'use client';

import { memo, useState, useEffect, useRef } from 'react';
import { AnimatePresence, m } from 'framer-motion';

interface TvTimesUpOverlayProps {
  remainingTime: number | null;
  t: (key: string) => string;
  /** Called when TIME'S UP fires — parent wires sound */
  onTimesUp?: () => void;
}

/**
 * TvTimesUpOverlay — dramatic countdown + "TIME'S UP!" for TV broadcast.
 *
 * Shows countdown numbers at remainingTime <= 5.
 * Triggers "TIME'S UP!" via setTimeout at remainingTime === 1, because
 * React 18 batching unmounts TvBroadcastView before remainingTime === 0 renders.
 */
const TvTimesUpOverlay = memo<TvTimesUpOverlayProps>(({ remainingTime, t, onTimesUp }) => {
  const [showTimesUp, setShowTimesUp] = useState(false);
  const timesUpFiredRef = useRef(false);
  const onTimesUpRef = useRef(onTimesUp);
  onTimesUpRef.current = onTimesUp;

  // Fire "TIME'S UP!" when countdown hits 1
  useEffect(() => {
    if (remainingTime !== 1 || timesUpFiredRef.current) return;

    const timer = setTimeout(() => {
      timesUpFiredRef.current = true;
      setShowTimesUp(true);
      onTimesUpRef.current?.();
    }, 800);

    return () => clearTimeout(timer);
  }, [remainingTime]);

  // Don't render when timer not active or above threshold
  if (remainingTime == null || remainingTime > 5) return null;

  return (
    <div
      data-testid="tv-times-up-overlay"
      className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none"
    >
      <AnimatePresence mode="wait">
        {showTimesUp ? (
          <m.div
            key="times-up"
            data-testid="times-up-text"
            initial={{ scale: 0.3, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            className="text-center"
          >
            <p className="text-6xl md:text-8xl font-neo-display font-black text-neo-red drop-shadow-[0_4px_0_black] uppercase tracking-wider">
              {t('tvBroadcast.timesUp')}
            </p>
            <p className="text-xl md:text-2xl font-neo-body font-bold text-neo-cream mt-2 opacity-80">
              {t('tvBroadcast.timesUpSub')}
            </p>
          </m.div>
        ) : (
          <m.div
            key={`countdown-${remainingTime}`}
            data-testid="countdown-number"
            initial={{ scale: 2, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 500, damping: 25 }}
            className="text-8xl md:text-[12rem] font-neo-display font-black text-neo-cream drop-shadow-[0_6px_0_black]"
          >
            {remainingTime}
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
});

TvTimesUpOverlay.displayName = 'TvTimesUpOverlay';

export default TvTimesUpOverlay;
