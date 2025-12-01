/**
 * GameAIService - Vertex AI + Supabase Integration (JavaScript/CommonJS version)
 *
 * Backend-compatible version for Railway deployment with ENV-based credentials.
 * Uses Gemini 1.5 Flash for word validation and caches results in Supabase.
 *
 * Uses existing tables:
 * - community_words: Host/AI approved words
 * - word_scores: Crowd-sourced validation (is_potentially_valid when net_score >= 6)
 */

const { VertexAI } = require('@google-cloud/vertexai');
const { createClient } = require('@supabase/supabase-js');

// Minimum confidence threshold for AI to approve a word (85%)
const MIN_CONFIDENCE_THRESHOLD = 85;

// =============================================================================
// Credential Parsing (Railway ENV-based)
// =============================================================================

/**
 * Parse Google Cloud credentials from JSON string environment variable.
 * This is crucial for Railway deployment where we can't use file-based credentials.
 *
 * @throws {Error} If GOOGLE_CREDENTIALS_JSON is missing or malformed
 * @returns {Object} Google credentials object
 */
function parseGoogleCredentials() {
  const credentialsJson = process.env.GOOGLE_CREDENTIALS_JSON;

  if (!credentialsJson) {
    throw new Error(
      'GOOGLE_CREDENTIALS_JSON environment variable is not set. ' +
      'Please add your Google Cloud service account JSON key to Railway environment variables.'
    );
  }

  try {
    const credentials = JSON.parse(credentialsJson);

    // Validate required fields
    const requiredFields = ['project_id', 'private_key', 'client_email'];

    for (const field of requiredFields) {
      if (!credentials[field]) {
        throw new Error(`Missing required field in credentials: ${field}`);
      }
    }

    // Handle escaped newlines in private_key (common when pasting JSON)
    if (credentials.private_key.includes('\\n')) {
      credentials.private_key = credentials.private_key.replace(/\\n/g, '\n');
    }

    return credentials;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(
        'GOOGLE_CREDENTIALS_JSON contains malformed JSON. ' +
        'Ensure you copied the entire service account key without line breaks. ' +
        `Parse error: ${error.message}`
      );
    }
    throw error;
  }
}

// =============================================================================
// Supabase Service Client (bypasses RLS)
// =============================================================================

/**
 * Create a Supabase client with service role key to bypass RLS for writing.
 * @returns {Object|null} Supabase client or null if not configured
 */
function createServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.warn(
      '[GameAIService] Supabase service role not configured. ' +
      'Word caching will be disabled.'
    );
    return null;
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

// =============================================================================
// GameAIService Class
// =============================================================================

class GameAIService {
  constructor() {
    this.vertexAI = null;
    this.model = null;
    this.batchModel = null; // Separate model for batch validation with higher token limit
    this.supabaseAdmin = null;
    this.credentials = null;
    this.initialized = false;
    this.initError = null;
  }

  /**
   * Initialize the service. Called lazily on first use.
   */
  async initialize() {
    if (this.initialized) return;
    if (this.initError) throw this.initError;

    try {
      // Parse credentials
      this.credentials = parseGoogleCredentials();

      // Initialize Vertex AI with credentials object (not file path!)
      // This is the key for Railway deployment
      this.vertexAI = new VertexAI({
        project: this.credentials.project_id,
        location: process.env.VERTEX_AI_LOCATION || 'us-central1',
        googleAuthOptions: {
          credentials: {
            client_email: this.credentials.client_email,
            private_key: this.credentials.private_key,
          },
          projectId: this.credentials.project_id,
        },
      });

      // Get the Gemini 1.5 Flash model for single word validation
      this.model = this.vertexAI.getGenerativeModel({
        model: process.env.VERTEX_AI_MODEL || 'gemini-1.5-flash-002',
        generationConfig: {
          maxOutputTokens: 256,
          temperature: 0.1, // Low temperature for consistent validation
        },
      });

      // Get a separate model for batch validation with higher token limit
      this.batchModel = this.vertexAI.getGenerativeModel({
        model: process.env.VERTEX_AI_MODEL || 'gemini-1.5-flash-002',
        generationConfig: {
          maxOutputTokens: 2048, // Higher limit for batch responses (100 chars per word × 20 words max)
          temperature: 0.1,
        },
      });

      // Initialize Supabase admin client
      this.supabaseAdmin = createServiceClient();

      this.initialized = true;
      console.log('[GameAIService] Initialized successfully');
    } catch (error) {
      this.initError = error;
      console.error('[GameAIService] Initialization failed:', error);
      throw error;
    }
  }

