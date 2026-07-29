'use client';

import { m, AnimatePresence } from 'framer-motion';

interface ScreenFlashOverlayProps {
  trigger: number;
  /** Flash color — defaults to white. Use Tailwind bg-* class. */
  colorClass?: string;
}

/**
 * Full-screen flash overlay. Each new `trigger` value remounts the motion div
 * (via `key={trigger}`) and re-runs the initial→animate flash. Stateless —
 * purely derived from props so React Compiler / set-state-in-effect is clean.
 */
export function ScreenFlashOverlay({ trigger, colorClass = 'bg-white' }: ScreenFlashOverlayProps) {
  return (
    <AnimatePresence>
      {trigger > 0 && (
        <m.div
          key={trigger}
          data-testid="screen-flash"
          data-trigger={trigger}
          initial={{ opacity: 0.1 }}
          animate={{ opacity: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className={`absolute inset-0 z-50 pointer-events-none ${colorClass}`}
        />
      )}
    </AnimatePresence>
  );
}
