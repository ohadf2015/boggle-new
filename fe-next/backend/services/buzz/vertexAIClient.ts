/**
 * Vertex AI Client for Daily Buzz
 * Handles Gemini API interactions for challenge generation
 */

import { VertexAI } from '@google-cloud/vertexai';
import {
  AI_GENERATION_TIMEOUT_MS,
  AI_SINGLE_CHALLENGE_TIMEOUT_MS,
  GEMINI_MODEL,
  THINKING_BUDGET,
} from './constants';
import type { BuzzChallenge, GoogleCredentials } from './types';
import { withTimeout } from './utils';

/**
 * Get Vertex AI credentials from environment
 */
export function getVertexAICredentials(): GoogleCredentials & { location: string } {
  const credentialsJson = process.env.GOOGLE_CREDENTIALS_JSON;
  if (!credentialsJson) {
    throw new Error('GOOGLE_CREDENTIALS_JSON environment variable is not set');
  }

  try {
    const credentials = JSON.parse(credentialsJson) as GoogleCredentials;

    const requiredFields: (keyof GoogleCredentials)[] = ['project_id', 'private_key', 'client_email'];
    for (const field of requiredFields) {
      if (!credentials[field]) {
        throw new Error(`Missing required field in credentials: ${field}`);
      }
    }

    // Handle escaped newlines in private_key
    if (credentials.private_key.includes('\\n')) {
      credentials.private_key = credentials.private_key.replace(/\\n/g, '\n');
    }

    return {
      ...credentials,
      location: process.env.GCP_LOCATION || process.env.GOOGLE_CLOUD_LOCATION || 'us-central1',
    };
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`Failed to parse GOOGLE_CREDENTIALS_JSON: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Create a Vertex AI client instance
 */
export function createVertexAIClient(): VertexAI {
  const credentials = getVertexAICredentials();

  return new VertexAI({
    project: credentials.project_id,
    location: credentials.location,
    googleAuthOptions: {
      credentials: {
        client_email: credentials.client_email,
        private_key: credentials.private_key,
      },
      projectId: credentials.project_id,
    },
  });
}

/**
 * Generate content using Vertex AI Gemini with full configuration
 */
export async function generateWithGemini(prompt: string): Promise<string> {
  console.log('[BUZZ] Creating Vertex AI client...');
  let vertexAI;
  try {
    vertexAI = createVertexAIClient();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[BUZZ] Failed to create Vertex AI client:', errorMessage);
    throw error;
  }
  console.log('[BUZZ] Vertex AI client created, getting model:', GEMINI_MODEL);
  const model = vertexAI.getGenerativeModel({ model: GEMINI_MODEL });

  // Build generation config with optional thinking for extended reasoning
  const generationConfig: Record<string, unknown> = {
    temperature: 0.8,
    maxOutputTokens: 8000,
    topP: 0.9,
    topK: 40,
  };

  // Add thinking config for enhanced reasoning if budget > 0
  if (THINKING_BUDGET > 0) {
    generationConfig.thinkingConfig = {
      thinkingBudget: THINKING_BUDGET,
    };
    console.log(`[BUZZ] Using thinking budget: ${THINKING_BUDGET} tokens`);
  }

  console.log('[BUZZ] Starting Gemini API call...');
  const generatePromise = model.generateContent({
    contents: [
      {
        role: 'user',
        parts: [{ text: prompt }],
      },
    ],
    generationConfig,
  } as Parameters<typeof model.generateContent>[0]);

  let result;
  try {
    result = await withTimeout(
      generatePromise,
      AI_GENERATION_TIMEOUT_MS,
      'AI challenge generation'
    );
    console.log('[BUZZ] Gemini API call completed successfully');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[BUZZ] Gemini API call failed:', errorMessage);
    throw error;
  }

  const responseText = result.response.candidates?.[0]?.content?.parts?.[0]?.text || '';

  if (!responseText) {
    throw new Error('No response text from Gemini');
  }

  // Log response preview for debugging
  console.log(`[BUZZ] Gemini response length: ${responseText.length} chars`);
  console.log(`[BUZZ] Response preview (first 500 chars):`, responseText.substring(0, 500));

  return responseText;
}

/**
 * Generate a single challenge using Gemini with lighter configuration
 */
export async function generateSingleChallengeWithAI(prompt: string): Promise<BuzzChallenge> {
  const vertexAI = createVertexAIClient();
  const model = vertexAI.getGenerativeModel({ model: GEMINI_MODEL });

  const generatePromise = model.generateContent({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 1500,
      topP: 0.9,
    },
  });

  const result = await withTimeout(
    generatePromise,
    AI_SINGLE_CHALLENGE_TIMEOUT_MS,
    'Single challenge regeneration'
  );

  const responseText = result.response.candidates?.[0]?.content?.parts?.[0]?.text || '';

  if (!responseText) {
    throw new Error('No response from Gemini for single challenge');
  }

  // Parse single challenge JSON
  let jsonText = responseText.trim();

  // Remove markdown code blocks if present
  if (jsonText.startsWith('```')) {
    jsonText = jsonText.replace(/```json?\n?/g, '').replace(/```\n?$/g, '');
  }

  // Find JSON object boundaries
  const startIdx = jsonText.indexOf('{');
  const endIdx = jsonText.lastIndexOf('}');
  if (startIdx === -1 || endIdx === -1) {
    throw new Error('Invalid JSON structure from AI');
  }
  jsonText = jsonText.substring(startIdx, endIdx + 1);

  const challenge = JSON.parse(jsonText) as BuzzChallenge;

  // Validate structure
  if (!challenge.type || !challenge.prompt || !challenge.answer) {
    throw new Error('Invalid challenge structure from AI');
  }

  return challenge;
}

/**
 * Get the current Gemini model name
 */
export function getGeminiModel(): string {
  return GEMINI_MODEL;
}
