import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import type { ComponentProps } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { minTouch, radius, space, useTheme } from '../tokens';
import { AppText } from './AppText';
import { tr } from '@/core/i18n/i18n';

type Kind = 'primary' | 'secondary' | 'ghost';

export interface ButtonProps {
  label: string;
  onPress: () => void;
  kind?: Kind;
  icon?: ComponentProps<typeof Ionicons>['name'];
  loading?: boolean;
  disabled?: boolean;
  accessibilityHint?: string;
}

export function Button({ label, onPress, kind = 'primary', icon, loading, disabled, accessibilityHint }: ButtonProps) {
  const t = useTheme();
  const inactive = disabled || loading;
  const bg = kind === 'primary' ? t.brand : kind === 'secondary' ? t.surface : 'transparent';
  const fg = kind === 'primary' ? t.onBrand : t.brand;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={tr(label)}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!inactive, busy: !!loading }}
      disabled={inactive}
      onPress={() => {
        Haptics.selectionAsync().catch(() => {});
        onPress();
      }}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: bg,
          borderColor: kind === 'secondary' ? t.borderStrong : 'transparent',
          opacity: inactive ? 0.5 : pressed ? 0.85 : 1,
        },
        pressed && { transform: [{ scale: 0.985 }] },
      ]}>
      <View style={styles.row}>
        {loading ? <ActivityIndicator color={fg} /> : icon ? <Ionicons name={icon} size={20} color={fg} /> : null}
        <AppText variant="bodyStrong" style={{ color: fg }}>
          {label}
        </AppText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { minHeight: minTouch + 8, borderRadius: radius.md, borderWidth: 1, paddingHorizontal: space.xl, justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.sm },
});
