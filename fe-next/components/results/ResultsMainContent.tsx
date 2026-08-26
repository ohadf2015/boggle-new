'use client';

import React, { memo, useMemo, useState, useEffect, useCallback } from 'react';
import { useReducedMotion } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { Sparkles, Type, Star, Coins, ChevronDown, ChevronUp, Share2 } from 'lucide-react';
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
import NextStepPrompt from '@/components/results/NextStepPrompt';
import GetAppMenuRow from '@/components/android-install/GetAppMenuRow';
import { useCrazyGames } from '@/components/CrazyGamesSDK';
import type { NearMiss } from '@/components/results/NearMissCard';
import { NearRankTeaser } from '@/components/multiplayer/NearRankTeaser';
import type { RankTier } from '@/shared/utils/eloRating';
import { ShareButton } from '@/components/results/ShareButton';
import MpBragCard from '@/components/results/MpBragCard';
import { deriveBragCardData, deriveBragShareText } from '@/lib/results/bragCard';
import { getBragShareUrl, trackShareCompleted } from '@/utils/share';
import GameFeedback from '@/components/feedback/GameFeedback';
import InlineSignupCard from '@/components/auth/InlineSignupCard';
import ReferralShareBanner from '@/components/referral/ReferralShareBanner';
import { useIsGuest } from '@/hooks/useIsGuest';
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

/** Shared by the two disclosure toggles below (flex-it strip + show-details).
 *  They differ in icon order, analytics and child wrapping, so they stay two
 *  buttons — only the chrome is common. */
