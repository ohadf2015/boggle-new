/**
 * Upcoming Daily Word Validator
 *
 * Judges the served word for each upcoming puzzle slot (language × date). A word
 * that fails the quality gate (proper noun, loanword, niche/technical, inflected
 * fragment, broken orthography) is blocked in the word bank and replaced with a
 * vetted bank word; rejected candidates are blocked too, so the bank self-cleans.
 * Approved words get a short meaning stored for the results page.
 *
 * Dependency-injected (no Supabase / LLM imports here) so it is unit-testable and
 * provider-agnostic — the `judge` function is the only LLM seam.
 *
 * See docs/2026-06-30-daily-word-quality-validator.md
 * @module lib/dailyChallenge/validateUpcomingWords
 */

import type { DailyWordVerdict } from '@/lib/ai-service/dailyWordJudge';

export interface UpcomingRow {
  targetWord: string | null;
  overrideWord: string | null;
  /** non-null = a human admin set this override; never auto-replace these */
  overrideBy: string | null;
  meaning: string | null;
  validatedAt: string | Date | null;
  updatedAt: string | Date | null;
}

export interface ValidateDeps {
  loadRow: (language: string, date: string) => Promise<UpcomingRow | null>;
  /** Throws if the LLM is unavailable — callers SKIP (leave word) and alert. */
  judge: (word: string, language: string) => Promise<DailyWordVerdict>;
  /** Active bank candidates (length/recency-filtered upstream), uppercased, minus `exclude`. */
  getCandidates: (language: string, count: number, exclude: Set<string>) => Promise<string[]>;
  blockBankWord: (language: string, wordUpper: string) => Promise<void>;
  /** GOOD served word (or human override): store meaning + stamp validated_at. */
  saveMeaning: (language: string, date: string, meaning: string) => Promise<void>;
  /** Replace served word: set override_word + meaning + validated_at, null the grid. */
  saveReplacement: (language: string, date: string, wordUpper: string, meaning: string) => Promise<void>;
  log?: (msg: string) => void;
}

export interface ValidateOptions {
  languages: readonly string[];
  dates: readonly string[];
  /** max candidate words to try before giving up on a slot (default 12) */
  maxCandidatesPerSlot?: number;
}

export interface ValidateSummary {
  checked: number;
  replaced: number;
  meaningsFilled: number;
  skipped: number;
  failures: string[];
}

const LEN: Record<string, { min: number; max: number }> = {
  ja: { min: 2, max: 4 },
};
const DEFAULT_LEN = { min: 5, max: 7 }; // 5..7 letters; <= MAX_TARGET_WORD_LENGTH avoids serve-time grid fallthrough

function lenOk(word: string, language: string): boolean {
  const { min, max } = LEN[language] || DEFAULT_LEN;
  return word.length >= min && word.length <= max;
}

function ms(ts: string | Date | null): number {
  if (!ts) return 0;
  return ts instanceof Date ? ts.getTime() : new Date(ts).getTime();
}

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

export async function validateUpcomingWords(
  deps: ValidateDeps,
  opts: ValidateOptions
): Promise<ValidateSummary> {
  const summary: ValidateSummary = { checked: 0, replaced: 0, meaningsFilled: 0, skipped: 0, failures: [] };
  const maxTries = opts.maxCandidatesPerSlot ?? 12;

  for (const language of opts.languages) {
    const usedThisRun = new Set<string>(); // dedupe replacements within a run (no repeats)

    for (const date of opts.dates) {
      const row = await deps.loadRow(language, date);
      if (!row) continue; // selector hasn't generated this slot yet
      summary.checked++;

      const served = (row.overrideWord || row.targetWord || '').trim();
      if (!served) continue;
      const servedUpper = served.toUpperCase();

      // Idempotent: already judged this exact word (no newer overwrite) and has a meaning.
      if (row.validatedAt && row.meaning && ms(row.updatedAt) <= ms(row.validatedAt)) {
        usedThisRun.add(servedUpper);
        continue;
      }

      let verdict: DailyWordVerdict;
      try {
        verdict = await deps.judge(served, language);
      } catch (e) {
        summary.skipped++;
        summary.failures.push(`${language} ${date}: judge failed on "${served}" (${errMsg(e)})`);
        continue;
      }

      const humanOverride = !!row.overrideBy;
      if (verdict.ok || humanOverride) {
        // Keep the word. Respect human overrides even if the judge dislikes them.
        await deps.saveMeaning(language, date, verdict.meaning || '');
        summary.meaningsFilled++;
        usedThisRun.add(servedUpper);
        continue;
      }

      // BAD machine-picked word → block it and find a clean replacement from the bank.
      await deps.blockBankWord(language, servedUpper);
      const exclude = new Set<string>([servedUpper, ...usedThisRun]);
      let chosen: { word: string; meaning: string } | null = null;
      let tries = 0;

      while (tries < maxTries && !chosen) {
        const candidates = await deps.getCandidates(language, Math.min(5, maxTries - tries), exclude);
        if (candidates.length === 0) break;
        for (const cand of candidates) {
          if (chosen) break;
          tries++;
          const cu = cand.toUpperCase();
          if (exclude.has(cu)) continue;
          if (!lenOk(cand, language)) { exclude.add(cu); continue; }
          let cv: DailyWordVerdict;
          try {
            cv = await deps.judge(cand, language);
          } catch {
            exclude.add(cu); // LLM hiccup on a candidate — skip it, don't block it
            continue;
          }
          if (cv.ok) {
            chosen = { word: cand, meaning: cv.meaning || '' };
          } else {
            await deps.blockBankWord(language, cu); // self-cleans the bank
            exclude.add(cu);
          }
        }
      }

      if (chosen) {
        await deps.saveReplacement(language, date, chosen.word.toUpperCase(), chosen.meaning);
        usedThisRun.add(chosen.word.toUpperCase());
        summary.replaced++;
        deps.log?.(`Replaced ${language} ${date}: "${served}" -> "${chosen.word}"`);
      } else {
        summary.failures.push(`${language} ${date}: no clean replacement for "${served}"`);
      }
    }
  }

  return summary;
}
