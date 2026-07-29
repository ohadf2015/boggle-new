/**
 * Google Gen AI Client (Vertex AI backend)
 *
 * Handles communication with Google Vertex AI for word validation.
 * Migrated from deprecated @google-cloud/vertexai to @google/genai.
 */

import { GoogleGenAI } from '@google/genai';
import type {
  GoogleCredentials,
  ParsedValidation,
  BatchValidationItem,
  ValidationResult,
} from './types.js';
import { trackTokenUsage, estimateTokens } from './tokenTracker.js';
import { withRetry } from './retryUtils.js';
import {
  parseValidationResponse,
  extractPartialJsonResults,
  mapResultsToWords,
  parseBatchResponse,
  parseThemedBoardResponse,
} from './responseParser.js';
import {
  buildSingleWordPrompt,
  buildBatchPrompt,
  buildThemedBoardPrompt,
} from './promptBuilder.js';

import logger from '../../utils/logger';

/**
 * Parse Google Cloud credentials from JSON string environment variable
 */
export function parseGoogleCredentials(): GoogleCredentials {
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
    const requiredFields: (keyof GoogleCredentials)[] = [
      'project_id',
      'private_key',
      'client_email',
    ];

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

/**
 * Vertex AI client wrapper using @google/genai SDK
 */
export class VertexAIClient {
  private ai: GoogleGenAI | null = null;
  private modelName: string = '';
  /**
   * Initialize the Google Gen AI client with Vertex AI backend
   */
  initialize(credentials: GoogleCredentials): void {
    this.modelName = process.env.VERTEX_AI_MODEL || 'gemini-1.5-flash-002';

    this.ai = new GoogleGenAI({
      vertexai: true,
      project: credentials.project_id,
      location: process.env.VERTEX_AI_LOCATION || 'us-central1',
      googleAuthOptions: {
        credentials: {
          client_email: credentials.client_email,
          private_key: credentials.private_key,
        },
        projectId: credentials.project_id,
      },
    });
  }

  isInitialized(): boolean {
    return this.ai !== null;
  }

  /**
   * Parse validation response (delegate to responseParser)
   */
  parseValidationResponse(text: string, word: string): ParsedValidation {
    return parseValidationResponse(text, word);
  }

  /**
   * Extract partial JSON results (delegate to responseParser)
   */
  extractPartialJsonResults(
    jsonContent: string,
    expectedWords: string[]
  ): BatchValidationItem[] {
    return extractPartialJsonResults(jsonContent, expectedWords);
  }

  /**
   * Map results to words (delegate to responseParser)
   */
  mapResultsToWords(
    parsed: BatchValidationItem[],
    words: string[]
  ): ValidationResult[] {
    return mapResultsToWords(parsed, words);
  }

  /**
   * Generate content using the Google Gen AI SDK
   */
  private async generate(
    prompt: string,
    maxOutputTokens: number
  ): Promise<{ text: string; finishReason: string | undefined }> {
    if (!this.ai) {
      throw new Error('Google Gen AI client not initialized');
    }

    const response = await this.ai.models.generateContent({
      model: this.modelName,
      contents: prompt,
      config: {
        maxOutputTokens,
        temperature: 0.1,
      },
    });

    const candidate = response.candidates?.[0];
    const text = candidate?.content?.parts?.[0]?.text || response.text || '';
    const finishReason = candidate?.finishReason;

    return { text, finishReason };
  }

  /**
   * Validate a single word using Vertex AI
   */
  async validateWord(word: string, language: string): Promise<ParsedValidation> {
    const prompt = buildSingleWordPrompt(word, language);

    const result = await withRetry(async () => {
      const { text, finishReason } = await this.generate(prompt, 1024);

      // Handle non-successful finish reasons
      if (finishReason && finishReason !== 'STOP') {
        logger.debug(
          'AI_SERVICE',
          `Non-standard finish reason for "${word}": ${finishReason}, partial: ${text.substring(0, 100)}`
        );

        if (finishReason === 'MAX_TOKENS') {
          const error = new Error('AI response truncated due to MAX_TOKENS');
          error.name = 'TruncatedResponseError';
          throw error;
        }

        // Try to recover from SAFETY/RECITATION/OTHER
        if (['SAFETY', 'RECITATION', 'OTHER'].includes(finishReason)) {
          return this.handleNonStopFinish(word, text, finishReason);
        }
      }

      return text;
    }, `validateWithAI("${word}")`);

    // Track token usage
    trackTokenUsage(estimateTokens(prompt), estimateTokens(result));

    return parseValidationResponse(result, word);
  }

  /**
   * Handle non-STOP finish reasons by attempting recovery
   */
  private handleNonStopFinish(
    word: string,
    partialText: string,
    finishReason: string
  ): string {
    if (partialText) {
      const partialMatch = partialText.match(/"isValid"\s*:\s*(true|false)/i);
      if (partialMatch) {
        logger.info('AI_SERVICE', `Recovered from ${finishReason} for "${word}"`);
        return `{"isValid": ${partialMatch[1]}, "reason": "Partial response", "confidence": 65}`;
      }
    }
    logger.debug(
      'AI_SERVICE',
      `Cannot recover from ${finishReason} for "${word}", returning rejection`
    );
    return '{"isValid": false, "reason": "AI validation inconclusive", "confidence": 0}';
  }

  /**
   * Batch validate multiple words in a single AI prompt
   */
  async validateWordsBatch(
    words: string[],
    language: string
  ): Promise<ValidationResult[]> {
    const prompt = buildBatchPrompt(words, language);

    const result = await withRetry(async () => {
      let text: string;
      let finishReason: string | undefined;
      try {
        ({ text, finishReason } = await this.generate(prompt, 4096));
      } catch (sdkError) {
        // Catch SyntaxError when SDK receives HTML instead of JSON (rate limit/auth error)
        if (sdkError instanceof SyntaxError) {
          const htmlError = new Error(
            `AI returned HTML instead of JSON (possible rate limit): ${sdkError.message}`
          );
          htmlError.name = 'HTMLResponseError';
          throw htmlError;
        }
        throw sdkError;
      }

      if (finishReason && finishReason !== 'STOP') {
        logger.debug(
          'AI_SERVICE',
          `Batch validation non-standard finish: ${finishReason}, partial: ${text.substring(0, 100)}`
        );

        if (finishReason === 'MAX_TOKENS') {
          const error = new Error('AI response truncated due to MAX_TOKENS');
          error.name = 'TruncatedResponseError';
          throw error;
        }
      }

      return text;
    }, `batchValidateWithAI(${words.length} words)`);

    // Track token usage
    trackTokenUsage(estimateTokens(prompt), estimateTokens(result));

    logger.debug(
      'AI_SERVICE',
      `Batch response (${result.length} chars): ${result.substring(0, 300)}...`
    );

    return parseBatchResponse(result, words);
  }

  /**
   * Generate a themed word board using AI
   */
  async generateThemedBoard(
    theme: string,
    count: number,
    language: string
  ): Promise<string[]> {
    const prompt = buildThemedBoardPrompt(theme, count, language);

    const result = await withRetry(async () => {
      const { text } = await this.generate(prompt, 1024);
      return text;
    }, `generateThemedBoard("${theme}")`);

    // Track tokens
    trackTokenUsage(estimateTokens(prompt), estimateTokens(result));

    return parseThemedBoardResponse(result, theme);
  }
}
