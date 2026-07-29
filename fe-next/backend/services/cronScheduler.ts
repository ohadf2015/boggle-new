import cron, { ScheduledTask } from 'node-cron';
import { populateWikipediaWords } from './wikipediaWordPopulator';
import { runDictionaryEnrichment } from '../modules/dictionaryEnrichment';
import { withCronLock } from '../utils/cronLock';
import type { Language } from '@/shared/types/game';
import {
  rotateTargetLang,
  runProactiveDiscoveryForLang,
  runDictionaryMetricsForLang,
} from '../modules/dictionaryImprovement/runtime';
import type { LangCode } from '../modules/dictionaryImprovement/types';
import logger from '../utils/logger';

/**
 * Cron Scheduler
 *
 * Schedules:
 * - Wikipedia words: 23:55 UTC daily - populates word bank from Wikipedia
 * - Daily word selector: 01:00 UTC daily - pre-selects target words for daily challenges
 * - Bot difficulty calculator: 03:00 UTC weekly (Sunday) - adjusts bot behavior from player stats
 *
 * Works with Railway, Heroku, or any Node.js hosting
 */

const LANGUAGES: readonly Language[] = ['en', 'he', 'sv', 'ja', 'es'] as const;
/**
 * Start Wikipedia word population cron
 * Runs at 23:55 UTC daily
 */
export function startWikipediaWordCron() {
  const task = cron.schedule('55 23 * * *', async () => {
    await withCronLock('cron:wikipedia', 10 * 60 * 1000, async () => {
      logger.info('CRON', 'Starting Wikipedia word population...');
      const startTime = Date.now();

      const results: Record<string, { success: boolean; wordsFound?: number; error?: string }> = {};

      const populationPromises = LANGUAGES.map(async (language) => {
        try {
          logger.info('CRON', `Fetching Wikipedia words for ${language}...`);
          const result = await populateWikipediaWords(new Date(), language);
          logger.info('CRON', `${language}: ${result.wordsFound} words found`);
          return { language, success: true, wordsFound: result.wordsFound };
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          logger.error('CRON', `${language} failed`, { error: errorMsg });
          return { language, success: false, error: errorMsg };
        }
      });

      const settledResults = await Promise.allSettled(populationPromises);

      for (const result of settledResults) {
        if (result.status === 'fulfilled') {
          const { language, success, wordsFound, error } = result.value;
          results[language] = { success, wordsFound, error };
        }
      }

      const duration = Date.now() - startTime;
      logger.info('CRON', `Wikipedia word population complete in ${duration}ms`, { results });
    });
  }, {
    timezone: 'UTC',
  });

  logger.info('CRON', 'Wikipedia word cron scheduler started (runs daily at 23:55 UTC)');

  return task;
}

/**
 * Manual trigger for Wikipedia word population
 * Used by admin dashboard
 */
export async function triggerWikipediaWordPopulation(
  date?: Date,
  language?: Language
): Promise<{ success: boolean; results: Record<string, { success: boolean; wordsFound?: number; error?: string }> }> {
  logger.info('MANUAL', 'Starting manual Wikipedia word population...');
  const startTime = Date.now();
  const targetDate = date || new Date();
  const targetLanguages = language ? [language] : LANGUAGES;

  const results: Record<string, { success: boolean; wordsFound?: number; error?: string }> = {};

  // Process languages in parallel for better performance
  const populationPromises = targetLanguages.map(async (lang) => {
    try {
      logger.info('MANUAL', `Fetching Wikipedia words for ${lang}...`);
      const result = await populateWikipediaWords(targetDate, lang);
      logger.info('MANUAL', `${lang}: ${result.wordsFound} words found`);
      return { lang, success: true, wordsFound: result.wordsFound };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      logger.error('MANUAL', `${lang} failed`, { error: errorMsg });
      return { lang, success: false, error: errorMsg };
    }
  });

  const settledResults = await Promise.allSettled(populationPromises);

  // Collect results from all promises
  for (const result of settledResults) {
    if (result.status === 'fulfilled') {
      const { lang, success, wordsFound, error } = result.value;
      results[lang] = { success, wordsFound, error };
    }
  }

  const duration = Date.now() - startTime;
  const allSuccess = Object.values(results).every(r => r.success);

  logger.info('MANUAL', `Population complete in ${duration}ms`, { results });

  return {
    success: allSuccess,
    results,
  };
}

