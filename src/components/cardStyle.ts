import type { ViewStyle } from 'react-native';

import type { Theme } from '@/theme';

/**
 * Raised card look shared by buttons, rows and info panels: a visible 3:1 border (so the edge is
 * clear to low vision users) plus a soft shadow in light mode for depth.
 */
export function cardStyle({ colors, layout, scheme }: Theme): ViewStyle {
  return {
    backgroundColor: colors.surface,
    borderColor: colors.secondaryButton.border,
    borderWidth: layout.buttonBorderWidth,
    borderRadius: layout.cornerRadius,
    ...(scheme === 'light'
      ? {
          shadowColor: colors.shadow,
          shadowOpacity: 0.06,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 4 },
          elevation: 2,
        }
      : null),
  };
}
