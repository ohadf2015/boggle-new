/**
 * Pure shape builder for the `daily_word_hunt_complete` analytics event.
 * Kept side-effect-free so it's trivially testable and reusable across any
 * entry point that finalizes a Word Hunt run (survival, future variants).
 */

import type { Language } from '@/types';
import type { SurvivalGameResult } from '../survival/types';

export type WordHuntRescueMethod = 'ad' | 'coin' | null;

export interface BuildWordHuntPayloadInput {
  result: SurvivalGameResult;
  puzzleNumber: number;
  language: Language;
  startedAt: number;
  completedAt: number;
  rescueMethod: WordHuntRescueMethod;
}

export interface WordHuntCompletePayload {
  score: number;
  puzzleNumber: number;
  wordCount: number;
  targetWordFound: boolean;
  rescueUsed: boolean;
  rescueMethod: WordHuntRescueMethod;
  durationMs: number;
  language: Language;
}

export const buildDailyWordHuntCompletePayload = (
  input: BuildWordHuntPayloadInput,
): WordHuntCompletePayload => {
  const { result, puzzleNumber, language, startedAt, completedAt, rescueMethod } = input;

  return {
    score: result.efficiencyScore ?? 0,
    puzzleNumber,
    wordCount: result.wordsDiscovered?.length ?? 0,
    targetWordFound: result.solved,
    rescueUsed: rescueMethod !== null,
    rescueMethod,
    durationMs: Math.max(0, completedAt - startedAt),
    language,
  };
};
