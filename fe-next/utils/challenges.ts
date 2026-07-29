/**
 * Score Challenge Utilities
 *
 * "Beat My Score" challenge system that allows players to share
 * game links where friends compete on the exact same board.
 */

import { createClient } from '@/utils/supabase/client';
import type { DifficultyLevel, Language, LetterGrid } from '@/shared/types/game';

// ==========================================
// Types
// ==========================================

export interface ChallengeCreatorData {
  username: string;
  avatarEmoji?: string;
  avatarColor?: string;
  playerId?: string; // UUID if authenticated
  guestFingerprint?: string; // For guests
}

export interface ChallengeGameConfig {
  gridSeed: string; // Seed to regenerate exact same board
  language: Language;
  difficulty: DifficultyLevel;
  durationSeconds: number;
  minWordLength: number;
}

export interface ChallengePerformance {
  score: number;
  wordCount: number;
  longestWord?: string;
  longestWordLength?: number;
  maxCombo?: number;
  achievements?: string[];
}

export interface CreateChallengeInput {
  creator: ChallengeCreatorData;
  gameConfig: ChallengeGameConfig;
  performance: ChallengePerformance;
}

export interface ScoreChallenge {
  id: string;
  challengeCode: string;
  creatorUsername: string;
  creatorAvatarEmoji: string;
  creatorAvatarColor: string;
  gridSeed: string;
  language: Language;
  difficulty: DifficultyLevel;
  durationSeconds: number;
  minWordLength: number;
  creatorScore: number;
  creatorWordCount: number;
  creatorLongestWord?: string;
  creatorLongestWordLength?: number;
  creatorMaxCombo: number;
  creatorAchievements: string[];
  totalAttempts: number;
  totalBeaten: number;
  expiresAt: string;
  createdAt: string;
}

export interface ChallengeAttemptInput {
  challengeId: string;
  username: string;
  avatarEmoji?: string;
  avatarColor?: string;
  playerId?: string;
  guestFingerprint?: string;
  score: number;
  wordCount: number;
  longestWord?: string;
  longestWordLength?: number;
  maxCombo?: number;
}

export interface ChallengeAttempt {
  id: string;
  username: string;
  avatarEmoji: string;
  avatarColor: string;
  score: number;
  wordCount: number;
  longestWord?: string;
  beatCreator: boolean;
  scoreDifference: number;
  completedAt: string;
}

// ==========================================
// Challenge Code Generation
// ==========================================

/**
 * Generate a short, URL-friendly challenge code
 * Format: 6 alphanumeric characters (e.g., "abc123")
 */
export function generateChallengeCode(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Generate a grid seed from the current board state
 * This seed can be used to regenerate the exact same grid
 */
export function generateGridSeed(grid: LetterGrid): string {
  // Flatten grid and join with separator
  const flatGrid = grid.map(row => row.join('')).join('-');
  // Add timestamp for uniqueness
  const timestamp = Date.now().toString(36);
  return `${flatGrid}:${timestamp}`;
}

/**
 * Parse a grid seed back into a letter grid
 */
export function parseGridSeed(seed: string): LetterGrid | null {
  try {
    const [gridPart] = seed.split(':');
    const rows = gridPart.split('-');
    return rows.map(row => row.split(''));
  } catch {
    return null;
  }
}

// ==========================================
// URL Generation
// ==========================================

/**
 * Get the challenge URL for sharing
 */
/**
 * Build OG image URL for a challenge (used for rich social media previews)
 */
export function getChallengeOgUrl(opts: {
  player: string;
  score: number;
  words?: number;
  combo?: number;
  lang?: string;
}): string {
  if (typeof window === 'undefined') return '';
  const origin = process.env.REACT_APP_PUBLIC_URL || window.location.origin;
  const params = new URLSearchParams({
    player: opts.player,
    score: String(opts.score),
  });
  if (opts.words) params.set('words', String(opts.words));
  if (opts.combo && opts.combo >= 3) params.set('combo', String(opts.combo));
  if (opts.lang) params.set('lang', opts.lang);
  return `${origin}/api/og/challenge?${params}`;
}

export function getChallengeUrl(challengeCode: string, utmSource?: string): string {
  if (typeof window === 'undefined') return '';
  const publicUrl = process.env.REACT_APP_PUBLIC_URL || window.location.origin;
  const params = new URLSearchParams();
  if (utmSource) {
    params.set('utm_source', utmSource);
    params.set('utm_medium', 'challenge');
  }
  const queryString = params.toString();
  return `${publicUrl}/challenge/${challengeCode}${queryString ? `?${queryString}` : ''}`;
}

// ==========================================
// Database Operations
// ==========================================

/**
 * Create a new score challenge
 */
export async function createChallenge(input: CreateChallengeInput): Promise<ScoreChallenge | null> {
  const supabase = createClient();

  const challengeCode = generateChallengeCode();

  const { data, error } = await supabase
    .from('score_challenges')
    .insert({
      challenge_code: challengeCode,
      creator_id: input.creator.playerId || null,
      creator_guest_fingerprint: input.creator.guestFingerprint || null,
      creator_username: input.creator.username,
      creator_avatar_emoji: input.creator.avatarEmoji || '😊',
      creator_avatar_color: input.creator.avatarColor || '#4F46E5',
      grid_seed: input.gameConfig.gridSeed,
      language: input.gameConfig.language,
      difficulty: input.gameConfig.difficulty,
      duration_seconds: input.gameConfig.durationSeconds,
      min_word_length: input.gameConfig.minWordLength,
      creator_score: input.performance.score,
      creator_word_count: input.performance.wordCount,
      creator_longest_word: input.performance.longestWord || null,
      creator_longest_word_length: input.performance.longestWordLength || null,
      creator_max_combo: input.performance.maxCombo || 1,
      creator_achievements: input.performance.achievements || [],
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating challenge:', error);
    return null;
  }

  return mapDbChallengeToChallenge(data);
}

/**
 * Get a challenge by its code
 */
export async function getChallenge(challengeCode: string): Promise<ScoreChallenge | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('score_challenges')
    .select('*')
    .eq('challenge_code', challengeCode)
    .single();

  if (error) {
    console.error('Error fetching challenge:', error);
    return null;
  }

  return mapDbChallengeToChallenge(data);
}

/**
 * Record a challenge attempt
 */
export async function recordChallengeAttempt(input: ChallengeAttemptInput): Promise<ChallengeAttempt | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('score_challenge_attempts')
    .insert({
      challenge_id: input.challengeId,
      player_id: input.playerId || null,
      guest_fingerprint: input.guestFingerprint || null,
      username: input.username,
      avatar_emoji: input.avatarEmoji || '😊',
      avatar_color: input.avatarColor || '#4F46E5',
      score: input.score,
      word_count: input.wordCount,
      longest_word: input.longestWord || null,
      longest_word_length: input.longestWordLength || null,
      max_combo: input.maxCombo || 1,
    })
    .select()
    .single();

  if (error) {
    console.error('Error recording challenge attempt:', error);
    return null;
  }

  return {
    id: data.id,
    username: data.username,
    avatarEmoji: data.avatar_emoji,
    avatarColor: data.avatar_color,
    score: data.score,
    wordCount: data.word_count,
    longestWord: data.longest_word,
    beatCreator: data.beat_creator,
    scoreDifference: data.score_difference,
    completedAt: data.completed_at,
  };
}

