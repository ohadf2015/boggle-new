/**
 * AI Hints - Vertex AI Enhancement
 * AI-powered hint generation with retry logic and response parsing
 */

import { GoogleGenAI } from '@google/genai';
import { z } from 'zod';
import logger from '../utils/logger';
import { LANGUAGE_CONFIG, type HintGenerationResponse } from './aiHintsCore';
import type { GenAIModel, GenAIContentResult } from '@/lib/ai-service/client';

interface GoogleCredentials {
  project_id: string;
  private_key: string;
  client_email: string;
}

const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 500;
const AI_HINT_TIMEOUT_MS = 20_000;

const aiResponseSchema = z.object({
  category: z.string().min(1).max(100),
  exampleSentence: z.string().min(5).max(200),
  wordType: z.enum(['noun', 'verb', 'adjective', 'adverb', 'preposition', 'conjunction', 'interjection', 'pronoun']).optional(),
  difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
  lettersToEliminate: z.array(z.string().length(1)).max(10).optional(),
});

function parseGoogleCredentials(): GoogleCredentials | null {
  const credentialsJson = process.env.GOOGLE_CREDENTIALS_JSON;
  if (!credentialsJson) {
    logger.warn('API', 'GOOGLE_CREDENTIALS_JSON not set - AI hints will use fallback');
    return null;
  }

  try {
    const credentials = JSON.parse(credentialsJson) as GoogleCredentials;
    for (const field of ['project_id', 'private_key', 'client_email'] as const) {
      if (!credentials[field]) throw new Error(`Missing required field: ${field}`);
    }
    if (credentials.private_key.includes('\\n')) {
      credentials.private_key = credentials.private_key.replace(/\\n/g, '\n');
    }
    return credentials;
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    logger.error('API', `Failed to parse Google credentials: ${msg}`);
    return null;
  }
}

let geminiModel: GenAIModel | null = null;

