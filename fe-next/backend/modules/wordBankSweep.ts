/**
 * Word-Bank Sweep Runner
 *
 * Wires the pure {@link sweepWordBank} to Supabase + the daily-word judge and runs
 * it over the unjudged active pool. Registered as the nightly `sweep-daily-word-bank`
 * cron; also callable on demand for an immediate backfill.
 *
 * This is what turns the reactive (judge-only-the-served-word) validator into a
 * proactive gate: every active bank word is judged, so the selection RPC can serve
 * ONLY judge-approved words. Loud on failure (Telegram + log).
 *
 * @module backend/modules/wordBankSweep
 */

import { createServiceClient } from '@/lib/ai-service/client';
import { gameAIService } from '@/lib/ai-service';
import { sweepWordBank, type SweepDeps, type SweepSummary } from '@/lib/dailyChallenge/sweepWordBank';
import { sendTelegramMessage, isTelegramConfigured, escapeTelegramMarkdownV2 } from '@/lib/telegram';
import logger from '@/backend/utils/logger';
import type { SupabaseClient } from '@supabase/supabase-js';

const SWEEP_LANGUAGES = ['en', 'he', 'sv', 'ja', 'es', 'ru'] as const;

function buildDeps(supabase: SupabaseClient): SweepDeps {
  return {
    getUnjudged: async (language, limit) => {
      // Length band lives in the RPC (PostgREST has no length operator).
      const { data, error } = await supabase.rpc('get_unjudged_bank_words', {
        p_language: language,
        p_count: limit,
      });
      if (error) throw new Error(`get_unjudged_bank_words(${language}): ${error.message}`);
      return (data ?? []).map((r: { word: string }) => r.word);
    },

    judge: (word, language) => gameAIService.judgeDailyWord(word, language),

    markApproved: async (language, wordUpper, meaning, interestingness) => {
      await supabase
        .from('daily_challenge_word_bank')
        .update({
          validation_status: 'approved',
          judged_at: new Date().toISOString(),
          meaning,
          interestingness_score: interestingness,
        })
        .eq('language', language)
        .ilike('word', wordUpper);
    },

    markRejected: async (language, wordUpper, reason) => {
      const now = new Date().toISOString();
      await supabase
        .from('daily_challenge_word_bank')
        .update({
          status: 'blocked',
          validation_status: 'rejected',
          judged_at: now,
          blocked_at: now,
          blocked_reason: `auto-sweep: ${reason}`.slice(0, 200),
        })
        .eq('language', language)
        .ilike('word', wordUpper);
    },

    log: (msg) => logger.info('WORD_BANK_SWEEP', msg),
  };
}

export interface SweepRunOptions {
  languages?: readonly string[];
  maxPerLanguage?: number;
  batchSize?: number;
  concurrency?: number;
}

export async function runWordBankSweep(options: SweepRunOptions = {}): Promise<SweepSummary | null> {
  const supabase = createServiceClient();
  if (!supabase) {
    logger.error('WORD_BANK_SWEEP', 'No Supabase service client — skipping');
    return null;
  }

  const languages = options.languages ?? SWEEP_LANGUAGES;
  const summary = await sweepWordBank(buildDeps(supabase), {
    languages,
    maxPerLanguage: options.maxPerLanguage ?? 300,
    batchSize: options.batchSize ?? 25,
    concurrency: options.concurrency ?? 1,
  });

  logger.info('WORD_BANK_SWEEP', 'Run complete', summary);

  // Loud on sustained failure — an LLM outage that silently judges nothing must
  // not look like "bank is clean".
  if (summary.failures.length > 0 && isTelegramConfigured()) {
    // Plain operational text → escape the whole thing for MarkdownV2 (failures
    // contain quotes/parens/dashes that would otherwise 400 the send — which would
    // silently swallow the very alert that flags trouble).
    const msg =
      `⚠️ Word-bank sweep: ${summary.failures.length} judge failure(s) ` +
      `(judged ${summary.judged}, approved ${summary.approved}, blocked ${summary.rejected}).\n` +
      summary.failures.slice(0, 15).join('\n');
    await sendTelegramMessage(escapeTelegramMarkdownV2(msg)).catch((e) =>
      logger.error('WORD_BANK_SWEEP', 'Telegram alert failed', e),
    );
  }

  return summary;
}
