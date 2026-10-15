import { useEffect, useRef } from 'react';

import {
  addHardwareButtonListener,
  setHardwareButtonsEnabled,
} from '../../modules/lumi-hardware-buttons';

/** Calls `onPress` for each volume button press while `enabled`. The volume itself is unchanged. */
export function useHardwareButton(enabled: boolean, onPress: () => void): void {
  const onPressRef = useRef(onPress);
  useEffect(() => {
    onPressRef.current = onPress;
  }, [onPress]);

  useEffect(() => {
    if (!enabled) return;
    setHardwareButtonsEnabled(true);
    const sub = addHardwareButtonListener(() => onPressRef.current());
    return () => {
      sub.remove();
      setHardwareButtonsEnabled(false);
    };
  }, [enabled]);
}
