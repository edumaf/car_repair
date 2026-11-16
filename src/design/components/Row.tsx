import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps, ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { minTouch, radius, space, useTheme } from '../tokens';
import { AppText } from './AppText';

type IconName = ComponentProps<typeof Ionicons>['name'];

interface RowProps {
  icon?: IconName;
  title: string;
  subtitle?: string;
  right?: ReactNode;
  onPress?: () => void;
  disabled?: boolean;
}

/** A list row inside a Card: icon tile, title, subtitle, optional trailing element or chevron. */
export function Row({ icon, title, subtitle, right, onPress, disabled }: RowProps) {
  const t = useTheme();
  const content = (
    <View style={[styles.row, disabled && { opacity: 0.55 }]}>
      {icon ? (
        <View style={[styles.iconTile, { backgroundColor: t.tint.brand }]}>
          <Ionicons name={icon} size={20} color={t.brand} />
        </View>
      ) : null}
      <View style={styles.text}>
        <AppText variant="bodyStrong">{title}</AppText>
        {subtitle ? (
          <AppText variant="caption" tone="muted">
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {right ?? (onPress && !disabled ? <Ionicons name="chevron-forward" size={18} color={t.faint} /> : null)}
    </View>
  );
  if (!onPress || disabled)
    return (
      <View accessible accessibilityLabel={[title, subtitle].filter(Boolean).join('. ')}>
        {content}
      </View>
    );
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={subtitle}
      onPress={onPress}
      style={({ pressed }) => pressed && { opacity: 0.7 }}>
      {content}
    </Pressable>
  );
}

export function Divider() {
  const t = useTheme();
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: t.border, marginVertical: space.xs }} />;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: minTouch, paddingVertical: space.xs },
  iconTile: { width: 38, height: 38, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, gap: 2 },
});
