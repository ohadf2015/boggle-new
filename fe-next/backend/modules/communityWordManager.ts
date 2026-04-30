/**
 * Community Word Manager
 * Handles crowd-sourced word voting and dynamic dictionary expansion
 *
 * VALIDATION SCORING:
 * - AI validation = 4 points, Player vote = 1 point
 * - Words need 6+ net score for prominent dictionary addition
 * - Words with positive ratio (> 0) count as valid for scoring
 */

import { getSupabase } from './supabaseServer';
import { normalizeWord } from '../dictionary';
import type { Language } from '@/shared/types';
import logger from '../utils/logger';
import type { SupabaseClient } from '@supabase/supabase-js';

// Re-export types
export type {
  WordScoreRow, VoteParams, VoteResult, AIVoteParams, AIVoteResult,
  WordValidationInfo, WordStats, NonDictionaryWord, WordForPlayer,
  PendingWordData, WordPriorityData, WordDetail, Game,
} from './communityWordTypes';
import type {
  VoteParams, VoteResult, AIVoteParams, AIVoteResult,
  WordValidationInfo, WordStats, NonDictionaryWord, WordForPlayer,
  PendingWordData, WordPriorityData, Game, LanguageCode,
} from './communityWordTypes';

// Re-export hybrid validation
export type { ShouldValidateResult, FilteredWordsResult, SelfHealingConfig } from './communityWordHybridValidation';
export {
  SELF_HEALING_CONFIG, shouldUseAIValidation, recordAIValidationUsed,
  getRemainingAIValidations, filterWordsForAIValidation,
  resetGameAIValidationCount, cleanupGameTracking,
} from './communityWordHybridValidation';
import { setPendingVotesRef } from './communityWordHybridValidation';

export const AI_VOTE_POINTS = 4;
// Bumped 6 → 8 on 2026-05-01 for collusion defense; matches DB trigger
// trg_word_scores_promote (migration tighten_word_promotion_threshold_to_8).
// Now requires (1 AI yes + 4 likes) OR 8 player likes — not (1 AI + 2 likes).
export const PROMINENT_THRESHOLD = 8;
export const VALID_THRESHOLD = 0;

const communityValidWords: Record<LanguageCode, Set<string>> = {
  en: new Set(), he: new Set(), sv: new Set(), ja: new Set(), es: new Set()
};
const wordsPendingVotes: Record<LanguageCode, Map<string, PendingWordData>> = {
  en: new Map(), he: new Map(), sv: new Map(), ja: new Map(), es: new Map()
};
setPendingVotesRef(wordsPendingVotes);

let loaded = false;

export async function loadCommunityWords(): Promise<void> {
  if (loaded) return;
  const client = getSupabase() as SupabaseClient | null;
  if (!client) { loaded = true; return; }

  const startTime = Date.now();
  try {
    const { data, error } = await client.from('word_scores').select('word, language').eq('is_potentially_valid', true).limit(50000);
    if (error) { logger.error('CommunityWords', `Error loading: ${error.message}`); return; }

    const counts: Record<LanguageCode, number> = { en: 0, he: 0, sv: 0, ja: 0, es: 0 };
    for (const row of data || []) {
      const lang = (row.language || 'en') as LanguageCode;
      if (communityValidWords[lang]) {
        communityValidWords[lang].add(normalizeWord(row.word, lang));
        counts[lang]++;
      }
    }

    const { data: pendingData, error: pendingError } = await client
      .from('word_scores').select('word, language, likes_count, dislikes_count, net_score')
      .eq('is_potentially_valid', false).gt('likes_count', 0).limit(10000);

    if (!pendingError && pendingData) {
      for (const row of pendingData) {
        const lang = (row.language || 'en') as LanguageCode;
        if (wordsPendingVotes[lang]) {
          wordsPendingVotes[lang].set(normalizeWord(row.word, lang), {
            likes: row.likes_count || 0, dislikes: row.dislikes_count || 0,
            netScore: row.net_score || 0, aiApproved: false, lastVoted: Date.now()
          });
        }
      }
    }
    logger.info('CommunityWords', `Loaded in ${Date.now() - startTime}ms: ${JSON.stringify(counts)}`);
    loaded = true;
  } catch (err) { logger.error('CommunityWords', `Error loading: ${err}`); loaded = true; }
}

export function isWordCommunityValid(word: string, language: string): boolean {
  const lang = (language || 'en') as LanguageCode;
  return communityValidWords[lang]?.has(normalizeWord(word, lang)) ?? false;
}