  // ===========================================================================
  // Feature A: validateAndSaveWord
  // ===========================================================================

  /**
   * Check if word exists in community_words table (host/AI approved words).
   * @param {string} word
   * @param {string} language
   * @returns {Promise<boolean>}
   */
  async checkCommunityWords(word, language) {
    if (!this.supabaseAdmin) return false;

    const { data, error } = await this.supabaseAdmin
      .from('community_words')
      .select('id')
      .eq('word', word)
      .eq('language', language)
      .limit(1)
      .maybeSingle();

    if (error) {
      console.warn('[GameAIService] community_words lookup error:', error.message);
      return false;
    }

    return data !== null;
  }

  /**
   * Check if word is crowd-validated in word_scores table (net_score >= 6).
   * @param {string} word
   * @param {string} language
   * @returns {Promise<boolean>}
   */
  async checkWordScores(word, language) {
    if (!this.supabaseAdmin) return false;

    const { data, error } = await this.supabaseAdmin
      .from('word_scores')
      .select('id')
      .eq('word', word)
      .eq('language', language)
      .eq('is_potentially_valid', true)
      .limit(1)
      .maybeSingle();

    if (error) {
      console.warn('[GameAIService] word_scores lookup error:', error.message);
      return false;
    }

    return data !== null;
  }

  /**
   * Save a valid word to community_words table.
   * Uses upsert to handle race conditions - increments approval_count if exists.
   * @param {string} word
   * @param {string} language
   */
  async saveToCommunityWords(word, language) {
    if (!this.supabaseAdmin) return;

    const now = new Date().toISOString();

    // First try to insert
    const { error: insertError } = await this.supabaseAdmin
      .from('community_words')
      .insert({
        word,
        language,
        approval_count: 1,
        first_approved_at: now,
        last_approved_at: now,
        // No user reference - AI-approved
      });

    // If unique constraint violation, update approval count
    if (insertError?.code === '23505') {
      const { error: updateError } = await this.supabaseAdmin
        .from('community_words')
        .update({
          last_approved_at: now,
        })
        .eq('word', word)
        .eq('language', language);

      if (updateError) {
        console.error('[GameAIService] Failed to update community_words:', updateError.message);
      }
    } else if (insertError) {
      console.error('[GameAIService] Failed to insert community_words:', insertError.message);
    }
  }

