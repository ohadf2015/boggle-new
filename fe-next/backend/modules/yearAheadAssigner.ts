/**
 * Year-Ahead Assigner Runner
 *
 * Wires the pure {@link assignYearAhead} to Supabase: pre-fills up to a year of
 * future daily slots per language with distinct, judge-approved, interesting words
 * drawn from the bank — so the puzzle is locked in far ahead and provably never
 * repeats within the year. Idempotent: fills empty future dates only, never
 * overwrites a human override, marks each word used so it can't be re-picked.
 *
 * @module backend/modules/yearAheadAssigner
 */

import { createServiceClient } from '@/lib/ai-service/client';
import { assignYearAhead, type YearAheadDeps, type YearAheadSummary } from '@/lib/dailyChallenge/assignYearAhead';
import { sendTelegramMessage, isTelegramConfigured, escapeTelegramMarkdownV2 } from '@/lib/telegram';
import logger from '@/backend/utils/logger';
import type { SupabaseClient } from '@supabase/supabase-js';

const YEAR_LANGUAGES = ['en', 'he', 'sv', 'ja', 'es'] as const; // ru excluded: no approved pool yet
const LEN: Record<string, { min: number; max: number }> = { ja: { min: 2, max: 4 } };
const DEFAULT_LEN = { min: 5, max: 7 };
const HORIZON_DAYS = 365;
const NO_REPEAT_DAYS = 365;

function isoToday(): string {
  return new Date().toISOString().slice(0, 10);
}
function daysBetween(aIso: string, bIso: string): number {
  return Math.round((Date.parse(`${bIso}T00:00:00Z`) - Date.parse(`${aIso}T00:00:00Z`)) / 86400000);
}

/** Latest existing row per language → base for sequential puzzle_number continuation. */
async function loadBase(supabase: SupabaseClient, language: string): Promise<{ date: string; number: number } | null> {
  const { data } = await supabase
    .from('daily_target_words')
    .select('puzzle_date, puzzle_number')
    .eq('language', language)
    .order('puzzle_date', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data) return null;
  return { date: data.puzzle_date as string, number: data.puzzle_number as number };
}

function buildDeps(supabase: SupabaseClient, language: string, base: { date: string; number: number }): YearAheadDeps {
  const { min, max } = LEN[language] || DEFAULT_LEN;
  return {
    getApprovedPool: async () => {
      const { data } = await supabase
        .from('daily_challenge_word_bank')
        .select('word, meaning, interestingness_score, last_used_at')
        .eq('language', language)
        .eq('status', 'active')
        .eq('validation_status', 'approved')
        .not('judged_at', 'is', null)
        .order('interestingness_score', { ascending: false, nullsFirst: false })
        .limit(2000);
      const horizon = new Date();
      horizon.setUTCDate(horizon.getUTCDate() - NO_REPEAT_DAYS);
      return (data ?? [])
        .filter((r) => {
          const w = r.word as string;
          if (w.length < min || w.length > max) return false;
          // never re-pick a word already consumed inside the no-repeat horizon
          return !r.last_used_at || new Date(r.last_used_at as string) < horizon;
        })
        .map((r) => ({ word: r.word as string, meaning: (r.meaning as string) || '', interestingness: (r.interestingness_score as number) ?? 3 }));
    },

    getRecentlyUsedWords: async () => {
      const since = new Date();
      since.setUTCDate(since.getUTCDate() - NO_REPEAT_DAYS);
      const { data } = await supabase
        .from('daily_target_words')
        .select('target_word, override_word')
        .eq('language', language)
        .gte('puzzle_date', since.toISOString().slice(0, 10));
      const set = new Set<string>();
      for (const r of data ?? []) {
        if (r.target_word) set.add((r.target_word as string).toUpperCase());
        if (r.override_word) set.add((r.override_word as string).toUpperCase());
      }
      return set;
    },

    getHumanOverrideDates: async () => {
      // Skip ANY already-filled future slot — human overrides AND prior machine
      // assignments — so re-running is additive (only fills truly empty days),
      // never clobbering an already-assigned word.
      const { data } = await supabase
        .from('daily_target_words')
        .select('puzzle_date, override_word, override_by')
        .eq('language', language)
        .gte('puzzle_date', isoToday());
      return new Set(
        (data ?? [])
          .filter((r) => r.override_by != null || r.override_word != null)
          .map((r) => r.puzzle_date as string),
      );
    },

    assignSlot: async (lang, date, wordUpper, meaning) => {
      const now = new Date().toISOString();
      const puzzleNumber = base.number + daysBetween(base.date, date);
      await supabase.from('daily_target_words').upsert(
        {
          puzzle_date: date,
          language: lang,
          puzzle_number: puzzleNumber,
          target_word: wordUpper,
          override_word: wordUpper,
          override_by: null, // machine-owned, validator/selector may not overwrite intent
          override_at: now,
          word_source: 'validator', // allowed by CHECK; ai_reason carries the real provenance
          ai_reason: 'Year-ahead pre-assignment (judge-approved bank word)',
          meaning,
          validated_at: now, // already judge-approved → idempotent skip by the validator
          grid: null,
          grid_generated_at: null,
          updated_at: now,
        },
        { onConflict: 'puzzle_date,language' },
      );
    },

    markBankUsed: async (lang, wordUpper, date) => {
      await supabase
        .from('daily_challenge_word_bank')
        .update({ last_used_at: `${date}T12:00:00Z` })
        .eq('language', lang)
        .ilike('word', wordUpper);
    },

    log: (msg) => logger.info('YEAR_AHEAD', msg),
  };
}

export interface YearAheadRunOptions {
  languages?: readonly string[];
  days?: number;
}

export async function runYearAheadAssignment(
  options: YearAheadRunOptions = {},
): Promise<Record<string, YearAheadSummary> | null> {
  const supabase = createServiceClient();
  if (!supabase) {
    logger.error('YEAR_AHEAD', 'No Supabase service client — skipping');
    return null;
  }

  const languages = options.languages ?? YEAR_LANGUAGES;
  const days = options.days ?? HORIZON_DAYS;
  const out: Record<string, YearAheadSummary> = {};
  const shortfalls: string[] = [];

  for (const language of languages) {
    const base = await loadBase(supabase, language);
    if (!base) {
      shortfalls.push(`${language}: no existing daily rows to continue numbering from`);
      continue;
    }
    // Fill the day AFTER the latest existing row, forward for `days`.
    const startDate = (() => {
      const d = new Date(`${base.date}T00:00:00Z`);
      d.setUTCDate(d.getUTCDate() + 1);
      return d.toISOString().slice(0, 10);
    })();

    const summary = await assignYearAhead(buildDeps(supabase, language, base), { language, startDate, days });
    out[language] = summary;
    if (summary.shortfall > 0) shortfalls.push(`${language}: ${summary.shortfall} day(s) unfilled (approved pool too small)`);
  }

  logger.info('YEAR_AHEAD', 'Run complete', out);
  if (shortfalls.length > 0 && isTelegramConfigured()) {
    await sendTelegramMessage(
      escapeTelegramMarkdownV2(`⚠️ Year-ahead assigner shortfalls:\n${shortfalls.join('\n')}`),
    ).catch((e) => logger.error('YEAR_AHEAD', 'Telegram alert failed', e));
  }
  return out;
}
