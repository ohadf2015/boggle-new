'use client';

import { useCallback, useEffect, useState } from 'react';

type Range = { start: number; end: number };

function centeredOn(anchor: number, length: number, size: number): Range {
  const start = Math.max(0, Math.min(Math.max(0, anchor) - Math.floor(size / 2), length - size));
  return { start, end: Math.min(length, start + size) };
}

/**
 * A `size`-row window over a ranked list, first centred on `anchorIndex` (the
 * viewer), with show-more above and below. `resetKey` re-centres (tab/season switch).
 */
export function useWindowedList(length: number, anchorIndex: number, size: number, resetKey: string) {
  const [range, setRange] = useState<Range | null>(null);

  useEffect(() => setRange(null), [resetKey]);

  useEffect(() => {
    if (range === null) {
      if (length > 0) setRange(centeredOn(anchorIndex, length, size));
      return;
    }
    // Keep the window honest as polling changes the list: clamp when it shrinks,
    // and grow while there is room — a new entrant on a 2-player board must appear.
    if (range.end > length) {
      setRange({ start: Math.min(range.start, Math.max(0, length - size)), end: length });
      return;
    }
    const room = size - (range.end - range.start);
    if (room > 0 && range.end < length) setRange({ start: range.start, end: Math.min(length, range.end + room) });
  }, [range, length, anchorIndex, size]);

  const loadAbove = useCallback(() => {
    setRange((prev) => (prev ? { start: Math.max(0, prev.start - size), end: prev.end } : prev));
  }, [size]);

  const loadBelow = useCallback(() => {
    setRange((prev) => (prev ? { start: prev.start, end: Math.min(length, prev.end + size) } : prev));
  }, [size, length]);

  const recenter = useCallback(() => setRange(centeredOn(anchorIndex, length, size)), [anchorIndex, length, size]);

  const start = range?.start ?? 0;
  const end = range?.end ?? Math.min(size, length);
  return { start, end, above: start, below: Math.max(0, length - end), loadAbove, loadBelow, recenter };
}
