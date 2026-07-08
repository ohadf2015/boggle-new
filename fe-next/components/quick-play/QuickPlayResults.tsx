'use client';

/**
 * Quick Play round results — the between-rounds screen.
 * Core stat is % of perfect (the board's ceiling), NOT placement: quick play
 * frames you vs the board, never vs a lobby of opponents (that's MP's turf).
 * Composes existing pieces: RivalCompareCard, confetti tiers, neo tokens.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { fireConfetti } from '@/utils/confettiUtils';
import { haptics } from '@/utils/haptics/HapticsManager';
import RivalCompareCard from '@/components/daily/RivalCompareCard';
import { celebrationTier } from './celebrationTier';
import { quickRank } from './quickRank';
import { NODE_COLORS } from './modeColors';
import { safeToLocaleString } from '@/utils/bcp47Locale';
import type { QuickRoundResult, QuickSubmitOutcome } from './types';

export interface QuickRival {
  name: string;
  emoji: string;
  /** Rival's number on the compared axis (round % for challenges, weekly points for ghost rivals) */
  theirValue: number;
  /** Your number on the SAME axis */
  myValue: number;
  type: 'challenge' | 'weekly';
}

interface LeaderboardEntry {
  userId: string;
  name: string;
  bestScorePct: number;
  rank: number;
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
  const [board, setBoard] = useState<LeaderboardEntry[]>([]);
  const [showFullBoard, setShowFullBoard] = useState(false);
  const celebrated = useRef(false);
  const headingRef = useRef<HTMLHeadingElement>(null);

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

