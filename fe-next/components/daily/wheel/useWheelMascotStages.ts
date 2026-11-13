'use client';

import { useMemo, useState } from 'react';

/** Gags play only in the desktop rail spot; on phones the mascot never takes room from the wheel. */
export function useWheelMascotStages() {
  const [rail, railRef] = useState<HTMLDivElement | null>(null);
  const stages = useMemo(() => [rail], [rail]);
  return { stages, railRef };
}
