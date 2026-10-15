import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type RefObject } from 'react';
import type { CameraRef } from 'react-native-vision-camera';
import { createFaceDetectorOutput, type Face } from 'react-native-vision-camera-face-detector';

import { cues } from '@/cues';
import { strings } from '@/i18n';
import { useSession, type CameraFacing } from '@/store/sessionStore';
import { useSettings } from '@/store/settingsStore';

import {
  ANALYSIS_INTERVAL_MS,
  AutoZoom,
  FramingTracker,
  previewBox,
  type Framing,
  type Target,
} from './model';

const t = strings.framing;

export function useFraming(
  camera: RefObject<CameraRef | null>,
  facing: CameraFacing,
  active: boolean,
  size: { width: number; height: number },
) {
  const safeZone = useSettings((s) => s.safeZone);
  const autoLens = useSettings((s) => s.autoLens);
  const [result, setResult] = useState<Framing>(() => new FramingTracker(Date.now()).result);
  const [fps, setFps] = useState(0);
  const tracker = useRef(new FramingTracker(0));
  const zoom = useRef(new AutoZoom());
  const live = useRef({ active, size, safeZone, autoLens, facing });
  useLayoutEffect(() => {
    live.current = { active, size, safeZone, autoLens, facing };
  }, [active, size, safeZone, autoLens, facing]);
  const lastProcessed = useRef(-Infinity);
  const lastTone = useRef(-Infinity);
  const metrics = useRef({ start: 0, count: 0 });
  const latest = useRef(result);
  const failure = useRef(false);

  const publish = useCallback((next: Framing) => {
    latest.current = next;
    setResult(next);
  }, []);

  const onFaces =
    (faces: Face[]) => {
      const current = live.current;
      const view = camera.current;
      const now = Date.now();
      if (!current.active || !view?.preview || now - lastProcessed.current < ANALYSIS_INTERVAL_MS)
        return;
      lastProcessed.current = now;
      try {
        const targets: Target[] = [];
        for (const face of faces) {
          const box = previewBox(face.bounds, current.size, (p) =>
            view.convertCameraPointToViewPoint(p),
          );
          if (box) targets.push({ box, id: face.trackingId });
        }
        failure.current = false;
        const next = tracker.current.update(targets, now, facing === 'front', current.safeZone);
        publish(next);
        metrics.current.count++;
        if (now - metrics.current.start >= 1000) {
          setFps((metrics.current.count * 1000) / (now - metrics.current.start));
          metrics.current = { start: now, count: 0 };
        }
        const controller = view.controller;
        if (controller) {
          const nextZoom = zoom.current.update(
            next,
            now,
            controller.zoom,
            { min: controller.minZoom, max: controller.maxZoom },
            current.autoLens,
            useSession.getState().recordingPhase === 'idle',
          );
          if (nextZoom !== null) {
            const widening = nextZoom < controller.zoom;
            // Stay on the same device. Virtual devices may switch physical lenses automatically.
            view.startZoomAnimation(nextZoom, 0.5);
            cues.say({
              id: widening ? 'framing.zoomOut' : 'framing.zoomIn',
              category: 'framing',
              text: widening ? t.widening : t.zooming,
              maxWaitMs: 800,
            });
          }
        }
      } catch (error) {
        // Mapping can briefly fail while rotating/reconfiguring; the watchdog invalidates stale results.
        console.warn('Framing update failed', error);
      }
    };

  const onFacesRef = useRef(onFaces);
  useLayoutEffect(() => {
    onFacesRef.current = onFaces;
  });
  // The upstream hook recreates its output whenever its options object changes. Create once per
  // facing instead, so UI updates cannot constantly reconfigure the recording pipeline.
  /* eslint-disable react-hooks/refs -- The native factory retains these callbacks for later frames; it does not invoke them during render. */
  const output = useMemo(
    () =>
      createFaceDetectorOutput({
        cameraFacing: facing,
        mirrorMode: 'auto',
        autoMode: true,
        performanceMode: 'fast',
        trackingEnabled: true,
        minFaceSize: 0.08,
        runLandmarks: false,
        runContours: false,
        runClassifications: false,
        outputResolution: 'preview',
        onFacesDetected: (faces) => {
          if (live.current.facing === facing) onFacesRef.current(faces);
        },
        onError: (error) => {
          if (!live.current.active) return;
          console.warn('Face detection failed', error);
          failure.current = true;
        },
      }),
    [facing],
  );
  /* eslint-enable react-hooks/refs */

  useEffect(() => {
    tracker.current = new FramingTracker(Date.now());
    zoom.current = new AutoZoom();
    lastProcessed.current = -Infinity;
    failure.current = false;
    metrics.current = { start: Date.now(), count: 0 };
    const resetId = setTimeout(() => {
      setFps(0);
      publish(tracker.current.result);
    }, 0);
    cues.clearCategory('framing');
    if (!active) return () => clearTimeout(resetId);
    const id = setInterval(() => {
      const now = Date.now();
      if (failure.current)
        publish({
          ...tracker.current.tick(now),
          state: 'unavailable',
          status: 'adjust',
          box: null,
        });
      else {
        const next = tracker.current.tick(now);
        if (next !== latest.current) publish(next);
      }
      const current = latest.current;
      if (
        current.state === 'searching' ||
        current.state === 'unavailable' ||
        current.state === 'good'
      )
        return;
      if (
        now - lastTone.current >= current.intervalMs &&
        cues.guideTone({ frequency: current.frequency, pan: current.pan, durationS: 0.08 })
      )
        lastTone.current = now;
    }, 100);
    return () => {
      clearTimeout(resetId);
      clearInterval(id);
      cues.clearCategory('framing');
    };
  }, [active, facing, size.width, size.height, safeZone, publish]);

  useEffect(() => {
    if (!active) return;
    // Delay initial searching cue; normal detector warm-up should be quiet.
    const id = setTimeout(
      () => {
        const current = latest.current;
        cues.say({
          id: `framing.${current.state}.${current.status}`,
          category: 'framing',
          text: t.states[current.state],
          earcon: current.state === 'good' ? 'chime' : undefined,
          haptic:
            current.state === 'good'
              ? 'single'
              : current.status === 'problem'
                ? 'double'
                : undefined,
          silentUntilChange: true,
          maxWaitMs: 900,
        });
      },
      result.state === 'searching' ? 1000 : 0,
    );
    return () => clearTimeout(id);
  }, [active, result.state, result.status]);

  return { output, result, fps, statusText: t.states[result.state] };
}