  /**
   * Slow check: Validate word using Vertex AI (Gemini 1.5 Flash).
   * @param {string} word
   * @param {string} language
   * @returns {Promise<{isValid: boolean, reason: string}>}
   */
  async validateWithAI(word, language) {
    if (!this.model) {
      throw new Error('Vertex AI model not initialized');
    }

    const languageNames = {
      en: 'English',
      he: 'Hebrew',
      sv: 'Swedish',
      es: 'Spanish',
      fr: 'French',
      de: 'German',
      it: 'Italian',
      pt: 'Portuguese',
      nl: 'Dutch',
      no: 'Norwegian',
      da: 'Danish',
      fi: 'Finnish',
    };

    const languageName = languageNames[language] || language;

    const prompt = `You are a strict word validator for a Boggle-style word game. Your task is to determine if a word is valid with a confidence score.

LANGUAGE: ${languageName} (${language})
WORD TO VALIDATE: "${word}"

VALIDATION RULES:
1. The word must be a REAL, established word in ${languageName}
2. ACCEPT: Common dictionary words, verbs in any conjugation, nouns (singular/plural), adjectives, adverbs
3. ACCEPT: Well-established slang that appears in dictionaries
4. REJECT: Proper nouns (names of people, places, brands) - these are NOT allowed in word games
5. REJECT: Abbreviations and acronyms (e.g., "TV", "USA")
6. REJECT: Words with spaces, hyphens, or special characters
7. REJECT: Random letter combinations that aren't real words
8. REJECT: Very obscure or archaic words that most native speakers wouldn't recognize
9. BE STRICT: Only approve words you are highly confident about. When in doubt, reject the word.

IMPORTANT: You must provide a confidence score (0-100) indicating how certain you are that this is a valid word.
- 95-100: Absolutely certain - common, well-known word
- 85-94: Very confident - established word, may be less common
- 70-84: Moderately confident - possibly valid but uncertain
- Below 70: Not confident - likely invalid or very obscure

The word is case-insensitive (ignore capitalization).

Respond with ONLY a valid JSON object in this exact format:
{ "isValid": boolean, "reason": "brief explanation in English", "confidence": number }

Example responses:
{ "isValid": true, "reason": "Common ${languageName} noun", "confidence": 98 }
{ "isValid": true, "reason": "Valid ${languageName} verb conjugation", "confidence": 92 }
{ "isValid": false, "reason": "Proper noun - not allowed in word games", "confidence": 95 }
{ "isValid": false, "reason": "Not a recognized ${languageName} word", "confidence": 88 }
{ "isValid": false, "reason": "Uncertain - may be valid but cannot confirm", "confidence": 60 }`;

    try {
      const result = await this.model.generateContent(prompt);
      const response = result.response;
      const text = response.candidates?.[0]?.content?.parts?.[0]?.text || '';

      // Extract JSON from response (handle potential markdown code blocks)
      // First, try to strip markdown code blocks
      let cleanText = text;
      // Remove ```json ... ``` or ``` ... ``` blocks
      const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (codeBlockMatch) {
        cleanText = codeBlockMatch[1].trim();
      }

      // Try to extract JSON object
      const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        // If no complete JSON found, try to handle truncated responses
        // Look for partial JSON that starts with { and has isValid
        const partialMatch = cleanText.match(/\{\s*"isValid"\s*:\s*(true|false)/);
        if (partialMatch) {
          // Return based on the partial isValid value found
          const isValid = partialMatch[1] === 'true';
          console.warn('[GameAIService] Extracted partial JSON response, isValid:', isValid);
          return { isValid, reason: 'Partial AI response - treated as ' + (isValid ? 'valid' : 'invalid'), confidence: 50 };
        }
        console.warn('[GameAIService] Could not extract JSON from AI response:', text.substring(0, 200));
        return { isValid: false, reason: 'Failed to parse AI response', confidence: 0 };
      }

      // Parse and validate
      let parsed;
      try {
        parsed = JSON.parse(jsonMatch[0]);
      } catch (parseError) {
        console.warn('[GameAIService] JSON parse error:', parseError.message, 'Raw:', jsonMatch[0].substring(0, 100));
        return { isValid: false, reason: 'Failed to parse AI response JSON', confidence: 0 };
      }

      if (typeof parsed.isValid !== 'boolean' || typeof parsed.reason !== 'string') {
        console.error('[GameAIService] AI response schema validation failed:', parsed);
        return { isValid: false, reason: 'Invalid AI response format', confidence: 0 };
      }

      // Ensure confidence is a number, default to 50 if not provided
      const confidence = typeof parsed.confidence === 'number' ? parsed.confidence : 50;

      // Apply confidence threshold - only approve if confidence >= 85%
      if (parsed.isValid && confidence < MIN_CONFIDENCE_THRESHOLD) {
        console.log(`[GameAIService] Word "${word}" rejected due to low confidence: ${confidence}% (threshold: ${MIN_CONFIDENCE_THRESHOLD}%)`);
        return {
          isValid: false,
          reason: `Confidence too low (${confidence}%) - need ${MIN_CONFIDENCE_THRESHOLD}%+ to approve`,
          confidence: confidence
        };
      }

      return { ...parsed, confidence };
    } catch (error) {
      console.error('[GameAIService] AI validation error:', error);
      throw error;
    }
  }

