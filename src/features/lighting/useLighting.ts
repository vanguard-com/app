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
import { createFaceDetector } from 'react-native-vision-camera-face-detector';
import { scheduleOnRN } from 'react-native-worklets';

import { cues } from '@/cues';
import { chooseTarget, previewBox, type Target } from '@/features/framing/model';
import { strings } from '@/i18n';

import { LIGHTING } from './config';
import { analyseLighting, EMPTY_LIGHTING, LightingTracker, type LightingResult } from './model';
import { sampleLuma, type Point } from './sample';

const RESOLUTION = { width: 320, height: 240 };
export function useLighting(
  camera: RefObject<CameraRef | null>,
  active: boolean,
  size: { width: number; height: number },
  facing: string,
  onBrightness: (brightness: number, now: number) => void,
  guidance: boolean,
) {
  const [result, setResult] = useState<LightingResult>(EMPTY_LIGHTING);
  const tracker = useRef(new LightingTracker());
  const latest = useRef({ active, size, onBrightness });
  useLayoutEffect(() => {
    latest.current = { active, size, onBrightness };
  });
  const mapping = useSharedValue<Point[] | null>(null);
  const lastFrame = useSharedValue(0);
  const generation = useSharedValue(0);
  const expectedGeneration = useRef(0);
  const invalidate = useCallback(() => ++expectedGeneration.current, []);
  const target = useRef<Target | null>(null);
  const seenAt = useRef(0);
  const detector = useMemo(
    () =>
      createFaceDetector({
        cameraFacing: facing as 'front' | 'back',
        mirrorMode: 'auto',
        autoMode: true,
        performanceMode: 'fast',
        trackingEnabled: true,
        minFaceSize: 0.08,
      }),
    [facing],
  );
  const receive = useCallback(
    (
      grid: number[],
      faces: { bounds: { x: number; y: number; width: number; height: number }; id?: number }[],
      at: number,
      token: number,
    ) => {
      if (
        !latest.current.active ||
        expectedGeneration.current !== token ||
        Date.now() - at > LIGHTING.staleMs
      )
        return;
      const view = camera.current;
      const targets: Target[] = [];
      if (view?.preview) {
        for (const face of faces) {
          try {
            const box = previewBox(face.bounds, latest.current.size, (p) =>
              view.convertCameraPointToViewPoint(p),
            );
            if (box) targets.push({ box, id: face.id });
          } catch {
            /* A reconfiguration can invalidate the converter between frames. */
          }
        }
      }
      const selected = chooseTarget(targets, target.current);
      if (selected) {
        target.current = selected;
        seenAt.current = at;
      } else if (at - seenAt.current >= 1000) target.current = null;
      // Never reuse an old face against pixels from a different frame.
      const next = analyseLighting(grid, LIGHTING.gridSize, selected?.box ?? null);
      setResult(tracker.current.update(next, at));
      if (next.state !== 'unavailable') latest.current.onBrightness(next.overall, at);
    },
    [camera],
  );
  const onFrame = useCallback(
    (frame: Frame) => {
      'worklet';
      const token = generation.value;
      try {
        const points = mapping.value;
        const now = Date.now();
        if (!points || now - lastFrame.value < LIGHTING.intervalMs) return;
        lastFrame.set(now);
        const format = frame.pixelFormat;
        if (
          !frame.isPlanar ||
          (format !== 'yuv-420-8-bit-full' && format !== 'yuv-420-8-bit-video')
        ) {
          scheduleOnRN(receive, [], [], now, token);
          return;
        }
        const plane = frame.getPlanes()[0];
        if (!plane) return;
        const grid = sampleLuma(
          new Uint8Array(plane.getPixelBuffer()),
          plane.width,
          plane.height,
          plane.bytesPerRow,
          frame.convertCameraPointToFramePoint(points[0]),
          frame.convertCameraPointToFramePoint(points[1]),
          frame.convertCameraPointToFramePoint(points[2]),
          LIGHTING.gridSize,
          format === 'yuv-420-8-bit-video',
        );
        const faces = detector.detectFaces(frame).map((face) => ({
          bounds: {
            x: face.bounds.x,
            y: face.bounds.y,
            width: face.bounds.width,
            height: face.bounds.height,
          },
          id: face.trackingId,
        }));
        scheduleOnRN(receive, grid, faces, now, token);
      } catch {
        scheduleOnRN(receive, [], [], Date.now(), token);
      } finally {
        frame.dispose();
      }
    },
    [mapping, lastFrame, generation, receive, detector],
  );
  const output = useFrameOutput({
    targetResolution: RESOLUTION,
    pixelFormat: 'yuv',
    enablePreviewSizedOutputBuffers: true,
    dropFramesWhileBusy: true,
    onFrame,
  });

  useEffect(() => {
    const token = invalidate();
    generation.set(token);
    tracker.current = new LightingTracker();
    target.current = null;
    mapping.set(null);
    const reset = setTimeout(() => setResult(EMPTY_LIGHTING), 0);
    cues.clearCategory('lighting');
    if (!active) return () => clearTimeout(reset);
    const update = () => {
      const view = camera.current;
      if (view?.preview && size.width > 0 && size.height > 0) {
        try {
          mapping.set([
            view.convertViewPointToCameraPoint({ x: 0, y: 0 }),
            view.convertViewPointToCameraPoint({ x: size.width, y: 0 }),
            view.convertViewPointToCameraPoint({ x: 0, y: size.height }),
          ]);
        } catch {
          mapping.set(null);
        }
      }
      setResult(tracker.current.tick(Date.now()));
    };
    update();
    const timer = setInterval(update, 250);
    return () => {
      clearTimeout(reset);
      clearInterval(timer);
      mapping.set(null);
      invalidate();
      cues.clearCategory('lighting');
    };
  }, [active, facing, size.width, size.height, camera, mapping, generation, invalidate]);

  useEffect(() => {
    if (!active) return;
    if (!guidance) {
      cues.clearCategory('lighting');
      return;
    }
    if (result.state === 'waiting') return;
    const send = () =>
      cues.say({
        id: `lighting.${result.state}`,
        category: 'lighting',
        text: strings.lighting.states[result.state],
        silentUntilChange: result.state === 'good',
        maxWaitMs: 1400,
        haptic: result.state === 'good' ? 'single' : undefined,
      });
    send();
    const timer = setInterval(send, 1000);
    return () => clearInterval(timer);
  }, [active, guidance, result.state]);

  const speakStatus = useCallback(() => {
    cues.say({
      id: 'lighting.request',
      category: 'lighting',
      text: strings.lighting.states[tracker.current.tick(Date.now()).state],
      force: true,
    });
  }, []);
  return { output, result, speakStatus };
}
