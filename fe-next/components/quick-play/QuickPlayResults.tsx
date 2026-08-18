'use client';

/**
 * Quick Play round results — the between-rounds screen.
 * Core stat is % of perfect (the board's ceiling), NOT placement: quick play
 * frames you vs the board, never vs a lobby of opponents (that's MP's turf).
 *
 * Hierarchy: hero % + score dominates; the race standings and the words you
 * collected sit beside it; rank is the long game underneath; the only filled
 * CTA is the next round — and it lets you pick the mode you go into.
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
import { QuickRivalsPassed } from './QuickRivalsPassed';
import { QuickWordsCollected, type CollectedWord } from './QuickWordsCollected';
import { ModeGlyph } from './ModeGlyph';
import { celebrationTier } from './celebrationTier';
import { quickRank } from './quickRank';
import { NODE_COLORS } from './modeColors';
import { percentileFromBoard } from '@/lib/quickPlay/guestProgress';
import { safeToLocaleString } from '@/utils/bcp47Locale';
import type { QuickGhostRival } from '@/lib/quickPlay/ghostRivals';
import type { CustomAvatarConfig } from '@/shared/types/customAvatar';
import { QUICK_MODES, type QuickMode, type QuickRoundResult, type QuickSubmitOutcome } from './types';

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
  /** The ghosts this round actually raced, so the standings survive the buzzer. */
  rivals?: QuickGhostRival[];
  /** This round's words, flagged with which are new to this player. */
  collected?: CollectedWord[];
  /** Distinct words this player has collected, after this round. */
  collectionTotal?: number;
  /** Signed out: rewards are computed but held until there's an account. */
  isGuest?: boolean;
  /** Consecutive days played (guests included). 0/1 hides the badge. */
  dayStreak?: number;
  /** A mode means "start that one now"; undefined means back to the wheel. */
  onNextRound: (mode?: QuickMode) => void;
  onChallenge: () => void;
}

const GAUGE_R = 54;
const GAUGE_C = 2 * Math.PI * GAUGE_R;

