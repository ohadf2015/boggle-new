'use client';

import { type ComponentType } from 'react';
import {
  Trophy, Star, Sparkles, Waves, Flag, Link as LinkIcon, Crown,
  BookOpen, Target, TrendingUp, Award, Zap, LayoutGrid,
} from 'lucide-react';
import { AdaptiveMotion } from '@/components/motion/AdaptiveMotion';
import { Button } from '@/components/ui/button';
import { MobileTooltip } from '@/components/ui/MobileTooltip';
import { cn } from '@/lib/utils';
import { useBlastBadgeUnlocks } from './hooks/useBlastBadgeUnlocks';
import { BlastBragCard } from './BlastBragCard';
import { getMascotForResults, MASCOT_IMAGES } from './utils/blastMascot';
import { computeFailReason } from './utils/computeFailReason';
import type { BlastResultsData } from './types';

type IconType = ComponentType<{ className?: string; strokeWidth?: number }>;

const BADGE_ICONS: Record<string, IconType> = {
  Sparkles, Waves, Flag, Link: LinkIcon, Crown, BookOpen, Target, Trophy,
};

interface BlastResultsSummaryProps {
  results: BlastResultsData;
  t: (key: string, vars?: Record<string, string | number> | string) => string;
  onPlayAgain: () => void;
  onQuit: () => void;
}

