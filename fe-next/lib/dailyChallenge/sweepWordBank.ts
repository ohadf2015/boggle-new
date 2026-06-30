/**
 * Proactive Word-Bank Sweep
 *
 * The nightly daily-word validator only judges the ~7 words it SERVES each night;
 * the pool those are drawn from (`daily_challenge_word_bank`) stays full of the
 * raw Wikipedia scrape — ~45% proper nouns (en) and ~90% sentence fragments (ja).
 * This sweep judges the WHOLE active-but-unjudged pool with the same trusted
 * {@link judgeDailyWord}, so a word is only ever servable once the judge approved it
 * (the selection RPC filters on `validation_status='approved'`).
 *
 * Fail-closed by construction: a judge/LLM error leaves the word UNJUDGED (it stays
 * `pending`, never auto-approved) and is reported — a batch that marked words "good"
 * on an infra hiccup is the exact Class-4 silent failure this exists to prevent.
 *
 * Dependency-injected (no Supabase / LLM imports) so it is unit-testable and
 * provider-agnostic — `judge` is the only LLM seam.
 *
 * See docs/2026-06-30-word-quality-bulletproof.md
 * @module lib/dailyChallenge/sweepWordBank
 */

import type { DailyWordVerdict } from '@/lib/ai-service/dailyWordJudge';

export interface SweepDeps {
  /** Active, length-correct, not-yet-judged (judged_at IS NULL, validation_status='pending') bank words, uppercased. */
  getUnjudged: (language: string, limit: number) => Promise<string[]>;
  /** Throws if the LLM is unavailable — the word is then left unjudged (retried next run). */
  judge: (word: string, language: string) => Promise<DailyWordVerdict>;
  /** Mark approved: validation_status='approved', store meaning + interestingness, stamp judged_at. */
  markApproved: (language: string, wordUpper: string, meaning: string, interestingness: number) => Promise<void>;
  /** Mark rejected: status='blocked', validation_status='rejected', blocked_reason, stamp judged_at. */
  markRejected: (language: string, wordUpper: string, reason: string) => Promise<void>;
  log?: (msg: string) => void;
}

export interface SweepOptions {
  languages: readonly string[];
  /** cap LLM calls per language per run (default 200) — keeps spend bounded, remainder picked up next run */
  maxPerLanguage?: number;
  /** getUnjudged page size (default 25) */
  batchSize?: number;
  /** how many judge calls to run in parallel within a batch (default 1 = sequential) */
  concurrency?: number;
}

export interface SweepSummary {
  judged: number;
  approved: number;
  rejected: number;
  failures: string[];
}

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

export async function sweepWordBank(deps: SweepDeps, opts: SweepOptions): Promise<SweepSummary> {
  const summary: SweepSummary = { judged: 0, approved: 0, rejected: 0, failures: [] };
  const maxPerLang = opts.maxPerLanguage ?? 200;
  const batchSize = opts.batchSize ?? 25;
  const concurrency = Math.max(1, opts.concurrency ?? 1);

  for (const language of opts.languages) {
    let processedThisLang = 0;
    // Words that errored this run: getUnjudged still returns them (judged_at stays null),
    // so we track them locally to (a) not retry them this run and (b) detect no-progress.
    const erroredThisRun = new Set<string>();

    while (processedThisLang < maxPerLang) {
      const limit = Math.min(batchSize, maxPerLang - processedThisLang);
      const batch = await deps.getUnjudged(language, limit);
      if (batch.length === 0) break;

      // No-progress guard: if every word fetched already errored this run, the pool
      // isn't draining (e.g. LLM fully down) — break instead of re-fetching forever.
      const fresh = batch.filter((w) => !erroredThisRun.has(w.toUpperCase()));
      if (fresh.length === 0) break;

      // Judge in parallel sub-chunks (preserve input order so persistence + summary
      // are deterministic regardless of which call resolves first).
      for (let off = 0; off < fresh.length && processedThisLang < maxPerLang; off += concurrency) {
        const slice = fresh.slice(off, off + concurrency);
        const verdicts = await Promise.all(
          slice.map(async (word): Promise<{ word: string; verdict?: DailyWordVerdict; error?: unknown }> => {
            try {
              return { word, verdict: await deps.judge(word, language) };
            } catch (error) {
              return { word, error };
            }
          }),
        );

        for (const { word, verdict, error } of verdicts) {
          if (processedThisLang >= maxPerLang) break;
          const wu = word.toUpperCase();
          if (error || !verdict) {
            erroredThisRun.add(wu);
            summary.failures.push(`${language} "${word}": judge failed (${errMsg(error)})`);
            continue; // fail-closed: leave unjudged, retried next run
          }
          if (verdict.ok) {
            await deps.markApproved(language, wu, verdict.meaning || '', verdict.interestingness ?? 3);
            summary.approved++;
          } else {
            await deps.markRejected(language, wu, verdict.reason || 'failed daily-word quality judge');
            summary.rejected++;
          }
          summary.judged++;
          processedThisLang++;
        }
      }
    }

    deps.log?.(`sweep ${language}: judged ${processedThisLang} (errors ${erroredThisRun.size})`);
  }

  return summary;
}