  return (
    <div className="flex min-h-full flex-col gap-2.5 bg-neo-navy px-4 py-3 animate-[fadeInUp_0.2s_ease-out_0s_both]" data-testid="quick-play-results">
      <div className="flex items-center justify-center gap-2">
        <span className={`rounded-xl border-neo-thick border-black px-3 py-1 font-neo-display text-xs font-bold tracking-widest text-black shadow-hard ${modeColor.bg}`}>
          {t(`quickPlay.solo.mode.${result.mode}`)}
        </span>
        <h1 ref={headingRef} tabIndex={-1} className="font-neo-display text-lg font-bold tracking-wide text-neo-cream outline-none">
          {t('quickPlay.solo.roundComplete')}
        </h1>
      </div>

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

      {/* Hero: % of perfect gauge */}
      <div className="flex items-center gap-4 rounded-2xl border-neo-thick border-black bg-neo-navy-elevated p-3 shadow-hard-lg">
        <div className="relative h-24 w-24 flex-none">
          <svg width="96" height="96" viewBox="0 0 128 128" className="-rotate-90">
            <circle cx="64" cy="64" r={GAUGE_R} fill="none" stroke="var(--neo-abyss)" strokeWidth="14" />
            <circle
              cx="64" cy="64" r={GAUGE_R} fill="none" stroke={modeColor.hex} strokeWidth="14"
              strokeDasharray={`${dash} ${GAUGE_C - dash}`}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <b className={`font-neo-display text-2xl ${modeColor.text}`}>{result.scorePct}%</b>
            <small className="text-[9px] tracking-wider text-neo-white/60">{t('quickPlay.solo.ofPerfect')}</small>
          </div>
        </div>
        <div className="flex flex-col gap-1 text-neo-cream">
          <div className="font-neo-display text-xl">
            <em className={`not-italic ${modeColor.text}`}>{result.score}</em> {t('quickPlay.solo.points')}
          </div>
          <div className="text-sm text-neo-white/75">
            {t('quickPlay.solo.wordsFound', { found: String(result.wordsFound), total: String(result.totalWords) })}
          </div>
          {result.mode === 'word-hunt' && result.targetWord && (
            <div className={`text-sm font-bold ${result.targetWordFound ? 'text-neo-lime' : 'text-neo-white/75'}`}>
              {t(
                result.targetWordFound ? 'quickPlay.solo.targetWordFound' : 'quickPlay.solo.targetWordMissed',
                { word: result.targetWord.toUpperCase() }
              )}
            </div>
          )}
          {improvementPct !== null && (
            <span
              className={`w-max rounded-lg border-2 px-2 py-0.5 text-xs font-bold ${
                improvementPct >= 0
                  ? 'border-neo-lime bg-neo-lime/15 text-neo-lime'
                  : 'border-neo-white/30 bg-neo-white/5 text-neo-white/70'
              }`}
            >
              {improvementPct >= 0 ? '▲' : '▼'}{' '}
              {t('quickPlay.solo.vsAverage', { pct: String(Math.abs(improvementPct)) })}
            </span>
          )}
        </div>
      </div>

      {/* Rewards */}
      <div className="flex gap-2.5">
        <div className="flex flex-1 items-center justify-center gap-2 rounded-xl border-neo-thick border-black bg-neo-yellow py-2 font-neo-display text-base font-bold text-black shadow-hard">
          ◉ +{outcome.coins}
        </div>
        <div className="flex flex-1 items-center justify-center gap-2 rounded-xl border-neo-thick border-black bg-neo-purple py-2 font-neo-display text-base font-bold text-white shadow-hard">
          ★ +{outcome.xp} XP
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
          t={t}
        />
      )}

      {/* Percentile + Quick Rank — merged into one card (was two) to cut a
          full card's worth of border/padding overhead. */}
      <div className="rounded-2xl border-neo-thick border-black bg-neo-navy-elevated p-3 shadow-hard" data-testid="quick-rank-bar">
        <p className="mb-1 text-xs text-neo-cream">
          {t('quickPlay.solo.betterThan', { pct: String(outcome.percentileToday) })}
        </p>
        <div className="h-2.5 overflow-hidden rounded-full border-2 border-black bg-neo-abyss">
          <i
            className="block h-full border-r-2 border-black bg-neo-cyan"
            style={{ width: `${outcome.percentileToday}%` }}
          />
        </div>
        <div className="mt-2.5 flex items-center justify-between text-xs">
          <span className={`font-neo-display font-bold tracking-wide ${rankNow.color}`}>
            {t(`quickPlay.solo.rank.${rankNow.key}`)}
          </span>
          <span className="text-neo-white/60">
            {rankNow.nextAt !== null
              ? t('quickPlay.solo.rankProgress', {
                  points: safeToLocaleString(outcome.totalPoints, language),
                  next: safeToLocaleString(rankNow.nextAt, language),
                  rank: t(`quickPlay.solo.rank.${quickRank(rankNow.nextAt).key}`),
                })
              : t('quickPlay.solo.rankMax')}
          </span>
        </div>
        <div className="mt-1 h-2.5 overflow-hidden rounded-full border-2 border-black bg-neo-abyss">
          <i
            className="block h-full border-r-2 border-black bg-neo-cozy transition-[width] duration-700"
            style={{ width: `${Math.round(rankNow.progress * 100)}%` }}
          />
        </div>
        <p className="mt-1 text-[11px] text-neo-white/55">
          {t('quickPlay.solo.rankGained', { pts: String(result.scorePct) })}
        </p>
      </div>

      {/* Leaderboard: collapsed to one summary line by default (was 3 always-open
          rows) — tap to expand, no scroll cost when the player isn't curious. */}
      {board.length > 0 && (
        <div className="overflow-hidden rounded-2xl border-neo-thick border-black bg-neo-navy-elevated shadow-hard">
          {!showFullBoard ? (
            <button
              type="button"
              onClick={() => setShowFullBoard(true)}
              className="w-full py-2 text-sm font-bold tracking-wide text-neo-cyan"
            >
              {t('quickPlay.solo.seeLeaderboard')}
            </button>
          ) : (
            board.map((e) => (
              <div key={e.userId} className="flex items-center gap-3 border-b-2 border-black/40 px-4 py-2 text-sm text-neo-cream">
                <span className="w-6 font-neo-display font-bold text-neo-white/60">{e.rank}</span>
                <span className="flex-1">{e.name}</span>
                <span className="font-neo-display font-semibold">{e.bestScorePct}%</span>
              </div>
            ))
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
        className="h-[44px] rounded-2xl border-[3px] border-neo-cozy font-neo-display text-sm font-semibold text-neo-cozy"
      >
        {t('quickPlay.solo.challengeFriend')}
      </button>
      <p className="text-center text-[10px] text-neo-white/45">{t('quickPlay.solo.challengeHint')}</p>
    </div>
  );
}
