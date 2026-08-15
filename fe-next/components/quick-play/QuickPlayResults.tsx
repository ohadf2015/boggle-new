'use client';

/**
 * Quick Play round results — the between-rounds screen.
 * Core stat is % of perfect (the board's ceiling), NOT placement: quick play
 * frames you vs the board, never vs a lobby of opponents (that's MP's turf).
 *
 * Hierarchy: hero % + score dominates; coins/xp are small chips; rank is
 * supporting context below the fold; next-round is the only filled CTA.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { fireConfetti } from '@/utils/confettiUtils';
import { haptics } from '@/utils/haptics/HapticsManager';
import useReducedMotion from '@/hooks/useReducedMotion';
import Avatar from '@/components/Avatar';
import RivalCompareCard from '@/components/daily/RivalCompareCard';
import { QuickPlayRankCard } from './QuickPlayRankCard';
import { celebrationTier } from './celebrationTier';
import { quickRank } from './quickRank';
import { NODE_COLORS } from './modeColors';
import { safeToLocaleString } from '@/utils/bcp47Locale';
import type { CustomAvatarConfig } from '@/shared/types/customAvatar';
import type { QuickRoundResult, QuickSubmitOutcome } from './types';

export interface QuickRival {
  name: string;
  emoji: string;
  /** Rival's number on the compared axis (round % for challenges, weekly points for ghost rivals) */
  theirValue: number;
  /** Your number on the SAME axis */
  myValue: number;
  type: 'challenge' | 'weekly';
  /** Seed for a real (custom or deterministic) avatar instead of a bare emoji */
  avatarUserId?: string;
  avatarConfig?: CustomAvatarConfig | null;
}

interface LeaderboardEntry {
  userId: string;
  name: string;
  bestScorePct: number;
  rank: number;
  customAvatar?: CustomAvatarConfig | null;
}

interface QuickPlayResultsProps {
  result: QuickRoundResult;
  outcome: QuickSubmitOutcome;
  rival: QuickRival | null;
  onNextRound: () => void;
  onChallenge: () => void;
}

const GAUGE_R = 54;
const GAUGE_C = 2 * Math.PI * GAUGE_R;

