import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

/** True while Lumi is in the foreground. Analysis and the camera pause otherwise. */
export function useAppActive(): boolean {
  const [active, setActive] = useState(AppState.currentState === 'active');
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => setActive(state === 'active'));
    return () => sub.remove();
  }, []);
  return active;
}
