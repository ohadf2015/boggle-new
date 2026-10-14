'use client';

import { useLayoutEffect, useState } from 'react';
import { loadDailyResult } from '@/lib/connections/dailyResultStore';

interface StoredState<T> {
  /** False until this device's storage has been read (pessimistic: render nothing yet). */
  checked: boolean;
  value: T | null;
}

/**
 * Today's stored terminal daily result for this flavor, read in a layout
 * effect: the host page SSRs, so reading storage during render would mismatch
 * hydration, and a plain effect would paint the fresh game before flipping to
 * the results (rules/60 Class 1). Callers render nothing until `checked`.
 */
export function useStoredDailyResult<T extends { kind: string }>(
  dateISO: string,
  language: string,
  kind: T['kind'],
): StoredState<T> {
  const [state, setState] = useState<StoredState<T>>({ checked: false, value: null });
  useLayoutEffect(() => {
    const value = loadDailyResult<T>(dateISO, language);
    setState({ checked: true, value: value && value.kind === kind ? value : null });
  }, [dateISO, language, kind]);
  return state;
}
