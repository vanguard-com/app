import { useEffect, useRef } from 'react';
import { cues } from '@/cues';
import { useSettings } from '@/store/settingsStore';

/** Only describe a user's own change; native screen readers already announce checked/value state. */
export function useSettingFeedback(label: string, value: string) {
  const requested = useRef(false);
  useEffect(() => {
    if (!requested.current) return;
    requested.current = false;
    const { voiceRate, cueVolume } = useSettings.getState();
    cues.configure({ voiceRate, cueVolume });
    cues.say({
      id: `setting.${label}`,
      category: 'system',
      text: `${label}. ${value}`,
      force: true,
      duplicatesScreenReader: true,
    });
  }, [label, value]);
  return () => {
    requested.current = true;
  };
}
