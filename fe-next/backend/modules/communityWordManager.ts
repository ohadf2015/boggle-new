/**
 * Community Word Manager
 * Handles crowd-sourced word voting and dynamic dictionary expansion
 * Words with net_score >= 6 become "prominently valid" and auto-validate during gameplay
 * Words with positive ratio (> 0) count as valid for scoring but still show validation modal
 *
 * VALIDATION SCORING:
 * - AI validation = 4 points
 * - Player vote = 1 point (like = +1, dislike = -1)
 * - Words need 6+ net score to be added prominently to dictionary (matches database is_potentially_valid)
 * - Words with positive ratio (> 0) count as valid for scoring
 */

import { getSupabase, isSupabaseConfigured } from './supabaseServer';
import { normalizeWord } from '../dictionary';
import type { Language } from '@/shared/types';
import logger from '../utils/logger';
import type { SupabaseClient } from '@supabase/supabase-js';

// Re-export hybrid validation types and functions
export type { ShouldValidateResult, FilteredWordsResult, SelfHealingConfig } from './communityWordHybridValidation';
export {
  SELF_HEALING_CONFIG,
  shouldUseAIValidation,
  recordAIValidationUsed,
  getRemainingAIValidations,
  filterWordsForAIValidation,
  resetGameAIValidationCount,
  cleanupGameTracking,
} from './communityWordHybridValidation';
import { setPendingVotesRef } from './communityWordHybridValidation';

// Interfaces
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

type LanguageCode = 'en' | 'he' | 'sv' | 'ja' | 'es';

// Validation scoring constants
export const AI_VOTE_POINTS = 4;
export const PROMINENT_THRESHOLD = 6;
export const VALID_THRESHOLD = 0;

// In-memory caches
const communityValidWords: Record<LanguageCode, Set<string>> = {
  en: new Set(), he: new Set(), sv: new Set(), ja: new Set(), es: new Set()
};

const wordsPendingVotes: Record<LanguageCode, Map<string, PendingWordData>> = {
  en: new Map(), he: new Map(), sv: new Map(), ja: new Map(), es: new Map()
};

// Wire up pending votes ref for hybrid validation module
setPendingVotesRef(wordsPendingVotes);

let loaded = false;

export async function loadCommunityWords(): Promise<void> {
  if (loaded) return;

  const client = getSupabase() as SupabaseClient | null;
  if (!client) {
    logger.debug('CommunityWords', 'Supabase not configured, skipping community word loading');
    loaded = true;
    return;
  }

  logger.info('CommunityWords', 'Loading community-validated words from database...');
  const startTime = Date.now();

  try {
    const { data, error } = await client
      .from('word_scores')
      .select('word, language')
      .eq('is_potentially_valid', true);

    if (error) {
      logger.error('CommunityWords', `Error loading from database: ${error.message}`);
      loaded = true;
      return;
    }

    const counts: Record<LanguageCode, number> = { en: 0, he: 0, sv: 0, ja: 0, es: 0 };
    for (const row of data || []) {
      const lang = (row.language || 'en') as LanguageCode;
      if (communityValidWords[lang]) {
        const normalized = normalizeWord(row.word, lang);
        communityValidWords[lang].add(normalized);
        counts[lang]++;
      }
    }

    const { data: pendingData, error: pendingError } = await client
      .from('word_scores')
      .select('word, language, likes_count, dislikes_count, net_score')
      .eq('is_potentially_valid', false)
      .gt('likes_count', 0);

    if (!pendingError && pendingData) {
      const pendingCounts: Record<LanguageCode, number> = { en: 0, he: 0, sv: 0, ja: 0, es: 0 };
      for (const row of pendingData) {
        const lang = (row.language || 'en') as LanguageCode;
        if (wordsPendingVotes[lang]) {
          const normalized = normalizeWord(row.word, lang);
          wordsPendingVotes[lang].set(normalized, {
            likes: row.likes_count || 0,
            dislikes: row.dislikes_count || 0,
            netScore: row.net_score || 0,
            aiApproved: false,
            lastVoted: Date.now()
          });
          pendingCounts[lang]++;
        }
      }
      logger.info('CommunityWords', `Loaded ${JSON.stringify(pendingCounts)} pending words for prioritized voting`);
    }

    const loadTime = Date.now() - startTime;
    logger.info('CommunityWords', `Loaded in ${loadTime}ms: ${JSON.stringify(counts)}`);
    loaded = true;
  } catch (err) {
    logger.error('CommunityWords', `Unexpected error loading words: ${err}`);
    loaded = true;
  }
}

