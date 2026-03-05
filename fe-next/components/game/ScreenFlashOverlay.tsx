'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ScreenFlashOverlayProps {
  trigger: number;
}

/**
 * Full-screen white flash overlay that fires when trigger increments.
 * Self-managing: tracks previous trigger value internally.
 */
export function ScreenFlashOverlay({ trigger }: ScreenFlashOverlayProps) {
  const [flash, setFlash] = useState(false);
  const prevTriggerRef = useRef(trigger);

  useEffect(() => {
    if (trigger > prevTriggerRef.current) {
      setFlash(true);
      const timer = setTimeout(() => setFlash(false), 200);
      prevTriggerRef.current = trigger;
      return () => clearTimeout(timer);
    }
    prevTriggerRef.current = trigger;
    return undefined;
  }, [trigger]);

  return (
    <AnimatePresence>
      {flash && (
        <motion.div
          data-testid="screen-flash"
          initial={{ opacity: 0.1 }}
          animate={{ opacity: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="absolute inset-0 z-40 pointer-events-none bg-white"
        />
      )}
    </AnimatePresence>
  );
}