const DISCLOSURE_TOGGLE_CLASS =
  'w-full flex items-center justify-center gap-2 py-2 px-4 border-2 border-black bg-neo-navy-light text-neo-white font-neo-body font-semibold rounded-neo shadow-hard-sm hover:shadow-hard active:shadow-hard-pressed transition-all';

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
  /** Set by the page when a mode-specific scene below already prints the
   *  current player's best word (blast), so the highlights strip drops its
   *  duplicate chip. Same contract as hideStandings. */
  hideBestWord?: boolean;
  allPlayerWords?: Record<string, WordObject[]>;
  /** Extra word lists (other players' unique words, missed words, post-game
   *  review) rendered INSIDE the single "show details" disclosure. Mobile passes
   *  them here instead of stacking them expanded below the recap — they were the
   *  longest content on the screen and none of it answers "did I win". */
  detailsSlot?: React.ReactNode;
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
  hideBestWord,
  shareCardStats,
  detailsSlot,
  onStartGame: _onStartGame,
  onExit,
}) {
  const reducedMotion = useReducedMotion();
  const { dir: _dir, language } = useLanguage();
  const [showDetails, setShowDetails] = useState(false);
  const [showBrag, setShowBrag] = useState(false);

  // Resolution-aware: `isAuthenticated` alone would flash the guest layout at a
  // logged-in player on first paint (rules/60 Class 1).
  const isGuest = useIsGuest(isAuthenticated);
  const { isOnCrazyGamesPlatform } = useCrazyGames();

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
  const { variant: progressHeaderVariant } = useExperiment('exp-mp-round-progress-header-v1');
  const { variant: rivalBestWordVariant } = useExperiment('exp-mp-results-rival-best-word-v1');

  useEffect(() => {
    // Canonical funnel event — same shape as word-wheel / word-hunt / blast so
    // PostHog mode-split dashboards include classic / survival / wheel-rush.
    // Fires for every ResultsMainContent mount (MP results path for those modes).
    trackGrowthEvent('results_viewed', {
      mode: gameMode ?? 'unknown',
      score: currentPlayerData?.score ?? 0,
    });
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
  /**
   * Above four players the podium alone hides most of the room: at fourteen it
   * shows the top 3 and the player's own row, erasing ranks 4–13. Rooms really do
   * run that big (Supabase `game_sessions`: 13→14→15→15→15→14 over six rounds), so
   * past four we list the whole remaining field. At four or fewer, podium + you IS
   * everyone and the single trimmed row stays.
   */
  const showFullField = sortedScores.length > 4;

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
    const stats: Array<{ label: string; value: string | number; icon: React.ReactNode; color: string }> = [];
    // Best word: blast prints it in its own stat card below the standings, and
    // this component can't see that scene — so the page that renders it sets
    // hideBestWord (same contract as hideStandings). Two "BEST WORD" rows on
    // one screen is worse than one, especially since the two are computed
    // differently (longest here, blast's own metric there) and can disagree.
    if (!hideBestWord) {
      stats.push({
        label: t('results.bestWord') || 'Best Word',
        value: displayWord.toUpperCase() || '—',
        icon: <Sparkles className="w-3 h-3" />,
        color: 'text-neo-pink',
      });
    }
    // Words-found lives in exactly ONE place. In word-hunt the hero already
    // shows it as a badge beside the target word ("TARGET / WORDS FOUND"), from
    // this same count — restating it here is the same number twice, one section
    // apart. Every other mode has nothing else carrying it, so it stays.
    if (!isWordHunt) {
      stats.push({
        label: t('results.wordsFound') || 'Words Found',
        value: currentPlayerValidWords.length,
        icon: <Type className="w-3 h-3" />,
        color: 'text-neo-lime',
      });
    }
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
    // exp-mp-results-rival-best-word-v1: show rival's highest-scoring word in 2p games.
    if (showRivals && rivalBestWordVariant === 'show-rival-word' && allPlayerWords && username) {
      const rivalUsername = sortedScores.find(p => p.username !== username)?.username;
      const rivalWords = rivalUsername ? (allPlayerWords[rivalUsername] as WordObject[] | undefined) : undefined;
      if (rivalWords && rivalWords.length > 0) {
        const rivalBest = rivalWords.reduce((best, w) => ((w.score || 0) > (best.score || 0) ? w : best), rivalWords[0]);
        const rivalBestDisplay = language === 'he' ? applyHebrewFinalLetters(rivalBest.word) : rivalBest.word;
        if (rivalBestDisplay) {
          stats.push({
            label: t('results.rivalBestWord') || "Rival's Best",
            value: rivalBestDisplay.toUpperCase(),
            icon: <Sparkles className="w-3 h-3" />,
            color: 'text-neo-pink',
          });
        }
      }
    }
    return stats;
  }, [currentPlayerData, currentPlayerValidWords, uniqueWordsCount, t, language, showRivals, isWordHunt, hideBestWord, isAuthenticated, coinReward, rivalBestWordVariant, allPlayerWords, username, sortedScores]);

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
    // Rhythm carries the hierarchy. Every block here is a bordered hard-shadow
    // card on dark navy, so a uniform gap made ~9 of them read as one flat
    // undifferentiated stack with nothing leading. Related blocks now sit tight
    // (gap-3) inside a beat, and the beats are separated widely (gap-8), so the
    // page reads as three statements — the verdict, how you played, what next —
    // instead of nine equal cards.
    <div className="flex flex-col gap-8">
      {/* Win streak now lives inside ImprovementPanel ("Your Progress") below —
          a single home for streak + XP + level avoids showing the streak twice. */}

      {/* exp-mp-round-progress-header-v1: compact series-progress pill above hero */}
      {progressHeaderVariant === 'progress-header' &&
        isMultiplayer &&
        seriesRoundNumber != null &&
        seriesTotalGames != null &&
        seriesRoundNumber < seriesTotalGames && (
          <div className="text-center text-xs font-neo-body font-semibold text-neo-white/70 bg-neo-navy-light border border-neo-white/20 rounded-neo px-3 py-1.5 tracking-wide">
            {t('results.series.gameXofY', { current: seriesRoundNumber, total: seriesTotalGames })}
          </div>
        )}

      {/* exp-mp-round-feedback-top-v1: top-prompt shows feedback above the fold.
          Guests skip it — their one ask on this screen is the signup CTA. */}
      {feedbackPosition === 'top-prompt' && !isGuest && (
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

      {/* ══ BEAT 1 — THE VERDICT. Rank, score, where everyone landed, series
          progress. One statement, so these sit tight together; every block
          below references it and never restates it at the same size. */}
      <div className="flex flex-col gap-3">
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
      {showPodium && consolationPlayers.length > 0
        && (showFullField || (currentPlayerRank > 3 && consolationPlayers.some(p => p.username === username))) && (
        <ConsolationRows
          players={showFullField ? consolationPlayers : consolationPlayers.filter(p => p.username === username)}
          crowns={consolationCrowns}
          currentUsername={username}
          startRank={showFullField ? 4 : currentPlayerRank}
          showAddFriend={!showFullField}
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
      </div>

      {/* ══ BEAT 2 — HOW YOU PLAYED + WHAT YOU EARNED. Small numbers about you:
          the highlights strip and the XP/level/streak panel are the same kind of
          thing, so they group as one unit rather than two separate announcements
          competing with the verdict above. */}
      <div className="flex flex-col gap-3">
      {currentPlayerData && (
        <HighlightsBar stats={highlightStats} />
      )}

      {/* ── 3b. GUESTS STOP HERE — no XP, level, rank tier or history exists for
          them, so the recap below is empty or meaningless. One signup CTA takes
          the place of the whole secondary stack. */}
      {isGuest && <InlineSignupCard isAuthenticated={isAuthenticated} />}

      {/* ── 3c. AUTHENTICATED PLAYERS — the incentivized referral CTA (code +
          coin/XP reward) that previously only reached players who opted into
          visiting the leaderboard page. Every finished game is now an
          impression at the highest-intent moment. Mirrors InlineSignupCard's
          guard above (`!isGuest`, the auth-resolved flag) so the two CTAs
          never double up mid-resolution; the component self-gates further on
          having a referral code loaded. */}
      {!isGuest && <ReferralShareBanner />}

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
      </div>

      {/* ══ BEAT 3 — WHAT NEXT. Brag, round feedback, revenge framing and the
          details drill-down. All optional/secondary: none of it competes with
          the sticky play-again bar, which stays the one primary action. */}
      <div className="flex flex-col gap-3">

      {/* ── 5. FLEX IT — a one-line strip, not a card. Expanded, MpBragCard is a
          ~350px block that re-prints avatar + name + score + rival + rival score
          (the verdict, again, two beats later) and carries a PRIMARY-styled
          "Challenge a friend" button competing with the sticky play-again bar for
          the same tap. Sharing is opt-in, so it costs one line until asked for.
          mp_brag_card_viewed still fires on mount — the impression is the strip,
          so the metric keeps meaning the same thing; opening is its own event. */}
      {bragData && (
        <button
          type="button"
          onClick={() => {
            setShowBrag(v => !v);
            if (!showBrag) {
              trackGrowthEvent('mp_brag_card_expanded', {
                gameMode: gameMode ?? 'unknown',
                outcome: bragData.data.outcome,
                language,
              });
            }
          }}
          className={DISCLOSURE_TOGGLE_CLASS}
        >
          <Share2 className="w-4 h-4 text-neo-pink" />
          {t('brag.strip')}
          {showBrag ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      )}
      {bragData && showBrag && (
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
      {feedbackPosition !== 'top-prompt' && !isGuest && (
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

      {/* 6. DETAILS — ONE disclosure for every word list on the screen, collapsed
          by default. Your words, everyone else's unique words, the missed words
          and the post-game review all live in here (mobile passes the latter
          three through `detailsSlot`). They were the tallest content on the page
          and none of it answers "did I win / play again", so it stays one tap
          away instead of pushing the rematch bar off the bottom of a long scroll.
          Gated on `currentPlayerData || detailsSlot`, not on currentPlayerData
          alone: it is null whenever the username doesn't match a row in
          finalScores (spectator, post-reconnect mismatch), and the slot content
          is about the OTHER players — it must not vanish with your own row. */}
      {(currentPlayerData || detailsSlot) && !hideDetailsToggle && !isGuest && (
        <div>
          <button
            type="button"
            onClick={() => setShowDetails(v => !v)}
            className={DISCLOSURE_TOGGLE_CLASS}
          >
            {showDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            {t('results.showDetails')}
          </button>
          {showDetails && (
            <div className="mt-4 space-y-4">
              {currentPlayerData && (
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
              )}
              {detailsSlot}
            </div>
          )}
        </div>
      )}

      {/* 7. CROSS-SURFACE EXITS — the only routes off this screen that aren't
          "play another multiplayer round" or "leave". Deliberately LAST: the
          rematch/ready controls above are the primary action and must not be
          out-competed.

          Suppressed entirely on CrazyGames: multiplayer is the only mode
          published there, so a daily-challenge CTA points at a surface that
          platform doesn't have, and the Play Store isn't its distribution
          channel. This guard came from `ResultsCtaSection`, which held both
          CTAs and was imported by nothing but its own test — which is why the
          daily challenge had no entry point from the busiest surface in the
          product (4,963 mp_results_viewed/14d against 151 daily opens). */}
      {!isOnCrazyGamesPlatform && (
        <>
          <NextStepPrompt
            currentMode="multiplayer-bots"
            onBackToLobby={onExit}
            variant="mobile"
            hideBackButton
          />

          {/* A game just finished — the highest-intent moment for the install
              ask. Existing durable row, not a new surface: it self-gates to
              platforms that can install and renders inline, so it cannot repeat
              #842 (promo painting over a live board). */}
          <GetAppMenuRow source="results" />
        </>
      )}
      </div>
    </div>
  );
});

ResultsMainContent.displayName = 'ResultsMainContent';

export default ResultsMainContent;
