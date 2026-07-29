/**
 * HubWelcomeBanner — Shown once when a player first reaches the Hub
 * (after completing their first level). Dismissed via close or explore button.
 * Parent controls visibility; this is a pure presentational component.
 */

import { AdaptiveMotion } from '@/components/motion/AdaptiveMotion';
import { Sparkles, X } from 'lucide-react';

interface HubWelcomeBannerProps {
  t: (key: string) => string;
  onDismiss: () => void;
}

export function HubWelcomeBanner({ t, onDismiss }: HubWelcomeBannerProps) {
  return (
    <AdaptiveMotion.div
      data-testid="hub-welcome-banner"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="relative bg-linear-to-r from-neo-cyan to-neo-purple border-3 border-neo-black rounded-neo-lg shadow-hard-lg p-4 mx-4 mb-3"
    >
      <button
        onClick={onDismiss}
        className="absolute top-2 inset-e-2 p-1 text-neo-white hover:text-neo-white"
        aria-label={t('common.close')}
      >
        <X className="w-4 h-4" />
      </button>
      <div className="flex items-start gap-3">
        <Sparkles className="w-6 h-6 text-neo-lime shrink-0 mt-0.5" />
        <div>
          <h3 className="font-neo-display font-bold text-neo-white text-sm uppercase">
            {t('adventure.hubWelcome.title')}
          </h3>
          <p className="text-xs text-neo-white mt-1 font-medium">
            {t('adventure.hubWelcome.description')}
          </p>
          <button
            onClick={onDismiss}
            className="mt-2.5 px-4 py-2 bg-neo-lime text-neo-black font-bold text-xs uppercase rounded-neo border-2 border-neo-black shadow-hard-sm active:shadow-hard-pressed active:translate-y-0.5 transition-all"
          >
            {t('adventure.hubWelcome.exploreButton')}
          </button>
        </div>
      </div>
    </AdaptiveMotion.div>
  );
}
