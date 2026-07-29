/**
 * Community Word Manager Types
 */

export interface WordScoreRow {
  word: string;
  language: string;
  likes_count?: number;
  dislikes_count?: number;
  net_score?: number;
  is_potentially_valid?: boolean;
}

export interface VoteParams {
  word: string;
  language: string;
  userId: string | null;
  guestId: string | null;
  gameCode: string;
  voteType: 'like' | 'dislike';
  submitter: string;
  isBotWord?: boolean;
}

export interface VoteResult {
  success: boolean;
  isNowValid: boolean;
  error: string | null;
}

export interface AIVoteParams {
  word: string;
  language: string;
  isValid: boolean;
  reason: string;
  confidence: number;
}

export interface AIVoteResult {
  success: boolean;
  netScore: number;
  isProminentlyValid: boolean;
  isValidForScoring: boolean;
  error: string | null;
}

export interface WordValidationInfo {
  netScore: number;
  isProminentlyValid: boolean;
  isValidForScoring: boolean;
  likesCount?: number;
  dislikesCount?: number;
}

export interface WordStats {
  likes: number;
  dislikes: number;
  netScore: number;
  isValid: boolean;
}

export interface NonDictionaryWord {
  word: string;
  submittedBy: string;
  submitterAvatar: string | null;
  isBot: boolean;
}

export interface WordForPlayer {
  word: string;
  submittedBy: string;
  submitterAvatar: string | null;
  isBot: boolean;
  voteInfo: {
    netScore: number;
    totalVotes: number;
    votesNeeded: number;
    isValidForScoring: boolean;
  };
}

export interface PendingWordData {
  likes: number;
  dislikes: number;
  netScore: number;
  aiApproved: boolean;
  lastVoted: number;
}

export interface WordPriorityData extends PendingWordData {
  isBot?: boolean;
}

export interface WordDetail {
  word: string;
  autoValidated?: boolean;
  onBoard?: boolean;
  isBot?: boolean;
}

export interface Game {
  language?: string;
  playerWordDetails?: Record<string, WordDetail[]>;
  users?: Record<string, { avatar?: string }>;
}

export type LanguageCode = 'en' | 'he' | 'sv' | 'ja' | 'es';
