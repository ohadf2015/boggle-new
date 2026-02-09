import cron, { ScheduledTask } from 'node-cron';
import { generateDailyBuzz } from './buzzGenerator';
import { populateWikipediaWords } from './wikipediaWordPopulator';
import { runDictionaryEnrichment } from '../modules/dictionaryEnrichment';
import type { Language } from '@/shared/types/game';

/**
 * Cron Scheduler
 *
 * Schedules:
 * - Daily Buzz: 00:00 UTC daily - generates challenges for all languages
 * - Wikipedia words: 23:55 UTC daily - populates word bank from Wikipedia
 * - Daily word selector: 01:00 UTC daily - pre-selects target words for daily challenges
 * - Bot difficulty calculator: 03:00 UTC weekly (Sunday) - adjusts bot behavior from player stats
 *
 * Works with Railway, Heroku, or any Node.js hosting
 */

const LANGUAGES: readonly Language[] = ['en', 'he', 'sv', 'ja'] as const;
const EDGE_FUNCTION_LANGUAGES = ['en', 'he', 'sv', 'ja'] as const;

export function startDailyBuzzCron() {
  // Validate Google credentials on startup
  const credentialsConfigured = !!process.env.GOOGLE_CREDENTIALS_JSON;
  if (!credentialsConfigured) {
    console.warn('⚠️  [CRON] GOOGLE_CREDENTIALS_JSON not configured - Daily Buzz generation will fail!');
    console.warn('⚠️  [CRON] See DAILY_BUZZ_README.md for setup instructions');
  } else {
    console.log('✅ [CRON] Google Vertex AI credentials configured');
  }

  // Run every day at 00:00 UTC (midnight)
  // Cron pattern: '0 0 * * *' = At 00:00
  const task = cron.schedule('0 0 * * *', async () => {
    console.log('🚀 [CRON] Starting Daily Buzz generation...');
    const startTime = Date.now();

    const results: Record<string, { success: boolean; error?: string }> = {};

    for (const language of LANGUAGES) {
      try {
        console.log(`📝 [CRON] Generating for ${language}...`);
        await generateDailyBuzz(new Date(), language);
        results[language] = { success: true };
        console.log(`✅ [CRON] ${language} complete`);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        console.error(`❌ [CRON] ${language} failed:`, errorMsg);
        results[language] = { success: false, error: errorMsg };
      }
    }

    const duration = Date.now() - startTime;
    console.log(`✨ [CRON] Daily Buzz generation complete in ${duration}ms`);
    console.log(`📊 [CRON] Results:`, JSON.stringify(results, null, 2));
  }, {
    timezone: 'UTC',
  });

  console.log('✅ Daily Buzz cron scheduler started (runs daily at 00:00 UTC)');

  // Return task for manual control if needed
  return task;
}

/**
 * Manual trigger for Daily Buzz generation
 * Used by admin dashboard
 */
export async function triggerDailyBuzzGeneration(
  date?: Date,
  language?: string
): Promise<{ success: boolean; results: Record<string, any> }> {
  console.log('🎯 [MANUAL] Starting manual Daily Buzz generation...');
  const startTime = Date.now();
  const targetDate = date || new Date();
  const targetLanguages = language ? [language] : LANGUAGES;

  const results: Record<string, { success: boolean; error?: string }> = {};

  for (const lang of targetLanguages) {
    try {
      console.log(`📝 [MANUAL] Generating for ${lang}...`);
      await generateDailyBuzz(targetDate, lang);
      results[lang] = { success: true };
      console.log(`✅ [MANUAL] ${lang} complete`);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error(`❌ [MANUAL] ${lang} failed:`, errorMsg);
      results[lang] = { success: false, error: errorMsg };
    }
  }

  const duration = Date.now() - startTime;
  const allSuccess = Object.values(results).every(r => r.success);

  console.log(`✨ [MANUAL] Generation complete in ${duration}ms`);
  console.log(`📊 [MANUAL] Results:`, JSON.stringify(results, null, 2));

  return {
    success: allSuccess,
    results: {
      ...results,
      duration,
      date: targetDate.toISOString(),
    },
  };
}

/**
 * Stop the cron scheduler (for graceful shutdown)
 */
export function stopDailyBuzzCron(task: ScheduledTask) {
  task.stop();
  console.log('🛑 Daily Buzz cron scheduler stopped');
}

/**
 * Start Wikipedia word population cron
 * Runs at 23:55 UTC daily (5 minutes before Daily Buzz generation)
 */