export function BlastResultsSummary({
  results, t, onPlayAgain, onQuit,
}: BlastResultsSummaryProps) {
  const badges = useBlastBadgeUnlocks({ results, t });

  const mascotKey = getMascotForResults(results);
  const mascotSrc = MASCOT_IMAGES[mascotKey];

  const pbDelta =
    results.previousBest != null && results.finalScore > results.previousBest
      ? results.finalScore - results.previousBest
      : null;
  const isNewRecord = pbDelta != null;
  const bestWave = results.bestWave
    ?? (results.waveResults.length > 0
      ? results.waveResults.reduce((a, b) => (b.score > a.score ? b : a))
      : null);

  // Derived skill stats from words found
  const wordCount = results.wordsFound.length;
  const avgLength = wordCount > 0
    ? Math.round(results.wordsFound.reduce((s, w) => s + w.length, 0) / wordCount * 10) / 10
    : 0;
  const longWords = results.wordsFound.filter(w => w.length >= 6).length;

  // Top words for chip display — sort by length desc, take top 8
  const topWords = [...results.wordsFound]
    .sort((a, b) => b.length - a.length)
    .slice(0, 8);

  // Fail signal mirrors advance gate in useBlastGameEnd.ts (clearPct >= 90)
  const didFail = results.clearPercentage < 90;
  // Sprint 1 clarity guard: concrete "N tiles short" reads sharper than a
  // bare percent. Falls back to needClearPct copy when shortfall is unknown.
  const failReason = computeFailReason({
    tilesCleared: results.tilesCleared,
    totalTiles: results.totalTiles,
  });

  return (
    <div
      className="flex-1 flex flex-col w-full max-w-md mx-auto min-h-0"
      data-testid="blast-results-summary"
      data-fail={didFail ? 'true' : 'false'}
    >
      <div className="flex-1 overflow-y-auto px-4 pt-6 pb-4 flex flex-col items-center gap-4">
      {/* Mascot */}
      <AdaptiveMotion.div
        initial={{ scale: 0, rotate: -10, opacity: 0 }}
        animate={{ scale: 1, rotate: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 380, damping: 18 }}
        className="relative w-24 h-24 rounded-neo border-3 border-neo-black shadow-hard-lg overflow-hidden bg-neo-navy-light"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={mascotSrc}
          alt={t(`blast.mascot.${mascotKey}`)}
          data-testid="blast-results-mascot"
          data-mascot-key={mascotKey}
          className="w-full h-full object-cover"
        />
      </AdaptiveMotion.div>

      {/* Header + star rating */}
      <div className="flex flex-col items-center gap-1.5">
        <AdaptiveMotion.h2
          initial={{ scale: 0.6, opacity: 0, y: -10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 380, damping: 22 }}
          className={cn(
            'text-3xl font-black uppercase font-neo-display tracking-wider drop-shadow-[3px_3px_0_#000]',
            didFail ? 'text-neo-red' : 'text-neo-pink',
          )}
        >
          {didFail ? t('blast.results.waveFailed') : t('blast.gameOver')}
        </AdaptiveMotion.h2>
        {!didFail && (
          <StarRating stars={results.stars} label={t(`blast.stars${results.stars}`)} />
        )}
      </div>

      {/* Fail banner — shown when player didn't hit the 90% advance threshold */}
      {didFail && (
        <AdaptiveMotion.div
          initial={{ scale: 0.85, opacity: 0, y: -4 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 380, damping: 20, delay: 0.05 }}
          className={cn(
            'w-full flex flex-col items-center gap-1 px-4 py-3',
            'rounded-neo border-3 border-neo-black shadow-hard',
            'bg-neo-red/90 text-white',
          )}
          data-testid="blast-results-fail-banner"
        >
          <p
            className="font-neo-display font-black uppercase tracking-wider text-sm"
            data-testid="blast-fail-reason"
          >
            {failReason.kind === 'tiles_short'
              ? t('blast.results.tilesShort', { count: failReason.tilesShort })
              : t('blast.results.needClearPct', { required: 90, got: results.clearPercentage })}
          </p>
          <p className="text-[11px] uppercase tracking-wider font-bold text-white">
            {t('blast.results.failHint')}
          </p>
          {results.targetWord && !results.targetWordFound && (
            <p
              data-testid="blast-target-word-missed"
              className="mt-1 text-[11px] uppercase tracking-wider font-bold text-white"
            >
              {t('blast.objective.targetWordMissed', { word: results.targetWord })}
            </p>
          )}
        </AdaptiveMotion.div>
      )}

      {/* Target-word acknowledgement on success */}
      {!didFail && results.targetWord && results.targetWordFound && (
        <AdaptiveMotion.div
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 380, damping: 20, delay: 0.05 }}
          className={cn(
            'inline-flex items-center gap-2 px-3 py-1.5',
            'rounded-neo border-3 border-neo-black shadow-hard',
            'bg-neo-lime text-neo-black',
            'font-neo-display font-black uppercase tracking-wider text-xs',
          )}
          data-testid="blast-target-word-found"
        >
          {t('blast.objective.targetWordFoundIt')} {results.targetWord}
        </AdaptiveMotion.div>
      )}

      {/* Target-word missed but wave succeeded — positive frame so player feels
          informed, not robbed. Mirrors LLM consensus: cascades that clear the
          target should read as a friendly assist, not a stolen win. */}
      {!didFail && results.targetWord && !results.targetWordFound && (
        <AdaptiveMotion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 380, damping: 22, delay: 0.05 }}
          className={cn(
            'inline-flex items-center gap-2 px-3 py-1.5',
            'rounded-neo border-2 border-neo-black/30',
            'bg-neo-navy-light text-neo-white',
            'font-neo-body font-bold text-xs',
          )}
          data-testid="blast-target-word-cascade-credit"
        >
          {t('blast.objective.targetWordMissed', { word: results.targetWord })}
        </AdaptiveMotion.div>
      )}

      {/* Score card */}
      <AdaptiveMotion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 380, damping: 22, delay: 0.05 }}
        className={cn(
          'w-full rounded-neo border-3 border-neo-black shadow-hard-lg p-5 text-center',
          'bg-linear-to-br from-neo-navy-light via-neo-navy to-neo-navy-light',
        )}
        data-testid="blast-results-score-card"
      >
        {isNewRecord && (
          <AdaptiveMotion.div
            initial={{ scale: 0, rotate: -8 }}
            animate={{ scale: 1, rotate: -4 }}
            transition={{ type: 'spring', stiffness: 380, damping: 14, delay: 0.4 }}
            className={cn(
              'inline-flex items-center gap-1.5 px-3 py-1 mb-2',
              'rounded-neo border-3 border-neo-black shadow-hard',
              'bg-linear-to-r from-neo-lime via-yellow-300 to-neo-lime',
              'font-neo-display font-black uppercase tracking-wider text-xs text-neo-black',
            )}
          >
            <Sparkles className="w-3.5 h-3.5" strokeWidth={2.75} />
            {t('blast.results.newRecord')}
          </AdaptiveMotion.div>
        )}
        <p className="text-6xl font-black text-white tabular-nums font-neo-display drop-shadow-[2px_2px_0_#000]">
          {results.finalScore.toLocaleString()}
        </p>
        <p className="text-xs uppercase tracking-widest text-white mt-1 font-bold">
          {results.wordsFound.length} {t('blast.wordsFound')} &middot;{' '}
          {results.wavesCompleted} {t('blast.waves')}
        </p>
        {pbDelta != null && (
          <p className="mt-2 text-sm font-black text-neo-lime tabular-nums flex items-center justify-center gap-1">
            <TrendingUp className="w-4 h-4" strokeWidth={2.75} />
            {t('blast.results.pbDelta', { delta: pbDelta.toLocaleString() })}
          </p>
        )}
        {/* Tiles cleared progress bar */}
        <div className="mt-3 pt-3 border-t border-white/10">
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-[10px] uppercase tracking-wider font-bold text-white">
              {t('blast.results.tilesCleared')}
            </span>
            <span className="text-[11px] font-black text-neo-cyan tabular-nums">
              {results.tilesCleared}/{results.totalTiles} &middot; {results.clearPercentage}%
            </span>
          </div>
          <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden border border-white/10">
            <AdaptiveMotion.div
              initial={{ width: 0 }}
              animate={{ width: `${results.clearPercentage}%` }}
              transition={{ duration: 0.8, delay: 0.2, ease: 'easeOut' }}
              className={cn(
                'h-full rounded-full',
                results.clearPercentage >= 90 ? 'bg-neo-lime' :
                results.clearPercentage >= 60 ? 'bg-neo-cyan' : 'bg-neo-pink',
              )}
            />
          </div>
        </div>
      </AdaptiveMotion.div>

      {/* Brag card */}
      <BlastBragCard results={results} t={t} />

      {/* Best-moment grid */}
      <AdaptiveMotion.div
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 380, damping: 22, delay: 0.15 }}
        className={cn(
          'w-full grid grid-cols-3 gap-2 p-3',
          'rounded-neo border-3 border-neo-black shadow-hard',
          'bg-neo-navy-light',
        )}
        data-testid="blast-results-moments"
      >
        {bestWave && (
          <BestMomentCell
            icon={Award}
            label={t('blast.results.bestWave')}
            value={t('blast.results.wave', { n: String(bestWave.waveNumber) })}
            sub={`${bestWave.score.toLocaleString()}`}
            tint="text-neo-lime"
          />
        )}
        <BestMomentCell
          icon={Zap}
          label={t('blast.results.biggestCombo')}
          value={`x${results.maxCombo}`}
          tint="text-neo-pink"
        />
        {results.bestWord && (
          <BestMomentCell
            icon={Star}
            label={t('blast.results.bestWord')}
            value={results.bestWord.toUpperCase()}
            tint="text-neo-cyan"
          />
        )}
      </AdaptiveMotion.div>

      {/* Wave breakdown */}
      {results.waveResults.length > 0 && (
        <AdaptiveMotion.div
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="w-full"
          data-testid="blast-results-wave-breakdown"
        >
          <p className="text-[10px] uppercase tracking-widest font-bold text-white mb-2 px-1">
            {t('blast.waveBreakdown')}
          </p>
          <div className="flex flex-col gap-1.5">
            {results.waveResults.map((wave) => {
              const isBest = bestWave?.waveNumber === wave.waveNumber;
              const pct = wave.clearPercentage;
              return (
                <div
                  key={wave.waveNumber}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 rounded-neo border-2',
                    isBest
                      ? 'border-neo-lime bg-neo-lime/10'
                      : 'border-white/10 bg-neo-navy',
                  )}
                >
                  <span className={cn(
                    'font-neo-display font-black text-xs min-w-[48px]',
                    isBest ? 'text-neo-lime' : 'text-white',
                  )}>
                    {t('blast.results.wave', { n: String(wave.waveNumber) })}
                  </span>
                  <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className={cn('h-full rounded-full', isBest ? 'bg-neo-lime' : 'bg-neo-cyan/60')}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="font-black text-xs text-white tabular-nums min-w-[44px] text-right">
                    {wave.score.toLocaleString()}
                  </span>
                  <span className="text-[10px] text-white tabular-nums min-w-[30px] text-right">
                    {pct}%
                  </span>
                </div>
              );
            })}
          </div>
        </AdaptiveMotion.div>
      )}

      {/* Skill stats */}
      <AdaptiveMotion.div
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.25 }}
        className="w-full"
        data-testid="blast-results-skills"
      >
        <p className="text-[10px] uppercase tracking-widest font-bold text-white mb-2 px-1">
          {t('blast.skillBreakdown')}
        </p>
        <div className="grid grid-cols-2 gap-2">
          <SkillCell icon={LayoutGrid} label={t('blast.skillBoardClear')} value={`${results.clearPercentage}%`} tint="text-neo-cyan" />
          <SkillCell icon={Zap} label={t('blast.skillLongWords')} value={`${longWords}`} tint="text-neo-pink" />
          <SkillCell icon={BookOpen} label={t('blast.skillAvgLength')} value={`${avgLength}`} tint="text-neo-lime" />
          <SkillCell icon={Trophy} label={t('blast.results.biggestCombo')} value={`x${results.maxCombo}`} tint="text-yellow-400" />
        </div>
      </AdaptiveMotion.div>

      {/* Words found chips */}
      {topWords.length > 0 && (
        <AdaptiveMotion.div
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="w-full"
          data-testid="blast-results-words"
        >
          <p className="text-[10px] uppercase tracking-widest font-bold text-white mb-2 px-1">
            {t('blast.foundWords')} ({wordCount})
          </p>
          <div className="flex flex-wrap gap-1.5">
            {topWords.map((word) => (
              <span
                key={word}
                className={cn(
                  'px-2.5 py-1 rounded-neo border-2 border-neo-black shadow-hard-sm',
                  'font-neo-display font-black uppercase text-[11px] tracking-wide',
                  word.length >= 6 ? 'bg-neo-lime text-neo-black' :
                  word.length >= 4 ? 'bg-neo-navy text-neo-cyan border-neo-cyan/40' :
                  'bg-neo-navy text-white border-white/10',
                )}
              >
                {word}
              </span>
            ))}
            {wordCount > 8 && (
              <span className="px-2.5 py-1 text-[11px] text-white font-bold">
                +{wordCount - 8}
              </span>
            )}
          </div>
        </AdaptiveMotion.div>
      )}

      {/* Achievement ribbon */}
      {badges.length > 0 && (
        <AdaptiveMotion.div
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.35 }}
          className="w-full"
          data-testid="blast-results-badges"
        >
          <p className="text-[10px] uppercase tracking-widest font-bold text-white mb-2 px-1">
            {t('blast.results.badgesEarned')}
          </p>
          <div className="flex flex-wrap gap-2">
              {badges.map((badge, i) => {
                const Icon = BADGE_ICONS[badge.icon] ?? Sparkles;
                return (
                  <MobileTooltip
                    key={badge.id}
                    side="top"
                    delayDuration={150}
                    contentClassName="max-w-[220px] text-center"
                    content={
                      <>
                        <p className="font-neo-display font-black uppercase text-[11px] text-neo-pink">
                          {badge.label}
                        </p>
                        <p className="text-xs mt-0.5">{badge.desc}</p>
                      </>
                    }
                  >
                      <AdaptiveMotion.button
                        type="button"
                        initial={{ scale: 0, rotate: -180 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{
                          type: 'spring', stiffness: 380, damping: 16,
                          delay: 0.4 + i * 0.08,
                        }}
                        className={cn(
                          'relative flex items-center gap-1.5 px-3 py-2 cursor-help',
                          'rounded-neo border-3 border-neo-black shadow-hard',
                          'focus:outline-none focus-visible:ring-2 focus-visible:ring-neo-pink',
                          badge.isNew
                            ? 'bg-linear-to-r from-neo-lime via-yellow-300 to-neo-lime'
                            : 'bg-neo-navy text-white',
                        )}
                        data-testid={`blast-badge-${badge.id}`}
                        aria-label={`${badge.label}: ${badge.desc}`}
                      >
                        <Icon
                          className={cn(
                            'w-4 h-4 shrink-0',
                            badge.isNew ? 'text-neo-black' : 'text-neo-lime',
                          )}
                          strokeWidth={2.75}
                        />
                        <span
                          className={cn(
                            'font-neo-display font-black uppercase tracking-wide text-[11px]',
                            badge.isNew ? 'text-neo-black' : 'text-white',
                          )}
                        >
                          {badge.label}
                        </span>
                        {badge.isNew && (
                          <AdaptiveMotion.span
                            initial={{ scale: 0, rotate: -8 }}
                            animate={{ scale: 1, rotate: -8 }}
                            transition={{
                              type: 'spring', stiffness: 380, damping: 14,
                              delay: 0.5 + i * 0.08,
                            }}
                            className={cn(
                              'absolute -top-2 -right-2 px-1.5 py-0.5',
                              'rounded border-2 border-neo-black bg-neo-pink text-white',
                              'font-neo-display font-black text-[8px] uppercase tracking-wider',
                              'shadow-hard-sm',
                            )}
                          >
                            {t('blast.results.newBadge')}
                          </AdaptiveMotion.span>
                        )}
                      </AdaptiveMotion.button>
                  </MobileTooltip>
                );
              })}
            </div>
        </AdaptiveMotion.div>
      )}

      </div>

      {/* Sticky CTA footer — always visible without scrolling */}
      <AdaptiveMotion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.45 }}
        className={cn(
          'shrink-0 flex flex-col gap-2 w-full px-4 py-3',
          'bg-neo-navy/95 backdrop-blur-sm border-t-3 border-neo-black',
          'pb-[max(0.75rem,env(safe-area-inset-bottom))]',
        )}
        data-testid="blast-results-cta-footer"
      >
        <Button
          data-testid="play-again-button"
          size="lg"
          onClick={onPlayAgain}
          className="min-h-[56px] font-black text-xl uppercase border-3 border-neo-black shadow-hard-lg bg-neo-lime text-neo-black hover:bg-neo-lime/90"
        >
          {didFail ? t('blast.results.tryAgain') : t('blast.playAgain')}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onQuit}
          className="font-semibold text-white hover:text-white hover:bg-transparent uppercase tracking-wider text-xs"
        >
          {t('common.home')}
        </Button>
      </AdaptiveMotion.div>
    </div>
  );
}

