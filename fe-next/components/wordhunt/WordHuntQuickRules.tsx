'use client';

import { memo, useEffect, useRef } from 'react';
import { Target, Heart, Lightbulb, AlertTriangle, X } from 'lucide-react';
import { AdaptiveMotion, AdaptiveAnimatePresence } from '@/components/motion/AdaptiveMotion';
import { cn } from '@/lib/utils';

const AUTO_DISMISS_MS = 8000;

export interface WordHuntQuickRulesProps {
  onDismiss: () => void;
  t: (key: string) => string;
}

interface Tip {
  icon: React.ReactNode;
  textKey: string;
  accent: string;
}

const TIPS: Tip[] = [
  {
    icon: <Target size={16} strokeWidth={2.5} />,
    textKey: 'wordHuntRules.panel1Title',
    accent: 'text-neo-pink',
  },
  {
    icon: <Heart size={16} strokeWidth={2.5} />,
    textKey: 'wordHuntRules.panel2Title',
    accent: 'text-neo-red',
  },
  {
    icon: <Lightbulb size={16} strokeWidth={2.5} />,
    textKey: 'wordHuntRules.panel3Title',
    accent: 'text-neo-lime',
  },
  {
    icon: <AlertTriangle size={16} strokeWidth={2.5} />,
    textKey: 'wordHuntRules.panel4Title',
    accent: 'text-neo-cyan',
  },
];

const TIP_COUNT = TIPS.length;

/**
 * Non-blocking compact quick-tips card for Word Hunt.
 * Floats at the top of the screen during gameplay, auto-dismisses.
 */
const WordHuntQuickRules = memo<WordHuntQuickRulesProps>(({ onDismiss, t }) => {
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    timerRef.current = setTimeout(onDismiss, AUTO_DISMISS_MS);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [onDismiss]);

  return (
    <AdaptiveAnimatePresence>
      <AdaptiveMotion.div
        initial={{ opacity: 0, y: -30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        className={cn(
          'fixed top-3 left-1/2 -translate-x-1/2 z-40 w-[min(92vw,360px)]',
          'bg-neo-navy-light/95',
          'border-2 border-neo-white/20 rounded-neo shadow-hard-sm',
          'px-4 py-3',
        )}
        data-testid="quick-rules"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <span className="font-neo-display font-bold text-xs uppercase tracking-wider text-neo-lime">
            {t('wordHuntRules.quickTipsTitle')}
          </span>
          <button
            type="button"
            onClick={onDismiss}
            className="p-0.5 rounded text-neo-white hover:text-neo-white transition-colors"
            data-testid="rules-dismiss"
            aria-label={t('wordHuntRules.gotIt')}
          >
            <X size={14} />
          </button>
        </div>

        {/* Tips list */}
        <ul className="flex flex-col gap-1.5">
          {TIPS.map((tip, i) => (
            <li
              key={`tip-${i}-${tip.textKey}`}
              className="flex items-center gap-2"
              data-testid={`tip-${i}`}
            >
              <span className={cn('shrink-0', tip.accent)}>{tip.icon}</span>
              <span className="text-[11px] font-neo-body text-neo-white leading-tight">
                {t(tip.textKey)}
              </span>
            </li>
          ))}
        </ul>
      </AdaptiveMotion.div>
    </AdaptiveAnimatePresence>
  );
});

WordHuntQuickRules.displayName = 'WordHuntQuickRules';
export { WordHuntQuickRules, TIPS, TIP_COUNT, AUTO_DISMISS_MS };
