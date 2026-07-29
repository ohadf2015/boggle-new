'use client';

import React, { useState } from 'react';
import { X } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  useGameFeedback,
  type FeedbackRating,
  type UseGameFeedbackArgs,
} from '@/hooks/useGameFeedback';

/**
 * GameFeedback — compact "how was that?" card for end-of-game surfaces.
 *
 * One tap on an emoji reports sentiment to PostHog as `game_feedback` (tagged
 * with the surface), then collapses into a brief thank-you. Dismissible. The
 * shared anti-annoyance budget (see useGameFeedback / feedbackThrottle) means a
 * player sees this at most once every few days, never on their first game, and
 * never twice for the same surface in a session. CSS-only entrance keeps the
 * unit test- and bundle-light.
 */

const RATINGS: ReadonlyArray<{ key: FeedbackRating; emoji: string; labelKey: string }> = [
  { key: 'bad', emoji: '😕', labelKey: 'gameFeedback.bad' },
  { key: 'ok', emoji: '😐', labelKey: 'gameFeedback.ok' },
  { key: 'great', emoji: '🤩', labelKey: 'gameFeedback.great' },
];

export type GameFeedbackProps = UseGameFeedbackArgs;

export const GameFeedback: React.FC<GameFeedbackProps> = (props) => {
  const { t } = useLanguage();
  const { shouldShow, recordRating, dismiss } = useGameFeedback(props);
  const [phase, setPhase] = useState<'prompt' | 'thanks'>('prompt');
  const [hidden, setHidden] = useState(false);

  if (!shouldShow || hidden) return null;

  const handleRate = (rating: FeedbackRating) => {
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
      data-testid="game-feedback"
      className="relative border-2 border-black rounded-neo bg-neo-navy-light shadow-hard-sm px-4 py-3 animate-neo-pop"
    >
      {phase === 'prompt' ? (
        <>
          <div className="flex items-center justify-between gap-2">
            <span className="font-neo-body font-semibold text-neo-white text-sm">
              {t('gameFeedback.prompt')}
            </span>
            <button
              type="button"
              aria-label={t('gameFeedback.dismiss')}
              onClick={handleDismiss}
              className="shrink-0 w-7 h-7 flex items-center justify-center rounded-neo text-neo-white hover:text-neo-white hover:bg-neo-white/10 transition-colors"
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
            {t('gameFeedback.thanks')}
          </span>
        </div>
      )}
    </div>
  );
};

export default GameFeedback;