interface BestMomentCellProps {
  icon: IconType;
  label: string;
  value: string;
  sub?: string;
  tint: string;
}

function BestMomentCell({ icon: Icon, label, value, sub, tint }: BestMomentCellProps) {
  return (
    <div className="flex flex-col items-center text-center px-1 py-1">
      <Icon className={cn('w-5 h-5 mb-1', tint)} strokeWidth={2.75} />
      <p className="text-[9px] uppercase tracking-wider font-bold text-white leading-tight">
        {label}
      </p>
      <p className={cn('font-neo-display font-black uppercase text-sm leading-tight', tint)}>
        {value}
      </p>
      {sub && (
        <p className="text-[10px] text-white tabular-nums leading-tight">{sub}</p>
      )}
    </div>
  );
}

interface SkillCellProps {
  icon: IconType;
  label: string;
  value: string;
  tint: string;
}

function SkillCell({ icon: Icon, label, value, tint }: SkillCellProps) {
  return (
    <div className={cn(
      'flex items-center gap-2.5 px-3 py-2.5 rounded-neo border-2 border-white/10 bg-neo-navy',
    )}>
      <Icon className={cn('w-4 h-4 shrink-0', tint)} strokeWidth={2.5} />
      <div className="flex-1 min-w-0">
        <p className="text-[9px] uppercase tracking-wider font-bold text-white leading-none mb-0.5">
          {label}
        </p>
        <p className={cn('font-neo-display font-black text-base leading-none tabular-nums', tint)}>
          {value}
        </p>
      </div>
    </div>
  );
}

interface StarRatingProps {
  stars: 1 | 2 | 3;
  label: string;
}

function StarRating({ stars, label }: StarRatingProps) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="flex gap-1">
        {[1, 2, 3].map((n) => (
          <Star
            key={n}
            className={cn(
              'w-6 h-6 transition-all',
              n <= stars
                ? 'text-yellow-400 fill-yellow-400 drop-shadow-[1px_1px_0_#000]'
                : 'text-white',
            )}
            strokeWidth={2}
          />
        ))}
      </div>
      <span className="text-[10px] uppercase tracking-widest font-black text-yellow-400/80">
        {label}
      </span>
    </div>
  );
}

export default BlastResultsSummary;
