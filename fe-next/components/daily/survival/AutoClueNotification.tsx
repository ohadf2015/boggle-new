'use client';

import React, { useEffect, useRef } from 'react';
import { AdaptiveMotion } from '@/components/motion/AdaptiveMotion';
import { X, Sparkles, Tag, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { safeToLocaleString } from '@/utils/bcp47Locale';

export interface AutoClueNotificationProps {
  clueType: 'reveal_letter' | 'reveal_category' | 'example_sentence';
  onDismiss: () => void;
  direction: 'ltr' | 'rtl';
  t: (key: string) => string;
  language: string;
}

/**
 * Auto-Clue Notification Component
 * Toast dropped in from the top when an auto-clue unlocks; stacked by the parent's fixed container
 */
export const AutoClueNotification: React.FC<AutoClueNotificationProps> = ({
  clueType,
  onDismiss,
  direction,
  t,
  language,
}) => {
  // Auto-dismiss after 1.5 seconds. Use ref so the timer is set ONCE on mount
  // and isn't reset by parent re-renders that produce a new onDismiss identity.
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;

  useEffect(() => {
    const timer = setTimeout(() => {
      onDismissRef.current();
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  // Get clue-specific content
  const getClueContent = () => {
    switch (clueType) {
      case 'reveal_letter':
        return {
          icon: <Sparkles className="w-5 h-5" />,
          title: t('wordHunt.survival.clueRevealLetter'),
          cost: 3,
          color: 'from-neo-cyan to-blue-400',
        };
      case 'reveal_category':
        return {
          icon: <Tag className="w-5 h-5" />,
          title: t('wordHunt.survival.clueRevealCategory'),
          cost: 9,
          color: 'from-neo-pink to-purple-400',
        };
      case 'example_sentence':
        return {
          icon: <FileText className="w-5 h-5" />,
          title: t('wordHunt.survival.clueExampleSentence'),
          cost: 15,
          color: 'from-neo-orange to-yellow-400',
        };
    }
  };

  const content = getClueContent();

  return (
    <AdaptiveMotion.div
      layout
      role="status"
      data-testid="auto-clue-toast"
      initial={{ y: -28, opacity: 0, scale: 0.9 }}
      animate={{ y: 0, opacity: 1, scale: 1 }}
      exit={{ y: -16, opacity: 0, scale: 0.96, transition: { duration: 0.14, ease: [0.23, 1, 0.32, 1] } }}
      transition={{ type: 'spring', damping: 22, stiffness: 420, mass: 0.7 }}
      dir={direction}
      className={cn(
        'pointer-events-auto relative w-full max-w-xs overflow-hidden',
        'bg-linear-to-r',
        content.color,
        'border-neo-thick border-neo-black',
        'rounded-neo',
        'shadow-hard-lg'
      )}
    >
      <div className="flex items-center gap-3 px-4 py-3">
        <AdaptiveMotion.div
          initial={{ scale: 0.4, rotate: -25 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', damping: 10, stiffness: 380, delay: 0.08 }}
          className="shrink-0 grid place-items-center w-9 h-9 rounded-full bg-neo-cream/90 border-2 border-neo-black text-neo-black"
        >
          {content.icon}
        </AdaptiveMotion.div>

        <div className="flex-1 min-w-0">
          <div className="font-black text-sm text-neo-black font-neo-display leading-tight">
            {t('wordHunt.survival.autoClueUnlocked')}
          </div>
          <div className="font-bold text-xs text-neo-black/80 font-neo-body">{content.title}</div>
          <div className="text-[10px] text-neo-black/60 font-bold mt-0.5">
            {t('wordHunt.survival.clueAutoMessage')?.replace('{cost}', safeToLocaleString(content.cost, language)) ||
              `Auto-unlocked at ${content.cost} tokens`}
          </div>
        </div>

        <button
          type="button"
          onClick={onDismiss}
          className={cn(
            'shrink-0 w-6 h-6',
            'flex items-center justify-center',
            'bg-neo-black text-white',
            'rounded-full',
            'hover:bg-neo-red transition-colors',
            'focus:outline-hidden focus:ring-2 focus:ring-neo-pink'
          )}
          aria-label={t('common.dismiss')}
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <span
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 h-1 origin-left bg-neo-black/70 rtl:origin-right motion-safe:animate-[clueToastTimer_1500ms_linear_forwards]"
      />
    </AdaptiveMotion.div>
  );
};

export default AutoClueNotification;
