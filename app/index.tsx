import { Redirect } from 'expo-router';

import { useSettings } from '@/store/settingsStore';

export default function Index() {
  const onboardingComplete = useSettings((s) => s.onboardingComplete);
  return <Redirect href={onboardingComplete ? '/camera' : '/welcome'} />;
}
