import { useEffect, useState } from 'react';

import { getLang, onLangChange, type Lang } from '@/core/i18n/i18n';

export function useLang(): Lang {
  const [lang, setLang] = useState(getLang());
  useEffect(() => onLangChange(setLang), []);
  return lang;
}