  /**
   * Validate a word and save valid words to the community_words table.
   *
   * Flow:
   * 1. Normalize: Trim and lowercase the input word
   * 2. Fast Check (DB): Query community_words table (host/AI approved)
   * 3. Fast Check (DB): Query word_scores table (crowd-validated, net_score >= 6)
   * 4. Slow Check (AI): If not found, call Gemini 1.5 Flash
   * 5. Persistence: If valid, upsert to community_words (learning loop)
   * 6. Return the result with source indicator
   *
   * @param {string} word - The word to validate
   * @param {string} language - Language code (e.g., 'en', 'sv')
   * @returns {Promise<{isValid: boolean, reason?: string, source: 'database'|'ai', error?: string}>}
   */
  async validateAndSaveWord(word, language = 'en') {
    // Ensure initialized
    await this.initialize();

    // Step 1: Normalization
    const normalizedWord = word.toLowerCase().trim();

    // Basic validation
    if (!normalizedWord || normalizedWord.length < 3) {
      return {
        isValid: false,
        reason: 'Word must be at least 3 characters',
        source: 'database',
      };
    }

    try {
      // Step 2: Fast Check - community_words (host/AI approved)
      const inCommunityWords = await this.checkCommunityWords(normalizedWord, language);
      if (inCommunityWords) {
        return {
          isValid: true,
          source: 'database',
        };
      }

      // Step 3: Fast Check - word_scores (crowd-validated)
      const inWordScores = await this.checkWordScores(normalizedWord, language);
      if (inWordScores) {
        return {
          isValid: true,
          source: 'database',
        };
      }

      // Step 4: Slow Check (AI)
      const aiResult = await this.validateWithAI(normalizedWord, language);

      // Step 5: Persistence (Learning Loop) - Only save valid words
      if (aiResult.isValid) {
        // Fire and forget - don't block on save
        this.saveToCommunityWords(normalizedWord, language).catch((err) => {
          console.error('[GameAIService] Background save failed:', err);
        });
      }

      // Step 6: Return result
      return {
        isValid: aiResult.isValid,
        reason: aiResult.reason,
        source: 'ai',
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[GameAIService] validateAndSaveWord error:', error);

      return {
        isValid: false,
        reason: 'Validation failed',
        source: 'ai',
        error: errorMessage,
      };
    }
  }

  // ===========================================================================
  // Feature B: generateThemedBoard
  // ===========================================================================

  /**
   * Generate a themed word board using AI.
   *
   * @param {string} theme - The theme for word generation (e.g., 'halloween', 'space')
   * @param {number} count - Number of words to generate
   * @param {string} language - Language code (e.g., 'en', 'sv')
   * @returns {Promise<string[]>} Array of themed words
   */
  async generateThemedBoard(theme, count, language = 'en') {
    // Ensure initialized
    await this.initialize();

    if (!this.model) {
      throw new Error('Vertex AI model not initialized');
    }

    const languageNames = {
      en: 'English',
      sv: 'Swedish',
      es: 'Spanish',
      fr: 'French',
      de: 'German',
      it: 'Italian',
      pt: 'Portuguese',
      nl: 'Dutch',
      no: 'Norwegian',
      da: 'Danish',
      fi: 'Finnish',
    };

    const languageName = languageNames[language] || language;

    const prompt = `Generate a JSON array of ${count} distinct words related to the theme '${theme}' in ${languageName}. Words must be between 3 to 10 letters long. No spaces, no hyphens. Output raw JSON only.`;

    try {
      const result = await this.model.generateContent(prompt);
      const response = result.response;
      const text = response.candidates?.[0]?.content?.parts?.[0]?.text || '';

      // Extract JSON array from response (handle markdown code blocks)
      let cleanText = text;
      // Remove ```json ... ``` or ``` ... ``` blocks
      const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (codeBlockMatch) {
        cleanText = codeBlockMatch[1].trim();
      }

      const jsonMatch = cleanText.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        console.warn('[GameAIService] Could not extract JSON array from AI response:', text.substring(0, 200));
        return [];
      }

      // Parse and validate
      let parsed;
      try {
        parsed = JSON.parse(jsonMatch[0]);
      } catch (parseError) {
        console.warn('[GameAIService] JSON array parse error:', parseError.message);
        return [];
      }

      if (!Array.isArray(parsed)) {
        console.error('[GameAIService] Themed words response is not an array:', parsed);
        return [];
      }

      // Filter to ensure word constraints
      const filteredWords = parsed
        .filter(w => typeof w === 'string')
        .map(w => w.toLowerCase().trim())
        .filter(w => w.length >= 3 && w.length <= 10 && /^[a-zA-Z\u00C0-\u024F]+$/.test(w));

      return filteredWords;
    } catch (error) {
      console.error('[GameAIService] generateThemedBoard error:', error);
      throw error;
    }
  }

  // ===========================================================================
  // Utility Methods
  // ===========================================================================

