import { useCallback, useEffect, useRef } from 'react';
import { useIsFocused } from 'expo-router';
import { cues } from '@/cues';
import { useAppActive } from '@/hooks/useAppActive';

/** Wait for navigation/screen reader setup, and never finish an old lesson on another screen. */
export function useNarration(id: string, text: string, automatic = true) {
  const focused = useIsFocused();
  const active = useAppActive();
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const replay = useCallback(() => {
    clearTimeout(timer.current);
    if (focused && active) cues.say({ id, category: 'system', text, force: true });
  }, [focused, active, id, text]);
  const stop = useCallback(() => {
    clearTimeout(timer.current);
    cues.clearIds([id]);
  }, [id]);
  useEffect(() => {
    if (!focused || !active || !automatic) return;
    timer.current = setTimeout(replay, 700);
    return () => {
      stop();
    };
  }, [focused, active, replay, stop, automatic]);
  return { replay, stop };
}
