import { useRef } from 'react';
import type { ViewProps } from 'react-native';

/** Clearly sideways and far enough: a swipe, not a scroll or a tap. */
export const isSwipe = (dx: number, dy: number, min = 60) => Math.abs(dx) >= min && Math.abs(dx) > Math.abs(dy) * 2;

/**
 * Swipe left / right on a view inside a vertical ScrollView (the inspection item). Uses plain touch events, so
 * scrolling, buttons and the iOS edge-swipe back keep working: a scroll or the back gesture cancels the touch, and
 * only a clearly sideways move counts. Spread the result onto the view.
 */
export function useHorizontalSwipe(
  onSwipeLeft: () => void,
  onSwipeRight: () => void,
): Pick<ViewProps, 'onTouchStart' | 'onTouchEnd' | 'onTouchCancel'> {
  const start = useRef<{ x: number; y: number } | null>(null);
  return {
    onTouchStart: (e) => {
      // One finger only; a second finger (pinch) cancels.
      start.current = e.nativeEvent.touches.length > 1 ? null : { x: e.nativeEvent.pageX, y: e.nativeEvent.pageY };
    },
    onTouchEnd: (e) => {
      const s = start.current;
      start.current = null;
      if (!s || !isSwipe(e.nativeEvent.pageX - s.x, e.nativeEvent.pageY - s.y)) return;
      if (e.nativeEvent.pageX < s.x) onSwipeLeft();
      else onSwipeRight();
    },
    onTouchCancel: () => {
      start.current = null;
    },
  };
}
