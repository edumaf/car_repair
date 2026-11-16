// Signature component: one AI suggestion with Confirm / Dismiss (CLAUDE.md §2.3, §12).
import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, View } from 'react-native';

import { minTouch, radius, space, useTheme } from '../tokens';
import { AppText } from './AppText';
import { tr } from '@/core/i18n/i18n';

export function PhotoFindingChip({
  title,
  detail,
  decision,
  onConfirm,
  onDismiss,
  confirmLabel = 'Confirm',
}: {
  title: string;
  detail?: string;
  decision?: 'confirmed' | 'dismissed';
  onConfirm: () => void;
  onDismiss: () => void;
  confirmLabel?: string;
}) {
  const t = useTheme();
  const done = decision !== undefined;
  return (
    <View
      style={[
        styles.chip,
        { backgroundColor: decision === 'dismissed' ? t.sunken : t.tint.warn, borderColor: decision === 'dismissed' ? t.border : t.warn },
      ]}
      accessible={done}
      accessibilityLabel={done ? `${title}: ${tr(decision)}` : undefined}>
      <View style={styles.head}>
        <Ionicons name="sparkles" size={16} color={decision === 'dismissed' ? t.muted : t.warn} />
        <AppText variant="overline" tone={decision === 'dismissed' ? 'muted' : 'warn'}>
          AI noticed
        </AppText>
      </View>
      <AppText variant="bodyStrong" style={decision === 'dismissed' && styles.struck}>
        {title}
      </AppText>
      {detail ? (
        <AppText variant="caption" tone="muted">
          {detail}
        </AppText>
      ) : null}
      {done ? (
        <AppText variant="label" tone={decision === 'confirmed' ? 'warn' : 'muted'}>
          {decision === 'confirmed' ? 'Confirmed: marked as a problem' : 'Dismissed'}
        </AppText>
      ) : (
        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${tr(confirmLabel)}: ${title}`}
            onPress={onConfirm}
            style={[styles.btn, { backgroundColor: t.warn }]}>
            <AppText variant="label" style={{ color: '#fff' }}>
              {confirmLabel}
            </AppText>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${tr('Dismiss')}: ${title}`}
            onPress={onDismiss}
            style={[styles.btn, { borderColor: t.borderStrong, borderWidth: 1 }]}>
            <AppText variant="label">Dismiss</AppText>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  chip: { borderRadius: radius.md, borderWidth: 1, padding: space.md, gap: space.xs },
  head: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  struck: { textDecorationLine: 'line-through' },
  actions: { flexDirection: 'row', gap: space.sm, marginTop: space.xs },
  btn: { flex: 1, minHeight: minTouch - 4, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
});
