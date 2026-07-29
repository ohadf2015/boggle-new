/**
 * Google Gen AI Client Setup and Initialization
 * Handles Google Cloud credentials and model initialization via @google/genai
 */

import { GoogleGenAI } from '@google/genai';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { captureAIServiceError } from '@/utils/sentry';
import { TOKEN_COSTS, type GoogleCredentials, type TokenUsageStats } from './types';
import logger from '@/backend/utils/logger';

/**
 * Thin wrapper that provides the same model.generateContent(prompt) interface
 * used by validation.ts, hints.ts, and generation.ts — backed by @google/genai.
 */
export interface GenAIModel {
  generateContent(prompt: string): Promise<GenAIContentResult>;
}

export interface GenAIContentResult {
  response: {
    candidates?: Array<{
      content?: { parts?: Array<{ text?: string }> };
      finishReason?: string;
    }>;
  };
}

/**
 * Parse Google Cloud credentials from JSON string environment variable.
 * Critical for Railway deployment where file-based credentials aren't available.
 */
export function parseGoogleCredentials(): GoogleCredentials {
  const credentialsJson = process.env.GOOGLE_CREDENTIALS_JSON;

  if (!credentialsJson) {
    throw new Error(
      'GOOGLE_CREDENTIALS_JSON environment variable is not set. ' +
      'Please add your Google Cloud service account JSON key to environment variables.'
    );
  }

  try {
    const credentials = JSON.parse(credentialsJson) as GoogleCredentials;

    // Validate required fields
    const requiredFields = ['project_id', 'private_key', 'client_email'] as const;

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
 * Create a Supabase client with service role key to bypass RLS.
 */
export function createServiceClient(): SupabaseClient | null {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    logger.info('AI_SERVICE', 'Supabase service role not configured. Word caching will be disabled.');
    return null;
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Initialize Google Gen AI with Vertex AI backend
 */
export async function initializeVertexAI(
  credentials: GoogleCredentials
): Promise<{ ai: GoogleGenAI; model: GenAIModel }> {
  try {
    const modelName = process.env.VERTEX_AI_MODEL || 'gemini-1.5-flash-002';

    const ai = new GoogleGenAI({
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

    // Wrap in the GenAIModel interface for backwards compatibility
    const model: GenAIModel = {
      async generateContent(prompt: string): Promise<GenAIContentResult> {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: prompt,
          config: {
            maxOutputTokens: 1024,
            temperature: 0.1,
            responseMimeType: 'application/json',
          },
        });

        // Adapt response to the old format expected by consumers
        return {
          response: {
            candidates: response.candidates?.map(c => ({
              content: {
                parts: c.content?.parts?.map(p => ({ text: p.text })),
              },
              finishReason: c.finishReason,
            })),
          },
        };
      },
    };

    logger.info('AI_SERVICE', ' Initialized successfully');
    return { ai, model };
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown initialization error';
    logger.error('AI_SERVICE', ' Initialization failed:', msg);
    captureAIServiceError(error instanceof Error ? error : new Error(msg), {
      operation: 'initialize',
    });
    throw error;
  }
}

/**
 * Token usage tracking utilities
 */
export function trackTokenUsage(
  usage: TokenUsageStats,
  inputTokens: number,
  outputTokens: number
): void {
  usage.totalInputTokens += inputTokens;
  usage.totalOutputTokens += outputTokens;
  usage.requestCount++;
  usage.estimatedCost =
    (usage.totalInputTokens * TOKEN_COSTS.input) +
    (usage.totalOutputTokens * TOKEN_COSTS.output);
}

export function createTokenUsageStats(): TokenUsageStats {
  return {
    totalInputTokens: 0,
    totalOutputTokens: 0,
    requestCount: 0,
    lastReset: Date.now(),
    estimatedCost: 0,
  };
}

export function resetTokenUsage(usage: TokenUsageStats): void {
  usage.totalInputTokens = 0;
  usage.totalOutputTokens = 0;
  usage.requestCount = 0;
  usage.lastReset = Date.now();
  usage.estimatedCost = 0;
}
