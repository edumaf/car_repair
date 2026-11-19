import { useEffect, useState } from 'react';

import { getFlags, onFlagsChange } from '@/state/appFlags';

/** The app-wide flags (onboarding done, analytics off, …), re-rendering when they change. */
export function useFlags() {
  const [flags, setFlagsState] = useState(getFlags());
  useEffect(() => onFlagsChange(setFlagsState), []);
  return flags;
}
