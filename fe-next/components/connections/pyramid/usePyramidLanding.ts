import { useEffect, useState } from 'react';

const LANDING_MS = 900;

/** The tier laid during this mount, while its landing beat plays; tiers already laid at mount never land again. */
export function usePyramidLanding(laid: number, enabled: boolean): number | null {
  const [prevLaid, setPrevLaid] = useState(laid);
  const [landing, setLanding] = useState<number | null>(null);
  if (laid !== prevLaid) {
    setPrevLaid(laid);
    if (enabled && laid > prevLaid) setLanding(laid - 1);
  }
  useEffect(() => {
    if (landing === null) return;
    const id = window.setTimeout(() => setLanding(null), LANDING_MS);
    return () => window.clearTimeout(id);
  }, [landing]);
  return landing;
}
