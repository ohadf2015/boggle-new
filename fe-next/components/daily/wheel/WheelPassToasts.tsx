import React from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { TrendingUp } from 'lucide-react';

type T = (key: string, params?: Record<string, string | number>) => string;

/** "You passed X" toasts, stacked under the HUD. */
export default function WheelPassToasts({ t, toasts, reducedMotion }: {
  t: T;
  toasts: Array<{ id: number; name: string }>;
  reducedMotion: boolean;
}) {
  return (
    <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 pointer-events-none flex flex-col items-center gap-1.5">
      <AnimatePresence>
        {toasts.map((toast, i) => (
          <m.div
            key={toast.id}
            className="px-3 py-1.5 rounded-neo border-3 border-neo-black bg-linear-to-r from-neo-pink to-neo-purple text-neo-white font-neo-display font-black text-sm shadow-[3px_3px_0px_black,0_0_18px_rgba(255,20,147,0.6)] flex items-center gap-1.5 whitespace-nowrap"
            initial={{ opacity: 0, y: -20, scale: 0.6 }}
            animate={{ opacity: 1, y: i * 4, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.7 }}
            transition={reducedMotion ? { duration: 0.2 } : { type: 'spring', stiffness: 500, damping: 18 }}
          >
            <TrendingUp className="w-4 h-4" />
            {t('wordWheel.passedPlayer', { name: toast.name })}
          </m.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
