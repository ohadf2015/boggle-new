/**
 * Peer Validation Manager Module
 * Handles AI-approved word tracking and peer validation voting
 * Extracted from gameStateManager.js for better modularity
 */

import type { AiApprovedWord, WordDetail } from '@/shared/types/game';

// Base game interface for peerValidationManager - compatible with both Game and GameState
 
export interface PeerValidationGameBase {
  aiApprovedWords?: AiApprovedWord[];
  peerValidationWord?: AiApprovedWord | null;
  peerValidationVotes?: Record<string, 'valid' | 'invalid'>;
   
  playerWordDetails?: Record<string, any[]>;
  playerScores?: Record<string, number>;
}

export interface TrackedWord extends AiApprovedWord {
  timestamp: number;
  isBot?: boolean;
}

export interface VoteResult {
  success: boolean;
  error?: string;
  totalVotes?: number;
  invalidVotes?: number;
  validVotes?: number;
  shouldReject?: boolean;
  word?: string;
  submitter?: string;
  isBot?: boolean;
}

export interface PeerValidationStats {
  aiApprovedCount: number;
  botWordCount: number;
  currentValidation: {
    word: string;
    submitter: string;
    voteCount: number;
  } | null;
}

// Extended game type for peer validation
interface GameWithValidation extends PeerValidationGameBase {
  botWords?: TrackedWord[];
}

// Extended word detail for peer rejection
interface WordDetailWithRejection extends WordDetail {
  peerRejected?: boolean;
}

/**
 * Track an AI-approved word for potential peer validation
 */
export function trackAiApprovedWord(
  game: PeerValidationGameBase | null,
  word: string,
  submitter: string,
  score: number,
  confidence: number
): void {
  if (!game) return;

  if (!game.aiApprovedWords) {
    game.aiApprovedWords = [];
  }

  const trackedWord: TrackedWord = {
    word: word.toLowerCase(),
    submitter,
    score,
    confidence,
    timestamp: Date.now()
  };

  game.aiApprovedWords.push(trackedWord as AiApprovedWord);
}

/**
 * Track a bot-submitted word for potential peer validation
 * Bot words appear in the "is this real word?" modal and can be blacklisted if rejected
 */
export function trackBotWord(
  game: PeerValidationGameBase | null,
  word: string,
  botUsername: string,
  score: number
): void {
  if (!game) return;

  const gameWithValidation = game as GameWithValidation;

  // Track bot words separately for potential validation
  if (!gameWithValidation.botWords) {
    gameWithValidation.botWords = [];
  }

  // Also add to aiApprovedWords pool so they can be shown in peer validation
  // Bot words mix with AI-validated words for community validation
  if (!game.aiApprovedWords) {
    game.aiApprovedWords = [];
  }

  const wordData: TrackedWord = {
    word: word.toLowerCase(),
    submitter: botUsername,
    score,
    confidence: 0, // Bots don't have AI confidence
    isBot: true, // Mark as bot word for blacklist handling
    timestamp: Date.now()
  };

  gameWithValidation.botWords.push(wordData);
  game.aiApprovedWords.push(wordData as AiApprovedWord);
}

/**
 * Select a random AI-approved word for peer validation
 * Excludes words from a specific submitter if needed
 */
export function selectWordForPeerValidation(game: PeerValidationGameBase | null): AiApprovedWord | null {
  if (!game || !game.aiApprovedWords || game.aiApprovedWords.length === 0) {
    return null;
  }

  // Randomly select one word from the AI-approved list
  const randomIndex = Math.floor(Math.random() * game.aiApprovedWords.length);
  const selectedWord = game.aiApprovedWords[randomIndex];

  game.peerValidationWord = selectedWord;
  game.peerValidationVotes = {};

  return selectedWord;
}

/**
 * Record a peer validation vote
 */
export function recordPeerValidationVote(
  game: PeerValidationGameBase | null,
  username: string,
  isValid: boolean
): VoteResult {
  if (!game || !game.peerValidationWord) {
    return { success: false, error: 'No word for peer validation' };
  }

  // Don't allow the submitter to vote on their own word
  if (username === game.peerValidationWord.submitter) {
    return { success: false, error: 'Cannot vote on your own word' };
  }

  // Record the vote (only one vote per user)
  if (!game.peerValidationVotes) {
    game.peerValidationVotes = {};
  }

  // Only allow one vote per player
  if (game.peerValidationVotes[username]) {
    return { success: false, error: 'Already voted' };
  }

  game.peerValidationVotes[username] = isValid ? 'valid' : 'invalid';

  // Count votes
  const votes = Object.values(game.peerValidationVotes);
  const invalidVotes = votes.filter(v => v === 'invalid').length;
  const totalVotes = votes.length;

  // Check if word should be rejected (more than 3 players said invalid)
  const shouldReject = invalidVotes > 3;

  const wordWithBot = game.peerValidationWord as TrackedWord;

  return {
    success: true,
    totalVotes,
    invalidVotes,
    validVotes: votes.filter(v => v === 'valid').length,
    shouldReject,
    word: game.peerValidationWord.word,
    submitter: game.peerValidationWord.submitter,
    isBot: wordWithBot.isBot || false // Track if it's a bot word for blacklisting
  };
}

/**
 * Get the peer validation word info
 */
export function getPeerValidationWord(game: PeerValidationGameBase | null): AiApprovedWord | null {
  if (!game) return null;
  return game.peerValidationWord || null;
}

/**
 * Remove score for a peer-rejected word
 */
export function removePeerRejectedWordScore(
  game: PeerValidationGameBase | null,
  word: string,
  submitter: string
): number {
  if (!game) return 0;

  // Find the word in playerWordDetails and mark as invalidated
  const wordDetails = game.playerWordDetails?.[submitter] || [];
  const wordDetail = wordDetails.find(wd => wd.word === word.toLowerCase()) as WordDetailWithRejection | undefined;

  if (!wordDetail) return 0;

  const scoreRemoved = wordDetail.score || 0;

  // Mark word as invalidated by peers
  wordDetail.validated = false;
  wordDetail.peerRejected = true;

  // Subtract score from player
  if (game.playerScores?.[submitter]) {
    game.playerScores[submitter] = Math.max(0, game.playerScores[submitter] - scoreRemoved);
  }

  return scoreRemoved;
}

/**
 * Reset peer validation state for a new round
 */
export function resetPeerValidation(game: PeerValidationGameBase | null): void {
  if (!game) return;

  const gameWithValidation = game as GameWithValidation;

  game.aiApprovedWords = [];
  gameWithValidation.botWords = [];
  game.peerValidationWord = null;
  game.peerValidationVotes = {};
}

/**
 * Get peer validation statistics for a game
 */
export function getPeerValidationStats(game: PeerValidationGameBase | null): PeerValidationStats {
  if (!game) return { aiApprovedCount: 0, botWordCount: 0, currentValidation: null };

  const gameWithValidation = game as GameWithValidation;

  return {
    aiApprovedCount: game.aiApprovedWords?.length || 0,
    botWordCount: gameWithValidation.botWords?.length || 0,
    currentValidation: game.peerValidationWord ? {
      word: game.peerValidationWord.word,
      submitter: game.peerValidationWord.submitter,
      voteCount: Object.keys(game.peerValidationVotes || {}).length,
    } : null,
  };
}

