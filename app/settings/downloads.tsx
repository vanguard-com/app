import { Text } from 'react-native';
import { Screen, ScreenHeader, ToggleRow } from '@/components';
import { strings } from '@/i18n';
import { useSettings } from '@/store/settingsStore';
import { useTheme } from '@/theme';
export default function DownloadSettings() {
  const t = strings.background,
    { colors, typography, spacing } = useTheme();
  const allowed = useSettings((s) => s.allowMobileDataDownloads),
    update = useSettings((s) => s.update);
  return (
    <Screen>
      <ScreenHeader title={t.downloads.label} />
      <Text style={[typography.body, { color: colors.textPrimary, marginBottom: spacing.md }]}>
        {t.downloadPolicy}
      </Text>
      <ToggleRow
        label={t.mobileData}
        value={allowed}
        onChange={(value) => update({ allowMobileDataDownloads: value })}
      />
    </Screen>
  );
}
