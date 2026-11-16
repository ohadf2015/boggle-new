import { useEffect, useState } from 'react';

/** Counts from `from` to `to` over `ms` once `active`; jumps straight to `to` when motion is reduced. */
export function useCountUp(from: number, to: number, active: boolean, reduced: boolean, ms = 900): number {
  const [value, setValue] = useState(from);
  useEffect(() => {
    if (!active) { setValue(from); return; }
    if (reduced || from === to) { setValue(to); return; }
    let raf = 0;
    const start = performance.now();
    const tick = () => {
      // own clock: the rAF timestamp can come from a different time origin than performance.now()
      const p = Math.max(0, Math.min(1, (performance.now() - start) / ms));
      setValue(Math.round(from + (to - from) * (1 - (1 - p) ** 3)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, from, to, reduced, ms]);
  return value;
}
