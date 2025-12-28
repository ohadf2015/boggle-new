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
 *
 * SELF-HEALING FEATURES:
 * - Prioritized word selection: Focus on words that need votes most
 * - AI accuracy tracking: Monitor when community disagrees with AI
 * - Multi-word voting queue: Increase vote collection per game
 */

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { getSupabase, isSupabaseConfigured } = require('./supabaseServer');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { normalizeWord } = require('../dictionary');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const logger = require('../utils/logger');

import type { SupabaseClient } from '@supabase/supabase-js';

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

export interface ShouldValidateResult {
  shouldValidate: boolean;
  reason: string;
  alternativeResult?: {
    isValid: boolean;
    source: string;
  };
}

export interface FilteredWordsResult {
  wordsForAI: string[];
  skippedWords: Map<string, { isValid: boolean; source: string; reason: string }>;
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

export interface SelfHealingConfig {
  WORDS_PER_PLAYER: number;
  THRESHOLD_PROXIMITY: number;
  MIN_VOTES_FOR_REVIEW: number;
  AI_DISAGREEMENT_THRESHOLD: number;
  MAX_AI_VALIDATIONS_PER_GAME: number;
  MIN_WORD_LENGTH_FOR_AI: number;
  SKIP_AI_IF_COMMUNITY_NEGATIVE: boolean;
}

type LanguageCode = 'en' | 'he' | 'sv' | 'ja' | 'es';

// Validation scoring constants
export const AI_VOTE_POINTS = 4;          // AI validation counts as 4 points
export const PROMINENT_THRESHOLD = 6;     // Words need 6+ net score for prominent dictionary addition (matches database is_potentially_valid)
export const VALID_THRESHOLD = 0;         // Words with positive ratio (> 0) count as valid for scoring

// In-memory cache of community-validated words per language
// These are words with net_score >= PROMINENT_THRESHOLD (6) that are prominently valid
// Words with positive ratio (> 0) also count as valid for scoring
const communityValidWords: Record<LanguageCode, Set<string>> = {
  en: new Set(),
  he: new Set(),
  sv: new Set(),
  ja: new Set(),
  es: new Set()
};

// In-memory cache of words pending validation with their vote counts
// Used for prioritized word selection
const wordsPendingVotes: Record<LanguageCode, Map<string, PendingWordData>> = {
  en: new Map(),
  he: new Map(),
  sv: new Map(),
  ja: new Map(),
  es: new Map()
};

// Configuration for self-healing system
export const SELF_HEALING_CONFIG: SelfHealingConfig = {
  // Number of words to show each player for voting
  WORDS_PER_PLAYER: 3,
  // Prioritize words within this range of the threshold (close to being validated)
  THRESHOLD_PROXIMITY: 3, // Words with net_score between 3 and 6 get priority
  // Minimum votes before a word is considered for validation
  MIN_VOTES_FOR_REVIEW: 4,
  // If AI and community disagree by this margin, flag for review
  AI_DISAGREEMENT_THRESHOLD: 5,
  // Maximum AI validations per game (to control costs)
  MAX_AI_VALIDATIONS_PER_GAME: 5,
  // Minimum word length for AI validation (skip very short words)
  MIN_WORD_LENGTH_FOR_AI: 3,
  // If community has voted negatively on word, skip AI validation
  SKIP_AI_IF_COMMUNITY_NEGATIVE: true
};

// Track AI validation usage per game
const gameAIValidationCount = new Map<string, number>(); // gameCode -> count

// Track if we've loaded from database
let loaded = false;

/**
 * Load community-validated words from Supabase into memory
 * Called on server startup
 */
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
    // Query all words with net_score >= PROMINENT_THRESHOLD (is_potentially_valid = true)
    const { data, error } = await client
      .from('word_scores')
      .select('word, language')
      .eq('is_potentially_valid', true);

    if (error) {
      logger.error('CommunityWords', `Error loading from database: ${error.message}`);
      loaded = true;
      return;
    }

