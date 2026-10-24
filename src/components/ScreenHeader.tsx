import { StyleSheet, Text, View } from 'react-native';
import { useRef } from 'react';
import { router } from 'expo-router';

import { strings } from '@/i18n';
import { useTheme } from '@/theme';
import { useScreenAnnouncement } from '@/utils/accessibility';

import { AccessibleButton } from './AccessibleButton';

export interface ScreenHeaderProps {
  title: string;
  /** Hide the back button (e.g. first onboarding screen). */
  hideBack?: boolean;
  onBack?: () => void;
  /** Narrated tutorials/review/playback manage their own speech. */
  announce?: boolean;
}

/** Title plus a 60 pt back button in the top left corner. */
export function ScreenHeader({ title, hideBack, onBack, announce = true }: ScreenHeaderProps) {
  const { colors, typography, spacing } = useTheme();
  const heading = useRef<Text>(null);
  useScreenAnnouncement(title, announce, heading);

  const goBack = () => {
    if (onBack) onBack();
    else if (router.canGoBack()) router.back();
    else router.replace('/camera');
  };

  return (
    <View style={[styles.row, { marginBottom: spacing.lg }]}>
      {hideBack ? null : (
        <AccessibleButton
          label={strings.common.back.label}
          hint={strings.common.back.hint}
          icon="‹"
          text=""
          onPress={goBack}
          testID="header-back"
        />
      )}
      <Text
        ref={heading}
        accessible
        accessibilityRole="header"
        style={[
          typography.title,
          styles.title,
          { color: colors.textPrimary, marginLeft: hideBack ? 0 : spacing.md },
        ]}
      >
        {title}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  title: { flex: 1, flexWrap: 'wrap' },
});
