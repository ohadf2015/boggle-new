/**
 * Player Word-Suggestion Processor
 *
 * Vets player-submitted daily-word suggestions with the same quality judge used
 * for selection, and places approved words onto upcoming puzzle slots. Pure /
 * dependency-injected so it unit-tests without Supabase or an LLM.
 *
 * See docs/2026-06-30-daily-word-quality-validator.md
 * @module lib/dailyChallenge/processSuggestions
 */

import type { DailyWordVerdict } from '@/lib/ai-service/dailyWordJudge';

export interface SuggestionRow {
  id: string;
  word: string;
}

export interface SuggestionDeps {
  loadPending: (language: string) => Promise<SuggestionRow[]>;
  /** Throws if the LLM is unavailable — that suggestion is left pending for next run. */
  judge: (word: string, language: string) => Promise<DailyWordVerdict>;
  isRecentlyUsed: (language: string, wordUpper: string) => Promise<boolean>;
  /** Upcoming dates eligible to receive a suggestion, furthest-first. */
  openFutureDates: (language: string) => Promise<string[]>;
  placeWord: (language: string, date: string, wordUpper: string, meaning: string) => Promise<void>;
  markSuggestion: (
    id: string,
    status: 'approved' | 'rejected' | 'duplicate',
    reason: string,
    opts?: { usedDate?: string; meaning?: string }
  ) => Promise<void>;
  log?: (msg: string) => void;
}

export interface SuggestionOptions {
  languages: readonly string[];
  /** max suggestions to place per language per run (default 2) */
  maxPerLanguage?: number;
}

export interface SuggestionSummary {
  considered: number;
  approved: number;
  rejected: number;
  failures: string[];
}

const LEN: Record<string, { min: number; max: number }> = { ja: { min: 2, max: 4 } };
const DEFAULT_LEN = { min: 5, max: 7 };

function lenOk(word: string, language: string): boolean {
  const { min, max } = LEN[language] || DEFAULT_LEN;
  return word.length >= min && word.length <= max;
}

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

export async function processSuggestions(
  deps: SuggestionDeps,
  opts: SuggestionOptions
): Promise<SuggestionSummary> {
  const summary: SuggestionSummary = { considered: 0, approved: 0, rejected: 0, failures: [] };
  const maxPerLang = opts.maxPerLanguage ?? 2;

  for (const language of opts.languages) {
    const pending = await deps.loadPending(language);
    summary.considered += pending.length;
    if (pending.length === 0) continue;

    const dates = await deps.openFutureDates(language);
    const placedWords = new Set<string>();
    let placed = 0;

    for (const s of pending) {
      if (placed >= maxPerLang) break; // leave the rest pending for the next run
      const wordUpper = (s.word || '').trim().toUpperCase();

      if (!lenOk(wordUpper, language)) {
        await deps.markSuggestion(s.id, 'rejected', 'invalid length');
        summary.rejected++;
        continue;
      }
      if (placedWords.has(wordUpper)) {
        await deps.markSuggestion(s.id, 'duplicate', 'duplicate of another suggestion this run');
        summary.rejected++;
        continue;
      }

      let verdict: DailyWordVerdict;
      try {
        verdict = await deps.judge(s.word, language);
      } catch (e) {
        summary.failures.push(`${language} suggestion "${s.word}": judge failed (${errMsg(e)})`);
        continue; // leave pending
      }

      if (!verdict.ok) {
        await deps.markSuggestion(s.id, 'rejected', verdict.reason);
        summary.rejected++;
        continue;
      }
      if (await deps.isRecentlyUsed(language, wordUpper)) {
        await deps.markSuggestion(s.id, 'rejected', 'recently used');
        summary.rejected++;
        continue;
      }
      if (dates.length === 0) break; // good word but nowhere to put it — keep pending

      const date = dates.shift() as string;
      await deps.placeWord(language, date, wordUpper, verdict.meaning || '');
      await deps.markSuggestion(s.id, 'approved', verdict.reason, { usedDate: date, meaning: verdict.meaning || '' });
      placedWords.add(wordUpper);
      placed++;
      summary.approved++;
      deps.log?.(`Approved suggestion "${s.word}" -> ${language} ${date}`);
    }
  }

  return summary;
}
