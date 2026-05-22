'use client';

import React, { useState } from 'react';
import { X } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  useRoundFeedback,
  type RoundRating,
  type UseRoundFeedbackArgs,
} from '@/hooks/useRoundFeedback';

/**
 * RoundFeedback — compact "how was that round?" card for the MP results screen.
 *
 * One tap on an emoji reports round sentiment to PostHog (see useRoundFeedback),
 * then collapses into a brief thank-you. Dismissible. Shows at most once per
 * room. CSS-only entrance (no framer-motion) keeps it test- and bundle-light.
 */

const RATINGS: ReadonlyArray<{ key: RoundRating; emoji: string; labelKey: string }> = [
  { key: 'bad', emoji: '😕', labelKey: 'roundFeedback.bad' },
  { key: 'ok', emoji: '😐', labelKey: 'roundFeedback.ok' },
  { key: 'great', emoji: '🤩', labelKey: 'roundFeedback.great' },
];

export type RoundFeedbackProps = UseRoundFeedbackArgs;

export const RoundFeedback: React.FC<RoundFeedbackProps> = (props) => {
  const { t } = useLanguage();
  const { shouldShow, recordRating, dismiss } = useRoundFeedback(props);
  const [phase, setPhase] = useState<'prompt' | 'thanks'>('prompt');
  const [hidden, setHidden] = useState(false);

  if (!shouldShow || hidden) return null;

  const handleRate = (rating: RoundRating) => {
    recordRating(rating);
    setPhase('thanks');
    if (typeof window !== 'undefined') {
      window.setTimeout(() => setHidden(true), 1600);
    }
  };

  const handleDismiss = () => {
    dismiss();
    setHidden(true);
  };

  return (
    <div
      data-testid="round-feedback"
      className="relative border-2 border-black rounded-neo bg-neo-navy-light shadow-hard-sm px-4 py-3 animate-neo-pop"
    >
      {phase === 'prompt' ? (
        <>
          <div className="flex items-center justify-between gap-2">
            <span className="font-neo-body font-semibold text-neo-cream text-sm">
              {t('roundFeedback.prompt')}
            </span>
            <button
              type="button"
              aria-label={t('roundFeedback.dismiss')}
              onClick={handleDismiss}
              className="shrink-0 w-7 h-7 flex items-center justify-center rounded-neo text-neo-cream/50 hover:text-neo-cream hover:bg-neo-white/10 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="mt-2 flex items-center justify-center gap-3">
            {RATINGS.map((r) => (
              <button
                key={r.key}
                type="button"
                aria-label={t(r.labelKey)}
                onClick={() => handleRate(r.key)}
                className="w-12 h-12 flex items-center justify-center text-2xl border-2 border-black rounded-neo bg-neo-navy shadow-hard-sm hover:shadow-hard active:shadow-hard-pressed hover:-translate-y-0.5 active:translate-y-0 transition-all"
              >
                <span aria-hidden="true">{r.emoji}</span>
              </button>
            ))}
          </div>
        </>
      ) : (
        <div className="flex items-center justify-center gap-2 py-1">
          <span aria-hidden="true" className="text-xl">
            🎉
          </span>
          <span className="font-neo-body font-semibold text-neo-lime text-sm">
            {t('roundFeedback.thanks')}
          </span>
        </div>
      )}
    </div>
  );
};

export default RoundFeedback;
