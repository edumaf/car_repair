// Signature component: VIN input in mono, shown grouped 3-6-8, with live validation state (CLAUDE.md §6.2, §12).
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRef, type ComponentRef } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { checkVin, groupVin, vinProblemMessage, VIN_LENGTH } from '@/core/vin/vin';

import { radius, space, useTheme } from '../tokens';
import { fonts } from '../typography';
import { AppText } from './AppText';
import { tr } from '@/core/i18n/i18n';

export function VinField({
  value,
  onChange,
  autoFocus,
  onSubmit,
}: {
  value: string;
  onChange: (v: string) => void;
  autoFocus?: boolean;
  /** Enter on the keyboard: look the VIN up (the field closes the keyboard either way). */
  onSubmit?: () => void;
}) {
  const t = useTheme();
  const input = useRef<ComponentRef<typeof TextInput>>(null);
  const check = checkVin(value);
  const message = check.vin.length > 0 ? vinProblemMessage(check) : null;
  const complete = check.problem === null;
  const state: 'empty' | 'typing' | 'ok' | 'warn' | 'error' =
    check.vin.length === 0
      ? 'empty'
      : check.problem === 'forbidden_letters' || check.problem === 'invalid_characters' || check.problem === 'too_long'
        ? 'error'
        : !complete
          ? 'typing'
          : check.checkDigitOk
            ? 'ok'
            : 'warn';
  const border = { empty: t.border, typing: t.brand, ok: t.go, warn: t.caution, error: t.stop }[state];
  const groups = groupVin(check.vin.padEnd(VIN_LENGTH, '·'));

  return (
    <View style={styles.wrap}>
      <View>
        <Pressable
          onPress={() => input.current?.focus()}
          style={[styles.box, { backgroundColor: t.surface, borderColor: border }]}
          accessibilityRole="none"
          importantForAccessibility="no-hide-descendants">
          <View style={styles.groups}>
            {groups.map((g, i) => (
              <AppText key={i} variant="mono" style={[styles.group, { color: i === 2 ? t.ink : t.muted }]}>
                {g}
              </AppText>
            ))}
          </View>
          {state === 'ok' ? <Ionicons name="checkmark-circle" size={22} color={t.go} /> : null}
          {state === 'warn' ? <Ionicons name="alert-circle" size={22} color={t.caution} /> : null}
          {state === 'error' ? <Ionicons name="close-circle" size={22} color={t.stop} /> : null}
        </Pressable>
        {/* The real input sits on top, transparent: native editing, paste and accessibility, grouped display below. */}
        <TextInput
          ref={input}
          value={check.vin}
          onChangeText={(text) =>
            onChange(
              text
                .toUpperCase()
                .replace(/[^A-Z0-9]/g, '')
                .slice(0, VIN_LENGTH + 2),
            )
          }
          autoCapitalize="characters"
          autoCorrect={false}
          autoComplete="off"
          spellCheck={false}
          autoFocus={autoFocus}
          returnKeyType="search"
          submitBehavior="blurAndSubmit"
          onSubmitEditing={onSubmit}
          maxLength={VIN_LENGTH + 2}
          accessibilityLabel={tr('VIN, 17 characters')}
          accessibilityHint={message ?? undefined}
          caretHidden
          style={[StyleSheet.absoluteFill, styles.hiddenInput, { fontFamily: fonts.mono }]}
        />
      </View>
      <View style={styles.meta}>
        <AppText variant="caption" tone={state === 'error' ? 'stop' : state === 'warn' ? 'caution' : 'muted'} style={styles.message}>
          {message ?? (state === 'ok' ? 'Looks like a valid VIN.' : 'Letters and numbers only. VINs never use I, O or Q.')}
        </AppText>
        <AppText variant="caption" tone="faint" style={styles.count}>
          {check.vin.length}/{VIN_LENGTH}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.sm },
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderRadius: radius.md,
    paddingVertical: space.lg,
    paddingHorizontal: space.lg,
    gap: space.sm,
  },
  groups: { flex: 1, flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' },
  group: { fontSize: 20, letterSpacing: 1.5 },
  hiddenInput: { opacity: 0.02, color: 'transparent' },
  meta: { flexDirection: 'row', gap: space.sm },
  message: { flex: 1 },
  count: { fontVariant: ['tabular-nums'] },
});
