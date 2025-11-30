/**
 * Community Word Manager
 * Handles crowd-sourced word voting and dynamic dictionary expansion
 * Words with net_score >= 6 become "potentially valid" and auto-validate during gameplay
 */

const { getSupabase, isSupabaseConfigured } = require('./supabaseServer');
const { normalizeWord } = require('../dictionary');
const logger = require('../utils/logger');

// In-memory cache of community-validated words per language
// These are words with net_score >= 6 that should auto-validate during gameplay
const communityValidWords = {
  en: new Set(),
  he: new Set(),
  sv: new Set(),
  ja: new Set()
};

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
    // Query all words with net_score >= 6 (is_potentially_valid = true)
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
 * Add a word to the community-valid cache (when it crosses the 6+ threshold)
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

    // If word just became valid, add to cache
    if (isNowValid && !communityValidWords[lang]?.has(normalizedWord)) {
      addToCommunityCache(normalizedWord, lang);
      logger.info('CommunityWords', `Word "${word}" (${lang}) reached 6+ votes! Now auto-validates.`);
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
 * Get a random word for a player to vote on (excluding words they submitted)
 * @param {array} nonDictWords - Array of { word, submittedBy, submitterAvatar }
 * @param {string} excludeUsername - Username to exclude (their own submissions)
 * @returns {object|null} - Word data or null if none available
 */
function getWordForPlayer(nonDictWords, excludeUsername) {
  // Filter out words submitted by this player
  const eligibleWords = nonDictWords.filter(w => w.submittedBy !== excludeUsername);

  if (eligibleWords.length === 0) {
    return null;
  }

  // Pick a random word
  const randomIndex = Math.floor(Math.random() * eligibleWords.length);
  return eligibleWords[randomIndex];
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

module.exports = {
  loadCommunityWords,
  isWordCommunityValid,
  addToCommunityCache,
  recordVote,
  collectNonDictionaryWords,
  getWordForPlayer,
  hasUserVoted,
  getWordStats
};
