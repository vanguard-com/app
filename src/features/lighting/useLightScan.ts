import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { DeviceMotion } from 'expo-sensors';

import { cues, speakAndWait } from '@/cues';
import { strings } from '@/i18n';

import { LightScan, type ScanResult } from './scan';

const t = strings.lighting;
export function useLightScan(active: boolean, idle: boolean) {
  const model = useRef(new LightScan());
  const live = useRef({ active, idle });
  useLayoutEffect(() => {
    live.current = { active, idle };
  });
  const [result, setResult] = useState<ScanResult>({ phase: 'idle', progress: 0, turn: 0 });
  const request = useRef(0);
  const pending = useRef(false);
  const running = result.phase === 'scanning' || result.phase === 'guiding';
  const publish = useCallback((next: ScanResult) => setResult(next), []);
  const cancel = useCallback(() => {
    request.current++;
    pending.current = false;
    model.current.cancel();
    publish(model.current.result);
    cues.clearCategory('lighting');
  }, [publish]);
  const start = useCallback(async () => {
    if (pending.current || ['scanning', 'guiding'].includes(model.current.result.phase)) {
      cancel();
      return;
    }
    if (!live.current.active || !live.current.idle) {
      cues.say({ id: 'lighting.scan.busy', category: 'system', text: t.scanIdleOnly, force: true });
      return;
    }
    const token = ++request.current;
    pending.current = true;
    try {
      if (!(await DeviceMotion.isAvailableAsync())) throw new Error('Motion unavailable');
      const permission = await DeviceMotion.getPermissionsAsync();
      if (!permission.granted) {
        if (!permission.canAskAgain) throw new Error('Motion denied');
        await speakAndWait(t.motionExplain);
        if (token !== request.current || !live.current.active || !live.current.idle) return;
        if (!(await DeviceMotion.requestPermissionsAsync()).granted)
          throw new Error('Motion denied');
      }
      if (token !== request.current || !live.current.active || !live.current.idle) return;
      await speakAndWait(t.scanInstructions);
      if (token !== request.current || !live.current.active || !live.current.idle) return;
      model.current.start(Date.now());
      publish(model.current.result);
    } catch {
      if (token === request.current && live.current.active)
        cues.say({
          id: 'lighting.scan.unavailable',
          category: 'system',
          text: t.motionUnavailable,
          force: true,
        });
    } finally {
      if (token === request.current) pending.current = false;
    }
  }, [cancel, publish]);

  const invalidate = useCallback(() => {
    request.current++;
    pending.current = false;
  }, []);
  useEffect(() => {
    const current = model.current;
    if (!active || !idle) {
      request.current++;
      pending.current = false;
      model.current.cancel();
      const timer = setTimeout(() => publish(model.current.result), 0);
      return () => clearTimeout(timer);
    }
    return () => {
      invalidate();
      current.cancel();
      cues.clearCategory('lighting');
    };
  }, [active, idle, publish, invalidate]);

  useEffect(() => {
    if (!active || !idle || !running) return;
    DeviceMotion.setUpdateInterval(50);
    const subscription = DeviceMotion.addListener((measurement) => {
      // Expo normalizes both platforms to yaw in radians, positive counter-clockwise.
      const alpha = measurement.rotation?.alpha;
      if (Number.isFinite(alpha))
        publish(model.current.heading((-alpha * 180) / Math.PI, Date.now()));
    });
    let lastTone = 0;
    const timer = setInterval(() => {
      const next = model.current.tick(Date.now());
      publish(next);
      if (next.phase !== 'guiding') return;
      const interval = 180 + Math.min(1, Math.abs(next.turn) / 180) * 720;
      if (
        Date.now() - lastTone >= interval &&
        cues.guideTone(
          {
            frequency: 440,
            pan: Math.max(-1, Math.min(1, next.turn / 90)),
            durationS: 0.08,
          },
          'lighting',
        )
      )
        lastTone = Date.now();
    }, 100);
    return () => {
      subscription.remove();
      clearInterval(timer);
    };
  }, [active, idle, running, publish]);

  const sample = useCallback(
    (brightness: number, now: number) => {
      publish(model.current.sample(brightness, now));
    },
    [publish],
  );
  const guidance = result.phase === 'guiding' ? Math.round(Math.abs(result.turn) / 10) * 10 : 0;
  const direction = result.turn < 0 ? 'left' : 'right';
  useEffect(() => {
    if (!active) return;
    let text: string | undefined;
    if (result.phase === 'guiding') text = t.scanTurn(direction, guidance);
    if (result.phase === 'done') text = t.scanDone;
    if (result.phase === 'failed') text = t.scanFailed;
    if (text)
      cues.say({
        id: `lighting.scan.${result.phase}.${direction}.${guidance}`,
        category: result.phase === 'done' || result.phase === 'failed' ? 'system' : 'lighting',
        text,
        earcon: result.phase === 'done' ? 'chime' : undefined,
        haptic: result.phase === 'done' ? 'single' : undefined,
        silentUntilChange: true,
        maxWaitMs: 1000,
      });
  }, [active, result.phase, guidance, direction]);
  return { result, start, cancel, sample, running };
}
