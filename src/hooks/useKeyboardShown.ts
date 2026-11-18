import { useEffect, useRef, useState } from 'react';
import { Keyboard, Platform } from 'react-native';

/**
 * True while the keyboard is up. `onShow` runs as it appears (e.g. scroll the field being typed in above it).
 * Screens with a bar pinned to the bottom hide that bar while typing, so it can't cover the field.
 */
export function useKeyboardShown(onShow?: () => void): boolean {
  const [shown, setShown] = useState(false);
  const cb = useRef(onShow);
  cb.current = onShow;
  useEffect(() => {
    const show = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', () => {
      setShown(true);
      setTimeout(() => cb.current?.(), 250);
    });
    const hide = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => setShown(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  return shown;
}
