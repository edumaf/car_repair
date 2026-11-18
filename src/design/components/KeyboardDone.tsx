// A "Done" bar above iOS keyboards that have no Enter key (number pads), so every keyboard can be closed.
import { InputAccessoryView, Keyboard, Platform, Pressable, StyleSheet, View } from 'react-native';

import { tr } from '@/core/i18n/i18n';

import { minTouch, space, useTheme } from '../tokens';
import { AppText } from './AppText';

export const needsDoneBar = (keyboardType: string | undefined) =>
  Platform.OS === 'ios' && !!keyboardType && /pad$/.test(keyboardType); // number-pad, decimal-pad, phone-pad

/** Render once next to the input and pass the same `id` as the input's `inputAccessoryViewID`. */
export function KeyboardDone({ id }: { id: string }) {
  const t = useTheme();
  if (Platform.OS !== 'ios') return null;
  return (
    <InputAccessoryView nativeID={id}>
      <View style={[styles.bar, { backgroundColor: t.surface, borderTopColor: t.border }]}>
        <Pressable accessibilityRole="button" accessibilityLabel={tr('Done')} onPress={() => Keyboard.dismiss()} style={styles.btn} hitSlop={8}>
          <AppText variant="bodyStrong" tone="brand">
            Done
          </AppText>
        </Pressable>
      </View>
    </InputAccessoryView>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', justifyContent: 'flex-end', borderTopWidth: 1, paddingHorizontal: space.lg },
  btn: { minHeight: minTouch, justifyContent: 'center', paddingHorizontal: space.sm },
});
