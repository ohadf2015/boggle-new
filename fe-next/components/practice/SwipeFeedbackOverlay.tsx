'use client';

import { m, MotionValue, useTransform } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { Check, X } from 'lucide-react';

interface SwipeFeedbackOverlayProps {
  /** X position motion value from useSwipeGesture */
  x: MotionValue<number>;
  /** Swipe threshold for normalization */
  threshold: number;
  /** Custom className */
  className?: string;
}

/**
 * Visual feedback overlay showing swipe direction
 *
 * Displays green "Got It" indicator when swiping right,
 * red "Don't Know" indicator when swiping left.
 * Opacity increases as user drags further.
 */
export function SwipeFeedbackOverlay({
  x,
  threshold,
  className,
}: SwipeFeedbackOverlayProps) {
  const { t, dir } = useLanguage();
  const isRTL = dir === 'rtl';

  // Calculate opacity based on drag distance
  // Right swipe: positive x = positive opacity for "Got It"
  // Left swipe: negative x = positive opacity for "Don't Know"
  const gotItOpacity = useTransform(x, [0, threshold], [0, 1]);
  const dontKnowOpacity = useTransform(x, [-threshold, 0], [1, 0]);

  return (
    <div className={cn('pointer-events-none absolute inset-0 z-10', className)}>
      {/* Got It - Right swipe (Green) */}
      <m.div
        className={cn(
          'absolute inset-0 flex items-center justify-center',
          'bg-green-500/20 border-4 border-green-500 rounded-neo',
          isRTL ? 'flex-row-reverse' : ''
        )}
        style={{ opacity: gotItOpacity }}
      >
        <div className="flex items-center gap-3 bg-green-500 px-6 py-3 rounded-neo shadow-hard-sm -rotate-12">
          <Check size={32} className="text-white" strokeWidth={3} />
          <span className="text-2xl font-neo-display text-white uppercase">
            {t('education.lesson.gotIt')}
          </span>
        </div>
      </m.div>

      {/* Don't Know - Left swipe (Red) */}
      <m.div
        className={cn(
          'absolute inset-0 flex items-center justify-center',
          'bg-red-500/20 border-4 border-red-500 rounded-neo',
          isRTL ? 'flex-row-reverse' : ''
        )}
        style={{ opacity: dontKnowOpacity }}
      >
        <div className="flex items-center gap-3 bg-red-500 px-6 py-3 rounded-neo shadow-hard-sm rotate-12">
          <X size={32} className="text-white" strokeWidth={3} />
          <span className="text-2xl font-neo-display text-white uppercase">
            {t('education.lesson.dontKnow')}
          </span>
        </div>
      </m.div>
    </div>
  );
}
