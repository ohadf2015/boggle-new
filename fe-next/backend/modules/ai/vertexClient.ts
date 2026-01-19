/**
 * Vertex AI Client
 *
 * Handles communication with Google Vertex AI for word validation.
 */

import { VertexAI, type GenerativeModel, type GenerateContentResult } from '@google-cloud/vertexai';
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

const logger = require('../../utils/logger');

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
 * Vertex AI client wrapper
 */
export class VertexAIClient {
  private vertexAI: VertexAI | null = null;
  private model: GenerativeModel | null = null;
  private batchModel: GenerativeModel | null = null;
  private credentials: GoogleCredentials | null = null;

  /**
   * Initialize the Vertex AI client with credentials
   */
  initialize(credentials: GoogleCredentials): void {
    this.credentials = credentials;

    this.vertexAI = new VertexAI({
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

    // Model for single word validation
    this.model = this.vertexAI.getGenerativeModel({
      model: process.env.VERTEX_AI_MODEL || 'gemini-1.5-flash-002',
      generationConfig: {
        maxOutputTokens: 1024,
        temperature: 0.1,
      },
    });

    // Model for batch validation with higher token limit
    this.batchModel = this.vertexAI.getGenerativeModel({
      model: process.env.VERTEX_AI_MODEL || 'gemini-1.5-flash-002',
      generationConfig: {
        maxOutputTokens: 4096,
        temperature: 0.1,
      },
    });
  }

  isInitialized(): boolean {
    return this.vertexAI !== null;
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
   * Validate a single word using Vertex AI
   */
  async validateWord(word: string, language: string): Promise<ParsedValidation> {
    if (!this.model) {
      throw new Error('Vertex AI model not initialized');
    }

    const prompt = buildSingleWordPrompt(word, language);

    const result = await withRetry(async () => {
      const response = await this.model!.generateContent(prompt);
      const candidate = response.response?.candidates?.[0];
      const finishReason = candidate?.finishReason;
      const partialText = candidate?.content?.parts?.[0]?.text || '';

      // Handle non-successful finish reasons
      if (finishReason && finishReason !== 'STOP') {
        logger.warn(
          'AI_SERVICE',
          `Non-standard finish reason for "${word}": ${finishReason}, partial: ${partialText.substring(0, 100)}`
        );

        if (finishReason === 'MAX_TOKENS') {
          const error = new Error('AI response truncated due to MAX_TOKENS');
          error.name = 'TruncatedResponseError';
          throw error;
        }

        // Try to recover from SAFETY/RECITATION/OTHER
        if (['SAFETY', 'RECITATION', 'OTHER'].includes(finishReason)) {
          return this.handleNonStopFinish(response, word, partialText, finishReason);
        }
      }

      return response;
    }, `validateWithAI("${word}")`);

    const text =
      result.response?.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // Track token usage
    trackTokenUsage(estimateTokens(prompt), estimateTokens(text));

    return parseValidationResponse(text, word);
  }

  /**
   * Handle non-STOP finish reasons by attempting recovery
   */
  private handleNonStopFinish(
    response: GenerateContentResult,
    word: string,
    partialText: string,
    finishReason: string
  ): GenerateContentResult {
    if (partialText) {
      const partialMatch = partialText.match(/"isValid"\s*:\s*(true|false)/i);
      if (partialMatch) {
        logger.info('AI_SERVICE', `Recovered from ${finishReason} for "${word}"`);
        return {
          response: {
            candidates: [
              {
                content: {
                  parts: [
                    {
                      text: `{"isValid": ${partialMatch[1]}, "reason": "Partial response", "confidence": 65}`,
                    },
                  ],
                },
                finishReason: 'STOP',
              },
            ],
          },
        } as unknown as GenerateContentResult;
      }
    }
    logger.warn(
      'AI_SERVICE',
      `Cannot recover from ${finishReason} for "${word}", returning rejection`
    );
    return {
      response: {
        candidates: [
          {
            content: {
              parts: [
                {
                  text: '{"isValid": false, "reason": "AI validation inconclusive", "confidence": 0}',
                },
              ],
            },
            finishReason: 'STOP',
          },
        ],
      },
    } as unknown as GenerateContentResult;
  }

  /**
   * Batch validate multiple words in a single AI prompt
   */
  async validateWordsBatch(
    words: string[],
    language: string
  ): Promise<ValidationResult[]> {
    if (!this.batchModel) {
      throw new Error('Vertex AI batch model not initialized');
    }

    const prompt = buildBatchPrompt(words, language);

    const result = await withRetry(async () => {
      const response = await this.batchModel!.generateContent(prompt);
      const candidate = response.response?.candidates?.[0];
      const finishReason = candidate?.finishReason;
      const partialText = candidate?.content?.parts?.[0]?.text || '';

      if (finishReason && finishReason !== 'STOP') {
        logger.warn(
          'AI_SERVICE',
          `Batch validation non-standard finish: ${finishReason}, partial: ${partialText.substring(0, 100)}`
        );

        if (finishReason === 'MAX_TOKENS') {
          const error = new Error('AI response truncated due to MAX_TOKENS');
          error.name = 'TruncatedResponseError';
          throw error;
        }
      }

      return response;
    }, `batchValidateWithAI(${words.length} words)`);

    const text =
      result.response?.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // Track token usage
    trackTokenUsage(estimateTokens(prompt), estimateTokens(text));

    logger.debug(
      'AI_SERVICE',
      `Batch response (${text.length} chars): ${text.substring(0, 300)}...`
    );

    return parseBatchResponse(text, words);
  }

  /**
   * Generate a themed word board using AI
   */
  async generateThemedBoard(
    theme: string,
    count: number,
    language: string
  ): Promise<string[]> {
    if (!this.model) {
      throw new Error('Vertex AI model not initialized');
    }

    const prompt = buildThemedBoardPrompt(theme, count, language);

    const result = await withRetry(async () => {
      return await this.model!.generateContent(prompt);
    }, `generateThemedBoard("${theme}")`);

    const text =
      result.response?.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // Track tokens
    trackTokenUsage(estimateTokens(prompt), estimateTokens(text));

    return parseThemedBoardResponse(text, theme);
  }
}
