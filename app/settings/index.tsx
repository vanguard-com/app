import { router, type Href } from 'expo-router';

import { AccessibleButton, Screen, ScreenHeader, type IconName } from '@/components';
import { strings } from '@/i18n';
import { useTheme } from '@/theme';

// Max 4 controls per screen, so settings are split into 4 groups.
const GROUPS: { key: keyof typeof strings.settings.groups; href: Href; icon: IconName }[] = [
  { key: 'sound', href: '/settings/sound', icon: 'volume-high-outline' },
  { key: 'feedback', href: '/settings/feedback', icon: 'pulse-outline' },
  { key: 'camera', href: '/settings/recording', icon: 'camera-outline' },
  { key: 'more', href: '/settings/more', icon: 'settings-outline' },
];

export default function SettingsHome() {
  const { spacing } = useTheme();
  const t = strings.settings;

  return (
    <Screen>
      <ScreenHeader title={t.title} />
      {GROUPS.map(({ key, href, icon }) => (
        <AccessibleButton
          navigation
          icon={icon}
          key={key}
          label={t.groups[key].label}
          hint={t.groups[key].hint}
          onPress={() => router.push(href)}
          style={{ marginBottom: spacing.md }}
          testID={`settings-group-${key}`}
        />
      ))}
    </Screen>
  );
}
