import { router, type Href } from 'expo-router';
import { useSettings } from '@/store/settingsStore';

export function nextOnboarding(
  pathname: '/tutorial' | '/practice' | '/permissions',
  replay: boolean,
) {
  router.push({ pathname, params: replay ? { replay: '1' } : {} } as Href);
}

export function finishOnboarding(replay: boolean) {
  if (replay) {
    if (router.canGoBack()) router.dismissTo('/settings/more');
    else router.replace('/settings/more');
  } else {
    useSettings.getState().update({ onboardingComplete: true });
    router.replace('/camera');
  }
}
