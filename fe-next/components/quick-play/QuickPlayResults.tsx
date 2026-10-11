'use client';

/**
 * Quick Play round results — the between-rounds screen.
 * Core stat is % of perfect (the board's ceiling), NOT placement: quick play
 * frames you vs the board, never vs a lobby of opponents (that's MP's turf).
 *
 * Above the fold is one calm moment: your avatar on turning light rays, three
 * stat cards that land and count in turn, coins flying into the wallet, and
 * one pinned next-round button. Standings, rank and words sit below.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { X } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { haptics } from '@/utils/haptics/HapticsManager';
import useReducedMotion from '@/hooks/useReducedMotion';
import { getOrCreateStoredCustomAvatar } from '@/utils/profileStorage';
import { holdQuickResultsCalm } from '@/lib/quickPlay/resultsCalm';
import { useHeroCheer } from '@/lib/quickPlay/useHeroCheer';
import { getGuestProgress, percentileFromBoard } from '@/lib/quickPlay/guestProgress';
import Avatar from '@/components/Avatar';
import BlastWalletHud from '@/components/blast/legacy/BlastWalletHud';
import { CoinArt } from '@/components/ui/CoinArt';
import { emitCoinEarned } from '@/utils/coinEarnedFx';
import RivalCompareCard from '@/components/daily/RivalCompareCard';
import { BurstLines, ConfettiPuff, QuickResultsRays, SparkleLoop } from './QuickResultsFx';
import { QuickResultsStats } from './QuickResultsStats';
import { QuickResultsCtaBar, QuickResultsModeSwitch } from './QuickResultsNextActions';
import { QuickPlayRankCard } from './QuickPlayRankCard';
import { QuickRivalsPassed } from './QuickRivalsPassed';
import { QuickWordsCollected, type CollectedWord } from './QuickWordsCollected';
import { QuickLeaderboardCard } from './QuickLeaderboardCard';
import { celebrationTier } from './celebrationTier';
import { quickRank } from './quickRank';
import { NODE_COLORS } from './modeColors';
import type { QuickGhostRival } from '@/lib/quickPlay/ghostRivals';
import type { CustomAvatarConfig } from '@/shared/types/customAvatar';
import type { QuickMode, QuickRoundResult, QuickSubmitOutcome } from './types';

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
  /** Leave the hub from the results screen; omitted = no exit button. */
  onExit?: () => void;
}

/** The idle/reaction mascot (GIF set) — used for the scoreless round. */
const InteractiveMascot = dynamic(() => import('@/components/ui/InteractiveMascot'), { ssr: false });

/** Below this many leaderboard rows a percentile is noise, not information. */
const MIN_BOARD_FOR_PERCENTILE = 5;
/** The signup sheet waits until the reveal has played out. */
const CALM_HOLD_MS = 6000;

