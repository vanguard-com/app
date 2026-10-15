import { StyleSheet, View } from 'react-native';

import { darkPalette, statusVisuals, type Status } from '@/theme';

// Gap between the two lines of the "double" border.
const DOUBLE_GAP = 6;

/**
 * Thick border around the whole camera screen. Colour, line style and icon differ per status, so
 * colour is never the only signal. Purely visual: status is spoken separately.
 */
export function StatusBorder({ status }: { status: Status | null }) {
  if (!status) return null;
  const visual = statusVisuals[status];
  const color = darkPalette[visual.colorToken];

  if (visual.borderStyle === 'double') {
    return (
      <View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { borderColor: color, borderWidth: visual.borderWidth }]}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        testID="status-border-double"
      >
        <View
          style={[
            styles.inner,
            {
              borderColor: color,
              borderWidth: visual.borderWidth,
              margin: DOUBLE_GAP,
            },
          ]}
        />
      </View>
    );
  }

  return (
    <View
      pointerEvents="none"
      style={[
        StyleSheet.absoluteFill,
        { borderColor: color, borderWidth: visual.borderWidth, borderStyle: visual.borderStyle },
      ]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      testID={`status-border-${visual.borderStyle}`}
    />
  );
}

const styles = StyleSheet.create({
  inner: { flex: 1 },
});
