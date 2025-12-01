/**
 * Community Word Manager
 * Handles crowd-sourced word voting and dynamic dictionary expansion
 * Words with net_score >= 10 become "prominently valid" and auto-validate during gameplay
 * Words with positive ratio (> 0) count as valid for scoring but still show validation modal
 *
 * VALIDATION SCORING:
 * - AI validation = 4 points
 * - Player vote = 1 point (like = +1, dislike = -1)
 * - Words need 10+ net score to be added prominently to dictionary
 * - Words with positive ratio (> 0) count as valid for scoring
 *
 * SELF-HEALING FEATURES:
 * - Prioritized word selection: Focus on words that need votes most
 * - AI accuracy tracking: Monitor when community disagrees with AI
 * - Multi-word voting queue: Increase vote collection per game
 */

const { getSupabase, isSupabaseConfigured } = require('./supabaseServer');
const { normalizeWord } = require('../dictionary');
const logger = require('../utils/logger');

// Validation scoring constants
const AI_VOTE_POINTS = 4;          // AI validation counts as 4 points
const PROMINENT_THRESHOLD = 10;    // Words need 10+ net score for prominent dictionary addition
const VALID_THRESHOLD = 0;         // Words with positive ratio (> 0) count as valid for scoring

// In-memory cache of community-validated words per language
// These are words with net_score >= PROMINENT_THRESHOLD (10) that are prominently valid
// Words with positive ratio (> 0) also count as valid for scoring
const communityValidWords = {
  en: new Set(),
  he: new Set(),
  sv: new Set(),
  ja: new Set()
};

// In-memory cache of words pending validation with their vote counts
// Used for prioritized word selection
const wordsPendingVotes = {
  en: new Map(), // word -> { likes, dislikes, netScore, aiApproved, lastVoted }
  he: new Map(),
  sv: new Map(),
  ja: new Map()
};

