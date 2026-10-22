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
import { chooseTarget, previewBox, type Box, type Target } from '@/features/framing/model';
import { strings } from '@/i18n';
import { useSession } from '@/store/sessionStore';
import { useSettings } from '@/store/settingsStore';

import { FEEDBACK } from './config';
import {
  analysePosture,
  FeedbackTracker,
  observeFace,
  type FaceSample,
  type FeedbackObservation,
  type Keypoint,
} from './model';
import { parsePose, posePointToFrame } from './pose';
import { loadPoseResources } from './poseResources';
import { FeedbackStats } from './stats';

interface FacePacket extends FaceSample {
  bounds: Box;
  id?: number;
}
const UNKNOWN: FeedbackObservation = { eyeContact: null, smiling: null, posture: 'unknown' };
const RESOLUTION = { width: 640, height: 480 };

export function useFeedbackCamera(
  camera: RefObject<CameraRef | null>,
  active: boolean,
  facing: 'front' | 'back',
  size: { width: number; height: number },
) {
  const settings = useSettings((s) => s.feedback);
  const master = useSettings((s) => s.liveFeedback);
  const verbosity = useSettings((s) => s.verbosity);
  const enabled = active && master;
  const [observation, setObservation] = useState(UNKNOWN);
  const [poseStatus, setPoseStatus] = useState<'off' | 'loading' | 'ready' | 'unavailable'>('off');
  const [resources, setResources] = useState<Awaited<ReturnType<typeof loadPoseResources>> | null>(
    null,
  );
  const latest = useRef({ enabled, settings, verbosity, size });
  useLayoutEffect(() => {
    latest.current = { enabled, settings, verbosity, size };
  });
  const tracker = useRef(new FeedbackTracker());
  const stats = useRef(new FeedbackStats());
  const lastRequests = useRef(new Map<string, number>());
  const currentCue = useRef<string | null>(null);
  const target = useRef<Target | null>(null);
  const lastSeen = useRef(0);
  const lastAt = useRef(0);
  const available = useSharedValue(false);
  const token = useSharedValue(0);
  const lastFrame = useSharedValue(0);
  const poseBroken = useSharedValue(false);
  const expected = useRef(0);
  const invalidate = useCallback(() => ++expected.current, []);
  const detector = useMemo(
    () =>
      createFaceDetector({
        cameraFacing: facing,
        mirrorMode: 'auto',
        autoMode: true,
        performanceMode: 'fast',
        trackingEnabled: true,
        minFaceSize: 0.08,
        runLandmarks: true,
        runClassifications: true,
      }),
    [facing],
  );

  useEffect(() => {
    let abandoned = false;
    const timer = setTimeout(() => {
      setResources(null);
      setPoseStatus(enabled && settings.posture ? 'loading' : 'off');
      if (enabled && settings.posture)
        loadPoseResources()
          .then((value) => {
            if (abandoned) {
              value.resizer.dispose();
              value.model.dispose();
              return;
            }
            setResources(value);
            setPoseStatus('ready');
          })
          .catch(() => {
            if (!abandoned) setPoseStatus('unavailable');
          });
    }, 0);
    return () => {
      abandoned = true;
      clearTimeout(timer);
    };
  }, [enabled, settings.posture]);
  // Native HybridObjects are retained by the installed worklet until it is replaced.
  const model = enabled && settings.posture ? resources?.model : undefined;
  const resizer = enabled && settings.posture ? resources?.resizer : undefined;

  useEffect(() => {
    poseBroken.set(false);
  }, [resources, poseBroken]);
  const poseFailed = useCallback((generation: number) => {
    if (expected.current === generation && latest.current.enabled) setPoseStatus('unavailable');
  }, []);
  const receive = useCallback(
    (
      faces: FacePacket[],
      points: Keypoint[],
      nose: { x: number; y: number } | null,
      at: number,
      generation: number,
    ) => {
      const current = latest.current;
      if (!current.enabled || expected.current !== generation || Date.now() - at > FEEDBACK.staleMs)
        return;
      const view = camera.current;
      if (!view?.preview) return;
      const targets: Target[] = [];
      for (const face of faces) {
        try {
          const box = previewBox(face.bounds, current.size, (p) =>
            view.convertCameraPointToViewPoint(p),
          );
          if (box) targets.push({ box, id: face.id });
        } catch {
          /* A rotated/reconfigured preview may briefly invalidate its converter. */
        }
      }
      const selected = chooseTarget(targets, target.current);
      let face: FacePacket | null = null;
      if (selected) {
        const index = targets.indexOf(selected);
        // Keep packets paired even when a malformed box was rejected.
        face =
          faces.find((f) => f.id !== undefined && f.id === selected.id) ??
          (faces.length === targets.length ? faces[index] : null);
        target.current = selected;
        lastSeen.current = at;
      } else if (at - lastSeen.current >= 1000) target.current = null;
      let posture: FeedbackObservation['posture'] = 'unknown';
      if (selected && nose && current.settings.posture) {
        try {
          const p = view.convertCameraPointToViewPoint(nose);
          const x = p.x / current.size.width,
            y = p.y / current.size.height,
            b = selected.box;
          if (
            x >= b.x - 0.05 &&
            x <= b.x + b.width + 0.05 &&
            y >= b.y - 0.05 &&
            y <= b.y + b.height + 0.05
          )
            posture = analysePosture(points);
        } catch {
          posture = 'unknown';
        }
      }
      const next = { ...observeFace(face), posture };
      if (!current.settings.eyeContact) next.eyeContact = null;
      if (!current.settings.expression) next.smiling = null;
      setObservation(next);
      lastAt.current = at;
      if (useSession.getState().recordingPhase === 'recording') stats.current.sample(next, at);
      const requests = tracker.current.update(
        next,
        at,
        selected?.id ?? (selected ? 'tracked' : null),
        current.settings,
        current.verbosity === 'detailed',
      );
      for (const key of lastRequests.current.keys())
        if (!requests.includes(key as (typeof requests)[number])) lastRequests.current.delete(key);
      if (
        currentCue.current &&
        !requests.includes(currentCue.current as (typeof requests)[number])
      ) {
        cues.clearCategory('feedback');
        currentCue.current = null;
      }
      // Give independent, sustained problems a turn without replacing the queue on every frame.
      const cue = requests.find(
        (key) => at - (lastRequests.current.get(key) ?? -Infinity) >= 10_000,
      );
      if (
        cue &&
        cues.say({
          id: `feedback.${cue}`,
          category: 'feedback',
          text: strings.feedback.cues[cue],
          maxWaitMs: 4000,
        })
      ) {
        lastRequests.current.set(cue, at);
        currentCue.current = cue;
      }
    },
    [camera],
  );
  const onFrame = useCallback(
    (frame: Frame) => {
      'worklet';
      const generation = token.value;
      try {
        const now = Date.now();
        if (!available.value || now - lastFrame.value < FEEDBACK.intervalMs) return;
        lastFrame.set(now);
        const faces = detector.detectFaces(frame).map((face) => ({
          bounds: {
            x: face.bounds.x,
            y: face.bounds.y,
            width: face.bounds.width,
            height: face.bounds.height,
          },
          id: face.trackingId,
          yaw: face.yawAngle,
          pitch: face.pitchAngle,
          roll: face.rollAngle,
          smile: face.smilingProbability ?? null,
          eyesVisible: !!face.landmarks?.LEFT_EYE && !!face.landmarks?.RIGHT_EYE,
        }));
        let points: Keypoint[] = [];
        let nose: { x: number; y: number } | null = null;
        if (model && resizer && !poseBroken.value) {
          try {
            const resized = resizer.resize(frame);
            try {
              points = parsePose(new Float32Array(model.runSync([resized.getPixelBuffer()])[0]));
              if (points[0] && points[0].score >= FEEDBACK.keypointConfidence)
                nose = frame.convertFramePointToCameraPoint(
                  posePointToFrame(
                    points[0],
                    frame.width,
                    frame.height,
                    frame.orientation,
                    frame.isMirrored,
                  ),
                );
            } finally {
              resized.dispose();
            }
          } catch {
            poseBroken.set(true);
            scheduleOnRN(poseFailed, generation);
          }
        }
        scheduleOnRN(receive, faces, points, nose, now, generation);
      } catch {
        scheduleOnRN(receive, [], [], null, Date.now(), generation);
      } finally {
        frame.dispose();
      }
    },
    [token, available, lastFrame, detector, model, resizer, receive, poseBroken, poseFailed],
  );
  const output = useFrameOutput({
    targetResolution: RESOLUTION,
    pixelFormat: 'yuv',
    enablePreviewSizedOutputBuffers: true,
    dropFramesWhileBusy: true,
    onFrame,
  });
  useEffect(() => {
    token.set(invalidate());
    available.set(enabled);
    tracker.current.reset();
    lastRequests.current.clear();
    currentCue.current = null;
    target.current = null;
    const reset = setTimeout(() => setObservation(UNKNOWN), 0);
    cues.clearCategory('feedback');
    const timer = setInterval(() => {
      if (Date.now() - lastAt.current > FEEDBACK.staleMs) {
        tracker.current.reset();
        setObservation(UNKNOWN);
      }
    }, 500);
    return () => {
      invalidate();
      available.set(false);
      clearTimeout(reset);
      clearInterval(timer);
      cues.clearCategory('feedback');
    };
  }, [enabled, facing, size.width, size.height, token, available, invalidate]);
  useEffect(() => {
    if (poseStatus === 'unavailable' && enabled)
      cues.say({
        id: 'feedback.poseUnavailable',
        category: 'feedback',
        text: strings.feedback.poseUnavailable,
        silentUntilChange: true,
      });
  }, [poseStatus, enabled]);
  const beginStats = useCallback(() => {
    stats.current = new FeedbackStats();
  }, []);
  const finishStats = useCallback(() => stats.current.finish(Date.now()), []);
  return { output, observation, poseStatus, beginStats, finishStats };
}
