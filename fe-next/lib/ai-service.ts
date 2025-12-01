/**
 * GameAIService - Vertex AI + Supabase Integration
 *
 * Designed for Railway deployment with ENV-based credentials.
 * Uses Gemini 1.5 Flash for word validation and caches results in Supabase.
 */

import { VertexAI, GenerativeModel } from '@google-cloud/vertexai';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// =============================================================================
// Types
// =============================================================================

interface GoogleCredentials {
  type: string;
  project_id: string;
  private_key_id: string;
  private_key: string;
  client_email: string;
  client_id: string;
  auth_uri: string;
  token_uri: string;
  auth_provider_x509_cert_url: string;
  client_x509_cert_url: string;
  universe_domain?: string;
}

interface WordValidationResult {
  word: string;
  language: string;
  isValid: boolean;
  definition?: string;
  source: 'cache' | 'ai';
  error?: string;
}

interface CachedWord {
  word: string;
  language: string;
  is_valid: boolean;
  definition: string | null;
  created_at: string;
  updated_at: string;
}

// =============================================================================
// Credential Parsing (Railway ENV-based)
// =============================================================================

/**
 * Parse Google Cloud credentials from JSON string environment variable.
 * This is crucial for Railway deployment where we can't use file-based credentials.
 *
 * @throws {Error} If GOOGLE_CREDENTIALS_JSON is missing or malformed
 */
