import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from 'react';
import { useSharedValue } from 'react-native-reanimated';
import { useFrameOutput, type CameraRef, type Frame } from 'react-native-vision-camera';
import { createFaceDetector, type Face } from 'react-native-vision-camera-face-detector';
import { scheduleOnRN } from 'react-native-worklets';

import { cues } from '@/cues';
import { chooseTarget, previewBox, type Box, type Target } from '@/features/framing/model';
import { posePointToFrame } from '@/features/feedback/pose';
import { sampleLuma, type Point } from '@/features/lighting/sample';
import { analyseLighting, type LightingResult } from '@/features/lighting/model';
import { strings } from '@/i18n';
import {
  ObjectTracker,
  backgroundWarnings,
  containsFace,
  parseDetections,
  position,
  type Detection,
  type TrackedObject,
} from './model';
import { loadObjectResources } from './resources';

const WARNING_IDS = ['background.bright', 'background.person', 'background.clutter'];
const RESOLUTION = { width: 640, height: 480 };

type FacePacket = Pick<Face, 'bounds' | 'trackingId'>;
export function objectList(objects: TrackedObject[], face: Box | null): string {
  const entries = [
    ...new Set(
      objects
        .filter((o) => o.label !== 'person' || !containsFace(o.box, face))
        .map((o) => strings.background.item(o.label, position(o.box))),
    ),
  ].slice(0, 6);
  return entries.length
    ? strings.background.list(entries.join(', '))
    : strings.background.noObjects;
}

