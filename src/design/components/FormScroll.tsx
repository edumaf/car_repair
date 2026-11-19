// A scrolling screen with text fields. iOS itself moves the field being typed in above the keyboard (and its Done
// bar), and leaves room to scroll to the bottom. Replaces KeyboardAvoidingView, which under a screen header got the
// keyboard height wrong and left number fields hidden behind the number pad.
import { ScrollView, type ScrollViewProps } from 'react-native';

import { useTheme } from '../tokens';

export function FormScroll({ style, ...rest }: ScrollViewProps) {
  const t = useTheme();
  return (
    <ScrollView
      style={[{ flex: 1, backgroundColor: t.bg }, style]}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      automaticallyAdjustKeyboardInsets
      {...rest}
    />
  );
}
