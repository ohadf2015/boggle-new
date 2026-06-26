/**
 * RetryAssistModal Component
 *
 * Displays helpful retry options when players are struggling with a level.
 * Progressive assistance unlocks after multiple failures to prevent frustration.
 */

'use client';

import React, { memo, useRef, useEffect } from 'react';
import { RotateCcw, Clock, Lightbulb, LogOut, Target } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { useRewardedAd } from '@/hooks/useRewardedAd';
import { trackRewardedAdOffered } from '@/utils/growthTracking';
import type { NearMissMessage } from '@/lib/adventure/nearMiss';
import type { LevelObjective } from '@/types/adventure/level';

// ==============================================
// TYPES
// ==============================================

interface RetryAssistModalProps {
  /** Whether modal is visible */
  isOpen: boolean;
  /** Number of consecutive failures */
  consecutiveFailures: number;
  /** Best words found in any attempt */
  bestWords: number;
  /** Best score achieved in any attempt */
  bestScore: number;
  /** Total number of attempts */
  attemptCount: number;
  /** Standard retry callback */
  onRetry: () => void;
  /** Retry with bonus time callback */
  onRetryWithBonus: () => void;
  /** Retry with starting hint callback */
  onRetryWithHint: () => void;
  /** Exit to menu callback */
  onExit: () => void;
  /** Near-miss feedback messages (optional) */
  nearMissMessages?: NearMissMessage[];
  /**
   * F5 — failed-attempt objective state. Renders one progress bar per
   * incomplete objective so the player sees which goal they were short on.
   */
  objectives?: LevelObjective[];
}

// ==============================================
// CONSTANTS
// ==============================================

/** Failures required to unlock bonus time assist */
const BONUS_TIME_THRESHOLD = 2;

/** Failures required to unlock starting hint assist */
const HINT_ASSIST_THRESHOLD = 3;

// ==============================================
// COMPONENT
// ==============================================

