import type { ReactNode } from 'react';
import { m } from 'framer-motion';

/** Staggered rise-in for the phone results stack. */
export function RevealIn({ delay, children }: { delay: number; children: ReactNode }) {
  return (
    <m.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}>
      {children}
    </m.div>
  );
}