export function QuickPlayResults({ result, outcome, rival, onNextRound, onChallenge }: QuickPlayResultsProps) {
  const { t, language } = useLanguage();
  const { user, profile } = useAuth();
  const [board, setBoard] = useState<LeaderboardEntry[]>([]);
  const [showFullBoard, setShowFullBoard] = useState(false);
  const celebrated = useRef(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const prefersReducedMotion = useReducedMotion();

  // This screen replaces the game board with no navigation, so keyboard
  // focus needs to move here explicitly instead of being stranded on a
  // now-unmounted in-game control.
  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  // history[0] is this round (inserted before fetch); compare vs the rest
  const priorAvg = useMemo(() => {
    const prior = outcome.history.slice(1);
    if (prior.length === 0) return null;
    return prior.reduce((a, b) => a + b, 0) / prior.length;
  }, [outcome.history]);
  const improvementPct = priorAvg === null ? null : Math.round(result.scorePct - priorAvg);
  const isPersonalBest = useMemo(
    () => outcome.history.slice(1).every((h) => result.scorePct > h) && outcome.history.length > 1,
    [outcome.history, result.scorePct]
  );
  const beatRival = rival !== null && rival.myValue > rival.theirValue;
  // Near-miss tension: a strong-but-not-record round nudges "one more round"
  // harder than a flat score readout. Suppressed once the bigger badges
  // (best/rank-up) already cover the moment.
  const isNearMiss = result.scorePct >= 85 && result.scorePct < 100 && !isPersonalBest;
  // Quick Rank: this round's pct just became permanent points
  const rankNow = quickRank(outcome.totalPoints);
  const rankBefore = quickRank(Math.max(0, outcome.totalPoints - result.scorePct));
  const rankedUp = rankNow.key !== rankBefore.key && outcome.totalPoints > 0;

  useEffect(() => {
    if (celebrated.current) return;
    celebrated.current = true;
    const tier = celebrationTier({
      scorePct: result.scorePct,
      isPersonalBest,
      beatRival,
      percentileToday: outcome.percentileToday,
    });
    if (tier >= 2 || rankedUp) haptics.success();
    if (rankedUp) fireConfetti({ particleCount: 180, spread: 100 });
    if (tier === 1) fireConfetti({ particleCount: 40, spread: 55 });
    else if (tier === 2) fireConfetti({ particleCount: 90, spread: 70 });
    else if (tier === 3) fireConfetti({ particleCount: 140, spread: 90 });
    else if (tier === 4) {
      fireConfetti({ particleCount: 220, spread: 120 });
      setTimeout(() => fireConfetti({ particleCount: 120, spread: 70 }), 450);
    }
  }, [result.scorePct, isPersonalBest, beatRival, outcome.percentileToday, rankedUp]);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/quick-play/leaderboard?range=today')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!cancelled && d?.entries) setBoard(d.entries);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const dash = (result.scorePct / 100) * GAUGE_C;
  const modeColor = NODE_COLORS[result.mode];
  // Stagger delays: hero 0s, rewards 0.25s, rank 0.5s
  const staggerDelay = {
    hero: prefersReducedMotion ? '0s' : '0s',
    rewards: prefersReducedMotion ? '0s' : '0.25s',
    rank: prefersReducedMotion ? '0s' : '0.5s',
  };
  const heroAnimation = prefersReducedMotion ? '' : 'animate-[fadeInUp_0.3s_ease-out_var(--delay,0s)_both]';
  const rewardsAnimation = prefersReducedMotion ? '' : 'animate-[fadeInUp_0.3s_ease-out_var(--delay,0.25s)_both]';
  const rankAnimation = prefersReducedMotion ? '' : 'animate-[fadeInUp_0.3s_ease-out_var(--delay,0.5s)_both]';

  return (
    <div
      className="flex h-full flex-col gap-2.5 overflow-y-auto overscroll-contain bg-neo-navy px-4 py-3 pb-[max(1rem,env(safe-area-inset-bottom))]"
      data-testid="quick-play-results"
      data-reveal={prefersReducedMotion ? 'instant' : 'staggered'}
    >
      <div className="flex items-center justify-center gap-2">
        <span className={`rounded-xl border-neo-thick border-black px-3 py-1 font-neo-display text-xs font-bold tracking-widest text-black shadow-hard ${modeColor.bg}`}>
          {t(`quickPlay.solo.mode.${result.mode}`)}
        </span>
        <h1 ref={headingRef} tabIndex={-1} className="font-neo-display text-lg font-bold tracking-wide text-neo-cream outline-none">
          {t('quickPlay.solo.roundComplete')}
        </h1>
      </div>

      {/* Badges — celebration layer. Restyle/reposition only, keep conditions. */}

      {isPersonalBest && (
        <div className="animate-neo-pop -rotate-1 rounded-xl border-neo-thick border-black bg-neo-yellow px-3 py-1.5 text-center font-neo-display text-sm font-bold tracking-wide text-black shadow-hard" data-testid="quick-new-best">
          ★ {t('quickPlay.solo.newBest')}
        </div>
      )}
      {rankedUp && (
        <div className="animate-neo-pop rounded-xl border-neo-thick border-black bg-neo-pink px-3 py-1.5 text-center font-neo-display text-sm font-bold tracking-wide text-black shadow-hard" data-testid="quick-rank-up">
          {t('quickPlay.solo.rankUp', { rank: t(`quickPlay.solo.rank.${rankNow.key}`) })}
        </div>
      )}
      {isNearMiss && (
        <div className="animate-neo-pop rounded-xl border-neo-thick border-black bg-neo-orange px-3 py-1.5 text-center font-neo-display text-sm font-bold tracking-wide text-black shadow-hard" data-testid="quick-near-miss">
          {t('quickPlay.solo.nearMiss', { pct: String(100 - result.scorePct) })}
        </div>
      )}

      {/* Hero: % of perfect — DOMINANT element. */}
      <div
        className={`rounded-2xl border-neo-thick border-black bg-neo-navy-elevated p-4 shadow-hard-lg ${heroAnimation}`}
        style={{ '--delay': staggerDelay.hero } as React.CSSProperties}
        data-testid="quick-hero-card"
      >
        <div className="flex flex-col items-center gap-4">
          {/* Percentage gauge and display */}
          <div className="relative h-28 w-28">
            <svg width="112" height="112" viewBox="0 0 128 128" className="-rotate-90">
              <circle cx="64" cy="64" r={GAUGE_R} fill="none" stroke="var(--neo-abyss)" strokeWidth="14" />
              <circle
                cx="64" cy="64" r={GAUGE_R} fill="none" stroke={modeColor.hex} strokeWidth="14"
                strokeDasharray={`${dash} ${GAUGE_C - dash}`}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <b className={`font-neo-display text-5xl ${modeColor.text}`} data-testid="quick-hero-percentage">
                {result.scorePct}%
              </b>
              <small className="text-[10px] tracking-widest text-neo-white/60">{t('quickPlay.solo.ofPerfect')}</small>
            </div>
          </div>

          {/* Score secondary line */}
          <div className="text-center">
            <div className="font-neo-display text-2xl text-neo-cream">
              <em className={`not-italic ${modeColor.text}`}>{result.score}</em> {t('quickPlay.solo.points')}
            </div>
          </div>

          {/* Percentile comparison — pulled up from rank card */}
          <div className="w-full border-t border-neo-white/20 pt-3">
            <p className="text-center text-xs text-neo-cream font-bold">
              {t('quickPlay.solo.betterThan', { pct: String(outcome.percentileToday) })}
            </p>
          </div>

          {/* Target word indicator (word-hunt only) */}
          {result.mode === 'word-hunt' && result.targetWord && (
            <div className={`text-sm font-bold ${result.targetWordFound ? 'text-neo-lime' : 'text-neo-white/75'}`}>
              {t(
                result.targetWordFound ? 'quickPlay.solo.targetWordFound' : 'quickPlay.solo.targetWordMissed',
                { word: result.targetWord.toUpperCase() }
              )}
            </div>
          )}

          {/* Improvement vs average */}
          {improvementPct !== null && (
            <span
              className={`w-max rounded-lg border-2 px-2 py-0.5 text-xs font-bold ${
                improvementPct >= 0
                  ? 'border-neo-lime bg-neo-lime/15 text-neo-lime'
                  : 'border-neo-white/30 bg-neo-white/5 text-neo-white/70'
              }`}
            >
              {improvementPct >= 0 ? '▲' : '▼'} {t('quickPlay.solo.vsAverage', { pct: String(Math.abs(improvementPct)) })}
            </span>
          )}
        </div>
      </div>

      {/* Rewards — small chips, not full-width slabs */}
      <div
        className={`flex items-center justify-center gap-3 ${rewardsAnimation}`}
        style={{ '--delay': staggerDelay.rewards } as React.CSSProperties}
      >
        <div className="inline-flex items-center gap-1 rounded-full border-2 border-neo-yellow bg-neo-yellow/10 px-3 py-1.5 font-neo-display text-sm font-bold text-neo-yellow" data-testid="quick-coins-reward">
          ◉ +{outcome.coins}
        </div>
        <div className="inline-flex items-center gap-1 rounded-full border-2 border-neo-purple bg-neo-purple/10 px-3 py-1.5 font-neo-display text-sm font-bold text-neo-purple" data-testid="quick-xp-reward">
          ★ +{outcome.xp}
        </div>
      </div>

      {/* Rival compare: the competitive hook, promoted above the utility bars so
          it (and the Challenge CTA below) don't require a scroll to reach. */}
      {rival && (
        <RivalCompareCard
          rivalName={rival.name}
          rivalEmoji={rival.emoji}
          rivalScore={rival.theirValue}
          myScore={rival.myValue}
          rivalAvatar={
            rival.avatarUserId
              ? { userId: rival.avatarUserId, customAvatar: rival.avatarConfig ?? null }
              : undefined
          }
          myAvatar={user?.id ? { userId: user.id, customAvatar: profile?.avatar_config ?? null } : undefined}
          t={t}
        />
      )}

      {/* Rank progress card — split out for modularity */}
      <div className={rankAnimation} style={{ '--delay': staggerDelay.rank } as React.CSSProperties}>
        <QuickPlayRankCard
          totalPoints={outcome.totalPoints}
          percentileToday={outcome.percentileToday}
          scorePct={result.scorePct}
        />
      </div>

      {/* Leaderboard: collapsed to one summary line by default — tap to expand. */}
      {board.length > 0 && (
        <div className="overflow-hidden rounded-2xl border-neo-thick border-black bg-neo-navy-elevated shadow-hard">
          {!showFullBoard ? (
            <button
              type="button"
              onClick={() => setShowFullBoard(true)}
              className="flex h-[44px] w-full items-center justify-center text-sm font-bold tracking-wide text-neo-cyan"
            >
              {t('quickPlay.solo.seeLeaderboard')}
            </button>
          ) : (
            board.map((e) => {
              const isMe = e.userId === user?.id;
              return (
                <div
                  key={e.userId}
                  className={`flex items-center gap-3 border-b-2 border-black/40 px-4 py-2 text-sm last:border-b-0 ${
                    isMe ? 'bg-neo-cozy/15 text-neo-cream' : 'text-neo-cream'
                  }`}
                >
                  <span className="w-5 text-center font-neo-display font-bold text-neo-white/55">{e.rank}</span>
                  <Avatar
                    userId={e.userId}
                    customAvatar={e.customAvatar ?? undefined}
                    size="sm"
                    disableEffects
                    tierMarker={e.rank <= 3}
                  />
                  <span className="flex-1 truncate">{e.name}</span>
                  <span className="font-neo-display font-semibold">{e.bestScorePct}%</span>
                </div>
              );
            })
          )}
        </div>
      )}

      <button
        type="button"
        data-testid="quick-results-next"
        onClick={onNextRound}
        className="h-[52px] rounded-2xl border-4 border-black bg-neo-lime font-neo-display text-lg font-bold tracking-[2px] text-black shadow-hard-lg active:translate-x-0.5 active:translate-y-0.5 active:shadow-hard-pressed"
      >
        {t('quickPlay.solo.nextRound')}
      </button>
      <button
        type="button"
        data-testid="quick-results-challenge"
        onClick={onChallenge}
        className="flex h-[44px] items-center justify-center rounded-2xl font-neo-display text-sm font-semibold text-neo-cosy"
      >
        {t('quickPlay.solo.challengeFriend')}
      </button>
      <p className="text-center text-[10px] text-neo-white/45">{t('quickPlay.solo.challengeHint')}</p>

      {/* Bottom spacer: reserves space for the push-notification prompt that anchors
          at fixed bottom-[calc(5rem+var(--admob-banner-height,0px))], preventing it
          from covering the primary CTA. The prompt is max-w-md with internal padding,
          so we reserve an additional 1.5rem buffer. */}
      <div
        className="h-[calc(5rem+var(--admob-banner-height,0px)+1.5rem)]"
        data-testid="quick-results-bottom-spacer"
        aria-hidden="true"
      />
    </div>
  );
}
