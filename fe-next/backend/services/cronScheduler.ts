import cron, { ScheduledTask } from 'node-cron';
import { generateDailyBuzz } from './buzzGenerator';

/**
 * Daily Buzz Cron Scheduler
 *
 * Runs daily at 00:00 UTC to generate challenges for all 5 languages
 * Works with Railway, Heroku, or any Node.js hosting
 */

const LANGUAGES = ['en', 'he', 'sv', 'ja', 'es'] as const;

export function startDailyBuzzCron() {
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