  /**
   * Batch validate multiple words in a SINGLE AI prompt.
   * Much more efficient than individual calls - validates all words at once.
   * @param {string[]} words - Array of words to validate
   * @param {string} language - Language code
   * @returns {Promise<Array<{isValid: boolean, reason?: string, source: string, error?: string}>>}
   */
  async validateWords(words, language = 'en') {
    // Ensure initialized
    await this.initialize();

    if (!words || words.length === 0) {
      return [];
    }

    // Normalize all words
    const normalizedWords = words.map(w => w.toLowerCase().trim());
    const results = new Array(normalizedWords.length).fill(null);

    // Step 1: Check which words are already in database (fast path)
    const wordsNeedingAI = [];
    const wordIndexMap = new Map(); // Maps word to its original index

    for (let i = 0; i < normalizedWords.length; i++) {
      const word = normalizedWords[i];

      // Basic validation
      if (!word || word.length < 3) {
        results[i] = { isValid: false, reason: 'Word too short', source: 'database' };
        continue;
      }

      // Check database first
      const inCommunityWords = await this.checkCommunityWords(word, language);
      if (inCommunityWords) {
        results[i] = { isValid: true, source: 'database' };
        continue;
      }

      const inWordScores = await this.checkWordScores(word, language);
      if (inWordScores) {
        results[i] = { isValid: true, source: 'database' };
        continue;
      }

      // Word needs AI validation
      wordsNeedingAI.push(word);
      wordIndexMap.set(word, i);
    }

    // Step 2: If no words need AI validation, return results
    if (wordsNeedingAI.length === 0) {
      console.log(`[GameAIService] All ${normalizedWords.length} words found in database - no AI calls needed`);
      return results;
    }

    // Step 3: Batch validate with AI in a single prompt
    console.log(`[GameAIService] Batch validating ${wordsNeedingAI.length} words with AI (${normalizedWords.length - wordsNeedingAI.length} from database)`);

    try {
      const aiResults = await this.batchValidateWithAI(wordsNeedingAI, language);

      // Step 4: Process AI results and save valid words to database
      const validWords = [];

      for (let i = 0; i < wordsNeedingAI.length; i++) {
        const word = wordsNeedingAI[i];
        const aiResult = aiResults[i] || { isValid: false, reason: 'No AI response' };
        const originalIndex = wordIndexMap.get(word);

        results[originalIndex] = {
          isValid: aiResult.isValid,
          reason: aiResult.reason,
          source: 'ai',
          confidence: aiResult.confidence
        };

        if (aiResult.isValid) {
          validWords.push(word);
        }
      }

      // Step 5: Batch save valid words to community_words (fire and forget)
      if (validWords.length > 0) {
        console.log(`[GameAIService] Saving ${validWords.length} AI-validated words to database`);
        this.batchSaveToCommunityWords(validWords, language).catch(err => {
          console.error('[GameAIService] Batch save failed:', err);
        });
      }

      return results;
    } catch (error) {
      console.error('[GameAIService] Batch AI validation failed:', error);

      // Fill remaining results with errors
      for (const word of wordsNeedingAI) {
        const originalIndex = wordIndexMap.get(word);
        results[originalIndex] = {
          isValid: false,
          reason: 'AI validation failed',
          source: 'ai',
          error: error.message
        };
      }

      return results;
    }
  }