const RetryAssistModal = memo<RetryAssistModalProps>(
  ({
    isOpen,
    consecutiveFailures,
    bestWords,
    bestScore,
    attemptCount,
    onRetry,
    onRetryWithBonus,
    onRetryWithHint,
    onExit,
    nearMissMessages,
    objectives,
  }) => {
    const { t } = useLanguage();
    const dialogRef = useRef<HTMLDivElement>(null);
    useFocusTrap(dialogRef, isOpen, onExit);

    // R4 — rewarded ad grants bonus-time retry without failure threshold.
    // rewardKind='feature' so the bonus-retry is the SOLE reward (no extra coin payout).
    const rewarded = useRewardedAd({
      rewardKind: 'feature',
      surface: 'retry',
      onRewardEarned: () => onRetryWithBonus(),
    });

    // Fire offered-event each time the modal opens with CTA visible.
    useEffect(() => {
      if (isOpen && rewarded.canShowAd && !rewarded.isDailyLimitReached) {
        trackRewardedAdOffered('retry_assist');
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen]);

    // Determine which assists are unlocked
    const showBonusTime = consecutiveFailures >= BONUS_TIME_THRESHOLD;
    const showHintAssist = consecutiveFailures >= HINT_ASSIST_THRESHOLD;

    // F5 — only incomplete objectives are shown; completed ones are the gap-free part.
    const incompleteObjectives = (objectives ?? []).filter(
      (o) => !o.isComplete && o.target > 0
    );

    return (
      <>
        {isOpen && (
          <div
            data-testid="retry-assist-modal"
            role="dialog"
            aria-modal="true"
            aria-label={t('adventure.game.retryOptions')}
            className={cn(
              'fixed inset-0 z-50',
              'flex items-center justify-center',
              'bg-neo-black/80 backdrop-blur-xs',
              'p-4',
              'animate-in fade-in-0 duration-300'
            )}
          >
            <div
              ref={dialogRef}
              className={cn(
                'w-full max-w-md',
                'bg-neo-navy border-3 border-neo-black rounded-neo',
                'shadow-hard-lg',
                'overflow-hidden',
                'animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-2 duration-300'
              )}
            >
              {/* Header */}
              <div
                className={cn(
                  'p-6 text-center',
                  'bg-linear-to-br from-neo-orange/20 to-neo-pink/20',
                  'border-b-3 border-neo-black/30'
                )}
              >
                <h2 className="text-2xl font-black text-neo-white mb-2">
                  {t('adventure.retry.title')}
                </h2>
                <p className="text-neo-white">
                  {t('adventure.retry.subtitle')}
                </p>
              </div>

              {/* Stats */}
              <div className="p-4 border-b-2 border-neo-black/20">
                <p className="text-xs font-bold text-neo-white uppercase tracking-wide mb-3">
                  {t('adventure.retry.yourProgress')}
                </p>
                <div className="grid grid-cols-3 gap-3">
                  {/* Best Words */}
                  <div
                    className={cn(
                      'p-3 rounded-neo',
                      'bg-neo-black/30 border-2 border-neo-cyan/30',
                      'text-center'
                    )}
                  >
                    <p className="text-xl font-black text-neo-cyan">{bestWords}</p>
                    <p className="text-xs text-neo-white">
                      {t('adventure.retry.bestWords')}
                    </p>
                  </div>

                  {/* Best Score */}
                  <div
                    className={cn(
                      'p-3 rounded-neo',
                      'bg-neo-black/30 border-2 border-neo-lime/30',
                      'text-center'
                    )}
                  >
                    <p className="text-xl font-black text-neo-lime">{bestScore}</p>
                    <p className="text-xs text-neo-white">
                      {t('adventure.retry.bestScore')}
                    </p>
                  </div>

                  {/* Attempts */}
                  <div
                    className={cn(
                      'p-3 rounded-neo',
                      'bg-neo-black/30 border-2 border-neo-orange/30',
                      'text-center'
                    )}
                  >
                    <p className="text-xl font-black text-neo-orange">{attemptCount}</p>
                    <p className="text-xs text-neo-white">
                      {t('adventure.retry.attempts')}
                    </p>
                  </div>
                </div>
              </div>

              {/* F5 — Objective progress bars: shows the player which goals they were short on. */}
              {incompleteObjectives.length > 0 && (
                <div
                  data-testid="objective-progress-section"
                  className="px-4 py-3 border-b-2 border-neo-black/20"
                >
                  <p className="text-xs font-bold text-neo-white uppercase tracking-wide mb-2">
                    {t('adventure.retry.objectiveProgress')}
                  </p>
                  <ul className="space-y-2">
                    {incompleteObjectives.map((obj) => {
                      const current = Math.max(0, Math.min(obj.current ?? 0, obj.target));
                      const pct = Math.round((current / obj.target) * 100);
                      const label = t(`adventure.objectives.${obj.type}`);
                      return (
                        <li key={obj.type}>
                          <div className="flex items-baseline justify-between mb-1">
                            <span className="text-sm font-bold text-neo-white">{label}</span>
                            <span className="text-xs font-mono text-neo-white">
                              {current} / {obj.target}
                            </span>
                          </div>
                          <div
                            role="progressbar"
                            aria-label={label}
                            aria-valuenow={current}
                            aria-valuemin={0}
                            aria-valuemax={obj.target}
                            className="h-2 w-full overflow-hidden rounded-full bg-neo-black/40 border border-neo-black/40"
                          >
                            <div
                              className="h-full bg-neo-cyan transition-[width] duration-300"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              {/* Near-Miss Encouragement */}
              {nearMissMessages && nearMissMessages.length > 0 && (
                <div
                  data-testid="near-miss-section"
                  className="px-4 py-3 border-b-2 border-neo-black/20 bg-neo-purple/10"
                >
                  <p className="text-xs font-bold text-neo-purple uppercase tracking-wide mb-2 flex items-center gap-1.5">
                    <Target className="w-3.5 h-3.5" />
                    {t('adventure.retry.nearMissTitle')}
                  </p>
                  <ul className="space-y-1">
                    {nearMissMessages.map((msg) => (
                      <li key={msg.type} className="text-sm text-neo-white font-medium">
                        {t(msg.translationKey, msg.params as Record<string, string | number>)}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Action Buttons */}
              <div className="p-4 space-y-3">
                {/* R4 — Rewarded retry (bonus time via ad) */}
                {rewarded.canShowAd && !rewarded.isDailyLimitReached && (
                  <button
                    type="button"
                    data-testid="rewarded-retry-btn"
                    onClick={() => rewarded.showAd()}
                    disabled={rewarded.status === 'loading' || rewarded.status === 'showing'}
                    className={cn(
                      'w-full py-3 px-4',
                      'flex items-center justify-center gap-2',
                      'bg-neo-purple text-neo-white',
                      'font-black text-sm uppercase',
                      'border-3 border-neo-black rounded-neo',
                      'shadow-hard hover:-translate-y-0.5 transition-all',
                      'disabled:opacity-50 disabled:cursor-not-allowed'
                    )}
                  >
                    <Clock className="w-4 h-4" />
                    {t('adventure.retry.watchAdForBonus')}
                  </button>
                )}

                {/* Try Again - Always visible */}
                <button
                  type="button"
                  onClick={onRetry}
                  className={cn(
                    'w-full py-3 px-4',
                    'flex items-center justify-center gap-3',
                    'bg-neo-lime text-neo-black',
                    'font-black text-lg',
                    'border-3 border-neo-black rounded-neo',
                    'shadow-hard hover:shadow-hard-lg hover:-translate-y-0.5',
                    'active:translate-y-0.5 active:shadow-hard-pressed',
                    'transition-all duration-200'
                  )}
                >
                  <RotateCcw className="w-5 h-5" />
                  {t('adventure.retry.tryAgain')}
                </button>

                {/* Bonus Time - After 2+ failures */}
                {showBonusTime && (
                  <button
                    type="button"
                    onClick={onRetryWithBonus}
                    className={cn(
                      'w-full py-3 px-4',
                      'flex flex-col items-center gap-1',
                      'bg-neo-cyan/20 text-neo-cyan',
                      'font-bold',
                      'border-2 border-neo-cyan/50 rounded-neo',
                      'hover:bg-neo-cyan/30 hover:border-neo-cyan',
                      'transition-all duration-200'
                    )}
                  >
                    <span className="flex items-center gap-2">
                      <Clock className="w-5 h-5" />
                      {t('adventure.retry.bonusTime')}
                    </span>
                    <span className="text-xs text-neo-cyan/70">
                      {t('adventure.retry.bonusTimeDesc')}
                    </span>
                  </button>
                )}

                {/* Start with Hint - After 3+ failures */}
                {showHintAssist && (
                  <button
                    type="button"
                    onClick={onRetryWithHint}
                    className={cn(
                      'w-full py-3 px-4',
                      'flex flex-col items-center gap-1',
                      'bg-neo-yellow/20 text-neo-yellow',
                      'font-bold',
                      'border-2 border-neo-yellow/50 rounded-neo',
                      'hover:bg-neo-yellow/30 hover:border-neo-yellow',
                      'transition-all duration-200'
                    )}
                  >
                    <span className="flex items-center gap-2">
                      <Lightbulb className="w-5 h-5" />
                      {t('adventure.retry.startWithHint')}
                    </span>
                    <span className="text-xs text-neo-yellow/70">
                      {t('adventure.retry.startWithHintDesc')}
                    </span>
                  </button>
                )}

                {/* Exit */}
                <button
                  type="button"
                  onClick={onExit}
                  className={cn(
                    'w-full py-2 px-4',
                    'flex items-center justify-center gap-2',
                    'bg-transparent text-neo-white',
                    'font-medium text-sm',
                    'border border-neo-white/20 rounded-neo',
                    'hover:text-neo-white hover:border-neo-white/40',
                    'transition-all duration-200'
                  )}
                >
                  <LogOut className="w-4 h-4 rtl:scale-x-[-1]" />
                  {t('common.exit')}
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }
);

RetryAssistModal.displayName = 'RetryAssistModal';

export default RetryAssistModal;