export function isWordCommunityValid(word: string, language: string): boolean {
  const lang = (language || 'en') as LanguageCode;
  const set = communityValidWords[lang];
  if (!set) return false;
  const normalized = normalizeWord(word, lang);
  return set.has(normalized);
}

export async function addToCommunityCache(word: string, language: string): Promise<void> {
  const lang = (language || 'en') as LanguageCode;
  const set = communityValidWords[lang];
  if (!set) return;

  const normalized = normalizeWord(word, lang);
  if (set.has(normalized)) return;

  set.add(normalized);
  logger.debug('CommunityWords', `Word "${word}" (${lang}) added to community cache`);

  try {
    const { addApprovedWord } = require('../dictionary');
    await addApprovedWord(normalized, lang);
    logger.info('CommunityWords', `Word "${word}" (${lang}) persisted to approved dictionary file`);
  } catch (err) {
    logger.error('CommunityWords', `Failed to persist word to dictionary: ${err}`);
  }
}

export function removeFromCommunityCache(word: string, language: string): void {
  const lang = (language || 'en') as LanguageCode;
  const normalized = normalizeWord(word, lang);
  communityValidWords[lang]?.delete(normalized);
  wordsPendingVotes[lang]?.delete(normalized);
  logger.debug('CommunityWords', `Word "${word}" (${lang}) removed from community caches`);
}

export async function recordVote({
  word, language, userId, guestId, gameCode, voteType, submitter, isBotWord = false
}: VoteParams): Promise<VoteResult> {
  const client = getSupabase() as SupabaseClient | null;
  if (!client) return { success: false, isNowValid: false, error: 'Supabase not configured' };

  const normalizedWord = normalizeWord(word, (language || 'en') as Language);
  const lang = (language || 'en') as LanguageCode;

  try {
    const voteData: Record<string, unknown> = {
      word: normalizedWord, language: lang, game_code: gameCode,
      vote_type: voteType, is_bot_word: isBotWord
    };

    if (userId) {
      voteData.user_id = userId;
    } else if (guestId) {
      voteData.guest_id = guestId;
    } else {
      return { success: false, isNowValid: false, error: 'No voter identifier provided' };
    }

    const { error: insertError } = await client.from('word_votes').insert(voteData);

    if (insertError) {
      if (insertError.code === '23505') {
        logger.debug('CommunityWords', `Duplicate vote ignored for "${word}" (${lang})`);
        return { success: false, isNowValid: false, error: 'Already voted on this word' };
      }
      logger.error('CommunityWords', `Error recording vote: ${insertError.message}`);
      return { success: false, isNowValid: false, error: insertError.message };
    }

    const { data: scoreData, error: scoreError } = await client
      .from('word_scores')
      .select('net_score, is_potentially_valid')
      .eq('word', normalizedWord)
      .eq('language', lang)
      .single();

    if (scoreError) {
      logger.error('CommunityWords', `Error fetching score: ${scoreError.message}`);
      return { success: true, isNowValid: false, error: null };
    }

    const isNowValid = scoreData?.is_potentially_valid === true;
    if (isNowValid && !communityValidWords[lang]?.has(normalizedWord)) {
      await addToCommunityCache(normalizedWord, lang);
      logger.info('CommunityWords', `Word "${word}" (${lang}) reached ${PROMINENT_THRESHOLD}+ votes! Now prominently valid.`);
    }

    const voterType = userId ? 'auth user' : 'guest';
    logger.debug('CommunityWords', `Vote recorded: "${word}" (${lang}) - ${voteType} by ${voterType}`);

    return { success: true, isNowValid, error: null };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    logger.error('CommunityWords', `Unexpected error recording vote: ${err}`);
    return { success: false, isNowValid: false, error: errorMessage };
  }
}

