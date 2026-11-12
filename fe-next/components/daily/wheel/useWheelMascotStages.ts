'use client';

import { useMemo, useState } from 'react';

/** Where Word Wheel gags may play: the desktop rail spot, the phone band above the word line, then that band plus the word line on short phones. */
export function useWheelMascotStages() {
  const [rail, railRef] = useState<HTMLDivElement | null>(null);
  const [band, bandRef] = useState<HTMLDivElement | null>(null);
  const [reach, reachRef] = useState<HTMLDivElement | null>(null);
  const stages = useMemo(() => [rail, band, reach], [rail, band, reach]);
  return { stages, railRef, bandRef, reachRef };
}