const credentials = parseGoogleCredentials();
if (credentials) {
  try {
    const modelName = process.env.VERTEX_AI_MODEL || 'gemini-1.5-flash-002';
    const ai = new GoogleGenAI({
      vertexai: true,
      project: credentials.project_id,
      location: process.env.VERTEX_AI_LOCATION || 'us-central1',
      googleAuthOptions: {
        credentials: { client_email: credentials.client_email, private_key: credentials.private_key },
        projectId: credentials.project_id,
      },
    });
    geminiModel = {
      async generateContent(prompt: string): Promise<GenAIContentResult> {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: prompt,
          config: { maxOutputTokens: 400, temperature: 0.3 },
        });
        return {
          response: {
            candidates: response.candidates?.map(c => ({
              content: { parts: c.content?.parts?.map(p => ({ text: p.text })) },
              finishReason: c.finishReason,
            })),
          },
        };
      },
    };
    logger.info('API', 'Google Gen AI initialized for hint generation');
  } catch (error) {
    logger.error('API', `Failed to initialize Google Gen AI: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export function getGeminiModel(): GenAIModel | null {
  return geminiModel;
}

const SYSTEM_PROMPT = `You are a word game hint generator for a Boggle-style game. Your task is to create helpful hints that guide players toward guessing a target word WITHOUT making it too obvious.

CRITICAL: Respond with ONLY a valid JSON object. No markdown, no explanation, no code blocks.

JSON Schema (all fields required):
{
  "category": string,
  "exampleSentence": string,
  "wordType": string,
  "difficulty": string,
  "lettersToEliminate": string[]
}

Category: Use " > " separator for 2-3 level hierarchy (e.g., "Nature > Animals > Marine Life").
Example Sentence: Natural sentence with ____ replacing target word. Must make grammatical sense.
Difficulty: easy (common words), medium (moderately common), hard (specialized/uncommon).
Letters to Eliminate: 5-8 single uppercase letters NOT in the target word. Prefer common letters.`;

function buildAIPrompt(targetWord: string, language: string): string {
  const config = LANGUAGE_CONFIG[language] || LANGUAGE_CONFIG.en;
  const wordLetters = [...new Set(targetWord.toUpperCase().split(''))].join(', ');
  const wordLetterSet = new Set(targetWord.toUpperCase().split(''));
  const availableToEliminate = config.alphabet.split('').filter(l => !wordLetterSet.has(l)).slice(0, 15).join(', ');

  return `Generate hints for "${targetWord}" in ${config.name}.
Word letters: ${wordLetters}
Available to eliminate: ${availableToEliminate}
Respond with JSON only.`;
}

function extractValidFields(parsed: Record<string, unknown>, targetWord: string): Partial<HintGenerationResponse> {
  const result: Partial<HintGenerationResponse> = { category: 'Unknown', exampleSentence: '' };

  if (typeof parsed.category === 'string' && parsed.category.length > 0 && parsed.category.length <= 100) {
    result.category = parsed.category;
  }
  if (typeof parsed.exampleSentence === 'string' && parsed.exampleSentence.includes('____')) {
    result.exampleSentence = parsed.exampleSentence.slice(0, 200);
  }
  const validWordTypes = ['noun', 'verb', 'adjective', 'adverb', 'preposition', 'conjunction', 'interjection', 'pronoun'];
  if (typeof parsed.wordType === 'string' && validWordTypes.includes(parsed.wordType.toLowerCase())) {
    result.wordType = parsed.wordType.toLowerCase();
  }
  if (typeof parsed.difficulty === 'string' && ['easy', 'medium', 'hard'].includes(parsed.difficulty)) {
    result.difficulty = parsed.difficulty as 'easy' | 'medium' | 'hard';
  }
  if (Array.isArray(parsed.lettersToEliminate)) {
    const targetLetters = new Set(targetWord.toUpperCase().split(''));
    const validLetters = parsed.lettersToEliminate
      .filter((l): l is string => typeof l === 'string' && l.length === 1)
      .map(l => l.toUpperCase())
      .filter(l => !targetLetters.has(l));
    if (validLetters.length > 0) result.lettersToEliminate = validLetters.slice(0, 10);
  }
  return result;
}

function parseAIResponse(responseText: string, targetWord: string): Partial<HintGenerationResponse> {
  const defaults: Partial<HintGenerationResponse> = { category: 'Unknown', exampleSentence: '' };

  if (!responseText || typeof responseText !== 'string') return defaults;

  try {
    let jsonText = responseText.trim();
    const codeBlockMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) jsonText = codeBlockMatch[1].trim();

    const objectMatch = jsonText.match(/\{[\s\S]*\}/);
    if (!objectMatch) return defaults;
    jsonText = objectMatch[0].replace(/,(\s*[}\]])/g, '$1').replace(/:\s*'([^']*)'/g, ': "$1"');

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(jsonText);
    } catch {
      try {
        parsed = JSON.parse(jsonText.replace(/(\{|,)\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":'));
      } catch {
        return defaults;
      }
    }

    const validated = aiResponseSchema.safeParse(parsed);
    if (!validated.success) return extractValidFields(parsed, targetWord);

    const result = validated.data;
    if (result.lettersToEliminate) {
      const targetLetters = new Set(targetWord.toUpperCase().split(''));
      result.lettersToEliminate = result.lettersToEliminate
        .map(l => l.toUpperCase())
        .filter(l => !targetLetters.has(l) && /^[A-Z\u0590-\u05FF\u3040-\u30FF]$/.test(l));
      if (result.lettersToEliminate.length === 0) result.lettersToEliminate = undefined;
    }

    if (result.exampleSentence && !result.exampleSentence.includes('____')) {
      const wordRegex = new RegExp(`\\b${targetWord}\\b`, 'gi');
      result.exampleSentence = wordRegex.test(result.exampleSentence)
        ? result.exampleSentence.replace(wordRegex, '____')
        : '';
    }

    return result;
  } catch (error) {
    logger.warn('API', `Failed to parse AI response: ${(error as Error).message}`);
    return defaults;
  }
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, operationName: string): Promise<T> {
  let timeoutId: NodeJS.Timeout;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(`${operationName} timed out after ${timeoutMs / 1000}s`)), timeoutMs);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timeoutId));
}

function isRetryableError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const msg = error.message.toLowerCase();
  return msg.includes('rate limit') || msg.includes('timeout') || msg.includes('529') || msg.includes('503') || msg.includes('502') || msg.includes('overloaded');
}

export async function generateAIEnhancedData(
  targetWord: string,
  language: string
): Promise<Partial<HintGenerationResponse> & { tokenUsage?: { input: number; output: number } }> {
  if (!geminiModel) return { category: 'Unknown', exampleSentence: '' };

  const fullPrompt = `${SYSTEM_PROMPT}\n\n${buildAIPrompt(targetWord, language)}`;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      if (attempt > 0) {
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS * Math.pow(2, attempt - 1)));
      }

      const result = await withTimeout(geminiModel.generateContent(fullPrompt), AI_HINT_TIMEOUT_MS, 'AI hint generation');
      const text = result.response?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      if (!text) throw new Error('Empty response from Gemini');

      return {
        ...parseAIResponse(text, targetWord),
        tokenUsage: { input: Math.ceil(fullPrompt.length / 4), output: Math.ceil(text.length / 4) },
      };
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      if (!isRetryableError(error) || attempt === MAX_RETRIES) {
        logger.error('API', `AI hint generation failed for ${targetWord}: ${err.message}`);
        break;
      }
    }
  }

  return { category: 'Unknown', exampleSentence: '' };
}