function parseGoogleCredentials(): GoogleCredentials {
  const credentialsJson = process.env.GOOGLE_CREDENTIALS_JSON;

  if (!credentialsJson) {
    throw new Error(
      'GOOGLE_CREDENTIALS_JSON environment variable is not set. ' +
      'Please add your Google Cloud service account JSON key to Railway environment variables.'
    );
  }

  try {
    const credentials = JSON.parse(credentialsJson) as GoogleCredentials;

    // Validate required fields
    const requiredFields = [
      'project_id',
      'private_key',
      'client_email',
    ] as const;

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
 */
function createServiceClient(): SupabaseClient | null {
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
  private vertexAI: VertexAI | null = null;
  private model: GenerativeModel | null = null;
  private supabaseAdmin: SupabaseClient | null = null;
  private credentials: GoogleCredentials | null = null;
  private initialized = false;
  private initError: Error | null = null;

  constructor() {
    // Lazy initialization - will be called on first use
  }

  /**
   * Initialize the service. Called lazily on first use.
   */
  private async initialize(): Promise<void> {
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

      // Get the Gemini 1.5 Flash model
      this.model = this.vertexAI.getGenerativeModel({
        model: process.env.VERTEX_AI_MODEL || 'gemini-1.5-flash-001',
        generationConfig: {
          maxOutputTokens: 256,
          temperature: 0.1, // Low temperature for consistent validation
        },
      });

      // Initialize Supabase admin client
      this.supabaseAdmin = createServiceClient();

      this.initialized = true;
      console.log('[GameAIService] Initialized successfully');
    } catch (error) {
      this.initError = error as Error;
      console.error('[GameAIService] Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Check if a word exists in the Supabase cache.
   */
  private async getFromCache(
    word: string,
    language: string
  ): Promise<CachedWord | null> {
    if (!this.supabaseAdmin) return null;

    const normalizedWord = word.toLowerCase().trim();

    const { data, error } = await this.supabaseAdmin
      .from('word_validations')
      .select('*')
      .eq('word', normalizedWord)
      .eq('language', language)
      .single();

    if (error) {
      // PGRST116 = not found, which is expected for cache misses
      if (error.code !== 'PGRST116') {
        console.warn('[GameAIService] Cache lookup error:', error.message);
      }
      return null;
    }

    return data as CachedWord;
  }

  /**
   * Save a word validation result to Supabase cache.
   */
  private async saveToCache(
    word: string,
    language: string,
    isValid: boolean,
    definition: string | null
  ): Promise<void> {
    if (!this.supabaseAdmin) return;

    const normalizedWord = word.toLowerCase().trim();

    const { error } = await this.supabaseAdmin
      .from('word_validations')
      .upsert(
        {
          word: normalizedWord,
          language,
          is_valid: isValid,
          definition,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'word,language',
        }
      );

    if (error) {
      console.error('[GameAIService] Cache save error:', error.message);
    }
  }

  /**
   * Validate a word using Vertex AI (Gemini 1.5 Flash).
   */
  private async validateWithAI(
    word: string,
    language: string
  ): Promise<{ isValid: boolean; definition: string | null }> {
    if (!this.model) {
      throw new Error('Vertex AI model not initialized');
    }

    const languageNames: Record<string, string> = {
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

    const prompt = `You are a dictionary validator for the word game Boggle.
Determine if "${word}" is a valid ${languageName} word that would be accepted in Boggle.

Rules for valid Boggle words:
1. Must be a real word found in a standard dictionary
2. Must be at least 3 letters long
3. No proper nouns (names of people, places, brands)
4. No abbreviations or acronyms
5. No hyphenated words
6. Conjugated verbs and plural nouns ARE allowed

Respond in this exact JSON format:
{
  "isValid": true or false,
  "definition": "brief definition if valid, null if invalid"
}

Only respond with the JSON, no other text.`;

    try {
      const result = await this.model.generateContent(prompt);
      const response = result.response;
      const text = response.candidates?.[0]?.content?.parts?.[0]?.text || '';

      // Extract JSON from response (handle potential markdown code blocks)
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.warn('[GameAIService] Could not parse AI response:', text);
        return { isValid: false, definition: null };
      }

      const parsed = JSON.parse(jsonMatch[0]);
      return {
        isValid: Boolean(parsed.isValid),
        definition: parsed.definition || null,
      };
    } catch (error) {
      console.error('[GameAIService] AI validation error:', error);
      throw error;
    }
  }

  /**
   * Validate a word and save the result to cache.
   *
   * Flow:
   * 1. Check Supabase cache for existing validation
   * 2. If not cached, call Vertex AI for validation
   * 3. Upsert result to Supabase for future lookups
   *
   * @param word - The word to validate
   * @param language - Language code (e.g., 'en', 'sv')
   * @returns Validation result with source indicator
   */
  async validateAndSaveWord(
    word: string,
    language: string = 'en'
  ): Promise<WordValidationResult> {
    // Ensure initialized
    await this.initialize();

    const normalizedWord = word.toLowerCase().trim();

    // Basic validation
    if (!normalizedWord || normalizedWord.length < 3) {
      return {
        word: normalizedWord,
        language,
        isValid: false,
        source: 'cache',
        error: 'Word must be at least 3 characters',
      };
    }

    try {
      // Step 1: Check cache
      const cached = await this.getFromCache(normalizedWord, language);
      if (cached) {
        return {
          word: cached.word,
          language: cached.language,
          isValid: cached.is_valid,
          definition: cached.definition || undefined,
          source: 'cache',
        };
      }

      // Step 2: Call AI for validation
      const aiResult = await this.validateWithAI(normalizedWord, language);

      // Step 3: Save to cache (async, don't wait)
      this.saveToCache(
        normalizedWord,
        language,
        aiResult.isValid,
        aiResult.definition
      ).catch((err) => {
        console.error('[GameAIService] Background cache save failed:', err);
      });

      return {
        word: normalizedWord,
        language,
        isValid: aiResult.isValid,
        definition: aiResult.definition || undefined,
        source: 'ai',
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[GameAIService] validateAndSaveWord error:', error);

      return {
        word: normalizedWord,
        language,
        isValid: false,
        source: 'ai',
        error: `Validation failed: ${errorMessage}`,
      };
    }
  }

  /**
   * Batch validate multiple words.
   * Useful for validating all words at end of a game round.
   */
  async validateWords(
    words: string[],
    language: string = 'en'
  ): Promise<WordValidationResult[]> {
    // Process in parallel with concurrency limit
    const BATCH_SIZE = 5;
    const results: WordValidationResult[] = [];

    for (let i = 0; i < words.length; i += BATCH_SIZE) {
      const batch = words.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.all(
        batch.map((word) => this.validateAndSaveWord(word, language))
      );
      results.push(...batchResults);
    }

    return results;
  }

  /**
   * Check if the service is properly configured and ready.
   */
  async isConfigured(): Promise<boolean> {
    try {
      await this.initialize();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get configuration status for debugging.
   */
  getStatus(): {
    vertexAI: boolean;
    supabase: boolean;
    error: string | null;
  } {
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
export const gameAIService = new GameAIService();

// Export types for consumers
export type { WordValidationResult, CachedWord };

// Export class for testing
export { GameAIService };
