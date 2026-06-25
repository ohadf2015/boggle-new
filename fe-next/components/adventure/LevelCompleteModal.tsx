/**
 * LevelCompleteModal Component
 *
 * Displays level completion results with stars, score, and objectives summary.
 * Shows celebration effects for perfect scores (3 stars).
 *
 * Rewards/objectives/actions body extracted to LevelCompleteContent.tsx
 * to keep both files under the 500-line limit.
 */

'use client';

import { memo, useEffect, useRef } from 'react';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import { useParticleBudget } from '@/hooks/useParticleBudget';
import { InteractiveMascot, type ExtendedMascotVariant } from '@/components/ui/InteractiveMascot';
import { fireVictoryConfetti } from '@/utils/confettiUtils';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import LevelCompleteContent, { LevelCompleteActions } from './LevelCompleteContent';
import type { LevelObjective, LevelAttempt } from '@/types/adventure';

// ==============================================
// TYPES
// ==============================================

interface LevelCompleteModalProps {
  isOpen: boolean;
  stars: number;
  score: number;
  objectives: LevelObjective[];
  levelNumber: number;
  worldNumber: number;
  isHighScore?: boolean;
  onContinue: () => void;
  onRetry: () => void;
  onExit: () => void;
  totalStars?: number;
  previousBestStars?: number;
  bestAttempt?: LevelAttempt | null;
  xpEarned?: number;
  goldEarned?: number;
  isLastLevelOfWorld?: boolean;
  onNextWorld?: () => void;
  lootDrops?: Array<{ type: string; rarity: string; label?: string }>;
  storyBeatText?: string;
  canRetryFree?: boolean;
  nextLevelPreview?: {
    worldName: string;
    levelNumber: number;
    mechanic?: string;
  } | null;
  bossDefeatShare?: {
    bossId: string;
    bossName: string;
    worldName: string;
    killingWord: string;
    playerName: string;
  } | null;
  saveFailed?: boolean;
  onRetrySave?: () => void;
  /** Words on the board the player didn't find */
  missedWords?: string[];
  /** Best word found (longest) — for share card */
  bestWord?: string;
  /** Total words found — for share card */
  wordsFoundCount?: number;
  /** Streak milestone reached this session, if any */
  streakMilestone?: { days: number; rewardGold: number; titleKey: string } | null;
  /** Mode-specific stats for blast/hunt/wheel completion display */
  modeStats?: { archetype: string; movesRemaining?: number; movesTotal?: number; huntAttempts?: number; huntFound?: boolean; centerLetterWords?: number; totalWords?: number } | null;
}

// ==============================================
// HELPERS
// ==============================================

function getMascotVariantForStars(stars: number): ExtendedMascotVariant {
  if (stars >= 3) return 'victory';
  if (stars >= 2) return 'celebrating';
  if (stars >= 1) return 'happy';
  return 'encouraging';
}

function getBackgroundTint(stars: number): string {
  if (stars >= 3) return 'rgba(255,225,53,0.05)';
  if (stars >= 2) return 'rgba(163,230,53,0.04)';
  if (stars >= 1) return 'rgba(34,211,238,0.03)';
  return 'transparent';
}

// ==============================================
// COMPONENT
// ==============================================

