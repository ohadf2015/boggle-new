'use client';

import { useEffect, useState } from 'react';

export function useTodayLabel(lang: string, options: Intl.DateTimeFormatOptions): string {
  const [label, setLabel] = useState('');
  const key = JSON.stringify(options);
  useEffect(() => {
    setLabel(new Intl.DateTimeFormat(lang, JSON.parse(key)).format(new Date()));
  }, [lang, key]);
  return label;
}