export async function recordAIVote({
  word, language, isValid, reason, confidence
}: AIVoteParams): Promise<AIVoteResult> {
  const client = getSupabase() as SupabaseClient | null;
  if (!client) return { success: false, netScore: 0, isProminentlyValid: false, isValidForScoring: false, error: 'Supabase not configured' };

  const normalizedWord = normalizeWord(word, (language || 'en') as Language);
  const lang = (language || 'en') as LanguageCode;
  const votePoints = isValid ? AI_VOTE_POINTS : -AI_VOTE_POINTS;

  try {
    const { data: existing, error: fetchError } = await client
      .from('word_scores')
      .select('likes_count, dislikes_count, net_score, is_potentially_valid')
      .eq('word', normalizedWord)
      .eq('language', lang)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      logger.error('CommunityWords', `Error fetching word score for AI vote: ${fetchError.message}`);
      return { success: false, netScore: 0, isProminentlyValid: false, isValidForScoring: false, error: fetchError.message };
    }

    const currentLikes = existing?.likes_count || 0;
    const currentDislikes = existing?.dislikes_count || 0;
    const newLikes = isValid ? currentLikes + AI_VOTE_POINTS : currentLikes;
    const newDislikes = isValid ? currentDislikes : currentDislikes + AI_VOTE_POINTS;
    const newNetScore = newLikes - newDislikes;

    const { error: upsertError } = await client
      .from('word_scores')
      .upsert({
        word: normalizedWord, language: lang,
        likes_count: newLikes, dislikes_count: newDislikes,
        last_voted_at: new Date().toISOString()
      }, { onConflict: 'word,language' });

    if (upsertError) {
      logger.error('CommunityWords', `Error recording AI vote: ${upsertError.message}`);
      return { success: false, netScore: 0, isProminentlyValid: false, isValidForScoring: false, error: upsertError.message };
    }

    const isProminentlyValid = newNetScore >= PROMINENT_THRESHOLD;
    const isValidForScoring = newNetScore > VALID_THRESHOLD;

    if (isProminentlyValid && !communityValidWords[lang]?.has(normalizedWord)) {
      await addToCommunityCache(normalizedWord, lang);
      logger.info('CommunityWords', `Word "${word}" (${lang}) reached ${PROMINENT_THRESHOLD}+ via AI vote! Now prominently valid.`);
    }

    updatePendingCache(word, lang, isValid ? 'like' : 'dislike', true);

    logger.info('CommunityWords', `AI vote recorded: "${word}" (${lang}) - ${isValid ? 'VALID' : 'INVALID'} (${votePoints} points, new score: ${newNetScore})`);

    return { success: true, netScore: newNetScore, isProminentlyValid, isValidForScoring, error: null };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    logger.error('CommunityWords', `Unexpected error recording AI vote: ${err}`);
    return { success: false, netScore: 0, isProminentlyValid: false, isValidForScoring: false, error: errorMessage };
  }
}

export async function getWordValidationInfo(word: string, language: string): Promise<WordValidationInfo> {
  const client = getSupabase() as SupabaseClient | null;
  if (!client) return { netScore: 0, isProminentlyValid: false, isValidForScoring: false };

  const normalizedWord = normalizeWord(word, (language || 'en') as Language);
  const lang = language || 'en';

  try {
    const { data, error } = await client
      .from('word_scores')
      .select('net_score, is_potentially_valid, likes_count, dislikes_count')
      .eq('word', normalizedWord)
      .eq('language', lang)
      .single();

    if (error) return { netScore: 0, isProminentlyValid: false, isValidForScoring: false };

    const netScore = data?.net_score || 0;
    return {
      netScore,
      isProminentlyValid: data?.is_potentially_valid || netScore >= PROMINENT_THRESHOLD,
      isValidForScoring: netScore > VALID_THRESHOLD,
      likesCount: data?.likes_count || 0,
      dislikesCount: data?.dislikes_count || 0
    };
  } catch (err) {
    return { netScore: 0, isProminentlyValid: false, isValidForScoring: false };
  }
}

export function isWordValidForScoring(word: string, language: string): boolean {
  const lang = (language || 'en') as LanguageCode;
  const normalized = normalizeWord(word, lang);

  if (communityValidWords[lang]?.has(normalized)) return true;

  const pendingCache = wordsPendingVotes[lang];
  if (pendingCache) {
    const cached = pendingCache.get(normalized);
    if (cached && cached.netScore > VALID_THRESHOLD) return true;
  }

  return false;
}