const LevelCompleteModal = memo<LevelCompleteModalProps>(
  ({
    isOpen,
    stars,
    score,
    objectives,
    levelNumber,
    worldNumber,
    isHighScore = false,
    onContinue,
    onRetry,
    onExit,
    totalStars: _totalStars = 0,
    previousBestStars = 0,
    bestAttempt,
    xpEarned,
    goldEarned,
    isLastLevelOfWorld = false,
    onNextWorld,
    lootDrops = [],
    storyBeatText,
    canRetryFree = false,
    nextLevelPreview,
    bossDefeatShare: _bossDefeatShare,
    saveFailed,
    onRetrySave,
    missedWords,
    bestWord,
    wordsFoundCount,
    streakMilestone,
    modeStats,
  }) => {
    const { t } = useLanguage();
    const dialogRef = useRef<HTMLDivElement>(null);
    const isPerfect = stars === 3;
    const isFailed = stars === 0;
    const prefersReducedMotion = usePrefersReducedMotion();
    const particleBudget = useParticleBudget();

    useFocusTrap(dialogRef, isOpen, onExit);

    // Fire victory confetti on mount (only for victory, not defeat)
    useEffect(() => {
      if (isOpen && !isFailed && !prefersReducedMotion) {
        if (particleBudget.combo > 0) {
          fireVictoryConfetti();
        }
      }
    }, [isOpen, isFailed, prefersReducedMotion, particleBudget.combo]);

    // Scroll lock
    useEffect(() => {
      if (!isOpen) return;
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = prev; };
    }, [isOpen]);

    if (!isOpen) return null;

    return (
      <>
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="level-complete-title"
          className={cn(
            'fixed inset-0 z-50',
            'flex items-center justify-center',
            'bg-neo-black/80 backdrop-blur-xs animate-in fade-in-0 duration-300'
          )}
        >
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ backgroundColor: getBackgroundTint(stars) }}
          />

          <div
            className={cn(
              'relative w-full max-w-md mx-4',
              'bg-neo-navy border-4 border-neo-black',
              'rounded-neo shadow-hard-lg',
              'max-h-[90vh] flex flex-col overflow-hidden',
              'animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-2 duration-300'
            )}
          >
            {/* Scrollable content area */}
            <div className="flex-1 min-h-0 overflow-y-auto p-6 md:p-8 pb-0">
              {/* Title */}
              <div
                style={{ animationDelay: '0.1s' }}
                className="mb-2 animate-in fade-in-0 slide-in-from-top-4 duration-300 fill-mode-both"
              >
                <h2
                  id="level-complete-title"
                  className={cn(
                    'text-center text-3xl md:text-4xl font-black uppercase tracking-tight',
                    isFailed ? 'text-neo-red' : isPerfect ? 'text-neo-yellow' : 'text-neo-white'
                  )}
                >
                  {isFailed ? t('adventure.game.tryAgain') : isPerfect
                    ? t('adventure.perfect')
                    : t('adventure.levelComplete')}
                </h2>
              </div>

              {/* Level Badge */}
              <div
                style={{ animationDelay: '0.2s' }}
                className="flex justify-center mb-3 animate-in fade-in-0 zoom-in-95 duration-300 fill-mode-both"
              >
                <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-neo-black/50 border-2 border-neo-white/20 rounded-neo">
                  <span className="text-neo-white text-sm font-bold uppercase">
                    {t('adventure.worldLabel')} {worldNumber}
                  </span>
                  <span className="text-neo-white">|</span>
                  <span className="text-neo-white text-sm font-bold">
                    {t('adventure.level')} {levelNumber}
                  </span>
                </div>
              </div>

              {/* Mascot — smaller on mobile to save space */}
              <div
                style={{ animationDelay: '0.2s' }}
                className="flex justify-center mb-3 animate-in fade-in-0 zoom-in-95 duration-300 fill-mode-both"
              >
                <InteractiveMascot
                  variant={getMascotVariantForStars(stars)}
                  size="lg"
                  animated
                  enableHover={false}
                  enableClick={false}
                />
              </div>

              {/* Perfect Badge */}
              {isPerfect && (
                <p
                  style={{ animationDelay: '0.5s' }}
                  className="text-center text-lg font-black text-neo-yellow mb-3 animate-in fade-in-0 duration-300 fill-mode-both"
                >
                  {t('adventure.game.perfect')}
                </p>
              )}

              {/* Stars */}
              <div className="flex justify-center gap-3 mb-4">
                {[0, 1, 2].map((i) => (
                  <div
                    key={`star-${i}`}
                    style={{ animationDelay: `${0.3 + i * 0.1}s` }}
                    className={cn(
                      'animate-in fade-in-0 zoom-in-95 duration-300 fill-mode-both',
                      i >= stars && 'opacity-50 scale-80'
                    )}
                  >
                    <Star
                      className={cn(
                        'w-12 h-12 md:w-14 md:h-14',
                        i < stars
                          ? 'text-neo-yellow fill-neo-yellow'
                          : 'text-neo-white fill-neo-white/10'
                      )}
                    />
                  </div>
                ))}
              </div>

              {/* Show previous best stars when current attempt earned fewer */}
              {previousBestStars > stars && (
                <div
                  style={{ animationDelay: '0.6s' }}
                  className="flex justify-center items-center gap-1.5 -mt-2 mb-4 animate-in fade-in-0 duration-300 fill-mode-both"
                >
                  <span className="text-neo-white text-xs font-bold uppercase">
                    {t('adventure.bestStars')}:
                  </span>
                  {[0, 1, 2].map((i) => (
                    <Star
                      key={`best-${i}`}
                      className={cn(
                        'w-4 h-4',
                        i < previousBestStars
                          ? 'text-neo-yellow/60 fill-neo-yellow/60'
                          : 'text-neo-white fill-neo-white/5'
                      )}
                    />
                  ))}
                </div>
              )}

              {/* Rewards, Objectives — scrollable body (no action buttons) */}
              <LevelCompleteContent
                stars={stars}
                score={score}
                objectives={objectives}
                worldNumber={worldNumber}
                levelNumber={levelNumber}
                isHighScore={isHighScore}
                isFailed={isFailed}
                onContinue={onContinue}
                onRetry={onRetry}
                onExit={onExit}
                xpEarned={xpEarned}
                goldEarned={goldEarned}
                isLastLevelOfWorld={isLastLevelOfWorld}
                onNextWorld={onNextWorld}
                lootDrops={lootDrops}
                storyBeatText={storyBeatText}
                canRetryFree={canRetryFree}
                nextLevelPreview={nextLevelPreview}
                bossDefeatShare={null}
                bestAttempt={bestAttempt}
                missedWords={missedWords}
                modeStats={modeStats}
                t={t}
              />
            </div>

            {/* Sticky action buttons — always visible */}
            <LevelCompleteActions
              isFailed={isFailed}
              isLastLevelOfWorld={isLastLevelOfWorld}
              onNextWorld={onNextWorld}
              onContinue={onContinue}
              onRetry={onRetry}
              onExit={onExit}
              canRetryFree={canRetryFree}
              stars={stars}
              goldEarned={goldEarned}
              saveFailed={saveFailed}
              onRetrySave={onRetrySave}
              score={score}
              worldNumber={worldNumber}
              levelNumber={levelNumber}
              bestWord={bestWord}
              wordsFound={wordsFoundCount}
              streakMilestone={streakMilestone}
              t={t}
            />
          </div>
        </div>
      </>
    );
  }
);

LevelCompleteModal.displayName = 'LevelCompleteModal';

export default LevelCompleteModal;
