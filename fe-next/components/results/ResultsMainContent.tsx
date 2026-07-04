'use client';

import React, { memo, useMemo, useState, useEffect, useCallback } from 'react';
import { useReducedMotion } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { Sparkles, Type, Star, Coins, ChevronDown, ChevronUp } from 'lucide-react';
import type { Player, WordObject } from '@/components/results/types';
import { assignConsolationCrowns } from '@/utils/consolationCrowns';
import { selectUniqueWords } from '@/lib/results/selectUniqueWords';
import { applyHebrewFinalLetters } from '@/shared/utils/wordNormalization';

// New cinematic components
import ResultsHeroSection from '@/components/results/ResultsHeroSection';
import ResultsPodium from '@/components/results/ResultsPodium';
import ConsolationRows from '@/components/results/ConsolationRows';
import HighlightsBar from '@/components/results/HighlightsBar';
import { ResultsRevengeSection } from '@/components/results/ResultsRevengeSection';
import ResultsRivalsPanel from '@/components/results/ResultsRivalsPanel';
import ImprovementPanel from '@/components/results/ImprovementPanel';
import type { XpGainedData, LevelUpData } from '@/types/components';

import type { GameModeOption } from '@/components/GameModeSelector';
import type { SeriesStanding } from '@/hooks/useSeriesTracker';
import SeriesStandingsBanner from '@/components/results/SeriesStandingsBanner';
import type { CoinReward } from '@/components/results/CoinRewardDisplay';

import { ResultsWordsSection } from '@/components/results/ResultsWordsSection';
import type { NearMiss } from '@/components/results/NearMissCard';
import { NearRankTeaser } from '@/components/multiplayer/NearRankTeaser';
import type { RankTier } from '@/shared/utils/eloRating';
import { ShareButton } from '@/components/results/ShareButton';
import MpBragCard from '@/components/results/MpBragCard';
import { deriveBragCardData, deriveBragShareText } from '@/lib/results/bragCard';
import { getBragShareUrl, trackShareCompleted } from '@/utils/share';
import GameFeedback from '@/components/feedback/GameFeedback';
import { trackGrowthEvent } from '@/utils/growthTracking';
import { useExperiment } from '@/hooks/useExperiment';


// ==============================================
// TYPES
// ==============================================

interface WinStreakData {
  currentStreak: number;
  bestStreak: number;
  isNewMilestone: boolean;
  previousStreak: number;
}

/** Translation function type */
type TFunction = (key: string, params?: Record<string, string | number>) => string;

/** Mode names are brand proper-nouns shown on the brag card badge. */
const BRAG_MODE_LABEL: Record<string, string> = {
  classic: 'CLASSIC',
  blast: 'BLAST',
  'word-hunt': 'WORD HUNT',
  'wheel-rush': 'WHEEL RUSH',
};

