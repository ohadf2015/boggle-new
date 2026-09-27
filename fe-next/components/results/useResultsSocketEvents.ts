/**
 * useResultsSocketEvents - Hook for managing socket events on the results page
 *
 * Handles:
 * - Word feedback (crowd-sourced validation)
 * - XP gained notifications
 * - Level up celebrations
 * - Near-miss notifications
 * - Mystery rewards
 * - Referral milestones
 * - Players ready for next game
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import type { Socket } from 'socket.io-client';
import logger from '@/utils/logger';
import { useLanguage } from '@/contexts/LanguageContext';
import { neoInfoToast } from '@/components/NeoToast';
import type { NearMiss } from './NearMissCard';
import type { ReferralMilestone } from '@/shared/types/socket';
import type { WordToVote, XpGainedData, LevelUpData } from '@/types/components';
import type { OneMoreGamePrompt } from '@/shared/types/engagement';

// Delay before the "Build our dictionary" voting modal appears on the results
// page. Showing it immediately covers the rematch / next-round flow, so we wait
// ~10s and only ever show it once per results page.
const WORD_FEEDBACK_DELAY_MS = 10_000;

export interface ResultsSocketEventsState {
  // Word feedback state
  showWordFeedback: boolean;
  wordToVote: WordToVote | null;
  wordQueue: WordToVote[];

  // XP and Level state
  xpGainedData: XpGainedData | null;
  levelUpData: LevelUpData | null;
  showLevelUpCelebration: boolean;

  // Near-miss notifications
  nearMisses: NearMiss[];

  // Referral milestone state
  referralMilestone: ReferralMilestone | null;
  showReferralMilestone: boolean;

  // Players ready state
  readyUsernames: string[];
  isCurrentPlayerReady: boolean;
}

export interface ResultsSocketEventsActions {
  handleVote: (voteType: 'like' | 'dislike', votedWord?: string) => void;
  handleFeedbackSkip: () => void;
  handleReferralMilestoneClose: () => void;
  handleMarkReady: () => void;
  setShowLevelUpCelebration: (show: boolean) => void;
  setLevelUpData: (data: LevelUpData | null) => void;
}

export interface UseResultsSocketEventsProps {
  socket: Socket | null;
  username?: string;
}

export function useResultsSocketEvents({
  socket,
  username,
}: UseResultsSocketEventsProps): ResultsSocketEventsState & ResultsSocketEventsActions {
  const { t } = useLanguage();

  // Word feedback state
  const [showWordFeedback, setShowWordFeedback] = useState(false);
  const [wordToVote, setWordToVote] = useState<WordToVote | null>(null);
  const [wordQueue, setWordQueue] = useState<WordToVote[]>([]);

  // XP and Level state
  const [xpGainedData, setXpGainedData] = useState<XpGainedData | null>(null);
  const [levelUpData, setLevelUpData] = useState<LevelUpData | null>(null);
  const [showLevelUpCelebration, setShowLevelUpCelebration] = useState(false);

  // Near-miss notifications
  const [nearMisses, setNearMisses] = useState<NearMiss[]>([]);

  const hasShownLevelUpRef = useRef<boolean>(false); // Prevent duplicate level-up celebrations
  const hasShownWordFeedbackRef = useRef<boolean>(false); // Show the dictionary-building modal only once per results page
  const wordFeedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null); // Delays the dictionary modal so it never covers the rematch flow

  // Referral milestone state
  const [referralMilestone, setReferralMilestone] = useState<ReferralMilestone | null>(null);
  const [showReferralMilestone, setShowReferralMilestone] = useState(false);

  // Players ready state
  const [readyUsernames, setReadyUsernames] = useState<string[]>([]);
  const [isCurrentPlayerReady, setIsCurrentPlayerReady] = useState(false);

  // Socket event listeners for word feedback, XP, and engagement features
  useEffect(() => {
    if (!socket) return;

    const handleShowWordFeedback = (data: {
      word: string;
      submittedBy: string;
      submitterAvatar?: { emoji: string; color: string } | null;
      voteInfo?: { votesFor?: number; votesAgainst?: number; approvalCount?: number; disapprovalCount?: number };
      timeoutSeconds?: number;
      gameCode: string;
      language: string;
      wordQueue?: WordToVote[];
    }) => {
      logger.log('[RESULTS] Received word feedback request:', data);

      // Only ever surface the dictionary-building modal once per results page —
      // repeated socket emissions (or re-entry) must not re-pop it.
      if (hasShownWordFeedbackRef.current) {
        logger.log('[RESULTS] Word feedback already shown on this page — ignoring');
        return;
      }
      hasShownWordFeedbackRef.current = true;

      // Handle new word queue format (self-healing system)
      // Limit to 2 words to avoid overwhelming the user with modals
      const limitedQueue = (data.wordQueue && data.wordQueue.length > 0)
        ? data.wordQueue.slice(0, 2)
        : null;
      if (limitedQueue) {
        logger.log('[RESULTS] Word queue limited to', limitedQueue.length, 'of', data.wordQueue!.length, 'words for voting');
      }

      // Transform voteInfo to match expected VoteInfo interface
      const transformedVoteInfo = data.voteInfo ? {
        approvalCount: data.voteInfo.votesFor ?? data.voteInfo.approvalCount,
        disapprovalCount: data.voteInfo.votesAgainst ?? data.voteInfo.disapprovalCount
      } : undefined;

      // Delay so the modal never lands on top of the rematch / next-round flow.
      if (wordFeedbackTimerRef.current) clearTimeout(wordFeedbackTimerRef.current);
      wordFeedbackTimerRef.current = setTimeout(() => {
        if (limitedQueue) setWordQueue(limitedQueue);
        setWordToVote({
          word: data.word,
          submittedBy: data.submittedBy,
          submitterAvatar: data.submitterAvatar,
          voteInfo: transformedVoteInfo,
          timeoutSeconds: data.timeoutSeconds || 10,
          gameCode: data.gameCode,
          language: data.language
        });
        setShowWordFeedback(true);
      }, WORD_FEEDBACK_DELAY_MS);
    };

    const handleVoteRecorded = (data: { success: boolean; message?: string }) => {
      logger.log('[RESULTS] Vote recorded:', data);
    };

    const handleXpGained = (data: XpGainedData) => {
      logger.log('[RESULTS] XP gained:', data);
      setXpGainedData(data);
    };

    const handleLevelUp = (data: LevelUpData) => {
      if (hasShownLevelUpRef.current) return;
      hasShownLevelUpRef.current = true;
      logger.log('[RESULTS] Level up!', data);
      setLevelUpData(data);
      setShowLevelUpCelebration(true);
    };

    const handleNearMisses = (data: { nearMisses: NearMiss[] }) => {
      logger.log('[RESULTS] Near-miss notifications:', data);
      if (data.nearMisses && data.nearMisses.length > 0) {
        setNearMisses(data.nearMisses);
      }
    };

    const handleReferralMilestone = (data: { milestone: ReferralMilestone }) => {
      logger.log('[RESULTS] Referral milestone received:', data);
      if (data.milestone) {
        setReferralMilestone(data.milestone);
        setShowReferralMilestone(true);
      }
    };

    const handleOneMoreGame = (data: { prompt: OneMoreGamePrompt }) => {
      logger.log('[RESULTS] One more game prompt received:', data);
      if (!data?.prompt) return;
      const { prompt } = data;
      const title = prompt.title || t('oneMoreGame.defaultTitle');
      const message = prompt.message || t('oneMoreGame.defaultMessage');
      neoInfoToast(title, { description: message, duration: 8000 });
    };

    const handleWeeklyQuestCompleted = (data: { questType: string; xpReward: number; description: string }) => {
      import('@/components/quests/QuestCompletionToast').then(({ showQuestCompletionToast }) => {
        showQuestCompletionToast({
          questName: t(data.description),
          xpReward: data.xpReward,
          dedupKey: `weekly:${data.questType}`,
          t,
        });
      });
    };

    socket.on('showWordFeedback', handleShowWordFeedback);
    socket.on('voteRecorded', handleVoteRecorded);
    socket.on('xpGained', handleXpGained);
    socket.on('levelUp', handleLevelUp);
    socket.on('engagement:nearMisses', handleNearMisses);
    socket.on('engagement:referralMilestone', handleReferralMilestone);
    socket.on('engagement:oneMoreGame', handleOneMoreGame);
    socket.on('weeklyQuestCompleted', handleWeeklyQuestCompleted);

    return () => {
      socket.off('showWordFeedback', handleShowWordFeedback);
      socket.off('voteRecorded', handleVoteRecorded);
      socket.off('xpGained', handleXpGained);
      socket.off('levelUp', handleLevelUp);
      socket.off('engagement:nearMisses', handleNearMisses);
      socket.off('engagement:referralMilestone', handleReferralMilestone);
      socket.off('engagement:oneMoreGame', handleOneMoreGame);
      socket.off('weeklyQuestCompleted', handleWeeklyQuestCompleted);
      if (wordFeedbackTimerRef.current) {
        clearTimeout(wordFeedbackTimerRef.current);
        wordFeedbackTimerRef.current = null;
      }
    };
  }, [socket, t]);

  // Socket listener for players ready for next game updates
  useEffect(() => {
    if (!socket) return;

    const handlePlayersReadyUpdate = (data: {
      readyCount: number;
      totalPlayers: number;
      username?: string;
      readyUsernames?: string[];
    }) => {
      logger.log('[RESULTS] Players ready update:', data);
      if (data.readyUsernames) {
        setReadyUsernames(data.readyUsernames);
        if (username && data.readyUsernames.includes(username)) {
          setIsCurrentPlayerReady(true);
        }
      } else if (data.username) {
        setReadyUsernames(prev => {
          if (prev.includes(data.username!)) return prev;
          return [...prev, data.username!];
        });
        if (data.username === username) {
          setIsCurrentPlayerReady(true);
        }
      }
    };

    socket.on('playersReadyUpdate', handlePlayersReadyUpdate);
    socket.emit('getPlayersReadyCount');

    return () => {
      socket.off('playersReadyUpdate', handlePlayersReadyUpdate);
    };
  }, [socket, username]);

  // Handle word feedback vote
  const handleVote = useCallback((voteType: 'like' | 'dislike', votedWord?: string) => {
    if (!socket || !wordToVote) return;

    const wordToSubmit = votedWord || wordToVote.word;

    logger.log('[RESULTS] Submitting vote:', { word: wordToSubmit, voteType });
    socket.emit('submitWordVote', {
      word: wordToSubmit,
      language: wordToVote.language,
      gameCode: wordToVote.gameCode,
      voteType: voteType,
      submittedBy: wordToVote.submittedBy
    });
  }, [socket, wordToVote]);

  // Handle word feedback skip/timeout
  const handleFeedbackSkip = useCallback(() => {
    logger.log('[RESULTS] Skipping word feedback');
    if (wordFeedbackTimerRef.current) {
      clearTimeout(wordFeedbackTimerRef.current);
      wordFeedbackTimerRef.current = null;
    }
    setShowWordFeedback(false);
    setWordToVote(null);
    setWordQueue([]);
  }, []);

  // Handle referral milestone popup close
  const handleReferralMilestoneClose = useCallback(() => {
    setShowReferralMilestone(false);
    setReferralMilestone(null);
  }, []);

  // Handle marking the player as ready for the next game
  const handleMarkReady = useCallback(() => {
    if (!socket || isCurrentPlayerReady) return;
    logger.log('[RESULTS] Marking player as ready for next game');
    socket.emit('confirmReadyForNextGame');
    setIsCurrentPlayerReady(true);
    // Optimistic — counter + avatar dot must flip locally instantly.
    // Server `playersReadyUpdate` arrives a beat later (sometimes coalesced);
    // without this the StickyReadyBar still shows "2/3 READY" with your own
    // avatar grayed-out even though you tapped Ready.
    if (username) {
      setReadyUsernames(prev => prev.includes(username) ? prev : [...prev, username]);
    }
  }, [socket, isCurrentPlayerReady, username]);

  return {
    // State
    showWordFeedback,
    wordToVote,
    wordQueue,
    xpGainedData,
    levelUpData,
    showLevelUpCelebration,
    nearMisses,
    referralMilestone,
    showReferralMilestone,
    readyUsernames,
    isCurrentPlayerReady,
    // Actions
    handleVote,
    handleFeedbackSkip,
    handleReferralMilestoneClose,
    handleMarkReady,
    setShowLevelUpCelebration,
    setLevelUpData,
  };
}

export default useResultsSocketEvents;