export async function addToCommunityCache(word: string, language: string): Promise<void> {
  const lang = (language || 'en') as LanguageCode;
  const set = communityValidWords[lang];
  if (!set) return;
  const normalized = normalizeWord(word, lang);
  if (set.has(normalized)) return;
  set.add(normalized);
  try {
    const { addApprovedWord } = require('../dictionary');
    await addApprovedWord(normalized, lang);
  } catch (err) { logger.error('CommunityWords', `Failed to persist: ${err}`); }
}

export function removeFromCommunityCache(word: string, language: string): void {
  const lang = (language || 'en') as LanguageCode;
  const normalized = normalizeWord(word, lang);
  communityValidWords[lang]?.delete(normalized);
  wordsPendingVotes[lang]?.delete(normalized);
}

export async function recordVote(params: VoteParams): Promise<VoteResult> {
  const client = getSupabase() as SupabaseClient | null;
  if (!client) return { success: false, isNowValid: false, error: 'Supabase not configured' };

  const { word, language, userId, guestId, gameCode, voteType, isBotWord = false } = params;
  const normalizedWord = normalizeWord(word, (language || 'en') as Language);
  const lang = (language || 'en') as LanguageCode;

  try {
    const voteData: Record<string, unknown> = {
      word: normalizedWord, language: lang, game_code: gameCode,
      vote_type: voteType, is_bot_word: isBotWord
    };
    if (userId) voteData.user_id = userId;
    else if (guestId) voteData.guest_id = guestId;
    else return { success: false, isNowValid: false, error: 'No voter identifier provided' };

    const { error: insertError } = await client.from('word_votes').insert(voteData);
    if (insertError) {
      if (insertError.code === '23505') return { success: false, isNowValid: false, error: 'Already voted on this word' };
      return { success: false, isNowValid: false, error: insertError.message };
    }

    const { data: scoreData, error: scoreError } = await client
      .from('word_scores').select('net_score, is_potentially_valid')
      .eq('word', normalizedWord).eq('language', lang).single();

    if (scoreError) return { success: true, isNowValid: false, error: null };

    const isNowValid = scoreData?.is_potentially_valid === true;
    if (isNowValid && !communityValidWords[lang]?.has(normalizedWord)) {
      await addToCommunityCache(normalizedWord, lang);
    }
    return { success: true, isNowValid, error: null };
  } catch (err) {
    return { success: false, isNowValid: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function recordAIVote(params: AIVoteParams): Promise<AIVoteResult> {
  const client = getSupabase() as SupabaseClient | null;
  if (!client) return { success: false, netScore: 0, isProminentlyValid: false, isValidForScoring: false, error: 'Supabase not configured' };

  const { word, language, isValid } = params;
  const normalizedWord = normalizeWord(word, (language || 'en') as Language);
  const lang = (language || 'en') as LanguageCode;

  try {
    const { data: existing, error: fetchError } = await client
      .from('word_scores').select('likes_count, dislikes_count')
      .eq('word', normalizedWord).eq('language', lang).single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      return { success: false, netScore: 0, isProminentlyValid: false, isValidForScoring: false, error: fetchError.message };
    }

    const newLikes = (existing?.likes_count || 0) + (isValid ? AI_VOTE_POINTS : 0);
    const newDislikes = (existing?.dislikes_count || 0) + (isValid ? 0 : AI_VOTE_POINTS);
    const newNetScore = newLikes - newDislikes;

    const { error: upsertError } = await client.from('word_scores').upsert({
      word: normalizedWord, language: lang, likes_count: newLikes,
      dislikes_count: newDislikes, last_voted_at: new Date().toISOString()
    }, { onConflict: 'word,language' });

    if (upsertError) return { success: false, netScore: 0, isProminentlyValid: false, isValidForScoring: false, error: upsertError.message };

    // Read DB-authoritative flag — the trg_word_scores_promote trigger may refuse promotion
    // even when newNetScore >= 8 if there are <2 distinct authed like-voters. Local JS
    // computation would lie to the cache and create a JS/DB drift.
    const { data: postState } = await client
      .from('word_scores').select('is_potentially_valid')
      .eq('word', normalizedWord).eq('language', lang).single();
    const isProminentlyValid = postState?.is_potentially_valid === true;
    if (isProminentlyValid && !communityValidWords[lang]?.has(normalizedWord)) {
      await addToCommunityCache(normalizedWord, lang);
    }
    updatePendingCache(word, lang, isValid ? 'like' : 'dislike', true);

    return { success: true, netScore: newNetScore, isProminentlyValid, isValidForScoring: newNetScore > VALID_THRESHOLD, error: null };
  } catch (err) {
    return { success: false, netScore: 0, isProminentlyValid: false, isValidForScoring: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function getWordValidationInfo(word: string, language: string): Promise<WordValidationInfo> {
  const client = getSupabase() as SupabaseClient | null;
  if (!client) return { netScore: 0, isProminentlyValid: false, isValidForScoring: false };
  try {
    const { data, error } = await client.from('word_scores')
      .select('net_score, is_potentially_valid, likes_count, dislikes_count')
      .eq('word', normalizeWord(word, (language || 'en') as Language)).eq('language', language || 'en').single();
    if (error) return { netScore: 0, isProminentlyValid: false, isValidForScoring: false };
    const netScore = data?.net_score || 0;
    return { netScore, isProminentlyValid: data?.is_potentially_valid || netScore >= PROMINENT_THRESHOLD,
      isValidForScoring: netScore > VALID_THRESHOLD, likesCount: data?.likes_count || 0, dislikesCount: data?.dislikes_count || 0 };
  } catch { return { netScore: 0, isProminentlyValid: false, isValidForScoring: false }; }
}

export function isWordValidForScoring(word: string, language: string): boolean {
  const lang = (language || 'en') as LanguageCode;
  const normalized = normalizeWord(word, lang);
  if (communityValidWords[lang]?.has(normalized)) return true;
  const cached = wordsPendingVotes[lang]?.get(normalized);
  return cached ? cached.netScore > VALID_THRESHOLD : false;
}

export function collectNonDictionaryWords(game: Game): NonDictionaryWord[] {
  const result: NonDictionaryWord[] = [];
  const seen = new Set<string>();
  for (const [username, wordDetails] of Object.entries(game.playerWordDetails || {})) {
    for (const detail of wordDetails || []) {
      const isNonDict = !detail.autoValidated && detail.onBoard !== false && !seen.has(detail.word)
        && !isWordCommunityValid(detail.word, game.language || 'en');
      const isBot = detail.isBot === true && !seen.has(detail.word);
      if (isNonDict || isBot) {
        seen.add(detail.word);
        result.push({ word: detail.word, submittedBy: username,
          submitterAvatar: game.users?.[username]?.avatar || null, isBot: detail.isBot === true });
      }
    }
  }
  return result;
}

function calculateWordPriority(d: WordPriorityData): number {
  const { likes = 0, dislikes = 0, netScore = 0, aiApproved = false } = d;
  let p = 0;
  if (netScore >= PROMINENT_THRESHOLD - 3 && netScore < PROMINENT_THRESHOLD) p += 100 - (PROMINENT_THRESHOLD - netScore) * 10;
  else if (netScore >= 1 && netScore < PROMINENT_THRESHOLD - 3) p += 40 - Math.min(20, (PROMINENT_THRESHOLD - 3 - netScore) * 5);
  else if (netScore < 0) p += Math.max(0, 20 + netScore * 5);
  const totalVotes = likes + dislikes;
  if (totalVotes < 4) p += 50 - totalVotes * 10;
  else if (totalVotes < 10) p += 15;
  if (aiApproved && dislikes > 0) p += 30 + dislikes * 5;
  if (likes >= 3 && netScore < PROMINENT_THRESHOLD) p += 20;
  if (d.isBot) p += 80;
  return p;
}

export function getWordsForPlayer(nonDictWords: NonDictionaryWord[], excludeUsername: string, language: string, count: number = 3): WordForPlayer[] {
  const eligible = nonDictWords.filter(w => w.submittedBy !== excludeUsername);
  if (eligible.length === 0) return [];

  const lang = (language || 'en') as LanguageCode;
  const pendingCache = wordsPendingVotes[lang] || new Map();

  const scored = eligible.map(wd => {
    const cached = pendingCache.get(normalizeWord(wd.word, lang));
    const vs = cached || { likes: 0, dislikes: 0, netScore: 0, aiApproved: false, lastVoted: 0 };
    return { ...wd, ...vs, priority: calculateWordPriority({ ...vs, isBot: wd.isBot }) };
  });
  scored.sort((a, b) => b.priority - a.priority);

  const top = scored[0]?.priority || 0;
  const high = scored.filter(w => w.priority >= top * 0.7);
  for (let i = high.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [high[i], high[j]] = [high[j], high[i]];
  }

  const selected = high.slice(0, count);
  if (selected.length < count) {
    selected.push(...scored.filter(w => !selected.includes(w)).slice(0, count - selected.length));
  }

  return selected.map(({ word, submittedBy, submitterAvatar, isBot, netScore, likes, dislikes }) => ({
    word, submittedBy, submitterAvatar, isBot: isBot || false,
    voteInfo: { netScore: netScore || 0, totalVotes: (likes || 0) + (dislikes || 0),
      votesNeeded: Math.max(0, PROMINENT_THRESHOLD - (netScore || 0)), isValidForScoring: (netScore || 0) > VALID_THRESHOLD }
  }));
}

export function getWordForPlayer(nonDictWords: NonDictionaryWord[], excludeUsername: string, language?: string): WordForPlayer | null {
  const words = getWordsForPlayer(nonDictWords, excludeUsername, language || 'en', 1);
  return words.length > 0 ? words[0] : null;
}

export function updatePendingCache(word: string, language: string, voteType: 'like' | 'dislike', aiApproved: boolean | null = null): void {
  const lang = (language || 'en') as LanguageCode;
  const cache = wordsPendingVotes[lang];
  if (!cache) return;
  const normalized = normalizeWord(word, lang);
  const existing = cache.get(normalized) || { likes: 0, dislikes: 0, netScore: 0, aiApproved: false, lastVoted: 0 };
  if (voteType === 'like') { existing.likes++; existing.netScore++; }
  else { existing.dislikes++; existing.netScore--; }
  if (aiApproved !== null) existing.aiApproved = aiApproved;
  existing.lastVoted = Date.now();
  cache.set(normalized, existing);
  // Promotion is decided by recordVote/recordAIVote reading is_potentially_valid
  // from the DB after upsert (the trg_word_scores_promote trigger gates on
  // distinct authed voters). We only evict the pending entry here once the
  // word has actually crossed into the community-valid set.
  if (communityValidWords[lang]?.has(normalized)) {
    cache.delete(normalized);
  }
}

export async function hasUserVoted(word: string, language: string, userId: string | null, guestId: string | null): Promise<boolean> {
  const client = getSupabase() as SupabaseClient | null;
  if (!client) return false;
  try {
    let query = client.from('word_votes').select('id')
      .eq('word', normalizeWord(word, (language || 'en') as Language)).eq('language', language || 'en');
    if (userId) query = query.eq('user_id', userId);
    else if (guestId) query = query.eq('guest_id', guestId);
    else return false;
    const { data, error } = await query.single();
    if (error && error.code !== 'PGRST116') return false;
    return !!data;
  } catch { return false; }
}

export async function getWordStats(word: string, language: string): Promise<WordStats> {
  const client = getSupabase() as SupabaseClient | null;
  if (!client) return { likes: 0, dislikes: 0, netScore: 0, isValid: false };
  try {
    const { data, error } = await client.from('word_scores')
      .select('likes_count, dislikes_count, net_score, is_potentially_valid')
      .eq('word', normalizeWord(word, (language || 'en') as Language)).eq('language', language || 'en').single();
    if (error) return { likes: 0, dislikes: 0, netScore: 0, isValid: false };
    return { likes: data.likes_count || 0, dislikes: data.dislikes_count || 0,
      netScore: data.net_score || 0, isValid: data.is_potentially_valid === true };
  } catch { return { likes: 0, dislikes: 0, netScore: 0, isValid: false }; }
}

// CommonJS exports for backward compatibility
module.exports = {
  loadCommunityWords, isWordCommunityValid, addToCommunityCache, removeFromCommunityCache,
  recordVote, recordAIVote, collectNonDictionaryWords, getWordForPlayer, getWordsForPlayer,
  updatePendingCache, hasUserVoted, getWordStats, getWordValidationInfo, isWordValidForScoring,
  SELF_HEALING_CONFIG: require('./communityWordHybridValidation').SELF_HEALING_CONFIG,
  AI_VOTE_POINTS, PROMINENT_THRESHOLD, VALID_THRESHOLD,
  shouldUseAIValidation: require('./communityWordHybridValidation').shouldUseAIValidation,
  recordAIValidationUsed: require('./communityWordHybridValidation').recordAIValidationUsed,
  getRemainingAIValidations: require('./communityWordHybridValidation').getRemainingAIValidations,
  filterWordsForAIValidation: require('./communityWordHybridValidation').filterWordsForAIValidation,
  resetGameAIValidationCount: require('./communityWordHybridValidation').resetGameAIValidationCount,
  cleanupGameTracking: require('./communityWordHybridValidation').cleanupGameTracking
};