    // Populate in-memory sets
    const counts: Record<LanguageCode, number> = { en: 0, he: 0, sv: 0, ja: 0, es: 0 };
    for (const row of data || []) {
      const lang = (row.language || 'en') as LanguageCode;
      if (communityValidWords[lang]) {
        const normalized = normalizeWord(row.word, lang);
        communityValidWords[lang].add(normalized);
        counts[lang]++;
      }
    }

    // Also load words pending validation (have some votes but not yet valid)
    // These are prioritized for further voting
    const { data: pendingData, error: pendingError } = await client
      .from('word_scores')
      .select('word, language, likes_count, dislikes_count, net_score')
      .eq('is_potentially_valid', false)
      .gt('likes_count', 0); // Has at least some engagement

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
            aiApproved: false, // Will be updated when AI validates
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

/**
 * Check if a word is community-validated (has 6+ net votes)
 * O(1) in-memory lookup for gameplay performance
 */
export function isWordCommunityValid(word: string, language: string): boolean {
  const lang = (language || 'en') as LanguageCode;
  const set = communityValidWords[lang];
  if (!set) return false;

  const normalized = normalizeWord(word, lang);
  return set.has(normalized);
}

/**
 * Add a word to the community-valid cache (when it crosses the PROMINENT_THRESHOLD)
 */
export function addToCommunityCache(word: string, language: string): void {
  const lang = (language || 'en') as LanguageCode;
  const set = communityValidWords[lang];
  if (!set) return;

  const normalized = normalizeWord(word, lang);
  set.add(normalized);
  logger.debug('CommunityWords', `Word "${word}" (${lang}) added to community cache`);
}

/**
 * Record a vote on a word
 */
export async function recordVote({
  word,
  language,
  userId,
  guestId,
  gameCode,
  voteType,
  submitter,
  isBotWord = false
}: VoteParams): Promise<VoteResult> {
  const client = getSupabase() as SupabaseClient | null;
  if (!client) {
    return { success: false, isNowValid: false, error: 'Supabase not configured' };
  }

  const normalizedWord = normalizeWord(word, language || 'en');
  const lang = (language || 'en') as LanguageCode;

  try {
    // Insert the vote (will fail if duplicate due to unique constraints)
    const voteData: Record<string, unknown> = {
      word: normalizedWord,
      language: lang,
      game_code: gameCode,
      vote_type: voteType,
      is_bot_word: isBotWord  // Track if this vote is for a bot-submitted word
    };

    // Set either user_id or guest_id
    if (userId) {
      voteData.user_id = userId;
    } else if (guestId) {
      voteData.guest_id = guestId;
    } else {
      return { success: false, isNowValid: false, error: 'No voter identifier provided' };
    }

    const { error: insertError } = await client
      .from('word_votes')
      .insert(voteData);

    if (insertError) {
      // Check if it's a duplicate vote error
      if (insertError.code === '23505') { // Unique violation
        logger.debug('CommunityWords', `Duplicate vote ignored for "${word}" (${lang})`);
        return { success: false, isNowValid: false, error: 'Already voted on this word' };
      }
      logger.error('CommunityWords', `Error recording vote: ${insertError.message}`);
      return { success: false, isNowValid: false, error: insertError.message };
    }

    // Check if word just crossed the threshold
    // The trigger will have updated word_scores, so query the current state
    const { data: scoreData, error: scoreError } = await client
      .from('word_scores')
      .select('net_score, is_potentially_valid')
      .eq('word', normalizedWord)
      .eq('language', lang)
      .single();

    if (scoreError) {
      logger.error('CommunityWords', `Error fetching score: ${scoreError.message}`);
      // Vote was recorded successfully, just couldn't check threshold
      return { success: true, isNowValid: false, error: null };
    }

    const isNowValid = scoreData?.is_potentially_valid === true;

    // If word just became prominently valid, add to cache
    if (isNowValid && !communityValidWords[lang]?.has(normalizedWord)) {
      addToCommunityCache(normalizedWord, lang);
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

/**
 * Record an AI validation vote for a word
 * AI votes count as AI_VOTE_POINTS (4 points) toward the threshold
 */
export async function recordAIVote({
  word,
  language,
  isValid,
  reason,
  confidence
}: AIVoteParams): Promise<AIVoteResult> {
  const client = getSupabase() as SupabaseClient | null;
  if (!client) {
    return { success: false, netScore: 0, isProminentlyValid: false, isValidForScoring: false, error: 'Supabase not configured' };
  }

  const normalizedWord = normalizeWord(word, language || 'en');
  const lang = (language || 'en') as LanguageCode;
  const votePoints = isValid ? AI_VOTE_POINTS : -AI_VOTE_POINTS;

  try {
    // Upsert the word_scores record with AI vote points
    // AI votes are recorded by adding to likes_count (valid) or dislikes_count (invalid)
    // The net_score and is_potentially_valid columns are auto-generated

    // First, try to get existing record
    const { data: existing, error: fetchError } = await client
      .from('word_scores')
      .select('likes_count, dislikes_count, net_score, is_potentially_valid')
      .eq('word', normalizedWord)
      .eq('language', lang)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 = no rows returned
      logger.error('CommunityWords', `Error fetching word score for AI vote: ${fetchError.message}`);
      return { success: false, netScore: 0, isProminentlyValid: false, isValidForScoring: false, error: fetchError.message };
    }

    // Calculate new counts based on AI vote
    // AI vote adds AI_VOTE_POINTS to likes or dislikes
    const currentLikes = existing?.likes_count || 0;
    const currentDislikes = existing?.dislikes_count || 0;
    const newLikes = isValid ? currentLikes + AI_VOTE_POINTS : currentLikes;
    const newDislikes = isValid ? currentDislikes : currentDislikes + AI_VOTE_POINTS;
    const newNetScore = newLikes - newDislikes;

    // Upsert the record - only update likes_count and dislikes_count
    // net_score and is_potentially_valid are auto-generated by the database
    const { error: upsertError } = await client
      .from('word_scores')
      .upsert({
        word: normalizedWord,
        language: lang,
        likes_count: newLikes,
        dislikes_count: newDislikes,
        last_voted_at: new Date().toISOString()
      }, {
        onConflict: 'word,language'
      });

    if (upsertError) {
      logger.error('CommunityWords', `Error recording AI vote: ${upsertError.message}`);
      return { success: false, netScore: 0, isProminentlyValid: false, isValidForScoring: false, error: upsertError.message };
    }

    const isProminentlyValid = newNetScore >= PROMINENT_THRESHOLD;
    const isValidForScoring = newNetScore > VALID_THRESHOLD;

    // If word crossed the prominent threshold, add to cache
    if (isProminentlyValid && !communityValidWords[lang]?.has(normalizedWord)) {
      addToCommunityCache(normalizedWord, lang);
      logger.info('CommunityWords', `Word "${word}" (${lang}) reached ${PROMINENT_THRESHOLD}+ via AI vote! Now prominently valid.`);
    }

    // Update pending cache
    updatePendingCache(word, lang, isValid ? 'like' : 'dislike', true);

    logger.info('CommunityWords', `AI vote recorded: "${word}" (${lang}) - ${isValid ? 'VALID' : 'INVALID'} (${votePoints} points, new score: ${newNetScore})`);

    return {
      success: true,
      netScore: newNetScore,
      isProminentlyValid,
      isValidForScoring,
      error: null
    };

  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    logger.error('CommunityWords', `Unexpected error recording AI vote: ${err}`);
    return { success: false, netScore: 0, isProminentlyValid: false, isValidForScoring: false, error: errorMessage };
  }
}

/**
 * Get word validation info from database
 */
export async function getWordValidationInfo(word: string, language: string): Promise<WordValidationInfo> {
  const client = getSupabase() as SupabaseClient | null;
  if (!client) {
    return { netScore: 0, isProminentlyValid: false, isValidForScoring: false };
  }

  const normalizedWord = normalizeWord(word, language || 'en');
  const lang = language || 'en';

  try {
    const { data, error } = await client
      .from('word_scores')
      .select('net_score, is_potentially_valid, likes_count, dislikes_count')
      .eq('word', normalizedWord)
      .eq('language', lang)
      .single();

    if (error) {
      return { netScore: 0, isProminentlyValid: false, isValidForScoring: false };
    }

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

/**
 * Check if a word has positive validation ratio (valid for scoring)
 */
export function isWordValidForScoring(word: string, language: string): boolean {
  const lang = (language || 'en') as LanguageCode;
  const normalized = normalizeWord(word, lang);

  // First check if it's prominently valid
  if (communityValidWords[lang]?.has(normalized)) {
    return true;
  }

  // Then check pending cache for positive ratio
  const pendingCache = wordsPendingVotes[lang];
  if (pendingCache) {
    const cached = pendingCache.get(normalized);
    if (cached && cached.netScore > VALID_THRESHOLD) {
      return true;
    }
  }

  return false;
}

/**
 * Get non-dictionary words from a game that need feedback
 * Also includes bot words which can be voted on by players
 */
export function collectNonDictionaryWords(game: Game): NonDictionaryWord[] {
  const nonDictWords: NonDictionaryWord[] = [];
  const seenWords = new Set<string>();

  // Iterate through all players' word details
  for (const [username, wordDetails] of Object.entries(game.playerWordDetails || {})) {
    for (const detail of wordDetails || []) {
      // Include words that meet either criteria:
      // A) Non-dictionary words (for community validation):
      //    1. Were NOT auto-validated (not in dictionary)
      //    2. Are on the board (valid path)
      //    3. Haven't been seen yet (dedupe)
      //    4. Are NOT already community-validated
      // B) Bot words (for player feedback on bot's word choices):
      //    1. Were submitted by a bot
      //    2. Haven't been seen yet (dedupe)

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

/**
 * Calculate priority score for a word based on self-healing criteria
 * Higher score = should be shown to users sooner
 */
function calculateWordPriority(wordData: WordPriorityData): number {
  const { likes = 0, dislikes = 0, netScore = 0, aiApproved = false } = wordData;
  const totalVotes = likes + dislikes;

  let priority = 0;

  // Factor 1: Proximity to threshold (words close to PROMINENT_THRESHOLD get highest priority)
  if (netScore >= PROMINENT_THRESHOLD - 3 && netScore < PROMINENT_THRESHOLD) {
    priority += 100 - (PROMINENT_THRESHOLD - netScore) * 10; // 70-90 points
  } else if (netScore >= 1 && netScore < PROMINENT_THRESHOLD - 3) {
    priority += 40 - Math.min(20, (PROMINENT_THRESHOLD - 3 - netScore) * 5); // 20-40 points
  } else if (netScore < 0) {
    // Negative words might be being unfairly rejected - give them a chance
    priority += Math.max(0, 20 + netScore * 5); // 0-15 points for words between -4 and 0
  }

  // Factor 2: Words with fewer total votes need more data
  if (totalVotes < 4) {
    priority += 50 - totalVotes * 10; // 20-50 points for new words
  } else if (totalVotes < 10) {
    priority += 15; // Small boost for words with moderate votes
  }

  // Factor 3: AI-approved words with negative votes (potential false positive)
  if (aiApproved && dislikes > 0) {
    priority += 30 + dislikes * 5; // 35+ points - AI might be wrong
  }

  // Factor 4: Words with significant likes but not yet prominently validated
  if (likes >= 3 && netScore < PROMINENT_THRESHOLD) {
    priority += 20;
  }

  // Factor 5: Bot words get high priority for validation
  if (wordData.isBot) {
    priority += 80; // High priority to ensure bot words appear in validation queue
  }

  return priority;
}

/**
 * Get a prioritized list of words for a player to vote on
 */
export function getWordsForPlayer(
  nonDictWords: NonDictionaryWord[],
  excludeUsername: string,
  language: string,
  count: number = SELF_HEALING_CONFIG.WORDS_PER_PLAYER
): WordForPlayer[] {
  // Filter out words submitted by this player
  const eligibleWords = nonDictWords.filter(w => w.submittedBy !== excludeUsername);

  if (eligibleWords.length === 0) {
    return [];
  }

  const lang = (language || 'en') as LanguageCode;
  const pendingCache = wordsPendingVotes[lang] || new Map();

  // Enrich words with priority scores
  const wordsWithPriority = eligibleWords.map(wordData => {
    const normalized = normalizeWord(wordData.word, lang);
    const cached = pendingCache.get(normalized);

    // Get vote stats from cache or use defaults
    const voteStats = cached || { likes: 0, dislikes: 0, netScore: 0, aiApproved: false, lastVoted: 0 };

    // Include isBot flag in priority calculation so bot words get prioritized
    const priorityData: WordPriorityData = { ...voteStats, isBot: wordData.isBot === true };

    return {
      ...wordData,
      ...voteStats,
      priority: calculateWordPriority(priorityData),
      normalized
    };
  });

  // Sort by priority (highest first)
  wordsWithPriority.sort((a, b) => b.priority - a.priority);

  // Return top N words based on count
  // Add some randomization among equally high-priority words to avoid showing same words
  const topPriority = wordsWithPriority[0]?.priority || 0;
  const highPriorityWords = wordsWithPriority.filter(w => w.priority >= topPriority * 0.7);

  // Shuffle high-priority words to add variety
  for (let i = highPriorityWords.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [highPriorityWords[i], highPriorityWords[j]] = [highPriorityWords[j], highPriorityWords[i]];
  }

  // Take requested count from shuffled high-priority words, then fill with remaining
  const selected = highPriorityWords.slice(0, count);

  // If we need more, add from the rest of the sorted list
  if (selected.length < count) {
    const remaining = wordsWithPriority.filter(w => !selected.includes(w));
    selected.push(...remaining.slice(0, count - selected.length));
  }

  // Log selection for debugging
  if (selected.length > 0) {
    logger.debug('CommunityWords', `Selected ${selected.length} words for ${excludeUsername}: ${selected.map(w => `${w.word}(p:${w.priority})`).join(', ')}`);
  }

  // Return clean word data (remove internal priority fields)
  return selected.map(({ word, submittedBy, submitterAvatar, isBot, netScore, likes, dislikes }) => ({
    word,
    submittedBy,
    submitterAvatar,
    isBot: isBot || false,
    // Include vote info so UI can show progress toward validation
    voteInfo: {
      netScore: netScore || 0,
      totalVotes: (likes || 0) + (dislikes || 0),
      votesNeeded: Math.max(0, PROMINENT_THRESHOLD - (netScore || 0)),
      isValidForScoring: (netScore || 0) > VALID_THRESHOLD // Positive ratio = valid for scoring
    }
  }));
}

/**
 * Get a single word for a player to vote on (backward compatible)
 */
export function getWordForPlayer(
  nonDictWords: NonDictionaryWord[],
  excludeUsername: string,
  language?: string
): WordForPlayer | null {
  const words = getWordsForPlayer(nonDictWords, excludeUsername, language || 'en', 1);
  return words.length > 0 ? words[0] : null;
}

/**
 * Update the pending votes cache when a vote is recorded
 */
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

  if (voteType === 'like') {
    existing.likes++;
    existing.netScore++;
  } else if (voteType === 'dislike') {
    existing.dislikes++;
    existing.netScore--;
  }

  if (aiApproved !== null) {
    existing.aiApproved = aiApproved;
  }

  existing.lastVoted = Date.now();
  cache.set(normalized, existing);

  // If word crossed the prominent threshold, remove from pending and add to valid cache
  if (existing.netScore >= PROMINENT_THRESHOLD) {
    cache.delete(normalized);
    addToCommunityCache(word, lang);
    logger.info('CommunityWords', `Word "${word}" (${lang}) crossed prominent threshold (${PROMINENT_THRESHOLD}) via cache update`);
  }
}

/**
 * Check if user has already voted on a word
 */
export async function hasUserVoted(
  word: string,
  language: string,
  userId: string | null,
  guestId: string | null
): Promise<boolean> {
  const client = getSupabase() as SupabaseClient | null;
  if (!client) return false;

  const normalizedWord = normalizeWord(word, language || 'en');

  try {
    let query = client
      .from('word_votes')
      .select('id')
      .eq('word', normalizedWord)
      .eq('language', language || 'en');

    if (userId) {
      query = query.eq('user_id', userId);
    } else if (guestId) {
      query = query.eq('guest_id', guestId);
    } else {
      return false;
    }

    const { data, error } = await query.single();

    if (error && error.code !== 'PGRST116') { // Not found is OK
      logger.error('CommunityWords', `Error checking vote: ${error.message}`);
      return false;
    }

    return !!data;

  } catch (err) {
    logger.error('CommunityWords', `Unexpected error checking vote: ${err}`);
    return false;
  }
}

/**
 * Get stats for a word
 */
export async function getWordStats(word: string, language: string): Promise<WordStats> {
  const client = getSupabase() as SupabaseClient | null;
  if (!client) return { likes: 0, dislikes: 0, netScore: 0, isValid: false };

  const normalizedWord = normalizeWord(word, language || 'en');

  try {
    const { data, error } = await client
      .from('word_scores')
      .select('likes_count, dislikes_count, net_score, is_potentially_valid')
      .eq('word', normalizedWord)
      .eq('language', language || 'en')
      .single();

    if (error) {
      return { likes: 0, dislikes: 0, netScore: 0, isValid: false };
    }

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

// =============================================================================
// HYBRID VALIDATION - Cost-Efficient AI Usage
// =============================================================================

/**
 * Reset AI validation count for a game (call at game start)
 */
export function resetGameAIValidationCount(gameCode: string): void {
  gameAIValidationCount.set(gameCode, 0);
  logger.debug('CommunityWords', `Reset AI validation count for game ${gameCode}`);
}

/**
 * Clean up game tracking data when game ends
 */
export function cleanupGameTracking(gameCode: string): void {
  gameAIValidationCount.delete(gameCode);
}

/**
 * Check if we should use AI validation for this word
 * Returns decision and reason - implements hybrid cost-saving strategy
 */
export function shouldUseAIValidation(
  word: string,
  language: string,
  gameCode: string
): ShouldValidateResult {
  const lang = (language || 'en') as LanguageCode;
  const normalized = normalizeWord(word, lang);

  // 1. Check if already community-validated (no AI needed!)
  if (isWordCommunityValid(normalized, lang)) {
    return {
      shouldValidate: false,
      reason: 'already_community_valid',
      alternativeResult: { isValid: true, source: 'community' }
    };
  }

  // 2. Check pending cache for community voting status
  const pendingCache = wordsPendingVotes[lang];
  if (pendingCache) {
    const cached = pendingCache.get(normalized);
    if (cached) {
      // If community has strongly rejected this word, skip AI
      if (SELF_HEALING_CONFIG.SKIP_AI_IF_COMMUNITY_NEGATIVE && cached.netScore <= -3) {
        logger.debug('CommunityWords', `Skipping AI for "${word}" - community rejected (netScore: ${cached.netScore})`);
        return {
          shouldValidate: false,
          reason: 'Community rejected this word',
          alternativeResult: { isValid: false, source: 'community' }
        };
      }

      // If community has positively voted (near threshold), trust community
      if (cached.netScore >= 4) {
        logger.debug('CommunityWords', `Using community approval for "${word}" (netScore: ${cached.netScore})`);
        return {
          shouldValidate: false,
          reason: 'community_approved_pending',
          alternativeResult: { isValid: true, source: 'community_pending' }
        };
      }
    }
  }

  // 3. Check game AI validation limit
  const currentCount = gameAIValidationCount.get(gameCode) || 0;
  if (currentCount >= SELF_HEALING_CONFIG.MAX_AI_VALIDATIONS_PER_GAME) {
    logger.debug('CommunityWords', `AI limit reached for game ${gameCode} (${currentCount}/${SELF_HEALING_CONFIG.MAX_AI_VALIDATIONS_PER_GAME})`);
    return {
      shouldValidate: false,
      reason: 'Could not verify - validation limit reached',
      alternativeResult: { isValid: false, source: 'limit_reached' }
    };
  }

  // 4. Check word length
  if (normalized.length < SELF_HEALING_CONFIG.MIN_WORD_LENGTH_FOR_AI) {
    return {
      shouldValidate: false,
      reason: 'Word too short',
      alternativeResult: { isValid: false, source: 'too_short' }
    };
  }

  // 5. Basic gibberish detection (save tokens on obvious non-words)
  if (looksLikeGibberish(normalized, lang)) {
    logger.debug('CommunityWords', `Skipping AI for "${word}" - looks like gibberish`);
    return {
      shouldValidate: false,
      reason: 'Not a valid word',
      alternativeResult: { isValid: false, source: 'pattern_rejected' }
    };
  }

  // All checks passed - proceed with AI validation
  return {
    shouldValidate: true,
    reason: 'proceed_with_ai'
  };
}

/**
 * Basic heuristics to detect gibberish words (save AI tokens)
 */
function looksLikeGibberish(word: string, language: string): boolean {
  // Skip checks for very short words (they pass through)
  if (word.length < 4) return false;

  // Check for too many consecutive consonants (language-specific)
  const consonantPatterns: Record<string, RegExp | null> = {
    en: /[bcdfghjklmnpqrstvwxz]{5,}/i,
    he: null, // Hebrew has different rules
    sv: /[bcdfghjklmnpqrstvwxz]{5,}/i,
    ja: null  // Japanese has different rules
  };

  const pattern = consonantPatterns[language];
  if (pattern && pattern.test(word)) {
    return true;
  }

  // Check for too many consecutive vowels
  if (/[aeiou]{4,}/i.test(word)) {
    return true;
  }

  // Check for repeated character patterns (like "aaaa" or "abab")
  if (/(.)\1{3,}/.test(word)) {
    return true;
  }

  // Check for alternating pattern abuse (qwqwqw)
  if (/^(.{1,2})\1{2,}$/.test(word)) {
    return true;
  }

  return false;
}

/**
 * Record that an AI validation was used for a game
 */
export function recordAIValidationUsed(gameCode: string): void {
  const current = gameAIValidationCount.get(gameCode) || 0;
  gameAIValidationCount.set(gameCode, current + 1);
  logger.debug('CommunityWords', `AI validation count for game ${gameCode}: ${current + 1}/${SELF_HEALING_CONFIG.MAX_AI_VALIDATIONS_PER_GAME}`);
}

/**
 * Get remaining AI validations for a game
 */
export function getRemainingAIValidations(gameCode: string): number {
  const current = gameAIValidationCount.get(gameCode) || 0;
  return Math.max(0, SELF_HEALING_CONFIG.MAX_AI_VALIDATIONS_PER_GAME - current);
}

/**
 * Filter words for batch AI validation - only validate words that pass hybrid checks
 */
export function filterWordsForAIValidation(
  words: string[],
  language: string,
  gameCode: string
): FilteredWordsResult {
  const wordsForAI: string[] = [];
  const skippedWords = new Map<string, { isValid: boolean; source: string; reason: string }>();

  const remaining = getRemainingAIValidations(gameCode);

  for (const word of words) {
    // Check if we've hit the limit
    if (wordsForAI.length >= remaining) {
      skippedWords.set(word, {
        isValid: false,
        source: 'limit_reached',
        reason: 'Could not verify - validation limit reached'
      });
      continue;
    }

    const decision = shouldUseAIValidation(word, language, gameCode);

    if (decision.shouldValidate) {
      wordsForAI.push(word);
    } else {
      skippedWords.set(word, {
        isValid: decision.alternativeResult?.isValid || false,
        source: decision.alternativeResult?.source || 'skipped',
        reason: decision.reason
      });
    }
  }

  logger.info('CommunityWords', `Filtered ${words.length} words for AI: ${wordsForAI.length} for AI, ${skippedWords.size} skipped`);

  return { wordsForAI, skippedWords };
}

// CommonJS exports for backward compatibility
module.exports = {
  loadCommunityWords,
  isWordCommunityValid,
  addToCommunityCache,
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
  SELF_HEALING_CONFIG,
  // Validation constants
  AI_VOTE_POINTS,
  PROMINENT_THRESHOLD,
  VALID_THRESHOLD,
  // Hybrid validation exports
  shouldUseAIValidation,
  recordAIValidationUsed,
  getRemainingAIValidations,
  filterWordsForAIValidation,
  resetGameAIValidationCount,
  cleanupGameTracking
};