export interface ResultsMainContentProps {
  sortedScores: Player[];
  nearMisses: NearMiss[];
  isHost: boolean;
  onStartGame: () => void;
  onMarkReady: () => void;
  onExit: () => void;
  winStreakData: WinStreakData | null;
  /** Server-authoritative XP earned this game (drives the Improvement panel). */
  xpGainedData?: XpGainedData | null;
  /** Server-authoritative level-up payload (drives the Improvement panel flourish). */
  levelUpData?: LevelUpData | null;
  isAuthenticated: boolean;
  currentPlayerData: Player | null;
  isCurrentUserWinner: boolean;
  currentPlayerValidWords: Array<{ word: string; score: number }>;
  currentPlayerRank: number;
  scoreRevealComplete?: boolean;
  setScoreRevealComplete?: (complete: boolean) => void;
  normalizeUsername: (name: string | undefined | null) => string;
  username: string | undefined;
  gameCode?: string;
  onReturnToRoom?: () => void;
  isBotsOnlyGame: boolean;
  isCurrentPlayerReady: boolean;
  readyUsernames: string[];
  duplicateRuleDisabled: boolean;
  onShowDetails?: () => void;
  t: TFunction;
  selectedGameMode?: GameModeOption;
  onSelectGameMode?: (mode: GameModeOption) => void;
  seriesStandings?: SeriesStanding[];
  seriesRoundNumber?: number;
  seriesTotalGames?: number;
  seriesLeader?: string | null;
  gameMode?: string;
  missedWords?: Array<{ word: string; score: number; foundBy: string[] }>;
  emojiReactions?: Array<{ id: string; emoji: string; username: string; timestamp: number }>;
  hideInlineCta?: boolean;
  /** Hide the "show details" toggle (e.g. mobile where details are already inline below) */
  hideDetailsToggle?: boolean;
  /** Suppress the generic Top-3 Podium + Consolation rows. Set for wheel-rush,
   *  where WheelRushResultsScene already shows every placement on the wheel, so
   *  the standings here would just duplicate names/scores/avatars/ranks. */
  hideStandings?: boolean;
  allPlayerWords?: Record<string, WordObject[]>;
  gameDuration?: number;
  /** Callback for podium emoji reactions */
  onPodiumReaction?: (reactionId: string, targetUsername: string) => void;
  /** All player words for crown + MVP computation */
  /** Near rank teaser data */
  nearRankData?: { nextTier: RankTier; eloNeeded: number } | null;
  /** Word Hunt summary */
  wordHuntSummary?: {
    targetWord: string;
    playerLives: Record<string, number>;
    eliminatedPlayers: string[];
    targetFoundBy: string | null;
    survivalTime?: number;
  };
  /** Coin reward earned this game */
  coinReward?: CoinReward | null;
  /** Share card stats for the share button */
  shareCardStats?: { maxCombo?: number; longestWord?: string };
}

// ==============================================
// COMPONENT
// ==============================================

/**
 * ResultsMainContent - Cinematic results view
 *
 * YOU-FIRST order: Hero → Podium → ConsolationRows → Highlights → Revenge → Details
 */