export function collectNonDictionaryWords(game: Game): NonDictionaryWord[] {
  const nonDictWords: NonDictionaryWord[] = [];
  const seenWords = new Set<string>();

  for (const [username, wordDetails] of Object.entries(game.playerWordDetails || {})) {
    for (const detail of wordDetails || []) {
      const isNonDictWord = !detail.autoValidated &&
          detail.onBoard !== false &&
          !seenWords.has(detail.word) &&
          !isWordCommunityValid(detail.word, game.language || 'en');

      const isBotWord = detail.isBot === true && !seenWords.has(detail.word);

      if (isNonDictWord || isBotWord) {
        seenWords.add(detail.word);
        nonDictWords.push({
          word: detail.word,
          submittedBy: username,
          submitterAvatar: game.users?.[username]?.avatar || null,
          isBot: detail.isBot === true
        });
      }
    }
  }

  return nonDictWords;
}

function calculateWordPriority(wordData: WordPriorityData): number {
  const { likes = 0, dislikes = 0, netScore = 0, aiApproved = false } = wordData;
  const totalVotes = likes + dislikes;
  let priority = 0;

  if (netScore >= PROMINENT_THRESHOLD - 3 && netScore < PROMINENT_THRESHOLD) {
    priority += 100 - (PROMINENT_THRESHOLD - netScore) * 10;
  } else if (netScore >= 1 && netScore < PROMINENT_THRESHOLD - 3) {
    priority += 40 - Math.min(20, (PROMINENT_THRESHOLD - 3 - netScore) * 5);
  } else if (netScore < 0) {
    priority += Math.max(0, 20 + netScore * 5);
  }

  if (totalVotes < 4) {
    priority += 50 - totalVotes * 10;
  } else if (totalVotes < 10) {
    priority += 15;
  }

  if (aiApproved && dislikes > 0) priority += 30 + dislikes * 5;
  if (likes >= 3 && netScore < PROMINENT_THRESHOLD) priority += 20;
  if (wordData.isBot) priority += 80;

  return priority;
}

export function getWordsForPlayer(
  nonDictWords: NonDictionaryWord[],
  excludeUsername: string,
  language: string,
  count: number = 3
): WordForPlayer[] {
  const eligibleWords = nonDictWords.filter(w => w.submittedBy !== excludeUsername);
  if (eligibleWords.length === 0) return [];

  const lang = (language || 'en') as LanguageCode;
  const pendingCache = wordsPendingVotes[lang] || new Map();

  const wordsWithPriority = eligibleWords.map(wordData => {
    const normalized = normalizeWord(wordData.word, lang);
    const cached = pendingCache.get(normalized);
    const voteStats = cached || { likes: 0, dislikes: 0, netScore: 0, aiApproved: false, lastVoted: 0 };
    const priorityData: WordPriorityData = { ...voteStats, isBot: wordData.isBot === true };

    return { ...wordData, ...voteStats, priority: calculateWordPriority(priorityData), normalized };
  });

  wordsWithPriority.sort((a, b) => b.priority - a.priority);

  const topPriority = wordsWithPriority[0]?.priority || 0;
  const highPriorityWords = wordsWithPriority.filter(w => w.priority >= topPriority * 0.7);

  for (let i = highPriorityWords.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [highPriorityWords[i], highPriorityWords[j]] = [highPriorityWords[j], highPriorityWords[i]];
  }

  const selected = highPriorityWords.slice(0, count);

  if (selected.length < count) {
    const remaining = wordsWithPriority.filter(w => !selected.includes(w));
    selected.push(...remaining.slice(0, count - selected.length));
  }

  if (selected.length > 0) {
    logger.debug('CommunityWords', `Selected ${selected.length} words for ${excludeUsername}: ${selected.map(w => `${w.word}(p:${w.priority})`).join(', ')}`);
  }

  return selected.map(({ word, submittedBy, submitterAvatar, isBot, netScore, likes, dislikes }) => ({
    word,
    submittedBy,
    submitterAvatar,
    isBot: isBot || false,
    voteInfo: {
      netScore: netScore || 0,
      totalVotes: (likes || 0) + (dislikes || 0),
      votesNeeded: Math.max(0, PROMINENT_THRESHOLD - (netScore || 0)),
      isValidForScoring: (netScore || 0) > VALID_THRESHOLD
    }
  }));
}

export function getWordForPlayer(
  nonDictWords: NonDictionaryWord[],
  excludeUsername: string,
  language?: string
): WordForPlayer | null {
  const words = getWordsForPlayer(nonDictWords, excludeUsername, language || 'en', 1);
  return words.length > 0 ? words[0] : null;
}

