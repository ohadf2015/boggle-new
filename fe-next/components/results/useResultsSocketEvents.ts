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
import type { NearMiss } from './NearMissCard';
import type { MysteryReward } from '@/components/engagement/MysteryRewardPopup';
import type { ReferralMilestone } from '@/shared/types/socket';
import type { WordToVote, XpGainedData, LevelUpData } from '@/types/components';

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

  // Mystery reward state
  mysteryReward: MysteryReward | null;
  showMysteryReward: boolean;

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
  handleMysteryRewardClose: () => void;
  handleReferralMilestoneClose: () => void;
  handleMarkReady: () => void;
  setShowLevelUpCelebration: (show: boolean) => void;
}

export interface UseResultsSocketEventsProps {
  socket: Socket | null;
  username?: string;
}

export function useResultsSocketEvents({
  socket,
  username,
}: UseResultsSocketEventsProps): ResultsSocketEventsState & ResultsSocketEventsActions {
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

  // Mystery reward state
  const [mysteryReward, setMysteryReward] = useState<MysteryReward | null>(null);
  const [showMysteryReward, setShowMysteryReward] = useState(false);
  const mysteryRewardQueueRef = useRef<MysteryReward[]>([]);

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

      // Handle new word queue format (self-healing system)
      // Limit to 2 words to avoid overwhelming the user with modals
      if (data.wordQueue && data.wordQueue.length > 0) {
        const limitedQueue = data.wordQueue.slice(0, 2);
        setWordQueue(limitedQueue);
        logger.log('[RESULTS] Word queue limited to', limitedQueue.length, 'of', data.wordQueue.length, 'words for voting');
      }

      // Transform voteInfo to match expected VoteInfo interface
      const transformedVoteInfo = data.voteInfo ? {
        approvalCount: data.voteInfo.votesFor ?? data.voteInfo.approvalCount,
        disapprovalCount: data.voteInfo.votesAgainst ?? data.voteInfo.disapprovalCount
      } : undefined;

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
    };

    const handleVoteRecorded = (data: { success: boolean; message?: string }) => {
      logger.log('[RESULTS] Vote recorded:', data);
    };

    const handleXpGained = (data: XpGainedData) => {
      logger.log('[RESULTS] XP gained:', data);
      setXpGainedData(data);
    };

    const handleLevelUp = (data: LevelUpData) => {
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

    const handleMysteryReward = (data: { reward: MysteryReward }) => {
      logger.log('[RESULTS] Mystery reward received:', data);
      if (data.reward) {
        mysteryRewardQueueRef.current.push(data.reward);
        if (!showMysteryReward) {
          setMysteryReward(data.reward);
          setShowMysteryReward(true);
        }
      }
    };

    const handleReferralMilestone = (data: { milestone: ReferralMilestone }) => {
      logger.log('[RESULTS] Referral milestone received:', data);
      if (data.milestone) {
        setReferralMilestone(data.milestone);
        setShowReferralMilestone(true);
      }
    };

    socket.on('showWordFeedback', handleShowWordFeedback);
    socket.on('voteRecorded', handleVoteRecorded);
    socket.on('xpGained', handleXpGained);
    socket.on('levelUp', handleLevelUp);
    socket.on('engagement:nearMisses', handleNearMisses);
    socket.on('engagement:mysteryReward', handleMysteryReward);
    socket.on('engagement:referralMilestone', handleReferralMilestone);

    return () => {
      socket.off('showWordFeedback', handleShowWordFeedback);
      socket.off('voteRecorded', handleVoteRecorded);
      socket.off('xpGained', handleXpGained);
      socket.off('levelUp', handleLevelUp);
      socket.off('engagement:nearMisses', handleNearMisses);
      socket.off('engagement:mysteryReward', handleMysteryReward);
      socket.off('engagement:referralMilestone', handleReferralMilestone);
    };
  }, [socket, showMysteryReward]);

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
    setShowWordFeedback(false);
    setWordToVote(null);
    setWordQueue([]);
  }, []);

  // Handle mystery reward popup close
  const handleMysteryRewardClose = useCallback(() => {
    setShowMysteryReward(false);
    mysteryRewardQueueRef.current.shift();
    if (mysteryRewardQueueRef.current.length > 0) {
      setTimeout(() => {
        setMysteryReward(mysteryRewardQueueRef.current[0]);
        setShowMysteryReward(true);
      }, 500);
    } else {
      setMysteryReward(null);
    }
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
  }, [socket, isCurrentPlayerReady]);

  return {
    // State
    showWordFeedback,
    wordToVote,
    wordQueue,
    xpGainedData,
    levelUpData,
    showLevelUpCelebration,
    nearMisses,
    mysteryReward,
    showMysteryReward,
    referralMilestone,
    showReferralMilestone,
    readyUsernames,
    isCurrentPlayerReady,
    // Actions
    handleVote,
    handleFeedbackSkip,
    handleMysteryRewardClose,
    handleReferralMilestoneClose,
    handleMarkReady,
    setShowLevelUpCelebration,
  };
}

export default useResultsSocketEvents;