/**
 * Get top attempts for a challenge (leaderboard)
 */
export async function getChallengeLeaderboard(
  challengeId: string,
  limit: number = 10
): Promise<ChallengeAttempt[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('score_challenge_attempts')
    .select('*')
    .eq('challenge_id', challengeId)
    .order('score', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching challenge leaderboard:', error);
    return [];
  }

  return data.map(row => ({
    id: row.id,
    username: row.username,
    avatarEmoji: row.avatar_emoji,
    avatarColor: row.avatar_color,
    score: row.score,
    wordCount: row.word_count,
    longestWord: row.longest_word,
    beatCreator: row.beat_creator,
    scoreDifference: row.score_difference,
    completedAt: row.completed_at,
  }));
}

// ==========================================
// Share Message Generation
// ==========================================

/**
 * Generate a share message for a challenge link
 */
export function generateChallengeShareMessage(
  challenge: Pick<ScoreChallenge, 'creatorScore' | 'creatorWordCount' | 'challengeCode'>,
  language: string = 'en'
): string {
  const url = getChallengeUrl(challenge.challengeCode, 'challenge-share');
  const { creatorScore, creatorWordCount } = challenge;

  const messages: Record<string, string> = {
    en: `🎯 Think you can beat my ${creatorScore} points?\n\nI found ${creatorWordCount} words on this board. Your turn!\n\n${url}`,
    he: `🎯 חושבים שתנצחו ${creatorScore} נקודות?\n\nמצאתי ${creatorWordCount} מילים בלוח הזה. תורכם!\n\n${url}`,
    sv: `🎯 Tror du att du kan slå mina ${creatorScore} poäng?\n\nJag hittade ${creatorWordCount} ord. Din tur!\n\n${url}`,
    ja: `🎯 ${creatorScore}ポイントに勝てる？\n\n${creatorWordCount}語見つけました。君の番！\n\n${url}`,
    es: `🎯 ¿Crees que puedes superar mis ${creatorScore} puntos?\n\nEncontré ${creatorWordCount} palabras. ¡Tu turno!\n\n${url}`,
  };

  return messages[language] || messages.en;
}

// ==========================================
// Helper Functions
// ==========================================

interface DbChallenge {
  id: string;
  challenge_code: string;
  creator_username: string;
  creator_avatar_emoji: string;
  creator_avatar_color: string;
  grid_seed: string;
  language: string;
  difficulty: string;
  duration_seconds: number;
  min_word_length: number;
  creator_score: number;
  creator_word_count: number;
  creator_longest_word: string | null;
  creator_longest_word_length: number | null;
  creator_max_combo: number;
  creator_achievements: string[];
  total_attempts: number;
  total_beaten: number;
  expires_at: string;
  created_at: string;
}

function mapDbChallengeToChallenge(data: DbChallenge): ScoreChallenge {
  return {
    id: data.id,
    challengeCode: data.challenge_code,
    creatorUsername: data.creator_username,
    creatorAvatarEmoji: data.creator_avatar_emoji,
    creatorAvatarColor: data.creator_avatar_color,
    gridSeed: data.grid_seed,
    language: data.language as Language,
    difficulty: data.difficulty as DifficultyLevel,
    durationSeconds: data.duration_seconds,
    minWordLength: data.min_word_length,
    creatorScore: data.creator_score,
    creatorWordCount: data.creator_word_count,
    creatorLongestWord: data.creator_longest_word || undefined,
    creatorLongestWordLength: data.creator_longest_word_length || undefined,
    creatorMaxCombo: data.creator_max_combo,
    creatorAchievements: data.creator_achievements,
    totalAttempts: data.total_attempts,
    totalBeaten: data.total_beaten,
    expiresAt: data.expires_at,
    createdAt: data.created_at,
  };
}
