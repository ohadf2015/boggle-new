/**
 * Daily Word Judge
 *
 * A STRICT verdict on whether a word is a good daily-puzzle answer:
 * common, familiar, a base dictionary form, correctly spelled, fun to reveal,
 * and NOT a proper noun / loanword / niche-technical / inflected fragment.
 *
 * The general single-word validator (validateAndSaveWord) deliberately ACCEPTS
 * proper nouns and place names — wrong for a daily word, which is why this exists.
 * Criteria are kept in sync with the bulk-generation prompt (generation.ts) so the
 * generator and the judge never disagree (avoids a dual source of truth).
 *
 * On approval it also returns a short kid-friendly meaning in the word's own
 * language — shown on the daily results page.
 *
 * @module lib/ai-service/dailyWordJudge
 */

import { z } from 'zod';
import { trackTokenUsage, type GenAIModel } from './client';
import { AI_TIMEOUT_CONFIG, LANGUAGE_NAMES, type TokenUsageStats } from './types';
import { withRetry } from './validation';
import logger from '@/backend/utils/logger';

export interface DailyWordVerdict {
  ok: boolean;
  reason: string;
  meaning: string;
  /** 1 (dull/abstract) .. 5 (concrete, vivid, fun to reveal). Only meaningful when ok=true. */
  interestingness?: number;
}

const VerdictSchema = z.object({
  ok: z.boolean(),
  reason: z.string().optional().default(''),
  meaning: z.string().optional().default(''),
  interestingness: z.coerce.number().min(1).max(5).optional(),
});

export function buildDailyWordJudgePrompt(word: string, language: string): string {
  const languageName = LANGUAGE_NAMES[language] || language;
  return `You are the quality gate for the daily word puzzle. Judge ONE candidate answer word.

LANGUAGE: ${languageName}
WORD: ${word}

A GOOD daily word is:
- Common, everyday vocabulary a casual ${languageName} speaker knows.
- A base dictionary form (a lemma) — NOT an inflected/conjugated fragment or a possessive form.
- Spelled correctly with no diacritics (for Hebrew: no nikud; correct final letters).
- Fun and satisfying to reveal — concrete and picturable when possible.

REJECT (set ok=false) if the word is ANY of these:
- A proper noun: city, country, place, person, brand, deity, mythological or title.
- A transliteration or foreign loanword (only native ${languageName} vocabulary).
- Technical, scientific, archaic, niche, or rare — too obscure for a casual player.
- An inflected/conjugated fragment, plural-of, possessive, or otherwise not a clean base word.
- Misspelled or broken orthography (stray diacritics, wrong final letters, partial word).

If ok=true, also return:
- "meaning": a very short (max 8 words) simple definition in ${languageName}, suitable for all ages.
- "interestingness": an integer 1-5 for how fun/satisfying the word is to reveal in a puzzle — 5 = concrete, vivid, picturable (e.g. dragon, rocket, jungle); 1 = dull/abstract/functional (e.g. amount, period, manner). Prefer high-interest words.
If ok=false, "meaning" may be "" and "interestingness" may be 1.

Output ONLY raw JSON, no prose:
{"ok": true|false, "reason": "brief why", "meaning": "short ${languageName} definition or empty", "interestingness": 1-5}`;
}

export function parseDailyWordJudgeResponse(text: string): DailyWordVerdict {
  const clean = text.replace(/```(?:json)?\s*/gi, '').replace(/```\s*/g, '').trim();
  const match = clean.match(/\{[\s\S]*\}/);
  if (!match) {
    throw new Error('Daily word judge: no JSON in response');
  }
  const parsed = VerdictSchema.parse(JSON.parse(match[0]));
  return { ok: parsed.ok, reason: parsed.reason, meaning: parsed.meaning, interestingness: parsed.interestingness };
}

/**
 * Judge a single word. Throws if the model is unavailable or the response is
 * unparseable after retries — callers should SKIP (leave the word) and alert
 * rather than blindly replacing a possibly-good word on an infra hiccup.
 */
export async function judgeDailyWord(
  model: GenAIModel,
  word: string,
  language: string,
  withTimeout: <T>(promise: Promise<T>, timeoutMs: number, operationName: string) => Promise<T>,
  tokenUsage: TokenUsageStats
): Promise<DailyWordVerdict> {
  const prompt = buildDailyWordJudgePrompt(word, language);

  const result = await withRetry(async () => {
    const aiPromise = model.generateContent(prompt);
    return await withTimeout(aiPromise, AI_TIMEOUT_CONFIG.bulkGeneration, 'Daily word judge');
  }, `judgeDailyWord:${word}`);

  const responseText = result.response.candidates?.[0]?.content?.parts?.[0]?.text || '';
  trackTokenUsage(tokenUsage, Math.ceil(prompt.length / 4), Math.ceil(responseText.length / 4));

  const verdict = parseDailyWordJudgeResponse(responseText);
  logger.debug('AI_SERVICE', `judgeDailyWord ${language} "${word}" -> ok=${verdict.ok} (${verdict.reason})`);
  return verdict;
}