/**
 * Call Supabase Edge Function
 * Helper to invoke Edge Functions from the backend
 */
async function callEdgeFunction(
  functionName: string,
  logPrefix: string
): Promise<{ success: boolean; data?: unknown; error?: string }> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    logger.error('CRON', `${logPrefix} Missing Supabase configuration`);
    return { success: false, error: 'Missing Supabase configuration' };
  }

  try {
    const edgeFunctionUrl = `${supabaseUrl}/functions/v1/${functionName}`;

    const response = await fetch(edgeFunctionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseServiceKey}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('CRON', `${logPrefix} Edge Function error`, { error: errorText });
      return { success: false, error: errorText };
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    logger.error('CRON', `${logPrefix} Failed to call Edge Function`, { error: errorMsg });
    return { success: false, error: errorMsg };
  }
}

/**
 * Start Daily Word Selector cron
 * Runs at 01:00 UTC daily to pre-generate target words for the next 7 days
 */
export function startDailyWordSelectorCron() {
  const task = cron.schedule('0 1 * * *', async () => {
    await withCronLock('cron:daily-word', 5 * 60 * 1000, async () => {
      logger.info('CRON', 'Starting daily word selection...');
      const startTime = Date.now();

      const result = await callEdgeFunction('daily-word-selector', '🎯 [CRON]');

      const duration = Date.now() - startTime;
      if (result.success) {
        const data = result.data as { summary?: { created: number; skipped: number } };
        logger.info('CRON', `Daily word selection complete in ${duration}ms`, { summary: data.summary });
      } else {
        logger.error('CRON', 'Daily word selection failed', { error: result.error });
      }
    });
  }, {
    timezone: 'UTC',
  });

  logger.info('CRON', 'Daily word selector cron started (runs daily at 01:00 UTC)');
  return task;
}

/**
 * Start Bot Difficulty Calculator cron
 * Runs at 03:00 UTC every Sunday to analyze player stats and adjust bot behavior
 */
export function startBotDifficultyCalculatorCron() {
  // Run every Sunday at 03:00 UTC
  // Cron pattern: '0 3 * * 0' = At 03:00 on Sunday
  const task = cron.schedule('0 3 * * 0', async () => {
    await withCronLock('cron:bot-difficulty', 5 * 60 * 1000, async () => {
      logger.info('CRON', 'Starting bot difficulty calculation...');
      const startTime = Date.now();

      const result = await callEdgeFunction('bot-difficulty-calculator', '[BOT-CRON]');

      const duration = Date.now() - startTime;
      if (result.success) {
        const data = result.data as { summary?: { updated: number; fallback: number } };
        logger.info('CRON', `Bot difficulty calculation complete in ${duration}ms`, { summary: data.summary });
      } else {
        logger.error('CRON', 'Bot difficulty calculation failed', { error: result.error });
      }
    });
  }, {
    timezone: 'UTC',
  });

  logger.info('CRON', 'Bot difficulty calculator cron started (runs weekly on Sunday at 03:00 UTC)');
  return task;
}

/**
 * Manual trigger for Daily Word Selector
 * Used by admin dashboard
 */
export async function triggerDailyWordSelection(): Promise<{
  success: boolean;
  data?: unknown;
  error?: string;
  duration: number;
}> {
  logger.info('MANUAL', 'Starting manual daily word selection...');
  const startTime = Date.now();

  const result = await callEdgeFunction('daily-word-selector', '🎯 [MANUAL]');

  const duration = Date.now() - startTime;
  logger.info('MANUAL', `Daily word selection complete in ${duration}ms`);

  return { ...result, duration };
}

/**
 * Manual trigger for Bot Difficulty Calculator
 * Used by admin dashboard
 */
