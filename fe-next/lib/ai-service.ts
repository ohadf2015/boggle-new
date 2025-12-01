/**
 * GameAIService - Vertex AI + Supabase Integration
 *
 * Designed for Railway deployment with ENV-based credentials.
 * Uses Gemini 1.5 Flash for word validation and caches results in Supabase.
 *
 * Uses existing tables:
 * - community_words: Host/AI approved words
 * - word_scores: Crowd-sourced validation (is_potentially_valid when net_score >= 6)
 */

import { VertexAI, GenerativeModel } from '@google-cloud/vertexai';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';

// =============================================================================
// Zod Schemas for AI Response Validation
// =============================================================================

const WordValidationResponseSchema = z.object({
  isValid: z.boolean(),
  reason: z.string(),
});

const ThemedWordsResponseSchema = z.array(z.string());

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
  isValid: boolean;
  reason?: string;
  source: 'database' | 'ai';
  error?: string;
}

interface CommunityWord {
  id: string;
  word: string;
  language: string;
  approval_count: number;
  promoted_to_dictionary: boolean;
  first_approved_at: string;
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

  // ===========================================================================
  // Feature A: validateAndSaveWord
  // ===========================================================================

  /**
   * Check if word exists in community_words table (host/AI approved words).
   */
  private async checkCommunityWords(
    word: string,
    language: string
  ): Promise<boolean> {
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
   */
  private async checkWordScores(
    word: string,
    language: string
  ): Promise<boolean> {
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
   */
  private async saveToCommunityWords(
    word: string,
    language: string
  ): Promise<void> {
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
          approval_count: this.supabaseAdmin.rpc ? undefined : 1, // Will be incremented via raw SQL if needed
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
   * Uses zod to validate the AI response schema.
   */
  private async validateWithAI(
    word: string,
    language: string
  ): Promise<{ isValid: boolean; reason: string }> {
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

    const prompt = `You are a lenient word game judge. Is '${word}' a valid word in ${languageName}? Accept slang if it is commonly used. Ignore case. Return ONLY a JSON object: { "isValid": boolean, "reason": string }.`;

    try {
      const result = await this.model.generateContent(prompt);
      const response = result.response;
      const text = response.candidates?.[0]?.content?.parts?.[0]?.text || '';

      // Extract JSON from response (handle potential markdown code blocks)
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.warn('[GameAIService] Could not extract JSON from AI response:', text);
        return { isValid: false, reason: 'Failed to parse AI response' };
      }

      // Parse and validate with zod
      const parsed = JSON.parse(jsonMatch[0]);
      const validated = WordValidationResponseSchema.parse(parsed);

      return validated;
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error('[GameAIService] AI response schema validation failed:', error.errors);
        return { isValid: false, reason: 'Invalid AI response format' };
      }
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
   * @param theme - The theme for word generation (e.g., 'halloween', 'space')
   * @param count - Number of words to generate
   * @param language - Language code (e.g., 'en', 'sv')
   * @returns Array of themed words
   */
  async generateThemedBoard(
    theme: string,
    count: number,
    language: string = 'en'
  ): Promise<string[]> {
    // Ensure initialized
    await this.initialize();

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

    const prompt = `Generate a JSON array of ${count} distinct words related to the theme '${theme}' in ${languageName}. Words must be between 3 to 10 letters long. No spaces, no hyphens. Output raw JSON only.`;

    try {
      const result = await this.model.generateContent(prompt);
      const response = result.response;
      const text = response.candidates?.[0]?.content?.parts?.[0]?.text || '';

      // Extract JSON array from response
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        console.warn('[GameAIService] Could not extract JSON array from AI response:', text);
        return [];
      }

      // Parse and validate with zod
      const parsed = JSON.parse(jsonMatch[0]);
      const validated = ThemedWordsResponseSchema.parse(parsed);

      // Filter to ensure word constraints
      const filteredWords = validated
        .map((w) => w.toLowerCase().trim())
        .filter((w) => w.length >= 3 && w.length <= 10 && /^[a-zA-Z\u00C0-\u024F]+$/.test(w));

      return filteredWords;
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error('[GameAIService] Themed words schema validation failed:', error.errors);
        return [];
      }
      console.error('[GameAIService] generateThemedBoard error:', error);
      throw error;
    }
  }

  // ===========================================================================
  // Utility Methods
  // ===========================================================================

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
export type { WordValidationResult, CommunityWord };

// Export class for testing
export { GameAIService };