export function QuickPlayResults({
  result,
  outcome,
  rival,
  rivals = [],
  collected = [],
  collectionTotal = 0,
  isGuest = false,
  dayStreak = 0,
  onNextRound,
  onChallenge,
}: QuickPlayResultsProps) {
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
  // A guest's percentile RPC always answered 0 ("better than 0% of today's
  // scores" after every round). The public board answers the same question.
  const percentileToday =
    outcome.percentileToday > 0 ? outcome.percentileToday : percentileFromBoard(result.scorePct, board);

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

  const myName = profile?.username || t('common.you', 'You');

  return (
    <div
      className="flex h-full flex-col gap-2.5 overflow-y-auto overscroll-contain bg-neo-navy px-4 py-3 pb-[max(1rem,env(safe-area-inset-bottom))]"
      data-testid="quick-play-results"
      data-reveal={prefersReducedMotion ? 'instant' : 'staggered'}
    >
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-2.5">
      <div className="flex items-center justify-center gap-2">
        <span
          data-testid="quick-mode-chip"
          className={`rounded-xl border-neo-thick border-black px-3 py-1 font-neo-display text-xs font-bold tracking-widest text-black shadow-hard ${modeColor.bg}`}
        >
          {t(`quickPlay.solo.mode.${result.mode}`)}
        </span>
        <h1 ref={headingRef} tabIndex={-1} className="font-neo-display text-lg font-bold tracking-wide text-neo-cream outline-none">
          {t('quickPlay.solo.roundComplete')}
        </h1>
        {dayStreak > 1 && (
          <span
            className="rounded-xl border-neo-thick border-black bg-neo-orange px-2 py-1 font-neo-display text-xs font-bold text-black shadow-hard"
            data-testid="quick-day-streak"
          >
            {t('quickPlay.solo.dayStreak', '{days}-day streak', { days: String(dayStreak) })}
          </span>
        )}
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

      {/* Two columns on a wide screen — the single narrow stack left two thirds
          of a desktop viewport empty below the fold. */}
      <div className="grid gap-2.5 lg:grid-cols-2 lg:items-start">
      <div className="flex flex-col gap-2.5">
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
              <em className={`not-italic ${modeColor.text}`}>{safeToLocaleString(result.score, language)}</em>{' '}
              {t('quickPlay.solo.points')}
            </div>
            <div className="text-xs text-neo-white/60">
              {t('quickPlay.solo.wordsFound', {
                found: String(result.wordsFound),
                total: String(result.totalWords),
              })}
            </div>
          </div>

          {/* Percentile comparison — pulled up from rank card */}
          <div className="w-full border-t border-neo-white/20 pt-3">
            <p className="text-center text-xs text-neo-cream font-bold">
              {t('quickPlay.solo.betterThan', { pct: String(percentileToday) })}
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

      {/* Rewards — small chips, not full-width slabs. Signed out, the same
          numbers are shown as held rather than as a row of zeros. */}
      <div
        className={`flex flex-col items-center gap-1 ${rewardsAnimation}`}
        style={{ '--delay': staggerDelay.rewards } as React.CSSProperties}
      >
        <div className="flex items-center justify-center gap-3">
          <div
            className={`inline-flex items-center gap-1 rounded-full border-2 px-3 py-1.5 font-neo-display text-sm font-bold ${
              isGuest ? 'border-neo-yellow/50 bg-neo-yellow/5 text-neo-yellow/80' : 'border-neo-yellow bg-neo-yellow/10 text-neo-yellow'
            }`}
            data-testid="quick-coins-reward"
          >
            ◉ +{outcome.coins}
          </div>
          <div
            className={`inline-flex items-center gap-1 rounded-full border-2 px-3 py-1.5 font-neo-display text-sm font-bold ${
              isGuest ? 'border-neo-purple/50 bg-neo-purple/5 text-neo-purple/80' : 'border-neo-purple bg-neo-purple/10 text-neo-purple'
            }`}
            data-testid="quick-xp-reward"
          >
            ★ +{outcome.xp}
          </div>
        </div>
        {isGuest && (
          <p className="text-center text-[11px] text-neo-white/55" data-testid="quick-rewards-pending">
            {t('quickPlay.solo.rewardsPending', 'Sign in to keep them — {coins} coins waiting', {
              coins: safeToLocaleString(outcome.coins, language),
            })}
          </p>
        )}
      </div>

      {/* Rank progress card — split out for modularity */}
      <div className={rankAnimation} style={{ '--delay': staggerDelay.rank } as React.CSSProperties}>
        <QuickPlayRankCard
          totalPoints={outcome.totalPoints}
          percentileToday={percentileToday}
          scorePct={result.scorePct}
        />
      </div>
      </div>

      <div className="flex flex-col gap-2.5">
      {/* The field you just raced. */}
      <QuickRivalsPassed
        rivals={rivals}
        myScorePct={result.scorePct}
        myName={myName}
        myUserId={user?.id}
        myAvatar={profile?.avatar_config ?? null}
      />

      {/* Rival compare: the challenge / weekly rivalry, a different axis from
          the round's own field above. */}
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

      <QuickWordsCollected words={collected} collectionTotal={collectionTotal} />

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
      </div>
      </div>

      {/* Next round: the mode is part of the decision, so it lives on the
          button row instead of behind a trip back to the wheel. */}
      <div className="flex flex-col gap-1.5" data-testid="quick-next-mode-picker">
        <span className="text-center font-neo-display text-[10px] uppercase tracking-[0.18em] text-neo-white/45">
          {t('quickPlay.solo.pickNextMode', 'Next round')}
        </span>
        <div className="grid grid-cols-4 gap-1.5">
          {QUICK_MODES.map((mode) => (
            <button
              key={mode}
              type="button"
              data-testid={`quick-next-mode-${mode}`}
              onClick={() => onNextRound(mode)}
              className={`flex h-[56px] flex-col items-center justify-center gap-0.5 rounded-xl border-neo-thick border-black font-neo-display text-[11px] font-bold tracking-wide text-black shadow-hard active:translate-x-0.5 active:translate-y-0.5 active:shadow-hard-pressed ${NODE_COLORS[mode].bg} ${
                mode === result.mode ? 'ring-2 ring-neo-cream ring-offset-2 ring-offset-neo-navy' : ''
              }`}
            >
              <ModeGlyph mode={mode} size={18} />
              {t(`quickPlay.solo.mode.${mode}`)}
            </button>
          ))}
        </div>
      </div>

      <button
        type="button"
        data-testid="quick-results-next"
        onClick={() => onNextRound()}
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
      </div>

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