/** Ms after mount when the coins leave the reward chip, once the last stat card has landed. */
export const COIN_LAUNCH_MS = 1100;
const FLYING_COINS = 8;

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
  onExit,
}: QuickPlayResultsProps) {
  const { t } = useLanguage();
  const { user, profile } = useAuth();
  const [board, setBoard] = useState<LeaderboardEntry[]>([]);
  const celebrated = useRef(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const coinChipRef = useRef<HTMLSpanElement>(null);
  const prefersReducedMotion = useReducedMotion();
  const animate = !prefersReducedMotion;

  const [guestAvatar] = useState<CustomAvatarConfig | null>(() => (user ? null : getOrCreateStoredCustomAvatar()));
  const [walletTo] = useState(() =>
    isGuest ? getGuestProgress().coinsPending : (profile?.total_coins ?? 0) + outcome.coins
  );
  const walletFrom = Math.max(0, walletTo - outcome.coins);
  const [walletCoins, setWalletCoins] = useState(walletFrom);

  // This screen replaces the game board with no navigation, so keyboard
  // focus needs to move here explicitly instead of being stranded on a
  // now-unmounted in-game control.
  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  useEffect(() => {
    if (walletTo <= walletFrom) return;
    const launch = setTimeout(() => {
      const chip = coinChipRef.current?.getBoundingClientRect();
      const source = chip ? { x: chip.left + chip.width / 2, y: chip.top + chip.height / 2 } : undefined;
      emitCoinEarned(walletTo - walletFrom, source, { inline: true, coins: FLYING_COINS });
      setWalletCoins(walletTo);
    }, COIN_LAUNCH_MS);
    return () => clearTimeout(launch);
  }, [walletFrom, walletTo]);

  useEffect(() => holdQuickResultsCalm(CALM_HOLD_MS), []);

  useEffect(() => {
    document.body.classList.add('quick-results-open');
    return () => document.body.classList.remove('quick-results-open');
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
  // Near-miss tension, suppressed once the bigger badges cover the moment.
  const isNearMiss = result.scorePct >= 85 && result.scorePct < 100 && !isPersonalBest;
  const rankNow = quickRank(outcome.totalPoints);
  const rankBefore = quickRank(Math.max(0, outcome.totalPoints - result.scorePct));
  const rankedUp = rankNow.key !== rankBefore.key && outcome.totalPoints > 0;
  // A percentile on a three-row board reads "better than 100%" for a mediocre
  // round, so it waits for enough rows and caps at 99.
  const boardPercentile =
    board.length >= MIN_BOARD_FOR_PERCENTILE ? Math.min(99, percentileFromBoard(result.scorePct, board)) : null;
  const percentileToday = outcome.percentileToday > 0 ? outcome.percentileToday : boardPercentile ?? 0;
  const showPercentile = outcome.percentileToday > 0 || boardPercentile !== null;

  const celebrateTier = celebrationTier({
    scorePct: result.scorePct,
    isPersonalBest,
    beatRival,
    percentileToday: outcome.percentileToday,
  });
  const heroMood = useHeroCheer(result.wordsFound > 0, animate);
  const hopping = animate && heroMood === 'win';
  const confettiCount = result.wordsFound === 0 ? 0 : rankedUp || celebrateTier >= 2 ? 16 : 10;

  useEffect(() => {
    if (celebrated.current) return;
    celebrated.current = true;
    if (celebrateTier >= 2 || rankedUp) haptics.success();
  }, [celebrateTier, rankedUp]);

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

  const modeColor = NODE_COLORS[result.mode];
  const myName = profile?.username || t('common.you', 'You');
  const badge = 'animate-neo-pop rounded-xl border-[3px] border-black px-3 py-1 font-neo-display text-xs font-bold tracking-wide text-black shadow-hard';

  return (
    <div className="relative flex max-h-[100dvh] min-h-0 flex-1 flex-col overflow-hidden bg-neo-navy" data-testid="quick-play-results">
      <div className="relative min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain" data-testid="quick-results-scroll">
        <div className="flex min-h-[calc(100dvh-var(--bottom-nav-height,0px)-6.75rem)] flex-col" data-testid="quick-results-stage">
          <header className="relative z-20 mx-auto flex w-full max-w-5xl items-center justify-between gap-2 px-4 pt-3">
            {onExit ? (
              <button
                type="button"
                data-testid="quick-results-exit"
                onClick={onExit}
                aria-label={t('common.back')}
                className="flex h-11 w-11 items-center justify-center rounded-full text-neo-white/70 active:scale-95"
              >
                <X className="h-6 w-6" strokeWidth={2.75} aria-hidden="true" />
              </button>
            ) : (
              <span className="w-11" aria-hidden="true" />
            )}
            <div className="flex min-w-0 items-center gap-1.5">
              <span
                data-testid="quick-mode-chip"
                className={`rounded-xl border-[3px] border-black px-3 py-1 font-neo-display text-xs font-bold tracking-widest text-black shadow-hard ${modeColor.bg}`}
              >
                {t(`quickPlay.solo.mode.${result.mode}`)}
              </span>
              {dayStreak > 1 && (
                <span
                  className="rounded-xl border-[3px] border-black bg-neo-orange px-2 py-1 font-neo-display text-xs font-bold text-black shadow-hard"
                  data-testid="quick-day-streak"
                >
                  {t('quickPlay.solo.dayStreak', '{days}-day streak', { days: String(dayStreak) })}
                </span>
              )}
            </div>
            <div data-testid="quick-wallet" data-from={walletFrom} data-to={walletTo} className="[&_[data-strip]]:font-bold">
              <BlastWalletHud coins={walletCoins} />
            </div>
          </header>

          <section
            className="relative mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center gap-3 px-4 pb-6 lg:max-w-3xl lg:gap-5"
            data-testid="quick-hero-card"
          >
            <div className="relative flex h-[min(34dvh,290px)] w-full items-center justify-center lg:h-[300px]">
              <QuickResultsRays color={modeColor.hex} spinning={animate} />
              <ConfettiPuff count={confettiCount} enabled={animate} />
              <BurstLines enabled={animate && result.wordsFound > 0} />
              {hopping && <BurstLines enabled delayMs={0} />}
              <SparkleLoop enabled={animate && result.wordsFound > 0} />
              <div
                className={`relative z-10 ${animate ? 'animate-[qp-avatar-pop_0.7s_cubic-bezier(0.3,0.9,0.4,1)_both]' : ''}`}
                data-testid="quick-hero-avatar"
              >
                <div className={animate ? 'animate-[qp-avatar-bob_2.8s_ease-in-out_0.9s_infinite]' : ''}>
                  <div
                    data-testid={hopping ? 'quick-hero-hop' : undefined}
                    className={hopping ? 'animate-[qp-avatar-hop_0.62s_cubic-bezier(0.3,0.9,0.4,1)_both]' : ''}
                  >
                    <div className="-m-5 scale-[0.8] lg:m-0 lg:scale-100">
                      <Avatar
                        userId={user?.id ?? 'guest'}
                        customAvatar={profile?.avatar_config ?? guestAvatar ?? undefined}
                        pixelSize={200}
                        mood={heroMood}
                      />
                    </div>
                  </div>
                </div>
                <span
                  aria-hidden="true"
                  className={`absolute -bottom-3 left-1/2 -z-10 h-3.5 w-28 -translate-x-1/2 rounded-[50%] bg-black/45 ${
                    animate ? 'animate-[qp-shadow-bob_2.8s_ease-in-out_0.9s_infinite]' : ''
                  }`}
                />
              </div>
            </div>

            <div className="relative z-10 flex flex-col items-center gap-1 text-center">
              <h1
                ref={headingRef}
                tabIndex={-1}
                className="font-neo-display text-[32px] font-bold leading-tight text-neo-yellow outline-none [text-shadow:0_3px_0_#000] lg:text-5xl"
              >
                {t('quickPlay.solo.roundComplete')}
              </h1>
              <p className="text-sm font-semibold text-neo-white/70">
                {t('quickPlay.solo.wordsFound', { found: String(result.wordsFound), total: String(result.totalWords) })}
              </p>
            </div>

            {(isPersonalBest || rankedUp || isNearMiss) && (
              <div className="relative z-10 flex flex-wrap items-center justify-center gap-2">
                {isPersonalBest && (
                  <span className={`${badge} -rotate-2 bg-neo-yellow`} data-testid="quick-new-best">
                    ★ {t('quickPlay.solo.newBest')}
                  </span>
                )}
                {rankedUp && (
                  <span className={`${badge} rotate-1 bg-neo-pink`} data-testid="quick-rank-up">
                    {t('quickPlay.solo.rankUp', { rank: t(`quickPlay.solo.rank.${rankNow.key}`) })}
                  </span>
                )}
                {isNearMiss && (
                  <span className={`${badge} bg-neo-orange`} data-testid="quick-near-miss">
                    {t('quickPlay.solo.nearMiss', { pct: String(100 - result.scorePct) })}
                  </span>
                )}
              </div>
            )}

            <QuickResultsStats
              score={result.score}
              scorePct={result.scorePct}
              wordsFound={result.wordsFound}
              animate={animate}
              modeBand={modeColor.bg}
              modeInk={modeColor.text}
            />

            {showPercentile && (
              <p className="text-center text-xs font-bold text-neo-cream">
                {t('quickPlay.solo.betterThan', { pct: String(percentileToday) })}
              </p>
            )}
            {result.mode === 'word-hunt' && result.targetWord && (
              <p className={`text-sm font-bold ${result.targetWordFound ? 'text-neo-lime' : 'text-neo-white/75'}`}>
                {t(result.targetWordFound ? 'quickPlay.solo.targetWordFound' : 'quickPlay.solo.targetWordMissed', {
                  word: result.targetWord.toUpperCase(),
                })}
              </p>
            )}

            <div className="flex flex-wrap items-center justify-center gap-2.5">
              <span
                className="inline-flex items-center gap-1.5 rounded-full border-[3px] border-black bg-neo-navy-elevated px-3 py-1 font-neo-display text-sm font-bold text-neo-yellow shadow-hard"
                data-testid="quick-coins-reward"
              >
                <span ref={coinChipRef} className="block">
                  <CoinArt size={20} />
                </span>
                <span dir="ltr">+{outcome.coins}</span>
              </span>
              <span
                className="inline-flex items-center gap-1 rounded-full border-[3px] border-black bg-neo-navy-elevated px-3 py-1 font-neo-display text-sm font-bold text-neo-purple shadow-hard"
                data-testid="quick-xp-reward"
              >
                ★ <span dir="ltr">+{outcome.xp}</span>
              </span>
              {improvementPct !== null && improvementPct !== 0 && (
                <span
                  className={`rounded-full border-2 px-2.5 py-1 text-xs font-bold ${
                    improvementPct > 0 ? 'border-neo-lime text-neo-lime' : 'border-neo-white/30 text-neo-white/70'
                  }`}
                >
                  {improvementPct > 0 ? '▲' : '▼'} {t('quickPlay.solo.vsAverage', { pct: String(Math.abs(improvementPct)) })}
                </span>
              )}
            </div>
            {isGuest && (
              <p className="text-center text-[11px] text-neo-white/55" data-testid="quick-rewards-pending">
                {t('quickPlay.solo.rewardsPending', 'Sign in to start banking coins and XP')}
              </p>
            )}
          </section>
        </div>

        <section
          className="mx-auto grid w-full max-w-5xl gap-3 px-4 pb-4 lg:grid-cols-2 lg:items-start"
          data-testid="quick-results-details"
        >
          <div className="flex flex-col gap-3">
            <QuickPlayRankCard totalPoints={outcome.totalPoints} percentileToday={percentileToday} scorePct={result.scorePct} />
            <QuickRivalsPassed
              rivals={rivals}
              myScorePct={result.scorePct}
              myName={myName}
              myUserId={user?.id}
              myAvatar={profile?.avatar_config ?? guestAvatar}
            />
            {rival && rival.avatarUserId && (
              <RivalCompareCard
                rivalName={rival.name}
                rivalEmoji={rival.emoji}
                rivalScore={rival.theirValue}
                myScore={rival.myValue}
                rivalAvatar={{ userId: rival.avatarUserId, customAvatar: rival.avatarConfig ?? undefined }}
                myAvatar={user?.id ? { userId: user.id, customAvatar: profile?.avatar_config ?? undefined } : undefined}
                t={t}
              />
            )}
            <QuickResultsModeSwitch currentMode={result.mode} onNextRound={onNextRound} />
          </div>
          <div className="flex flex-col gap-3">
            {collected.length > 0 ? (
              <QuickWordsCollected words={collected} collectionTotal={collectionTotal} />
            ) : (
              <div
                className="flex items-center gap-3 rounded-2xl border-[3px] border-black bg-neo-navy-elevated p-3 shadow-hard"
                data-testid="quick-no-words"
              >
                <InteractiveMascot variant="encouraging" sizeClassName="w-16 h-16 shrink-0" animated={false} />
                <p className="font-neo-display text-sm text-neo-cream">
                  {t('quickPlay.solo.noWords', 'No words this time — the next board is 60 seconds away.')}
                </p>
              </div>
            )}
            <QuickLeaderboardCard entries={board} />
          </div>
        </section>

        {/* Reserves room for the push-notification prompt anchored at
            bottom-[calc(5rem+var(--admob-banner-height,0px))]. */}
        <div
          className="h-[calc(5rem+var(--admob-banner-height,0px)+1.5rem)]"
          data-testid="quick-results-bottom-spacer"
          aria-hidden="true"
        />
      </div>

      <QuickResultsCtaBar onNextRound={onNextRound} onChallenge={onChallenge} shine={animate} />
    </div>
  );
}
