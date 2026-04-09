'use client';

/**
 * AnonymousTeaserWidgets — guest conversion driver.
 *
 * Rendered on the landing page for unauthenticated visitors in place of the
 * authenticated engagement block (GhostRivalWidget, UrgencyCard, VaultCardConnected).
 * Each teaser is a lightweight locked preview — clicking any opens the auth modal.
 */

import React, { memo, useCallback, KeyboardEvent } from 'react';
import { motion } from 'framer-motion';
import { Lock, Swords, Flame, Coins } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';

export interface AnonymousTeaserWidgetsProps {
  onSignUpClick: () => void;
  className?: string;
}

type TeaserKey = 'rival' | 'streak' | 'vault';

interface TeaserDef {
  key: TeaserKey;
  icon: React.ReactNode;
  titleKey: string;
  subtitleKey: string;
  accent: string; // tailwind bg/border classes
}

const TEASERS: TeaserDef[] = [
  {
    key: 'rival',
    icon: <Swords className="w-5 h-5" aria-hidden="true" />,
    titleKey: 'landing.teaser.rivalTitle',
    subtitleKey: 'landing.teaser.rivalSubtitle',
    accent: 'bg-neo-pink/10 border-neo-pink/40',
  },
  {
    key: 'streak',
    icon: <Flame className="w-5 h-5" aria-hidden="true" />,
    titleKey: 'landing.teaser.streakTitle',
    subtitleKey: 'landing.teaser.streakSubtitle',
    accent: 'bg-neo-cyan/10 border-neo-cyan/40',
  },
  {
    key: 'vault',
    icon: <Coins className="w-5 h-5" aria-hidden="true" />,
    titleKey: 'landing.teaser.vaultTitle',
    subtitleKey: 'landing.teaser.vaultSubtitle',
    accent: 'bg-neo-lime/10 border-neo-lime/40',
  },
];

export const AnonymousTeaserWidgets: React.FC<AnonymousTeaserWidgetsProps> = memo(
  ({ onSignUpClick, className }) => {
    const { t } = useLanguage();

    const handleKey = useCallback(
      (e: KeyboardEvent<HTMLDivElement>) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSignUpClick();
        }
      },
      [onSignUpClick]
    );

    return (
      <div
        className={cn('flex flex-col gap-3 max-w-4xl mx-auto w-full', className)}
        data-testid="anonymous-teaser-widgets"
      >
        {TEASERS.map((teaser) => (
          <motion.div
            key={teaser.key}
            data-testid={`teaser-${teaser.key}`}
            role="button"
            tabIndex={0}
            aria-label={t(`landing.teaser.${teaser.key}Title`)}
            onClick={onSignUpClick}
            onKeyDown={handleKey}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            className={cn(
              'relative overflow-hidden cursor-pointer select-none',
              'rounded-neo border-neo-thick border-neo-black shadow-hard',
              'p-4 flex items-center justify-between gap-3',
              'transition-all active:shadow-hard-pressed',
              teaser.accent
            )}
          >
            {/* Faded preview icon + copy */}
            <div className="flex items-center gap-3 opacity-70">
              <div className="w-10 h-10 rounded-neo bg-neo-navy-light border-2 border-neo-black flex items-center justify-center text-neo-cream">
                {teaser.icon}
              </div>
              <div className="min-w-0">
                <div className="font-neo-display font-black text-neo-white text-sm uppercase truncate">
                  {t(teaser.titleKey)}
                </div>
                <div className="text-xs text-neo-cream/70 truncate">
                  {t(teaser.subtitleKey)}
                </div>
              </div>
            </div>

            {/* Lock + CTA */}
            <div className="flex items-center gap-2 shrink-0">
              <span className="hidden sm:inline text-xs font-bold text-neo-cream/80 uppercase tracking-wide">
                {t('landing.teaser.signInToUnlock')}
              </span>
              <div className="w-8 h-8 rounded-full bg-neo-black/60 border-2 border-neo-cream/60 flex items-center justify-center">
                <Lock className="w-4 h-4 text-neo-cream" aria-hidden="true" />
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    );
  }
);

AnonymousTeaserWidgets.displayName = 'AnonymousTeaserWidgets';

export default AnonymousTeaserWidgets;