export async function triggerBotDifficultyCalculation(): Promise<{
  success: boolean;
  data?: unknown;
  error?: string;
  duration: number;
}> {
  logger.info('MANUAL', 'Starting manual bot difficulty calculation...');
  const startTime = Date.now();

  const result = await callEdgeFunction('bot-difficulty-calculator', '[BOT-MANUAL]');

  const duration = Date.now() - startTime;
  logger.info('MANUAL', `Bot difficulty calculation complete in ${duration}ms`);

  return { ...result, duration };
}

/**
 * Start Hebrew Dictionary Enrichment cron
 * Runs at 04:00 UTC daily to:
 * 1. Verify pending Hebrew words against milog.co.il
 * 2. Promote verified words to the dictionary
 */
export function startDictionaryEnrichmentCron() {
  const task = cron.schedule('0 4 * * *', async () => {
    await withCronLock('cron:dictionary-enrichment', 10 * 60 * 1000, async () => {
      logger.info('CRON', 'Starting Hebrew dictionary enrichment...');
      const startTime = Date.now();

      try {
        const result = await runDictionaryEnrichment();

        const duration = Date.now() - startTime;
        logger.info('CRON', `Dictionary enrichment complete in ${duration}ms`, {
          verification: { verified: result.verification.verified, processed: result.verification.processed },
          promotion: { promoted: result.promotion.promoted, failed: result.promotion.failed, words: result.promotion.words },
        });
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        logger.error('CRON', 'Dictionary enrichment failed', { error: errorMsg });
      }
    });
  }, {
    timezone: 'UTC',
  });

  logger.info('CRON', 'Dictionary enrichment cron started (runs daily at 04:00 UTC)');
  return task;
}

/**
 * Manual trigger for Dictionary Enrichment
 * Used by admin dashboard
 */
