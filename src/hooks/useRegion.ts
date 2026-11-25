import { useEffect, useState } from 'react';

import { getRegion, onRegionChange, type Region } from '@/core/region';

export function useRegion(): Region {
  const [region, setRegion] = useState(getRegion());
  useEffect(() => onRegionChange(setRegion), []);
  return region;
}