export function updatePendingCache(
  word: string,
  language: string,
  voteType: 'like' | 'dislike',
  aiApproved: boolean | null = null
): void {
  const lang = (language || 'en') as LanguageCode;
  const cache = wordsPendingVotes[lang];
  if (!cache) return;

  const normalized = normalizeWord(word, lang);
  const existing = cache.get(normalized) || { likes: 0, dislikes: 0, netScore: 0, aiApproved: false, lastVoted: 0 };

  if (voteType === 'like') { existing.likes++; existing.netScore++; }
  else if (voteType === 'dislike') { existing.dislikes++; existing.netScore--; }

  if (aiApproved !== null) existing.aiApproved = aiApproved;
  existing.lastVoted = Date.now();
  cache.set(normalized, existing);

  if (existing.netScore >= PROMINENT_THRESHOLD) {
    cache.delete(normalized);
    addToCommunityCache(word, lang).catch((err) => {
      logger.error('CommunityWords', `Failed to persist word via cache update: ${err}`);
    });
    logger.info('CommunityWords', `Word "${word}" (${lang}) crossed prominent threshold (${PROMINENT_THRESHOLD}) via cache update`);
  }
}

export async function hasUserVoted(
  word: string, language: string, userId: string | null, guestId: string | null
): Promise<boolean> {
  const client = getSupabase() as SupabaseClient | null;
  if (!client) return false;

  const normalizedWord = normalizeWord(word, (language || 'en') as Language);

  try {
    let query = client.from('word_votes').select('id')
      .eq('word', normalizedWord).eq('language', language || 'en');

    if (userId) { query = query.eq('user_id', userId); }
    else if (guestId) { query = query.eq('guest_id', guestId); }
    else { return false; }

    const { data, error } = await query.single();
    if (error && error.code !== 'PGRST116') {
      logger.error('CommunityWords', `Error checking vote: ${error.message}`);
      return false;
    }
    return !!data;
  } catch (err) {
    logger.error('CommunityWords', `Unexpected error checking vote: ${err}`);
    return false;
  }
}

export async function getWordStats(word: string, language: string): Promise<WordStats> {
  const client = getSupabase() as SupabaseClient | null;
  if (!client) return { likes: 0, dislikes: 0, netScore: 0, isValid: false };

  const normalizedWord = normalizeWord(word, (language || 'en') as Language);

  try {
    const { data, error } = await client
      .from('word_scores')
      .select('likes_count, dislikes_count, net_score, is_potentially_valid')
      .eq('word', normalizedWord)
      .eq('language', language || 'en')
      .single();

    if (error) return { likes: 0, dislikes: 0, netScore: 0, isValid: false };

    return {
      likes: data.likes_count || 0,
      dislikes: data.dislikes_count || 0,
      netScore: data.net_score || 0,
      isValid: data.is_potentially_valid === true
    };
  } catch (err) {
    return { likes: 0, dislikes: 0, netScore: 0, isValid: false };
  }
}

// CommonJS exports for backward compatibility
module.exports = {
  loadCommunityWords,
  isWordCommunityValid,
  addToCommunityCache,
  removeFromCommunityCache,
  recordVote,
  recordAIVote,
  collectNonDictionaryWords,
  getWordForPlayer,
  getWordsForPlayer,
  updatePendingCache,
  hasUserVoted,
  getWordStats,
  getWordValidationInfo,
  isWordValidForScoring,
  SELF_HEALING_CONFIG: require('./communityWordHybridValidation').SELF_HEALING_CONFIG,
  AI_VOTE_POINTS,
  PROMINENT_THRESHOLD,
  VALID_THRESHOLD,
  shouldUseAIValidation: require('./communityWordHybridValidation').shouldUseAIValidation,
  recordAIValidationUsed: require('./communityWordHybridValidation').recordAIValidationUsed,
  getRemainingAIValidations: require('./communityWordHybridValidation').getRemainingAIValidations,
  filterWordsForAIValidation: require('./communityWordHybridValidation').filterWordsForAIValidation,
  resetGameAIValidationCount: require('./communityWordHybridValidation').resetGameAIValidationCount,
  cleanupGameTracking: require('./communityWordHybridValidation').cleanupGameTracking
};