export function startWikipediaWordCron() {
  const task = cron.schedule('55 23 * * *', async () => {
    console.log('📚 [CRON] Starting Wikipedia word population...');
    const startTime = Date.now();

    const results: Record<string, { success: boolean; wordsFound?: number; error?: string }> = {};

    // Process languages in parallel for better performance
    const populationPromises = LANGUAGES.map(async (language) => {
      try {
        console.log(`📖 [CRON] Fetching Wikipedia words for ${language}...`);
        const result = await populateWikipediaWords(new Date(), language);
        console.log(`✅ [CRON] ${language}: ${result.wordsFound} words found`);
        return { language, success: true, wordsFound: result.wordsFound };
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        console.error(`❌ [CRON] ${language} failed:`, errorMsg);
        return { language, success: false, error: errorMsg };
      }
    });

    const settledResults = await Promise.allSettled(populationPromises);

    // Collect results from all promises
    for (const result of settledResults) {
      if (result.status === 'fulfilled') {
        const { language, success, wordsFound, error } = result.value;
        results[language] = { success, wordsFound, error };
      }
    }

    const duration = Date.now() - startTime;
    console.log(`✨ [CRON] Wikipedia word population complete in ${duration}ms`);
    console.log(`📊 [CRON] Results:`, JSON.stringify(results, null, 2));
  }, {
    timezone: 'UTC',
  });

  console.log('✅ Wikipedia word cron scheduler started (runs daily at 23:55 UTC)');

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
  console.log('🎯 [MANUAL] Starting manual Wikipedia word population...');
  const startTime = Date.now();
  const targetDate = date || new Date();
  const targetLanguages = language ? [language] : LANGUAGES;

  const results: Record<string, { success: boolean; wordsFound?: number; error?: string }> = {};

  // Process languages in parallel for better performance
  const populationPromises = targetLanguages.map(async (lang) => {
    try {
      console.log(`📖 [MANUAL] Fetching Wikipedia words for ${lang}...`);
      const result = await populateWikipediaWords(targetDate, lang);
      console.log(`✅ [MANUAL] ${lang}: ${result.wordsFound} words found`);
      return { lang, success: true, wordsFound: result.wordsFound };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error(`❌ [MANUAL] ${lang} failed:`, errorMsg);
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

  console.log(`✨ [MANUAL] Population complete in ${duration}ms`);
  console.log(`📊 [MANUAL] Results:`, JSON.stringify(results, null, 2));

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
    console.error(`${logPrefix} Missing Supabase configuration`);
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
      console.error(`${logPrefix} Edge Function error:`, errorText);
      return { success: false, error: errorText };
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error(`${logPrefix} Failed to call Edge Function:`, errorMsg);
    return { success: false, error: errorMsg };
  }
}

/**
 * Start Daily Word Selector cron
 * Runs at 01:00 UTC daily to pre-generate target words for the next 7 days
 */
export function startDailyWordSelectorCron() {
  const task = cron.schedule('0 1 * * *', async () => {
    console.log('🎯 [CRON] Starting daily word selection...');
    const startTime = Date.now();

    const result = await callEdgeFunction('daily-word-selector', '🎯 [CRON]');

    const duration = Date.now() - startTime;
    if (result.success) {
      const data = result.data as { summary?: { created: number; skipped: number } };
      console.log(`✅ [CRON] Daily word selection complete in ${duration}ms`);
      console.log(`📊 [CRON] Summary:`, data.summary);
    } else {
      console.error(`❌ [CRON] Daily word selection failed:`, result.error);
    }
  }, {
    timezone: 'UTC',
  });

  console.log('✅ Daily word selector cron started (runs daily at 01:00 UTC)');
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
    console.log('🤖 [CRON] Starting bot difficulty calculation...');
    const startTime = Date.now();

    const result = await callEdgeFunction('bot-difficulty-calculator', '🤖 [CRON]');

    const duration = Date.now() - startTime;
    if (result.success) {
      const data = result.data as { summary?: { updated: number; fallback: number } };
      console.log(`✅ [CRON] Bot difficulty calculation complete in ${duration}ms`);
      console.log(`📊 [CRON] Summary:`, data.summary);
    } else {
      console.error(`❌ [CRON] Bot difficulty calculation failed:`, result.error);
    }
  }, {
    timezone: 'UTC',
  });

  console.log('✅ Bot difficulty calculator cron started (runs weekly on Sunday at 03:00 UTC)');
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
  console.log('🎯 [MANUAL] Starting manual daily word selection...');
  const startTime = Date.now();

  const result = await callEdgeFunction('daily-word-selector', '🎯 [MANUAL]');

  const duration = Date.now() - startTime;
  console.log(`✨ [MANUAL] Daily word selection complete in ${duration}ms`);

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
  console.log('🤖 [MANUAL] Starting manual bot difficulty calculation...');
  const startTime = Date.now();

  const result = await callEdgeFunction('bot-difficulty-calculator', '🤖 [MANUAL]');

  const duration = Date.now() - startTime;
  console.log(`✨ [MANUAL] Bot difficulty calculation complete in ${duration}ms`);

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
    console.log('📚 [CRON] Starting Hebrew dictionary enrichment...');
    const startTime = Date.now();

    try {
      const result = await runDictionaryEnrichment();

      const duration = Date.now() - startTime;
      console.log(`✅ [CRON] Dictionary enrichment complete in ${duration}ms`);
      console.log(`📊 [CRON] Verification: ${result.verification.verified} verified out of ${result.verification.processed} processed`);
      console.log(`📊 [CRON] Promotion: ${result.promotion.promoted} promoted, ${result.promotion.failed} failed`);
      if (result.promotion.words.length > 0) {
        console.log(`📚 [CRON] New words: ${result.promotion.words.join(', ')}`);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error(`❌ [CRON] Dictionary enrichment failed:`, errorMsg);
    }
  }, {
    timezone: 'UTC',
  });

  console.log('✅ Dictionary enrichment cron started (runs daily at 04:00 UTC)');
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
  console.log('📚 [MANUAL] Starting manual dictionary enrichment...');
  const startTime = Date.now();

  try {
    const result = await runDictionaryEnrichment();
    const duration = Date.now() - startTime;

    console.log(`✅ [MANUAL] Dictionary enrichment complete in ${duration}ms`);

    return {
      success: true,
      verification: result.verification,
      promotion: result.promotion,
      duration,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error(`❌ [MANUAL] Dictionary enrichment failed:`, errorMsg);

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
    console.log('[CRON] Starting auto-promotion pipeline...');
    const startTime = Date.now();

    try {
      const { runAutoPromotion } = await import('../modules/autoPromotion');
      const result = await runAutoPromotion();
      const duration = Date.now() - startTime;

      if (result.skipped) {
        console.log(`[CRON] Auto-promotion skipped (already running)`);
      } else {
        console.log(`[CRON] Auto-promotion complete in ${duration}ms: ${result.promoted} promoted, ${result.failed} failed`);
        if (result.words.submissionBased.length > 0) {
          console.log(`[CRON] Submission-based: ${result.words.submissionBased.join(', ')}`);
        }
        if (result.words.milogBased.length > 0) {
          console.log(`[CRON] Milog-based: ${result.words.milogBased.join(', ')}`);
        }
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[CRON] Auto-promotion failed: ${errorMsg}`);
    }
  }, {
    timezone: 'UTC',
  });

  console.log('Auto-promotion cron started (runs every 4 hours)');
  return task;
}

/**
 * Manual trigger for Auto-Promotion
 * Used by admin dashboard
 */
export async function triggerAutoPromotion(): Promise<{
  success: boolean;
  result: { promoted: number; failed: number; skipped?: boolean; words: { submissionBased: string[]; milogBased: string[] } };
  duration: number;
  error?: string;
}> {
  console.log('[MANUAL] Starting manual auto-promotion...');
  const startTime = Date.now();

  try {
    const { runAutoPromotion } = await import('../modules/autoPromotion');
    const result = await runAutoPromotion();
    const duration = Date.now() - startTime;
    console.log(`[MANUAL] Auto-promotion complete in ${duration}ms`);

    return { success: true, result, duration };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[MANUAL] Auto-promotion failed: ${errorMsg}`);

    return {
      success: false,
      result: { promoted: 0, failed: 0, words: { submissionBased: [], milogBased: [] } },
      duration: Date.now() - startTime,
      error: errorMsg,
    };
  }
}

/**
 * Start all cron jobs
 * Called from server startup
 */
export function startAllCronJobs(): ScheduledTask[] {
  const tasks: ScheduledTask[] = [];

  // Daily Buzz generation (00:00 UTC)
  tasks.push(startDailyBuzzCron());

  // Wikipedia word population (23:55 UTC)
  tasks.push(startWikipediaWordCron());

  // Daily word selector (01:00 UTC)
  tasks.push(startDailyWordSelectorCron());

  // Bot difficulty calculator (03:00 UTC on Sundays)
  tasks.push(startBotDifficultyCalculatorCron());

  // Hebrew dictionary enrichment (04:00 UTC)
  tasks.push(startDictionaryEnrichmentCron());

  // Auto-promotion pipeline (every 4 hours)
  tasks.push(startAutoPromotionCron());

  console.log(`✅ All ${tasks.length} cron jobs started`);
  return tasks;
}

/**
 * Stop all cron jobs (for graceful shutdown)
 */
export function stopAllCronJobs(tasks: ScheduledTask[]): void {
  for (const task of tasks) {
    task.stop();
  }
  console.log(`🛑 Stopped ${tasks.length} cron jobs`);
}