export async function triggerDictionaryEnrichment(): Promise<{
  success: boolean;
  verification: { processed: number; verified: number };
  promotion: { promoted: number; failed: number; words: string[] };
  duration: number;
  error?: string;
}> {
  logger.info('MANUAL', 'Starting manual dictionary enrichment...');
  const startTime = Date.now();

  try {
    const result = await runDictionaryEnrichment();
    const duration = Date.now() - startTime;

    logger.info('MANUAL', `Dictionary enrichment complete in ${duration}ms`);

    return {
      success: true,
      verification: result.verification,
      promotion: result.promotion,
      duration,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    logger.error('MANUAL', 'Dictionary enrichment failed', { error: errorMsg });

    return {
      success: false,
      verification: { processed: 0, verified: 0 },
      promotion: { promoted: 0, failed: 0, words: [] },
      duration: Date.now() - startTime,
      error: errorMsg,
    };
  }
}

/**
 * Start Auto-Promotion cron
 * Runs every 4 hours to promote words that meet confidence thresholds
 * Uses dynamic import to avoid pulling backend-only deps into Next.js build
 */
export function startAutoPromotionCron() {
  const task = cron.schedule('0 */4 * * *', async () => {
    await withCronLock('cron:auto-promotion', 5 * 60 * 1000, async () => {
      logger.info('CRON', 'Starting auto-promotion pipeline...');
      const startTime = Date.now();

      try {
        const { runAutoPromotion } = await import('../modules/autoPromotion');
        const result = await runAutoPromotion();
        const duration = Date.now() - startTime;

        if (result.skipped) {
          logger.info('CRON', 'Auto-promotion skipped (already running)');
        } else {
          logger.info('CRON', `Auto-promotion complete in ${duration}ms`, {
            promoted: result.promoted, failed: result.failed, words: result.words,
          });
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        logger.error('CRON', 'Auto-promotion failed', { error: errorMsg });
      }
    });
  }, {
    timezone: 'UTC',
  });

  logger.info('CRON', 'Auto-promotion cron started (runs every 4 hours)');
  return task;
}

/**
 * Start English/Spanish word-verification cron
 * Runs daily at 02:00 UTC: verifies pending en/es rejected words against
 * Wiktionary so the auto-promotion cron (every 4h) has verified words to promote.
 * Hebrew is handled separately by the milog enrichment cron (04:00 UTC).
 */
export function startWordVerificationCron() {
  const task = cron.schedule('0 2 * * *', async () => {
    await withCronLock('cron:word-verification', 15 * 60 * 1000, async () => {
      logger.info('CRON', 'Starting en/es word verification...');
      const startTime = Date.now();

      try {
        const { runWordVerification } = await import('../modules/wordVerificationRunner');
        const result = await runWordVerification();
        const duration = Date.now() - startTime;
        logger.info('CRON', `Word verification complete in ${duration}ms`, {
          en: { processed: result.en.processed, verified: result.en.verified },
          es: { processed: result.es.processed, verified: result.es.verified },
        });
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        logger.error('CRON', 'Word verification failed', { error: errorMsg });
      }
    });
  }, {
    timezone: 'UTC',
  });

  logger.info('CRON', 'Word verification cron started (runs daily at 02:00 UTC)');
  return task;
}

/**
 * Manual trigger for en/es word verification
 * Used by admin dashboard
 */
export async function triggerWordVerification(): Promise<{
  success: boolean;
  totalVerified: number;
  duration: number;
  error?: string;
}> {
  logger.info('MANUAL', 'Starting manual word verification...');
  const startTime = Date.now();
  try {
    const { runWordVerification } = await import('../modules/wordVerificationRunner');
    const result = await runWordVerification();
    return { success: true, totalVerified: result.totalVerified, duration: Date.now() - startTime };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    logger.error('MANUAL', 'Word verification failed', { error: errorMsg });
    return { success: false, totalVerified: 0, duration: Date.now() - startTime, error: errorMsg };
  }
}

/**
 * Manual trigger for Auto-Promotion
 * Used by admin dashboard
 */
export async function triggerAutoPromotion(): Promise<{
  success: boolean;
  result: { promoted: number; failed: number; blocked: number; skipped?: boolean; words: { milogBased: string[]; wiktionaryBased: string[]; wiktionaryEsBased: string[] } };
  duration: number;
  error?: string;
}> {
  logger.info('MANUAL', 'Starting manual auto-promotion...');
  const startTime = Date.now();

  try {
    const { runAutoPromotion } = await import('../modules/autoPromotion');
    const result = await runAutoPromotion();
    const duration = Date.now() - startTime;
    logger.info('MANUAL', `Auto-promotion complete in ${duration}ms`);

    return { success: true, result, duration };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    logger.error('MANUAL', 'Auto-promotion failed', { error: errorMsg });

    return {
      success: false,
      result: { promoted: 0, failed: 0, blocked: 0, words: { milogBased: [], wiktionaryBased: [], wiktionaryEsBased: [] } },
      duration: Date.now() - startTime,
      error: errorMsg,
    };
  }
}

/**
 * Start Dictionary Healing cron
 * Runs daily at 03:30 UTC: re-checks already auto-promoted en/es words against
 * the offensive filter and demotes any flagged slur/offensive terms.
 */
export function startDictionaryHealingCron() {
  const task = cron.schedule('30 3 * * *', async () => {
    await withCronLock('cron:dictionary-healing', 15 * 60 * 1000, async () => {
      logger.info('CRON', 'Starting dictionary healing sweep...');
      const startTime = Date.now();
      try {
        const { runDictionaryHealing } = await import('../modules/dictionaryHealing');
        const result = await runDictionaryHealing();
        const duration = Date.now() - startTime;
        logger.info('CRON', `Dictionary healing complete in ${duration}ms`, {
          scanned: result.scanned, demoted: result.demoted, words: result.words,
        });
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        logger.error('CRON', 'Dictionary healing failed', { error: errorMsg });
      }
    });
  }, {
    timezone: 'UTC',
  });

  logger.info('CRON', 'Dictionary healing cron started (runs daily at 03:30 UTC)');
  return task;
}

/**
 * Start Season Reset cron
 *
 * Runs daily at 00:05 UTC. Idempotent: only seasons whose status='active'
 * AND end_date <= now() are processed, so daily firings are no-ops 29 of 30
 * days. Push fan-out (`season_start`) happens inside `processExpiredSeasons`
 * — every archived player is notified that the new season is live.
 */
export function startSeasonResetCron() {
  const task = cron.schedule('5 0 * * *', async () => {
    await withCronLock('cron:season-reset', 15 * 60 * 1000, async () => {
      logger.info('CRON', 'Starting season reset...');
      const startTime = Date.now();

      try {
        const { processExpiredSeasons } = await import('../modules/seasonManager');
        const result = await processExpiredSeasons();
        const duration = Date.now() - startTime;

        if (result.errors?.length) {
          logger.error('CRON', 'Season reset reported errors', { errors: result.errors });
        }
        logger.info('CRON', `Season reset complete in ${duration}ms`, {
          processed: result.processed,
          notified: result.notified ?? 0,
        });
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        logger.error('CRON', 'Season reset failed', { error: errorMsg });
      }
    });
  }, {
    timezone: 'UTC',
  });

  logger.info('CRON', 'Season reset cron started (runs daily at 00:05 UTC)');
  return task;
}

/**
 * Manual trigger for Season Reset
 * Used by admin dashboard / staging validation
 */
export async function triggerSeasonReset(): Promise<{
  success: boolean;
  processed: number;
  notified: number;
  duration: number;
  error?: string;
}> {
  logger.info('MANUAL', 'Starting manual season reset...');
  const startTime = Date.now();

  try {
    const { processExpiredSeasons } = await import('../modules/seasonManager');
    const result = await processExpiredSeasons();
    const duration = Date.now() - startTime;

    logger.info('MANUAL', `Season reset complete in ${duration}ms`, result);

    return {
      success: !result.errors?.length,
      processed: result.processed,
      notified: result.notified ?? 0,
      duration,
      error: result.errors?.join('; '),
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    logger.error('MANUAL', 'Season reset failed', { error: errorMsg });
    return {
      success: false,
      processed: 0,
      notified: 0,
      duration: Date.now() - startTime,
      error: errorMsg,
    };
  }
}

/**
 * Start Re-engagement Email cron
 * Runs every hour to send "first letter hint" emails to inactive daily challenge players.
 * The recipient query filters by local time (7-9 AM), so hourly runs cover all timezones.
 */
export function startReengagementEmailCron() {
  const task = cron.schedule('0 * * * *', async () => {
    await withCronLock('cron:reengagement-email', 5 * 60 * 1000, async () => {
      logger.info('CRON', 'Starting re-engagement email send...');
      const startTime = Date.now();

      try {
        const { getReengagementRecipients, resolveUserLanguage, getFirstLetterForLanguage, sendReengagementEmail } =
          await import('@/lib/reengagementEmail');
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://lexiclash.live';

        const recipients = await getReengagementRecipients();
        if (recipients.length === 0) {
          logger.info('CRON', 'Re-engagement: no eligible recipients');
          return;
        }

        let sent = 0;
        let failed = 0;

        for (const recipient of recipients) {
          const language = await resolveUserLanguage(recipient.id, recipient.country_code);
          let letterData = await getFirstLetterForLanguage(language);
          if (!letterData) letterData = await getFirstLetterForLanguage('en');
          if (!letterData) { failed++; continue; }

          const result = await sendReengagementEmail(recipient, language, letterData.letter, baseUrl);
          if (result.success) sent++;
          else failed++;
        }

        const duration = Date.now() - startTime;
        logger.info('CRON', `Re-engagement email complete in ${duration}ms`, { sent, failed, total: recipients.length });
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        logger.error('CRON', 'Re-engagement email failed', { error: errorMsg });
      }
    });
  }, {
    timezone: 'UTC',
  });

  logger.info('CRON', 'Re-engagement email cron started (runs hourly)');
  return task;
}

/**
 * Start all cron jobs
 * Called from server startup
 */
/**
 * Proactive dictionary discovery (01:30 UTC daily).
 *
 * Injects a bounded batch of frequency-ranked, novel candidate words for the
 * day's rotated target language into invalid_word_submissions. They flow through
 * the EXISTING word-verification cron (02:00) + auto-promotion (every 4h) +
 * offensive filter — this only fills the funnel proactively so weak languages
 * (ja/sv/es) stop starving. See docs/2026-06-04-dictionary-extensive-improvement-spec.md.
 */
export function startProactiveDiscoveryCron() {
  const task = cron.schedule('30 1 * * *', async () => {
    await withCronLock('cron:dict-proactive', 15 * 60 * 1000, async () => {
      const lang = rotateTargetLang();
      logger.info('CRON', `Proactive dictionary discovery starting (target=${lang})...`);
      try {
        const r = await runProactiveDiscoveryForLang(lang, 200);
        logger.info('CRON', `Proactive discovery ${lang}: considered=${r.considered} novel=${r.novel} queued=${r.queued}`);
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Unknown error';
        logger.error('CRON', `Proactive discovery ${lang} failed`, { error: msg });
      }
    });
  }, { timezone: 'UTC' });
  logger.info('CRON', 'Proactive dictionary discovery cron started (daily 01:30 UTC, rotating language)');
  return task;
}

/**
 * Dictionary quality metrics (05:00 UTC daily) — after verification + promotion.
 *
 * Records per-language recall@gold + precision@(re-verified sample) into
 * dictionary_quality_metrics and runs the monotonic-quality gate so a precision
 * regression surfaces (qualityGate). Read-only w.r.t. the dictionary.
 */
export function startDictionaryMetricsCron() {
  const task = cron.schedule('0 5 * * *', async () => {
    await withCronLock('cron:dict-metrics', 20 * 60 * 1000, async () => {
      logger.info('CRON', 'Dictionary quality metrics starting...');
      for (const lang of LANGUAGES) {
        try {
          const m = await runDictionaryMetricsForLang(lang as LangCode, 100);
          logger.info('CRON', `Metrics ${lang}: recall=${m.recall.toFixed(3)} precision=${m.precision.toFixed(3)} gate=${m.gate.ok ? 'ok' : 'FAIL'}`);
        } catch (error) {
          const msg = error instanceof Error ? error.message : 'Unknown error';
          logger.error('CRON', `Metrics ${lang} failed`, { error: msg });
        }
      }
    });
  }, { timezone: 'UTC' });
  logger.info('CRON', 'Dictionary quality metrics cron started (daily 05:00 UTC)');
  return task;
}

export function startAllCronJobs(): ScheduledTask[] {
  const tasks: ScheduledTask[] = [];

  // Wikipedia word population (23:55 UTC)
  tasks.push(startWikipediaWordCron());

  // Daily word selector (01:00 UTC)
  tasks.push(startDailyWordSelectorCron());

  // Bot difficulty calculator (03:00 UTC on Sundays)
  tasks.push(startBotDifficultyCalculatorCron());

  // Hebrew dictionary enrichment (04:00 UTC)
  tasks.push(startDictionaryEnrichmentCron());

  // English/Spanish word verification (02:00 UTC) — feeds the auto-promotion cron
  tasks.push(startWordVerificationCron());

  // Auto-promotion pipeline (every 4 hours)
  tasks.push(startAutoPromotionCron());

  // Dictionary healing sweep (03:30 UTC) — demotes any promoted slurs
  tasks.push(startDictionaryHealingCron());

  // Re-engagement emails (hourly — filters by local time 7-9 AM)
  tasks.push(startReengagementEmailCron());

  // Season reset (daily 00:05 UTC, no-op when no expired seasons)
  tasks.push(startSeasonResetCron());

  // Proactive dictionary discovery (01:30 UTC) — feeds the verification queue
  tasks.push(startProactiveDiscoveryCron());

  // Dictionary quality metrics (05:00 UTC) — recall@gold + precision@sample
  tasks.push(startDictionaryMetricsCron());

  logger.info('CRON', `All ${tasks.length} cron jobs started`);
  return tasks;
}

/**
 * Stop all cron jobs (for graceful shutdown)
 */
export function stopAllCronJobs(tasks: ScheduledTask[]): void {
  for (const task of tasks) {
    task.stop();
  }
  logger.info('CRON', `Stopped ${tasks.length} cron jobs`);
}
