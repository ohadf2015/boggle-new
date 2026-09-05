/**
 * Vertex AI adapter for lesson enrichment.
 *
 * Kept separate from route.ts so the route test can mock this one function.
 * Reuses the project's Google Gen AI bootstrap (`lib/ai-service/client`) but
 * calls the model directly because the shared GenAIModel wrapper caps output
 * at 1024 tokens — too small for a batch of definitions + examples.
 */
import type { GoogleGenAI } from '@google/genai';
import { parseGoogleCredentials, initializeVertexAI } from '@/lib/ai-service/client';
import { withRetry } from '@/lib/ai-service/validation';
import { buildEnrichPrompt, extractJsonObject } from '@/lib/education/vocabEnrich';
import logger from '@/utils/logger';

/** Words per model call — keeps each JSON response comfortably inside the output budget. */
const BATCH_SIZE = 15;
const TIMEOUT_MS = 45_000;
const MAX_OUTPUT_TOKENS = 4096;

let aiPromise: Promise<GoogleGenAI> | null = null;

async function getAi(): Promise<GoogleGenAI> {
  if (!aiPromise) {
    aiPromise = initializeVertexAI(parseGoogleCredentials())
      .then(({ ai }) => ai)
      .catch((error) => {
        aiPromise = null; // let the next request retry initialisation
        throw error;
      });
  }
  return aiPromise;
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: NodeJS.Timeout;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`Lesson enrichment timed out after ${ms / 1000}s`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

async function generateBatch(ai: GoogleGenAI, words: string[], language: string): Promise<Record<string, unknown>> {
  const modelName = process.env.VERTEX_AI_MODEL || 'gemini-1.5-flash-002';
  const prompt = buildEnrichPrompt(words, language);

  const response = await withRetry(
    () =>
      withTimeout(
        ai.models.generateContent({
          model: modelName,
          contents: prompt,
          config: {
            maxOutputTokens: MAX_OUTPUT_TOKENS,
            temperature: 0.3,
            responseMimeType: 'application/json',
          },
        }),
        TIMEOUT_MS
      ),
    'lessonEnrich'
  );

  const text = response.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';
  const parsed = extractJsonObject(text);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    logger.warn('AI_SERVICE', 'lessonEnrich: batch returned no JSON object', { words: words.length });
    return {};
  }
  return parsed as Record<string, unknown>;
}

/**
 * Ask the model for definitions / synonyms / antonyms / example sentences.
 * Returns the raw JSON text (object keyed by word) — parsing/normalising is
 * done by `parseEnrichResponse` in the route so the contract stays testable.
 * Throws when Vertex is not configured or every batch fails.
 */
export async function generateEnrichmentText(words: string[], language: string): Promise<string> {
  const ai = await getAi();
  const batches: string[][] = [];
  for (let i = 0; i < words.length; i += BATCH_SIZE) batches.push(words.slice(i, i + BATCH_SIZE));

  const settled = await Promise.allSettled(batches.map((batch) => generateBatch(ai, batch, language)));
  const merged: Record<string, unknown> = {};
  let failures = 0;
  for (const result of settled) {
    if (result.status === 'fulfilled') Object.assign(merged, result.value);
    else {
      failures += 1;
      logger.error('lessonEnrich batch failed:', result.reason);
    }
  }
  if (failures === settled.length) {
    throw new Error('Lesson enrichment failed for every batch');
  }
  return JSON.stringify(merged);
}
