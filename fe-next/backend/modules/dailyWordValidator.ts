/**
 * Daily Word Validator Runner
 *
 * Wires the pure {@link validateUpcomingWords} orchestrator to real services
 * (Supabase + the daily-word judge) and runs it over the upcoming puzzle window.
 * Registered as the nightly `validate-upcoming-daily-words` cron job; also
 * callable on demand (admin trigger / immediate backfill).
 *
 * Loud on failure (Telegram + log) — an unvalidated word silently shipping is
 * the exact failure mode this whole feature exists to prevent.
 *
 * @module backend/modules/dailyWordValidator
 */

import { createServiceClient } from '@/lib/ai-service/client';
import { gameAIService } from '@/lib/ai-service';
import { getWordsFromWordBank } from '@/lib/dailyChallenge/wordBankService';
import { validateUpcomingWords, type ValidateDeps, type ValidateSummary } from '@/lib/dailyChallenge/validateUpcomingWords';
import { processSuggestions, type SuggestionDeps, type SuggestionSummary } from '@/lib/dailyChallenge/processSuggestions';
import { sendTelegramMessage, isTelegramConfigured, escapeTelegramMarkdownV2 } from '@/lib/telegram';
import logger from '@/backend/utils/logger';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Language } from '@/types';

const VALIDATOR_LANGUAGES = ['en', 'he', 'sv', 'ja', 'es', 'ru'] as const;
const WINDOW_DAYS = 8; // today + next 7

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function upcomingDates(from: Date, days: number): string[] {
  const out: string[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(from);
    d.setUTCDate(d.getUTCDate() + i);
    out.push(isoDate(d));
  }
  return out;
}

function buildDeps(supabase: SupabaseClient): ValidateDeps {
  return {
    loadRow: async (language, date) => {
      const { data } = await supabase
        .from('daily_target_words')
        .select('target_word, override_word, override_by, meaning, validated_at, updated_at')
        .eq('language', language)
        .eq('puzzle_date', date)
        .maybeSingle();
      if (!data) return null;
      return {
        targetWord: data.target_word,
        overrideWord: data.override_word,
        overrideBy: data.override_by,
        meaning: data.meaning,
        validatedAt: data.validated_at,
        updatedAt: data.updated_at,
      };
    },

    judge: (word, language) => gameAIService.judgeDailyWord(word, language),

    getCandidates: async (language, count, exclude) => {
      const entries = await getWordsFromWordBank(supabase, language as Language, count, exclude);
      return entries.map((e) => e.word);
    },

    blockBankWord: async (language, wordUpper) => {
      // case-insensitive exact match; no-op if the served word wasn't bank-sourced
      await supabase
        .from('daily_challenge_word_bank')
        .update({ status: 'blocked', blocked_at: new Date().toISOString(), blocked_reason: 'auto: failed daily-word quality judge' })
        .eq('language', language)
        .ilike('word', wordUpper);
    },

    saveMeaning: async (language, date, meaning) => {
      const now = new Date().toISOString(); // same stamp so updated_at <= validated_at → idempotent next run
      await supabase
        .from('daily_target_words')
        .update({ meaning, validated_at: now, updated_at: now })
        .eq('language', language)
        .eq('puzzle_date', date);
    },

    saveReplacement: async (language, date, wordUpper, meaning) => {
      const now = new Date().toISOString();
      await supabase
        .from('daily_target_words')
        .update({
          override_word: wordUpper,
          override_by: null, // distinguishes validator writes from human admin overrides
          override_at: now,
          word_source: 'validator',
          ai_reason: 'Auto-replaced by daily-word quality validator',
          meaning,
          validated_at: now,
          grid: null, // force serve-time grid regeneration for the new word
          grid_generated_at: null,
          updated_at: now,
        })
        .eq('language', language)
        .eq('puzzle_date', date);
    },

    log: (msg) => logger.info('DAILY_WORD_VALIDATOR', msg),
  };
}

