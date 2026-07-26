'use client';

import React, { useState } from 'react';
import { m } from 'framer-motion';
import { Smile, Frown, Heart } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useGameFeedback, type FeedbackRating, type FeedbackSurface } from '@/hooks/useGameFeedback';
import { useExperiment } from '@/hooks/useExperiment';
import { trackGrowthEvent } from '@/utils/growthTracking';
import { cn } from '@/lib/utils';

interface GameFeedbackCardProps {
  isOpen: boolean;
  onClose: () => void;
  surface: FeedbackSurface;
  gameMode?: string;
  /** Gate: only show after rematch CTA is visible. Use eligible to control this. */
  eligible: boolean;
  throttleKey?: string;
}

/**
 * GameFeedbackCard — Post-game sentiment survey ("How was that round?").
 *
 * POLICY: Only shows after rematch CTA is visible (eligible=true).
 * Gated by useGameFeedback:
 *   - Min 2 games played (brand-new users don't rate)
 *   - 3-day cooldown between prompts (don't spam)
 *   - Per-surface de-dupe (don't ask twice same session)
 *
 * Priority: Added to ResultsModals queue with priority=6 (lowest).
 * This ensures modals show in order: celebrations → conversions → word-voting → surveys.
 */
const GameFeedbackCard: React.FC<GameFeedbackCardProps> = ({
  isOpen,
  onClose,
  surface,
  gameMode,
  eligible,
  throttleKey,
}) => {
  const { t } = useLanguage();
  const { shouldShow, recordRating, dismiss } = useGameFeedback({
    surface,
    eligible,
    gameMode,
    throttleKey,
  });

  const { variant: issueProbeVariant } = useExperiment('exp-mp-round-issue-probe-v1');
  const [showingProbe, setShowingProbe] = useState(false);

  if (!isOpen || !shouldShow) return null;

  // exp-mp-round-issue-probe-v1: MP-only follow-up asking WHY a round felt bad.
  const probeArm = issueProbeVariant === 'issue-probe' && surface === 'mp_round';

  const handleRating = (rating: FeedbackRating) => {
    recordRating(rating);
    if (probeArm && (rating === 'bad' || rating === 'ok')) {
      setShowingProbe(true);
      return;
    }
    onClose();
  };

  const handleProbeSelect = (issue: 'bots_too_strong' | 'technical_issue') => {
    trackGrowthEvent('mp_round_issue_selected', { issue, gameMode });
    onClose();
  };

  const handleDismiss = () => {
    dismiss();
    onClose();
  };

  return (
    <m.div
      initial={{ opacity: 0, scale: 0.95, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: 20 }}
      transition={{ type: 'spring', damping: 25, stiffness: 350 }}
      className="fixed inset-0 z-40 flex items-center justify-center pointer-events-none"
    >
      <div
        onClick={handleDismiss}
        className="absolute inset-0 bg-black/20 backdrop-blur-sm pointer-events-auto"
      />

      <m.div
        onClick={(e) => e.stopPropagation()}
        className="relative z-50 w-full max-w-sm mx-4 p-6 rounded-2xl bg-neo-navy border-4 border-black shadow-hard-lg pointer-events-auto"
      >
        {showingProbe ? (
          <>
            <h3 className="text-xl font-neo-display font-black text-neo-white text-center mb-6">
              {t('gameFeedback.issueProbe.prompt')}
            </h3>
            <div className="grid gap-3">
              {(
                [
                  ['bots_too_strong', 'gameFeedback.issueProbe.botsStrong'],
                  ['technical_issue', 'gameFeedback.issueProbe.technical'],
                ] as const
              ).map(([issue, key]) => (
                <m.button
                  key={issue}
                  type="button"
                  onClick={() => handleProbeSelect(issue)}
                  whileTap={{ scale: 0.95 }}
                  className="w-full p-3 rounded-lg border-3 border-black font-bold bg-neo-cyan text-neo-navy hover:bg-neo-cyan/80 shadow-hard-sm"
                >
                  {t(key)}
                </m.button>
              ))}
            </div>
          </>
        ) : (
          <>
        {/* Header */}
        <div className="text-center mb-6">
          <h3 className="text-2xl font-neo-display font-black text-neo-white mb-2">
            {t('gameFeedback.prompt')}
          </h3>
          <p className="text-sm text-gray-400">
            {t('gameFeedback.thanks')}
          </p>
        </div>

        {/* Rating buttons */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <m.button
            type="button"
            onClick={() => handleRating('bad')}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={cn(
              'flex flex-col items-center gap-2 p-3 rounded-lg border-3 border-black font-bold transition-all',
              'bg-neo-navy hover:bg-neo-navy/80 text-neo-white shadow-hard-sm',
            )}
          >
            <Frown size={24} />
            <span className="text-xs">{t('gameFeedback.bad')}</span>
          </m.button>

          <m.button
            type="button"
            onClick={() => handleRating('ok')}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={cn(
              'flex flex-col items-center gap-2 p-3 rounded-lg border-3 border-black font-bold transition-all',
              'bg-neo-cyan text-neo-navy hover:bg-neo-cyan/80 shadow-hard-sm',
            )}
          >
            <Smile size={24} />
            <span className="text-xs">{t('gameFeedback.ok')}</span>
          </m.button>

          <m.button
            type="button"
            onClick={() => handleRating('great')}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={cn(
              'flex flex-col items-center gap-2 p-3 rounded-lg border-3 border-black font-bold transition-all',
              'bg-neo-lime text-neo-navy hover:bg-neo-lime/80 shadow-hard-sm',
            )}
          >
            <Heart size={24} />
            <span className="text-xs">{t('gameFeedback.great')}</span>
          </m.button>
        </div>

        {/* Dismiss link */}
        <button
          type="button"
          onClick={handleDismiss}
          className="w-full text-center text-xs text-gray-500 hover:text-gray-300 transition-colors py-2"
        >
          {t('gameFeedback.dismiss')}
        </button>
          </>
        )}
      </m.div>
    </m.div>
  );
};

export default GameFeedbackCard;