/** One camera analysis output: face framing at 12 Hz, objects and brightness at 1 Hz. */
export function useBackgroundCamera(
  camera: RefObject<CameraRef | null>,
  active: boolean,
  facing: 'front' | 'back',
  size: { width: number; height: number },
  onFaces: (faces: FacePacket[]) => void,
  framing: boolean,
  onLighting?: (result: LightingResult, at: number) => void,
) {
  const [resources, setResources] = useState<Awaited<
    ReturnType<typeof loadObjectResources>
  > | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'unavailable'>('loading');
  const [objects, setObjects] = useState<TrackedObject[]>([]);
  const tracker = useRef(new ObjectTracker());
  const selected = useRef<Target | null>(null);
  const latest = useRef({ active, size, onFaces, framing, onLighting });
  useLayoutEffect(() => {
    latest.current = { active, size, onFaces, framing, onLighting };
  });
  const enabled = useSharedValue(false),
    token = useSharedValue(0),
    lastFace = useSharedValue(0),
    lastObject = useSharedValue(0),
    mapping = useSharedValue<Point[] | null>(null);
  const expected = useRef(0),
    lastPacket = useRef(0),
    lastCue = useRef(new Map<string, number>());
  const invalidate = useCallback(() => ++expected.current, []);
  const model = active ? resources?.model : undefined,
    resizer = active ? resources?.resizer : undefined;
  const detector = useMemo(
    () =>
      createFaceDetector({
        cameraFacing: facing,
        mirrorMode: 'auto',
        autoMode: true,
        performanceMode: 'fast',
        trackingEnabled: true,
        minFaceSize: 0.08,
      }),
    [facing],
  );
  useEffect(() => {
    if (!active) return;
    let abandoned = false;
    const timer = setTimeout(() => {
      setResources(null);
      setStatus('loading');
      loadObjectResources()
        .then((value) => {
          if (abandoned) {
            value.model.dispose();
            value.resizer.dispose();
          } else {
            setResources(value);
            setStatus('ready');
          }
        })
        .catch(() => {
          if (!abandoned) setStatus('unavailable');
        });
    }, 0);
    return () => {
      abandoned = true;
      clearTimeout(timer);
    };
  }, [active]);
  const receive = useCallback(
    (
      faces: FacePacket[],
      detections: Detection[] | null,
      grid: number[],
      at: number,
      generation: number,
    ) => {
      if (!latest.current.active || expected.current !== generation || Date.now() - at > 1500)
        return;
      if (latest.current.framing) latest.current.onFaces(faces);
      if (detections === null && !grid.length) return;
      const view = camera.current;
      if (!view?.preview) return;
      const targets: Target[] = [];
      for (const face of faces) {
        try {
          const box = previewBox(face.bounds, latest.current.size, (p) =>
            view.convertCameraPointToViewPoint(p),
          );
          if (box) targets.push({ box, id: face.trackingId });
        } catch {
          /* Reconfiguration invalidates maps. */
        }
      }
      selected.current = chooseTarget(targets, selected.current);
      const light = analyseLighting(grid, 16, selected.current?.box ?? null);
      latest.current.onLighting?.(light, at);
      if (detections === null) return;
      const mapped: Detection[] = [];
      for (const d of detections) {
        try {
          const box = previewBox(d.box, latest.current.size, (p) =>
            view.convertCameraPointToViewPoint(p),
          );
          if (box) mapped.push({ ...d, box });
        } catch {
          /* Drop invalid maps. */
        }
      }
      const next = tracker.current.update(mapped, at);
      setObjects(next);
      lastPacket.current = at;
      const warnings = backgroundWarnings(
        next,
        selected.current?.box ?? null,
        light.state === 'backlit',
        at,
      );
      if (!warnings.length) cues.clearIds(WARNING_IDS);
      for (const key of warnings)
        if (
          at - (lastCue.current.get(key) ?? -Infinity) >= 10000 &&
          cues.say({
            id: `background.${key}`,
            category: 'background',
            text: strings.background.warnings[key],
            maxWaitMs: 1500,
          })
        ) {
          lastCue.current.set(key, at);
          break;
        }
    },
    [camera],
  );
  const failed = useCallback((generation: number) => {
    if (latest.current.active && generation === expected.current) setStatus('unavailable');
  }, []);
  const onFrame = useCallback(
    (frame: Frame) => {
      'worklet';
      const generation = token.value;
      try {
        const now = Date.now();
        if (!enabled.value || now - lastFace.value < 83) return;
        lastFace.set(now);
        const faces = detector.detectFaces(frame).map((face) => ({
          bounds: {
            x: face.bounds.x,
            y: face.bounds.y,
            width: face.bounds.width,
            height: face.bounds.height,
          },
          trackingId: face.trackingId,
        }));
        let detections: Detection[] | null = null,
          grid: number[] = [];
        if (now - lastObject.value >= 1000) {
          lastObject.set(now);
          if (model && resizer) {
            try {
              const resized = resizer.resize(frame);
              try {
                detections = parseDetections(model.runSync([resized.getPixelBuffer()])).map((d) => {
                  const b = d.box;
                  const corners = [
                    { x: b.x, y: b.y },
                    { x: b.x + b.width, y: b.y },
                    { x: b.x, y: b.y + b.height },
                    { x: b.x + b.width, y: b.y + b.height },
                  ].map((p) =>
                    frame.convertFramePointToCameraPoint(
                      posePointToFrame(
                        p,
                        frame.width,
                        frame.height,
                        frame.orientation,
                        frame.isMirrored,
                        300,
                      ),
                    ),
                  );
                  const xs = corners.map((p) => p.x),
                    ys = corners.map((p) => p.y),
                    x = Math.min(...xs),
                    y = Math.min(...ys);
                  return {
                    ...d,
                    box: { x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y },
                  };
                });
              } finally {
                resized.dispose();
              }
            } catch {
              scheduleOnRN(failed, generation);
              detections = [];
            }
          }
          const points = mapping.value,
            format = frame.pixelFormat;
          if (
            points &&
            frame.isPlanar &&
            (format === 'yuv-420-8-bit-full' || format === 'yuv-420-8-bit-video')
          ) {
            const plane = frame.getPlanes()[0];
            if (plane)
              grid = sampleLuma(
                new Uint8Array(plane.getPixelBuffer()),
                plane.width,
                plane.height,
                plane.bytesPerRow,
                frame.convertCameraPointToFramePoint(points[0]),
                frame.convertCameraPointToFramePoint(points[1]),
                frame.convertCameraPointToFramePoint(points[2]),
                16,
                format === 'yuv-420-8-bit-video',
              );
          }
        }
        scheduleOnRN(receive, faces, detections, grid, now, generation);
      } catch {
        scheduleOnRN(failed, generation);
      } finally {
        frame.dispose();
      }
    },
    [token, enabled, lastFace, lastObject, detector, model, resizer, mapping, receive, failed],
  );
  const output = useFrameOutput({
    targetResolution: RESOLUTION,
    pixelFormat: 'yuv',
    enablePreviewSizedOutputBuffers: true,
    dropFramesWhileBusy: true,
    onFrame,
  });
  useEffect(() => {
    const generation = invalidate();
    token.set(generation);
    enabled.set(active);
    lastFace.set(0);
    lastObject.set(0);
    tracker.current = new ObjectTracker();
    selected.current = null;
    lastPacket.current = 0;
    lastCue.current.clear();
    mapping.set(null);
    const reset = setTimeout(() => setObjects([]), 0);
    cues.clearCategory('background');
    if (!active) return () => clearTimeout(reset);
    const update = () => {
      try {
        const view = camera.current;
        if (view?.preview && size.width > 0 && size.height > 0)
          mapping.set([
            view.convertViewPointToCameraPoint({ x: 0, y: 0 }),
            view.convertViewPointToCameraPoint({ x: size.width, y: 0 }),
            view.convertViewPointToCameraPoint({ x: 0, y: size.height }),
          ]);
      } catch {
        mapping.set(null);
      }
      if (lastPacket.current !== 0 && Date.now() - lastPacket.current > 2500) {
        lastPacket.current = 0;
        setObjects([]);
        selected.current = null;
        cues.clearIds(WARNING_IDS);
      }
    };
    update();
    const timer = setInterval(update, 500);
    return () => {
      clearTimeout(reset);
      clearInterval(timer);
      invalidate();
      enabled.set(false);
      mapping.set(null);
      cues.clearCategory('background');
    };
  }, [
    active,
    facing,
    size.width,
    size.height,
    camera,
    token,
    enabled,
    lastFace,
    lastObject,
    mapping,
    invalidate,
  ]);
  const summary = useCallback(
    () =>
      lastPacket.current === 0 || Date.now() - lastPacket.current > 2500
        ? status === 'unavailable'
          ? strings.background.unavailable
          : strings.background.waiting
        : objectList(tracker.current.current(Date.now()), selected.current?.box ?? null),
    [status],
  );
  const speakStatus = useCallback(() => {
    cues.say({ id: 'background.list', category: 'background', text: summary(), force: true });
  }, [summary]);
  return { output, objects, status, summary, speakStatus };
}
