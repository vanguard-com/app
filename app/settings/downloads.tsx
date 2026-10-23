import { Text } from 'react-native';
import { Screen, ScreenHeader, ToggleRow } from '@/components';
import { strings } from '@/i18n';
import { useSettings } from '@/store/settingsStore';
import { useTheme } from '@/theme';
import { useScreenAnnouncement } from '@/utils/accessibility';
export default function DownloadSettings() {
  const t = strings.background,
    { colors, typography } = useTheme();
  const allowed = useSettings((s) => s.allowMobileDataDownloads),
    update = useSettings((s) => s.update);
  useScreenAnnouncement(t.downloads.label);
  return (
    <Screen>
      <ScreenHeader title={t.downloads.label} />
      <Text style={[typography.body, { color: colors.textPrimary }]}>{t.downloadPolicy}</Text>
      <ToggleRow
        label={t.mobileData}
        value={allowed}
        onChange={(value) => update({ allowMobileDataDownloads: value })}
      />
    </Screen>
  );
}
