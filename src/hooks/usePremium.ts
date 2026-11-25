// Premium status. Until RevenueCat is wired (M5 dev build), only the dev "simulate premium" toggle grants it.
import { useEffect, useState } from 'react';

import { getFlags, onFlagsChange } from '@/state/appFlags';

export function usePremium(): boolean {
  const [premium, setPremium] = useState(getFlags().simulatePremium);
  useEffect(() => onFlagsChange((f) => setPremium(f.simulatePremium)), []);
  return premium;
}
