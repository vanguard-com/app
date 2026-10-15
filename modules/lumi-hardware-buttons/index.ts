import { requireOptionalNativeModule, type EventSubscription } from 'expo-modules-core';

export type HardwareButton = 'volume' | 'volumeUp' | 'volumeDown';

interface NativeHardwareButtons {
  isSupported(): boolean;
  setEnabled(enabled: boolean): Promise<void> | void;
  addListener(
    event: 'onButtonPress',
    listener: (event: { button: HardwareButton }) => void,
  ): EventSubscription;
}

// Optional so Jest, web and builds made before this module was added keep working.
const native = requireOptionalNativeModule<NativeHardwareButtons>('LumiHardwareButtons');

/** False on iOS before 17.2 and wherever the native module is missing. */
export function isHardwareButtonSupported(): boolean {
  try {
    return native?.isSupported() ?? false;
  } catch {
    return false;
  }
}

export function setHardwareButtonsEnabled(enabled: boolean): void {
  Promise.resolve(native?.setEnabled(enabled)).catch(() => {});
}

export function addHardwareButtonListener(listener: (button: HardwareButton) => void): {
  remove: () => void;
} {
  if (!native) return { remove: () => {} };
  return native.addListener('onButtonPress', (event) => listener(event.button));
}
