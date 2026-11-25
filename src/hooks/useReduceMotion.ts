import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

/** True when the user turned on Reduce Motion (CLAUDE.md §12): animations then stay still. */
export function useReduceMotion(): boolean {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled()
      .then(setReduce)
      .catch(() => {});
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduce);
    return () => sub.remove();
  }, []);
  return reduce;
}
