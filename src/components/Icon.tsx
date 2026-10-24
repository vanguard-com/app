import { View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

export type IconName = keyof typeof Ionicons.glyphMap;

export interface IconProps {
  name: IconName;
  color: string;
  size?: number;
}

/** Decorative icon. Always hidden from screen readers: the control's label carries the meaning. */
export function Icon({ name, color, size = 24 }: IconProps) {
  return (
    <View
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      testID={`icon-${name}`}
    >
      <Ionicons name={name} size={size} color={color} />
    </View>
  );
}
