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
 * Side banner notification when auto-clue unlocks
 * Slides from edge with mascot animation
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
      initial={{
        x: direction === 'ltr' ? -300 : 300,
        opacity: 0,
      }}
      animate={{
        x: 0,
        opacity: 1,
      }}
      exit={{
        x: direction === 'ltr' ? -300 : 300,
        opacity: 0,
      }}
      transition={{
        type: 'spring',
        damping: 20,
        stiffness: 300,
      }}
      className={cn(
        'fixed top-20 z-50',
        direction === 'ltr' ? 'left-4' : 'right-4'
      )}
    >
      <div
        className={cn(
          'relative flex items-center gap-3',
          'px-4 py-3 max-w-xs',
          'bg-linear-to-r',
          content.color,
          'border-neo-thick border-neo-black',
          'rounded-neo',
          'shadow-hard-lg'
        )}
      >
        {/* Mascot/Icon Section */}
        <AdaptiveMotion.div
          animate={{
            scale: [1, 1.1, 1],
            rotate: [0, 5, -5, 0],
          }}
          transition={{
            duration: 0.5,
            repeat: 2,
            repeatDelay: 0.3,
          }}
          className="shrink-0"
        >
          {content.icon}
        </AdaptiveMotion.div>

        {/* Content Section */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2">
            <div className="flex-1">
              {/* Title */}
              <div className="font-black text-sm text-neo-black font-neo-display mb-0.5">
                {t('wordHunt.survival.autoClueUnlocked')}
              </div>

              {/* Subtitle */}
              <div className="font-bold text-xs text-neo-black/80 font-neo-body">
                {content.title}
              </div>

              {/* Cost Reference */}
              <div className="text-[10px] text-neo-black/60 font-bold mt-1">
                {t('wordHunt.survival.clueAutoMessage')?.replace('{cost}', safeToLocaleString(content.cost, language)) ||
                  `Auto-unlocked at ${content.cost} tokens`}
              </div>
            </div>

            {/* Icon */}
            <div className="shrink-0 text-neo-black/70">{content.icon}</div>
          </div>
        </div>

        {/* Close Button */}
        <button
          type="button"
          onClick={onDismiss}
          className={cn(
            'absolute -top-2 -right-2',
            'w-6 h-6',
            'flex items-center justify-center',
            'bg-neo-black text-white',
            'rounded-full',
            'border-2 border-white',
            'shadow-hard-sm',
            'hover:bg-neo-red transition-colors',
            'focus:outline-hidden focus:ring-2 focus:ring-neo-pink'
          )}
          aria-label={t('common.dismiss')}
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </AdaptiveMotion.div>
  );
};

export default AutoClueNotification;