function buildSuggestionDeps(supabase: SupabaseClient, from: Date): SuggestionDeps {
  return {
    loadPending: async (language) => {
      const { data } = await supabase
        .from('daily_word_suggestions')
        .select('id, word')
        .eq('language', language)
        .eq('status', 'pending')
        .order('created_at', { ascending: true })
        .limit(50);
      return (data ?? []).map((r) => ({ id: r.id, word: r.word }));
    },

    judge: (word, language) => gameAIService.judgeDailyWord(word, language),

    isRecentlyUsed: async (language, wordUpper) => {
      const since = new Date(from);
      since.setUTCDate(since.getUTCDate() - 30);
      // Two parameterized .eq queries — never interpolate the word into a PostgREST
      // filter string (.or(...)), which would be an injection vector.
      const base = () =>
        supabase
          .from('daily_target_words')
          .select('puzzle_date', { count: 'exact', head: true })
          .eq('language', language)
          .gte('puzzle_date', isoDate(since));
      const [byOverride, byTarget] = await Promise.all([
        base().eq('override_word', wordUpper),
        base().eq('target_word', wordUpper),
      ]);
      return (byOverride.count ?? 0) > 0 || (byTarget.count ?? 0) > 0;
    },

    // furthest-out machine-owned slots (skip today/tomorrow; never human overrides)
    openFutureDates: async (language) => {
      const start = new Date(from);
      start.setUTCDate(start.getUTCDate() + 2);
      const end = new Date(from);
      end.setUTCDate(end.getUTCDate() + 7);
      const { data } = await supabase
        .from('daily_target_words')
        .select('puzzle_date, word_source')
        .eq('language', language)
        .is('override_by', null)
        .gte('puzzle_date', isoDate(start))
        .lte('puzzle_date', isoDate(end))
        .order('puzzle_date', { ascending: false });
      // Don't overwrite a slot already filled by a prior approved suggestion.
      return (data ?? [])
        .filter((r) => r.word_source !== 'suggestion')
        .map((r) => r.puzzle_date as string);
    },

    placeWord: async (language, date, wordUpper, meaning) => {
      const now = new Date().toISOString();
      await supabase
        .from('daily_target_words')
        .update({
          override_word: wordUpper, override_by: null, override_at: now,
          word_source: 'suggestion', ai_reason: 'Player-suggested word (auto-approved by quality judge)',
          meaning, validated_at: now, grid: null, grid_generated_at: null, updated_at: now,
        })
        .eq('language', language)
        .eq('puzzle_date', date);
    },

    markSuggestion: async (id, status, reason, opts) => {
      await supabase
        .from('daily_word_suggestions')
        .update({ status, reason, judged_at: new Date().toISOString(), used_date: opts?.usedDate ?? null, meaning: opts?.meaning ?? null })
        .eq('id', id);
    },

    log: (msg) => logger.info('DAILY_WORD_VALIDATOR', msg),
  };
}

export interface RunOptions {
  languages?: readonly string[];
  dates?: readonly string[];
  from?: Date;
}

export type RunSummary = ValidateSummary & { suggestions: SuggestionSummary };

export async function runUpcomingWordValidation(options: RunOptions = {}): Promise<RunSummary | null> {
  const supabase = createServiceClient();
  if (!supabase) {
    logger.error('DAILY_WORD_VALIDATOR', 'No Supabase service client — skipping');
    return null;
  }

  const from = options.from ?? new Date();
  const languages = options.languages ?? VALIDATOR_LANGUAGES;
  const dates = options.dates ?? upcomingDates(from, WINDOW_DAYS);

  // 1) Place vetted player suggestions onto upcoming slots first, so step 2 sees
  //    (and idempotently skips) the already-judged words.
  const suggestions = await processSuggestions(buildSuggestionDeps(supabase, from), { languages });

  // 2) Quality-gate every upcoming served word + backfill meanings.
  const summary = await validateUpcomingWords(buildDeps(supabase), { languages, dates });

  logger.info('DAILY_WORD_VALIDATOR', 'Run complete', { ...summary, suggestions });

  const allFailures = [...summary.failures, ...suggestions.failures];
  if (allFailures.length > 0 && isTelegramConfigured()) {
    const lines = allFailures.slice(0, 20).join('\n');
    // Escape the whole plain-text body — failure strings contain quotes/parens/
    // dashes/slashes that 400 a raw MarkdownV2 send, silently swallowing the alert.
    const msg =
      `⚠️ Daily-word validator: ${allFailures.length} issue(s) ` +
      `(checked ${summary.checked}, replaced ${summary.replaced}, meanings ${summary.meaningsFilled}, ` +
      `suggestions +${suggestions.approved}/-${suggestions.rejected}).\n${lines}`;
    await sendTelegramMessage(escapeTelegramMarkdownV2(msg)).catch((e) =>
      logger.error('DAILY_WORD_VALIDATOR', 'Telegram alert failed', e),
    );
  }

  return { ...summary, suggestions };
}