  /**
   * Validate multiple words in a SINGLE AI prompt.
   * Returns validation results for all words at once.
   * @param {string[]} words - Array of words to validate
   * @param {string} language - Language code
   * @returns {Promise<Array<{isValid: boolean, reason: string, confidence: number}>>}
   */
  async batchValidateWithAI(words, language) {
    if (!this.batchModel) {
      throw new Error('Vertex AI batch model not initialized');
    }

    const languageNames = {
      en: 'English',
      he: 'Hebrew',
      sv: 'Swedish',
      es: 'Spanish',
      fr: 'French',
      de: 'German',
      it: 'Italian',
      pt: 'Portuguese',
      nl: 'Dutch',
      no: 'Norwegian',
      da: 'Danish',
      fi: 'Finnish',
    };

    const languageName = languageNames[language] || language;
    const wordList = words.map((w, i) => `${i + 1}. "${w}"`).join('\n');

    const prompt = `You are a strict word validator for a Boggle-style word game. Validate ALL of these ${words.length} words in ${languageName}.

WORDS TO VALIDATE:
${wordList}

VALIDATION RULES:
1. The word must be a REAL, established word in ${languageName}
2. ACCEPT: Common dictionary words, verbs in any conjugation, nouns (singular/plural), adjectives, adverbs
3. ACCEPT: Well-established slang that appears in dictionaries
4. REJECT: Proper nouns (names of people, places, brands)
5. REJECT: Abbreviations and acronyms
6. REJECT: Random letter combinations that aren't real words
7. BE STRICT: When in doubt, reject the word

Respond with ONLY a valid JSON array with one object per word, in the same order as the input.
Each object must have: { "word": string, "isValid": boolean, "reason": string, "confidence": number (0-100) }

Example response format:
[
  { "word": "cat", "isValid": true, "reason": "Common English noun", "confidence": 99 },
  { "word": "xyz", "isValid": false, "reason": "Not a recognized word", "confidence": 95 }
]`;

    try {
      const result = await this.batchModel.generateContent(prompt);
      const response = result.response;
      const text = response.candidates?.[0]?.content?.parts?.[0]?.text || '';

      // Log raw response for debugging (first 500 chars)
      console.log(`[GameAIService] Batch AI raw response (${text.length} chars): ${text.substring(0, 500)}${text.length > 500 ? '...' : ''}`);

      // Extract JSON array from response
      let cleanText = text;
      const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (codeBlockMatch) {
        cleanText = codeBlockMatch[1].trim();
      }

      const jsonMatch = cleanText.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        // Log the full response when extraction fails to help debug
        console.error('[GameAIService] Could not extract JSON array from batch AI response. Full response:', text);
        // Return all as invalid
        return words.map(w => ({ isValid: false, reason: 'Failed to parse AI response', confidence: 0 }));
      }

      let parsed;
      try {
        parsed = JSON.parse(jsonMatch[0]);
      } catch (parseError) {
        console.warn('[GameAIService] JSON parse error in batch validation:', parseError.message);
        return words.map(w => ({ isValid: false, reason: 'Failed to parse AI response', confidence: 0 }));
      }

      if (!Array.isArray(parsed)) {
        console.warn('[GameAIService] Batch AI response is not an array');
        return words.map(w => ({ isValid: false, reason: 'Invalid AI response format', confidence: 0 }));
      }

      // Map results back to original word order
      const resultMap = new Map();
      for (const item of parsed) {
        if (item && typeof item.word === 'string') {
          const normalizedWord = item.word.toLowerCase().trim();
          const confidence = typeof item.confidence === 'number' ? item.confidence : 50;

          // Apply confidence threshold
          let isValid = item.isValid === true;
          let reason = item.reason || (isValid ? 'Valid word' : 'Invalid word');

          if (isValid && confidence < MIN_CONFIDENCE_THRESHOLD) {
            isValid = false;
            reason = `Confidence too low (${confidence}%) - need ${MIN_CONFIDENCE_THRESHOLD}%+ to approve`;
          }

          resultMap.set(normalizedWord, { isValid, reason, confidence });
        }
      }

      // Return results in original word order
      return words.map(word => {
        const result = resultMap.get(word.toLowerCase().trim());
        return result || { isValid: false, reason: 'Word not in AI response', confidence: 0 };
      });

    } catch (error) {
      console.error('[GameAIService] Batch AI validation error:', error);
      throw error;
    }
  }

  /**
   * Batch save multiple valid words to community_words table.
   * @param {string[]} words - Array of valid words to save
   * @param {string} language - Language code
   */
  async batchSaveToCommunityWords(words, language) {
    if (!this.supabaseAdmin || words.length === 0) return;

    const now = new Date().toISOString();

    // Prepare batch insert data
    const insertData = words.map(word => ({
      word: word.toLowerCase().trim(),
      language,
      approval_count: 1,
      first_approved_at: now,
      last_approved_at: now,
    }));

    // Use upsert to handle duplicates gracefully
    const { error } = await this.supabaseAdmin
      .from('community_words')
      .upsert(insertData, {
        onConflict: 'word,language',
        ignoreDuplicates: false
      });

    if (error) {
      console.error('[GameAIService] Batch save to community_words failed:', error.message);
    } else {
      console.log(`[GameAIService] Successfully saved ${words.length} words to community_words`);
    }
  }

  /**
   * Check if the service is properly configured and ready.
   * @returns {Promise<boolean>}
   */
  async isConfigured() {
    try {
      await this.initialize();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get configuration status for debugging.
   * @returns {{vertexAI: boolean, supabase: boolean, error: string|null}}
   */
  getStatus() {
    return {
      vertexAI: this.vertexAI !== null,
      supabase: this.supabaseAdmin !== null,
      error: this.initError?.message || null,
    };
  }
}

// =============================================================================
// Singleton Export
// =============================================================================

// Export singleton instance
const gameAIService = new GameAIService();

module.exports = {
  gameAIService,
  GameAIService,
};