export const ResultsMainContent: React.FC<ResultsMainContentProps> = memo(function ResultsMainContent({
  sortedScores,
  currentPlayerData,
  currentPlayerValidWords,
  currentPlayerRank,
  username,
  gameCode,
  gameMode,
  t,
  allPlayerWords,
  gameDuration: _gameDuration,
  winStreakData,
  xpGainedData,
  levelUpData,
  nearRankData,
  wordHuntSummary,
  onPodiumReaction,
  emojiReactions: _emojiReactions,
  seriesStandings,
  seriesRoundNumber,
  seriesTotalGames,
  seriesLeader,
  missedWords: _missedWords,
  coinReward,
  isAuthenticated,
  isCurrentUserWinner,
  hideDetailsToggle,
  hideStandings,
  shareCardStats,
  onStartGame: _onStartGame,
}) {
  const reducedMotion = useReducedMotion();
  const { dir: _dir, language } = useLanguage();
  const [showDetails, setShowDetails] = useState(false);

  // Derived data
  const winnerScore = sortedScores[0]?.score ?? 0;
  const gapToWinner = currentPlayerRank > 1 ? winnerScore - (currentPlayerData?.score ?? 0) : 0;
  const isWordHunt = gameMode === 'word-hunt';
  const isMultiplayer = sortedScores.length > 1;

  // Standings dedup (see JSX §2). The old layout stacked Podium AND RivalsPanel
  // AND a consolation row, restating the player's rank/score up to 3×. Now we
  // show exactly ONE standings block, sized to the lobby:
  //   • 2 players  → head-to-head RivalsPanel (you vs them, with delta).
  //   • 3+ players → Top-3 Podium (your own row added below when you placed 4th+).
  // hideStandings (wheel-rush/blast — their scene owns placement) turns it all off.
  const showRivals = !hideStandings && isMultiplayer && sortedScores.length === 2;
  const showPodium = !hideStandings && isMultiplayer && sortedScores.length >= 3;

  const { variant: feedbackPosition } = useExperiment('exp-mp-round-feedback-top-v1');
  const { variant: gapNudgeVariant } = useExperiment('exp-mp-score-gap-nudge-v1');

  useEffect(() => {
    if (isMultiplayer) {
      trackGrowthEvent('mp_results_viewed', { gameMode: gameMode ?? 'unknown', language });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Challenge CTA analytics
  const handleChallengeCta = useCallback(() => {
    trackGrowthEvent('mp_results_challenge_cta', {
      gameMode: gameMode ?? 'unknown',
      language,
      surface: 'mp_brag_card',
    });
  }, [gameMode, language]);

  // Split players: top 3 for podium, 4th+ for consolation rows
  const podiumPlayers = useMemo(() => sortedScores.slice(0, 3), [sortedScores]);
  const consolationPlayers = useMemo(() => sortedScores.slice(3), [sortedScores]);

  // Assign consolation crowns to 4th+ players
  const consolationCrowns = useMemo(() => {
    const topThree = podiumPlayers.map(p => p.username);
    const playersWithStats = sortedScores.map(p => {
      const words = allPlayerWords?.[p.username]?.map((w: WordObject | string) => ({
        word: typeof w === 'string' ? w : w.word || '',
        score: typeof w === 'string' ? 0 : w.score || 0,
      }));
      return {
        username: p.username,
        score: p.score,
        wordsFoundCount: words?.length || p.allWords?.length || 0,
        allWords: words || p.allWords?.map(w => ({ word: w.word, score: w.score || 0 })),
      };
    });
    return assignConsolationCrowns(playersWithStats, topThree);
  }, [sortedScores, podiumPlayers, allPlayerWords]);

  // Count words only current player found. Derived from the SAME selector the
  // UniqueWordsSection list uses, so the "Only You" badge can't drift from the
  // chips shown below (the old inline count ignored opponents' isDuplicate flag
  // and could over/under-count vs the list).
  const uniqueWordsCount = useMemo(() => {
    if (!currentPlayerData || !allPlayerWords || !username) return 0;
    return selectUniqueWords(allPlayerWords, username).length;
  }, [currentPlayerData, allPlayerWords, username]);

  // Compute highlights stats
  const highlightStats = useMemo(() => {
    if (!currentPlayerData) return [];
    const longestWord = currentPlayerValidWords.reduce(
      (best, w) => (w.word.length > best.length ? w.word : best),
      ''
    );
    const displayWord = language === 'he' ? applyHebrewFinalLetters(longestWord) : longestWord;
    const stats = [
      {
        label: t('results.bestWord') || 'Best Word',
        value: displayWord.toUpperCase() || '—',
        icon: <Sparkles className="w-3 h-3" />,
        color: 'text-neo-pink',
      },
      {
        label: t('results.wordsFound') || 'Words Found',
        value: currentPlayerValidWords.length,
        icon: <Type className="w-3 h-3" />,
        color: 'text-neo-lime',
      },
    ];
    // "Only You" lives in exactly ONE place. When the RivalsPanel renders (2p) it
    // already brags this count richer ("✨ Only you found N"), so showing it again
    // here is the same number twice, adjacent. Keep it for 3+ games (podium has no
    // unique-words line to carry it).
    if (!showRivals) {
      stats.push({
        label: t('results.uniqueWords.label') || 'Only You',
        value: uniqueWordsCount,
        icon: <Star className="w-3 h-3" />,
        color: 'text-neo-cyan',
      });
    }
    // Coins fold into this stats strip instead of owning a near-empty full-width
    // row of their own (the old standalone RewardsSummary card). Only for signed-in
    // players who actually earned coins — guests don't earn, so a "+N" there would
    // mislead (their conversion path is the signup nudge sheet, not this chip).
    if (isAuthenticated && coinReward && coinReward.awarded > 0) {
      stats.push({
        label: t('results.coinsEarned') || 'Coins',
        value: `+${coinReward.awarded}`,
        icon: <Coins className="w-3 h-3" />,
        color: 'text-neo-lime',
      });
    }
    return stats;
  }, [currentPlayerData, currentPlayerValidWords, uniqueWordsCount, t, language, showRivals, isAuthenticated, coinReward]);

  // Share params for the share button
  const shareParams = useMemo(() => {
    if (!currentPlayerData) return null;
    type ShareGameMode = 'singleplayer' | 'multiplayer' | 'blast' | 'daily' | 'adventure' | 'wordHunt';
    const modeMap: Record<string, ShareGameMode> = {
      blast: 'blast',
      'word-hunt': 'wordHunt',
    };
    const resolvedMode: ShareGameMode = modeMap[gameMode ?? ''] ?? 'multiplayer';
    return {
      gameMode: resolvedMode,
      score: currentPlayerData.score,
      wordsFound: currentPlayerValidWords.length,
      longestWord: shareCardStats?.longestWord,
      maxCombo: shareCardStats?.maxCombo,
      won: isCurrentUserWinner,
      opponentScore: sortedScores.find(p => p.username !== username)?.score,
    };
  }, [currentPlayerData, currentPlayerValidWords.length, shareCardStats, isCurrentUserWinner, sortedScores, username, gameMode]);

  // Brag card — screenshot-first MP share artifact. MP-only; reuses the same
  // derived stats as shareParams. The card is built to be screenshotted (no
  // Share button), so the play link is printed on it.
  const bragData = useMemo(() => {
    if (!currentPlayerData || !isMultiplayer) return null;
    const opponent = sortedScores.find(p => p.username !== username);
    const name = username ?? currentPlayerData.username;
    return {
      data: deriveBragCardData({
        gameMode,
        isWinner: isCurrentUserWinner,
        rank: currentPlayerRank,
        playerCount: sortedScores.length,
        score: currentPlayerData.score,
        wordsFound: currentPlayerValidWords.length,
        longestWord: shareCardStats?.longestWord,
        maxCombo: shareCardStats?.maxCombo,
        opponentName: opponent?.username,
        opponentScore: opponent?.score,
        locale: language,
      }),
      current: { name, avatar: currentPlayerData.avatar, score: currentPlayerData.score },
      opponent: opponent
        ? { name: opponent.username, avatar: opponent.avatar, score: opponent.score }
        : undefined,
    };
  }, [currentPlayerData, isMultiplayer, sortedScores, username, isCurrentUserWinner, currentPlayerRank, currentPlayerValidWords.length, shareCardStats, gameMode, language]);

  useEffect(() => {
    if (bragData) {
      trackGrowthEvent('mp_brag_card_viewed', {
        gameMode: gameMode ?? 'unknown',
        outcome: bragData.data.outcome,
        language,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bragData?.data.outcome]);

  // Word Hunt status for current player
  const wordHuntStatus = useMemo(() => {
    if (!isWordHunt || !wordHuntSummary || !username) return undefined;
    return wordHuntSummary.eliminatedPlayers.includes(username) ? 'eliminated' as const : 'survived' as const;
  }, [isWordHunt, wordHuntSummary, username]);

  return (
    <div className="space-y-6">
      {/* Win streak now lives inside ImprovementPanel ("Your Progress") below —
          a single home for streak + XP + level avoids showing the streak twice. */}

      {/* exp-mp-round-feedback-top-v1: top-prompt shows feedback above the fold */}
      {feedbackPosition === 'top-prompt' && (
        <GameFeedback
          surface="mp_round"
          eligible={
            isMultiplayer &&
            !!gameCode &&
            !(seriesRoundNumber != null && seriesRoundNumber >= (seriesTotalGames ?? 3))
          }
          gameMode={gameMode}
          language={language}
          throttleKey={gameCode}
        />
      )}

      {/* Near Rank Teaser */}
      {nearRankData && (
        <NearRankTeaser nextTier={nearRankData.nextTier} eloNeeded={nearRankData.eloNeeded} />
      )}

      {/* exp-mp-score-gap-nudge-v1: between-round gap nudge for non-winners */}
      {gapNudgeVariant === 'gap-nudge' &&
        isMultiplayer &&
        !isCurrentUserWinner &&
        seriesRoundNumber != null &&
        seriesRoundNumber < (seriesTotalGames ?? 3) &&
        currentPlayerData &&
        sortedScores[0] && (
          <div className="rounded-neo border-2 border-neo-pink bg-neo-pink/10 px-4 py-2 text-center text-sm font-neo-body text-neo-pink">
            {t('results.mpGapNudge', { gap: String(sortedScores[0].score - currentPlayerData.score) })}
          </div>
        )}

      {/* ── 1. YOUR RESULT — the verdict: rank, score, gap to #1. The one big
          standing statement; every block below references it, never restates it
          at the same size. */}
      {currentPlayerData && (
        <ResultsHeroSection
          rank={currentPlayerRank}
          score={currentPlayerData.score}
          username={currentPlayerData.username}
          avatar={currentPlayerData.avatar}
          winnerScore={winnerScore}
          totalPlayers={sortedScores.length}
          isWordHunt={isWordHunt}
          wordHuntStatus={wordHuntStatus}
          wordHuntTarget={wordHuntSummary?.targetWord}
          wordsFound={currentPlayerValidWords.length}
          t={t}
        />
      )}

      {/* ── 2. STANDINGS — exactly ONE block (see showRivals/showPodium above).
          2p → head-to-head rivals; 3+ → Top-3 podium with your own row added
          when you placed 4th+. Replaces the old Podium+Rivals+Consolation stack. */}
      {showRivals && (
        <ResultsRivalsPanel
          sortedScores={sortedScores}
          username={username}
          t={t}
          reducedMotion={reducedMotion}
          allPlayerWords={allPlayerWords as Record<string, WordObject[]> | undefined}
        />
      )}
      {showPodium && (
        <ResultsPodium
          players={podiumPlayers}
          currentUsername={username}
          isWordHunt={isWordHunt}
          t={t}
          onReaction={onPodiumReaction}
        />
      )}
      {showPodium && currentPlayerRank > 3 && consolationPlayers.some(p => p.username === username) && (
        <ConsolationRows
          players={consolationPlayers.filter(p => p.username === username)}
          crowns={consolationCrowns}
          currentUsername={username}
          startRank={currentPlayerRank}
          t={t}
        />
      )}

      {/* SERIES STANDINGS — best-of-N progress sits with the standings. */}
      {seriesStandings && seriesRoundNumber != null && (
        <SeriesStandingsBanner
          standings={seriesStandings}
          roundNumber={seriesRoundNumber}
          totalGames={seriesTotalGames}
          seriesLeader={seriesLeader}
          currentUsername={username}
          t={t}
        />
      )}

      {/* ── 3. HOW YOU PLAYED — best word / words found / only-you. */}
      {currentPlayerData && (
        <HighlightsBar stats={highlightStats} />
      )}

      {/* ── 4. WHAT YOU EARNED — XP / level / streak. ImprovementPanel renders
          nothing for guests w/ no progress. Coins no longer get their own
          near-empty full-width card here — they fold into the HighlightsBar
          stats strip above (see highlightStats). The solo/daily share button
          is the only thing left that earns this row. */}
      <ImprovementPanel
        xp={xpGainedData ?? null}
        levelUp={levelUpData ?? null}
        streak={winStreakData}
        t={t}
        reducedMotion={reducedMotion}
      />
      {shareParams && !isMultiplayer && (
        <div className="flex flex-wrap items-stretch gap-2">
          <ShareButton params={shareParams} t={t} className="shrink-0" />
        </div>
      )}

      {/* ── 5. FLEX IT — the brag card lands AFTER result + stats + rewards, so
          sharing reads as the reward beat instead of interrupting the recap mid-
          stream (where it used to sit, between score and standings). MP-only,
          screenshot-first: no Share button, the play link is printed on the card. */}
      {bragData && (
        <MpBragCard
          data={bragData.data}
          current={bragData.current}
          opponent={bragData.opponent}
          modeLabel={BRAG_MODE_LABEL[gameMode ?? ''] ?? 'MULTIPLAYER'}
          // The room stays open through results (held for the rematch), so the
          // card carries a LIVE join link — a shared link lands the friend in
          // the room for the next round, not on the homepage.
          shareUrl={getBragShareUrl(gameCode)}
          shareText={(() => {
            const { key, params } = deriveBragShareText(bragData.data, bragData.current.score);
            return t(key, params);
          })()}
          onCopyLink={() =>
            trackGrowthEvent('mp_brag_card_copy_link', {
              gameMode: gameMode ?? 'unknown',
              outcome: bragData.data.outcome,
              language,
              hasRoomLink: !!gameCode,
            })
          }
          onNativeShare={() => {
            trackGrowthEvent('mp_brag_card_native_share', {
              gameMode: gameMode ?? 'unknown',
              outcome: bragData.data.outcome,
              language,
              hasRoomLink: !!gameCode,
            });
            trackShareCompleted('web_share_api', { surface: 'mp_brag_card' });
          }}
          onChallenge={handleChallengeCta}
          t={t}
        />
      )}

      {/* BETWEEN-ROUNDS FEEDBACK — one-tap round sentiment → PostHog
          (game_feedback, surface=mp_round). Eligible only between live rounds
          (multiplayer + room + not the series finale); the shared throttle in
          useGameFeedback keeps it to ~once every few days. top-prompt variant
          renders above the fold instead (see top of return). */}
      {feedbackPosition !== 'top-prompt' && (
        <GameFeedback
          surface="mp_round"
          eligible={
            isMultiplayer &&
            !!gameCode &&
            !(seriesRoundNumber != null && seriesRoundNumber >= (seriesTotalGames ?? 3))
          }
          gameMode={gameMode}
          language={language}
          throttleKey={gameCode}
        />
      )}

      {/* 5. REVENGE CARD — the witty motivational line + VS framing. Shown ONLY
          where RivalsPanel is suppressed (blast/wheel-rush, hideStandings): those
          modes' own scenes carry the standings, so Revenge adds the charm layer
          without duplicating the rival deltas RivalsPanel already shows. */}
      {isMultiplayer && hideStandings && currentPlayerData && sortedScores.length > 1 && (
        <ResultsRevengeSection
          sortedScores={sortedScores}
          currentPlayerData={currentPlayerData}
          currentPlayerRank={currentPlayerRank}
          gapToWinner={gapToWinner}
          gameMode={gameMode}
          reducedMotion={reducedMotion}
          revengeDelay={0.3}
          t={t}
        />
      )}

      {/* 6. DETAILS (collapsed by default — hidden on mobile where details are already inline) */}
      {currentPlayerData && !hideDetailsToggle && (
        <div>
          <button
            type="button"
            onClick={() => setShowDetails(v => !v)}
            className="w-full flex items-center justify-center gap-2 py-2 px-4 border-2 border-black bg-neo-navy-light text-neo-white font-neo-body font-semibold rounded-neo shadow-hard-sm hover:shadow-hard active:shadow-hard-pressed transition-all"
          >
            {showDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            {t('results.showDetails')}
          </button>
          {showDetails && (
            <div className="mt-4">
              <ResultsWordsSection
                currentPlayerData={currentPlayerData}
                currentPlayerValidWords={currentPlayerValidWords}
                currentPlayerRank={currentPlayerRank}
                reducedMotion={reducedMotion}
                statsDelay={0}
                wordsDelay={0.1}
                isStatsVisible
                isWordsVisible
                t={t}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
});

ResultsMainContent.displayName = 'ResultsMainContent';

export default ResultsMainContent;