// Configuration for self-healing system
const SELF_HEALING_CONFIG = {
  // Number of words to show each player for voting
  WORDS_PER_PLAYER: 3,
  // Prioritize words within this range of the threshold (close to being validated)
  THRESHOLD_PROXIMITY: 3, // Words with net_score between 3 and 8 get priority
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
const gameAIValidationCount = new Map(); // gameCode -> count

// Track if we've loaded from database
let loaded = false;

/**
 * Load community-validated words from Supabase into memory
 * Called on server startup
 */
async function loadCommunityWords() {
  if (loaded) return;

  const client = getSupabase();
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
    let counts = { en: 0, he: 0, sv: 0, ja: 0 };
    for (const row of data || []) {
      const lang = row.language || 'en';
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
      let pendingCounts = { en: 0, he: 0, sv: 0, ja: 0 };
      for (const row of pendingData) {
        const lang = row.language || 'en';
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
 * @param {string} word - The word to check
 * @param {string} language - Language code
 * @returns {boolean} - True if word is community-validated
 */
function isWordCommunityValid(word, language) {
  const lang = language || 'en';
  const set = communityValidWords[lang];
  if (!set) return false;

  const normalized = normalizeWord(word, lang);
  return set.has(normalized);
}

/**
 * Add a word to the community-valid cache (when it crosses the PROMINENT_THRESHOLD)
 * @param {string} word - The word to add
 * @param {string} language - Language code
 */
function addToCommunityCache(word, language) {
  const lang = language || 'en';
  const set = communityValidWords[lang];
  if (!set) return;

  const normalized = normalizeWord(word, lang);
  set.add(normalized);
  logger.debug('CommunityWords', `Word "${word}" (${lang}) added to community cache`);
}

/**
 * Record a vote on a word
 * @param {object} params - Vote parameters
 * @param {string} params.word - The word being voted on
 * @param {string} params.language - Language code
 * @param {string|null} params.userId - Auth user ID (null for guests)
 * @param {string|null} params.guestId - Guest ID (null for auth users)
 * @param {string} params.gameCode - Game where vote occurred
 * @param {string} params.voteType - 'like' or 'dislike'
 * @param {string} params.submitter - Username who submitted the word
 * @returns {object} - { success, isNowValid, error }
 */
async function recordVote({ word, language, userId, guestId, gameCode, voteType, submitter }) {
  const client = getSupabase();
  if (!client) {
    return { success: false, isNowValid: false, error: 'Supabase not configured' };
  }

  const normalizedWord = normalizeWord(word, language || 'en');
  const lang = language || 'en';

  try {
    // Insert the vote (will fail if duplicate due to unique constraints)
    const voteData = {
      word: normalizedWord,
      language: lang,
      game_code: gameCode,
      vote_type: voteType
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
    logger.error('CommunityWords', `Unexpected error recording vote: ${err}`);
    return { success: false, isNowValid: false, error: err.message };
  }
}

/**
 * Record an AI validation vote for a word
 * AI votes count as AI_VOTE_POINTS (4 points) toward the threshold
 * @param {object} params - Vote parameters
 * @param {string} params.word - The word validated
 * @param {string} params.language - Language code
 * @param {boolean} params.isValid - Whether AI validated as valid
 * @param {string} params.reason - AI's reason for validation
 * @param {number} params.confidence - AI confidence score (0-100)
 * @returns {object} - { success, netScore, isProminentlyValid, isValidForScoring, error }
 */
async function recordAIVote({ word, language, isValid, reason, confidence }) {
  const client = getSupabase();
  if (!client) {
    return { success: false, netScore: 0, isProminentlyValid: false, isValidForScoring: false, error: 'Supabase not configured' };
  }

  const normalizedWord = normalizeWord(word, language || 'en');
  const lang = language || 'en';
  const votePoints = isValid ? AI_VOTE_POINTS : -AI_VOTE_POINTS;

  try {
    // Upsert the word_scores record with AI vote points
    // First, try to get existing record
    const { data: existing, error: fetchError } = await client
      .from('word_scores')
      .select('net_score, ai_score, ai_reason, ai_validated')
      .eq('word', normalizedWord)
      .eq('language', lang)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 = no rows returned
      logger.error('CommunityWords', `Error fetching word score for AI vote: ${fetchError.message}`);
      return { success: false, netScore: 0, isProminentlyValid: false, isValidForScoring: false, error: fetchError.message };
    }

    // Skip if already AI validated
    if (existing?.ai_validated) {
      logger.debug('CommunityWords', `Word "${word}" (${lang}) already AI validated, skipping`);
      const netScore = existing.net_score || 0;
      return {
        success: true,
        netScore,
        isProminentlyValid: netScore >= PROMINENT_THRESHOLD,
        isValidForScoring: netScore > VALID_THRESHOLD,
        error: null
      };
    }

    const currentNetScore = existing?.net_score || 0;
    const newNetScore = currentNetScore + votePoints;

    // Upsert the record
    const { error: upsertError } = await client
      .from('word_scores')
      .upsert({
        word: normalizedWord,
        language: lang,
        net_score: newNetScore,
        ai_score: votePoints,
        ai_reason: reason || (isValid ? 'Valid word' : 'Invalid word'),
        ai_validated: true,
        ai_confidence: confidence || 85,
        is_potentially_valid: newNetScore >= PROMINENT_THRESHOLD
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
      aiReason: reason,
      error: null
    };

  } catch (err) {
    logger.error('CommunityWords', `Unexpected error recording AI vote: ${err}`);
    return { success: false, netScore: 0, isProminentlyValid: false, isValidForScoring: false, error: err.message };
  }
}

/**
 * Get word validation info including AI reason
 * @param {string} word - The word to check
 * @param {string} language - Language code
 * @returns {Promise<object>} - { netScore, isProminentlyValid, isValidForScoring, aiReason, aiValidated }
 */
async function getWordValidationInfo(word, language) {
  const client = getSupabase();
  if (!client) {
    return { netScore: 0, isProminentlyValid: false, isValidForScoring: false, aiReason: null, aiValidated: false };
  }

  const normalizedWord = normalizeWord(word, language || 'en');
  const lang = language || 'en';

  try {
    const { data, error } = await client
      .from('word_scores')
      .select('net_score, ai_reason, ai_validated, ai_confidence, is_potentially_valid')
      .eq('word', normalizedWord)
      .eq('language', lang)
      .single();

    if (error) {
      return { netScore: 0, isProminentlyValid: false, isValidForScoring: false, aiReason: null, aiValidated: false };
    }

    const netScore = data?.net_score || 0;
    return {
      netScore,
      isProminentlyValid: data?.is_potentially_valid || netScore >= PROMINENT_THRESHOLD,
      isValidForScoring: netScore > VALID_THRESHOLD,
      aiReason: data?.ai_reason || null,
      aiValidated: data?.ai_validated || false,
      aiConfidence: data?.ai_confidence || null
    };

  } catch (err) {
    return { netScore: 0, isProminentlyValid: false, isValidForScoring: false, aiReason: null, aiValidated: false };
  }
}

/**
 * Check if a word has positive validation ratio (valid for scoring)
 * @param {string} word - The word to check
 * @param {string} language - Language code
 * @returns {boolean} - True if word has positive ratio
 */
function isWordValidForScoring(word, language) {
  const lang = language || 'en';
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
 * @param {object} game - Game object with playerWordDetails
 * @returns {array} - Array of { word, submittedBy, submitterAvatar }
 */
function collectNonDictionaryWords(game) {
  const nonDictWords = [];
  const seenWords = new Set();

  // Iterate through all players' word details
  for (const [username, wordDetails] of Object.entries(game.playerWordDetails || {})) {
    for (const detail of wordDetails || []) {
      // Only include words that:
      // 1. Were NOT auto-validated (not in dictionary)
      // 2. Are on the board (valid path)
      // 3. Haven't been seen yet (dedupe)
      // 4. Are NOT already community-validated
      if (!detail.autoValidated &&
          detail.onBoard !== false &&
          !seenWords.has(detail.word) &&
          !isWordCommunityValid(detail.word, game.language)) {

        seenWords.add(detail.word);
        nonDictWords.push({
          word: detail.word,
          submittedBy: username,
          submitterAvatar: game.users?.[username]?.avatar || null
        });
      }
    }
  }

  return nonDictWords;
}

/**
 * Calculate priority score for a word based on self-healing criteria
 * Higher score = should be shown to users sooner
 *
 * Priority factors:
 * 1. Words close to validation threshold (net_score between 3-5) - HIGHEST priority
 * 2. Words with fewer total votes (need more data)
 * 3. AI-approved words that have some negative votes (potential false positive)
 * 4. Words with many likes but not yet validated (community wants it validated)
 *
 * @param {object} wordData - { word, likes, dislikes, netScore, aiApproved }
 * @returns {number} - Priority score (higher = more important)
 */
function calculateWordPriority(wordData) {
  const { likes = 0, dislikes = 0, netScore = 0, aiApproved = false } = wordData;
  const totalVotes = likes + dislikes;

  let priority = 0;

  // Factor 1: Proximity to threshold (words close to PROMINENT_THRESHOLD get highest priority)
  // Words approaching the threshold need just a few more votes to become prominently valid
  if (netScore >= PROMINENT_THRESHOLD - 3 && netScore < PROMINENT_THRESHOLD) {
    priority += 100 - (PROMINENT_THRESHOLD - netScore) * 10; // 70-90 points
  } else if (netScore >= 1 && netScore < PROMINENT_THRESHOLD - 3) {
    priority += 40 - Math.min(20, (PROMINENT_THRESHOLD - 3 - netScore) * 5); // 20-40 points
  } else if (netScore < 0) {
    // Negative words might be being unfairly rejected - give them a chance
    priority += Math.max(0, 20 + netScore * 5); // 0-15 points for words between -4 and 0
  }

  // Factor 2: Words with fewer total votes need more data
  // New words (0-3 votes) get boost to gather initial data
  if (totalVotes < 4) {
    priority += 50 - totalVotes * 10; // 20-50 points for new words
  } else if (totalVotes < 10) {
    priority += 15; // Small boost for words with moderate votes
  }

  // Factor 3: AI-approved words with negative votes (potential false positive)
  // These need community verification to improve AI accuracy
  if (aiApproved && dislikes > 0) {
    priority += 30 + dislikes * 5; // 35+ points - AI might be wrong
  }

  // Factor 4: Words with significant likes but not yet prominently validated
  // Community clearly wants these validated
  if (likes >= 3 && netScore < PROMINENT_THRESHOLD) {
    priority += 20;
  }

  return priority;
}

/**
 * Get a prioritized list of words for a player to vote on
 * Focuses on words that will have the most impact on dictionary quality
 *
 * @param {array} nonDictWords - Array of { word, submittedBy, submitterAvatar }
 * @param {string} excludeUsername - Username to exclude (their own submissions)
 * @param {string} language - Language code
 * @param {number} count - Number of words to return (default from config)
 * @returns {array} - Array of word data objects, prioritized by importance
 */
function getWordsForPlayer(nonDictWords, excludeUsername, language, count = SELF_HEALING_CONFIG.WORDS_PER_PLAYER) {
  // Filter out words submitted by this player
  const eligibleWords = nonDictWords.filter(w => w.submittedBy !== excludeUsername);

  if (eligibleWords.length === 0) {
    return [];
  }

  const lang = language || 'en';
  const pendingCache = wordsPendingVotes[lang] || new Map();

  // Enrich words with priority scores
  const wordsWithPriority = eligibleWords.map(wordData => {
    const normalized = normalizeWord(wordData.word, lang);
    const cached = pendingCache.get(normalized);

    // Get vote stats from cache or use defaults
    const voteStats = cached || { likes: 0, dislikes: 0, netScore: 0, aiApproved: false };

    return {
      ...wordData,
      ...voteStats,
      priority: calculateWordPriority(voteStats),
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
  return selected.map(({ word, submittedBy, submitterAvatar, netScore, likes, dislikes }) => ({
    word,
    submittedBy,
    submitterAvatar,
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
 * @param {array} nonDictWords - Array of { word, submittedBy, submitterAvatar }
 * @param {string} excludeUsername - Username to exclude (their own submissions)
 * @param {string} language - Language code (optional)
 * @returns {object|null} - Word data or null if none available
 */
function getWordForPlayer(nonDictWords, excludeUsername, language) {
  const words = getWordsForPlayer(nonDictWords, excludeUsername, language, 1);
  return words.length > 0 ? words[0] : null;
}

/**
 * Update the pending votes cache when a vote is recorded
 * This keeps our prioritization accurate without DB queries
 *
 * @param {string} word - The word that was voted on
 * @param {string} language - Language code
 * @param {string} voteType - 'like' or 'dislike'
 * @param {boolean} aiApproved - Whether AI approved this word (optional)
 */
function updatePendingCache(word, language, voteType, aiApproved = null) {
  const lang = language || 'en';
  const cache = wordsPendingVotes[lang];
  if (!cache) return;

  const normalized = normalizeWord(word, lang);
  const existing = cache.get(normalized) || { likes: 0, dislikes: 0, netScore: 0, aiApproved: false };

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
 * @param {string} word - The word
 * @param {string} language - Language code
 * @param {string|null} userId - Auth user ID
 * @param {string|null} guestId - Guest ID
 * @returns {boolean} - True if already voted
 */
async function hasUserVoted(word, language, userId, guestId) {
  const client = getSupabase();
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
 * @param {string} word - The word
 * @param {string} language - Language code
 * @returns {object} - { likes, dislikes, netScore, isValid }
 */
async function getWordStats(word, language) {
  const client = getSupabase();
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
 * @param {string} gameCode - Game code
 */
function resetGameAIValidationCount(gameCode) {
  gameAIValidationCount.set(gameCode, 0);
  logger.debug('CommunityWords', `Reset AI validation count for game ${gameCode}`);
}

/**
 * Clean up game tracking data when game ends
 * @param {string} gameCode - Game code
 */
function cleanupGameTracking(gameCode) {
  gameAIValidationCount.delete(gameCode);
}

/**
 * Check if we should use AI validation for this word
 * Returns decision and reason - implements hybrid cost-saving strategy
 *
 * Decision factors:
 * 1. Check if game has exceeded AI validation limit
 * 2. Check if word is already in community cache (no AI needed)
 * 3. Check if community has negatively voted on word (skip AI)
 * 4. Check word length (skip very short words)
 * 5. Check if word looks like gibberish (basic heuristics)
 *
 * @param {string} word - Word to potentially validate
 * @param {string} language - Language code
 * @param {string} gameCode - Game code for tracking limits
 * @returns {{ shouldValidate: boolean, reason: string, alternativeResult?: { isValid: boolean, source: string } }}
 */
function shouldUseAIValidation(word, language, gameCode) {
  const lang = language || 'en';
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
          reason: 'community_rejected',
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
      reason: 'ai_limit_reached',
      alternativeResult: { isValid: false, source: 'limit_reached' }
    };
  }

  // 4. Check word length
  if (normalized.length < SELF_HEALING_CONFIG.MIN_WORD_LENGTH_FOR_AI) {
    return {
      shouldValidate: false,
      reason: 'word_too_short',
      alternativeResult: { isValid: false, source: 'too_short' }
    };
  }

  // 5. Basic gibberish detection (save tokens on obvious non-words)
  if (looksLikeGibberish(normalized, lang)) {
    logger.debug('CommunityWords', `Skipping AI for "${word}" - looks like gibberish`);
    return {
      shouldValidate: false,
      reason: 'looks_gibberish',
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
 * @param {string} word - Normalized word
 * @param {string} language - Language code
 * @returns {boolean} - True if word looks like gibberish
 */
function looksLikeGibberish(word, language) {
  // Skip checks for very short words (they pass through)
  if (word.length < 4) return false;

  // Check for too many consecutive consonants (language-specific)
  const consonantPatterns = {
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
 * @param {string} gameCode - Game code
 */
function recordAIValidationUsed(gameCode) {
  const current = gameAIValidationCount.get(gameCode) || 0;
  gameAIValidationCount.set(gameCode, current + 1);
  logger.debug('CommunityWords', `AI validation count for game ${gameCode}: ${current + 1}/${SELF_HEALING_CONFIG.MAX_AI_VALIDATIONS_PER_GAME}`);
}

/**
 * Get remaining AI validations for a game
 * @param {string} gameCode - Game code
 * @returns {number} - Remaining AI validations
 */
function getRemainingAIValidations(gameCode) {
  const current = gameAIValidationCount.get(gameCode) || 0;
  return Math.max(0, SELF_HEALING_CONFIG.MAX_AI_VALIDATIONS_PER_GAME - current);
}

/**
 * Filter words for batch AI validation - only validate words that pass hybrid checks
 * @param {string[]} words - Array of words to potentially validate
 * @param {string} language - Language code
 * @param {string} gameCode - Game code
 * @returns {{ wordsForAI: string[], skippedWords: Map<string, { isValid: boolean, source: string, reason: string }> }}
 */
function filterWordsForAIValidation(words, language, gameCode) {
  const wordsForAI = [];
  const skippedWords = new Map();

  const remaining = getRemainingAIValidations(gameCode);

  for (const word of words) {
    // Check if we've hit the limit
    if (wordsForAI.length >= remaining) {
      skippedWords.set(word, {
        isValid: false,
        source: 'limit_reached',
        reason: 'AI validation limit reached'
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
