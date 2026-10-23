import { useEffect } from 'react';
import { router } from 'expo-router';
import { AccessibleButton, Screen, ScreenHeader } from '@/components';
import { strings } from '@/i18n';
import { refreshModels } from '@/features/background/models';
import { useScreenAnnouncement } from '@/utils/accessibility';
export default function ModelsScreen() {
  const t = strings.background;
  useScreenAnnouncement(t.models.label);
  useEffect(() => {
    void refreshModels();
  }, []);
  return (
    <Screen>
      <ScreenHeader title={t.models.label} />
      {(['standard', 'detailed'] as const).map((model) => (
        <AccessibleButton
          key={model}
          label={t.modelNames[model]}
          hint={t.modelHint}
          onPress={() => router.push({ pathname: '/settings/scene-model', params: { model } })}
        />
      ))}
      <AccessibleButton
        label={t.downloads.label}
        hint={t.downloads.hint}
        onPress={() => router.push('/settings/downloads')}
      />
    </Screen>
  );
}
