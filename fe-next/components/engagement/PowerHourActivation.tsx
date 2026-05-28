'use client';

/**
 * PowerHourActivation - Toast overlay on first game of the day
 *
 * Shows "Power Hour Activated! 2x XP for the next 60 minutes!"
 * with lightning bolt animation. Auto-dismisses after 3 seconds.
 */

import React, { memo, useEffect } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { Zap } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import useReducedMotion from '@/hooks/useReducedMotion';
import { cn } from '@/lib/utils';

interface PowerHourActivationProps {
  visible: boolean;
  onDismiss: () => void;
}

export const PowerHourActivation: React.FC<PowerHourActivationProps> = memo(
  ({ visible, onDismiss }) => {
    const { t } = useLanguage();
    const reducedMotion = useReducedMotion();

    // Auto-dismiss after 3 seconds
    useEffect(() => {
      if (!visible) return;
      const timer = setTimeout(onDismiss, 3000);
      return () => clearTimeout(timer);
    }, [visible, onDismiss]);

    if (!visible) return null;

    return (
      <AnimatePresence>
        {visible && (
          <m.div
            data-testid="power-hour-activation"
            initial={reducedMotion ? false : { opacity: 0, y: -40, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className={cn(
              'fixed top-20 left-1/2 -translate-x-1/2 z-50',
              'flex flex-col items-center gap-2 px-6 py-4',
              'bg-neo-navy border-neo border-neo-cyan/50 rounded-neo',
              'shadow-[0_0_20px_rgba(0,255,255,0.3)]',
              'text-center',
            )}
            role="alert"
            aria-live="assertive"
          >
            {/* Lightning bolt icon */}
            <m.span
              data-testid="power-hour-bolt"
              animate={
                reducedMotion
                  ? {}
                  : { scale: [1, 1.2, 1], rotate: [0, -10, 10, 0] }
              }
              transition={{ type: 'tween', duration: 0.6, repeat: 2 }}
              className="text-neo-cyan"
            >
              <Zap className="w-10 h-10 fill-neo-cyan stroke-neo-cyan" />
            </m.span>

            {/* Title */}
            <h3 className="font-neo-display text-xl font-black text-neo-cyan">
              {t('powerHour.activated')}
            </h3>

            {/* Description */}
            <p className="text-neo-white text-sm font-neo-body">
              {t('powerHour.description')}
            </p>
          </m.div>
        )}
      </AnimatePresence>
    );
  }
);

PowerHourActivation.displayName = 'PowerHourActivation';
export default PowerHourActivation;
