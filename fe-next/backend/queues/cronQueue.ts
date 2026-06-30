/**
 * BullMQ-based cron job queue
 *
 * Replaces node-cron + manual Redis locks with BullMQ repeatable jobs.
 * Benefits: built-in deduplication, retries, concurrency control,
 * job history, and graceful shutdown.
 *
 * Falls back to node-cron if Redis is unavailable (local dev).
 */
import { Queue, Worker, type Job } from 'bullmq';
import logger from '../utils/logger';

// Job name → handler mapping (registered at startup)
type JobHandler = (job: Job) => Promise<void>;
const jobHandlers = new Map<string, JobHandler>();

let cronQueue: Queue | null = null;
let cronWorker: Worker | null = null;

function getRedisConnection() {
  if (process.env.REDIS_URL) {
    return { url: process.env.REDIS_URL };
  }
  return {
    host: process.env.REDIS_HOST || process.env.REDISHOST || '127.0.0.1',
    port: parseInt(process.env.REDIS_PORT || process.env.REDISPORT || '6379', 10),
  };
}

/**
 * Initialize the cron queue and worker.
 * Call once at server startup.
 */
export function initCronQueue(): { queue: Queue; worker: Worker } {
  const connection = getRedisConnection();

  cronQueue = new Queue('cron-jobs', {
    connection,
    defaultJobOptions: {
      removeOnComplete: { count: 50 },
      removeOnFail: { count: 20 },
      attempts: 2,
      backoff: { type: 'exponential', delay: 30_000 },
    },
  });

  cronWorker = new Worker(
    'cron-jobs',
    async (job: Job) => {
      const handler = jobHandlers.get(job.name);
      if (!handler) {
        logger.error('BULLMQ', `No handler registered for job: ${job.name}`);
        return;
      }
      logger.info('BULLMQ', `Processing job: ${job.name}`);
      const start = Date.now();
      await handler(job);
      logger.info('BULLMQ', `Job ${job.name} completed in ${Date.now() - start}ms`);
    },
    {
      connection,
      concurrency: 1, // cron jobs run sequentially to avoid resource contention
    },
  );

  cronWorker.on('failed', (job, err) => {
    logger.error('BULLMQ', `Job ${job?.name} failed`, { error: err.message });
  });

  logger.info('BULLMQ', 'Cron queue and worker initialized');
  return { queue: cronQueue, worker: cronWorker };
}

/**
 * Register a handler for a named job and add it as a repeatable cron job.
 */
export async function registerCronJob(
  name: string,
  cronExpression: string,
  handler: JobHandler,
): Promise<void> {
  if (!cronQueue) throw new Error('Cron queue not initialized — call initCronQueue() first');

  jobHandlers.set(name, handler);

  await cronQueue.upsertJobScheduler(
    name,
    { pattern: cronExpression, utc: true },
    { name },
  );

  logger.info('BULLMQ', `Registered cron job: ${name} (${cronExpression})`);
}

/**
 * Manually trigger a job (e.g., from admin dashboard).
 */
export async function triggerJob(name: string, data?: Record<string, unknown>): Promise<Job | null> {
  if (!cronQueue) return null;
  return cronQueue.add(name, data ?? {});
}

/**
 * Register all cron jobs from the cron scheduler.
 * Mirrors the jobs in cronScheduler.ts but using BullMQ repeatable jobs.
 */
export async function registerAllCronJobs(): Promise<void> {
  // Dynamic imports to avoid pulling heavy deps into the module graph at import time
  const { populateWikipediaWords } = await import('../services/wikipediaWordPopulator');
  const { runDictionaryEnrichment } = await import('../modules/dictionaryEnrichment');

  const LANGUAGES = ['en', 'he', 'sv', 'ja', 'es', 'ru'] as const;

  await registerCronJob('wikipedia-words', '55 23 * * *', async () => {
    const results = await Promise.allSettled(
      LANGUAGES.map(lang => populateWikipediaWords(new Date(), lang)),
    );
    logger.info('BULLMQ', 'Wikipedia word population complete', {
      results: results.map((r, i) => ({ lang: LANGUAGES[i], status: r.status })),
    });
  });

  await registerCronJob('daily-word-selector', '0 1 * * *', async () => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !supabaseServiceKey) return;
    await fetch(`${supabaseUrl}/functions/v1/daily-word-selector`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${supabaseServiceKey}` },
    });
  });

  // Quality-gate the upcoming week of daily words (30 min after the selector):
  // rejects proper nouns / loanwords / niche / inflected fragments, replaces them
  // with vetted bank words, and stores a short meaning for the results page.
  await registerCronJob('validate-upcoming-daily-words', '30 1 * * *', async () => {
    const { runUpcomingWordValidation } = await import('../modules/dailyWordValidator');
    const summary = await runUpcomingWordValidation();
    logger.info('BULLMQ', 'Daily-word validation complete', summary ?? { skipped: 'no-client' });
  });

  // Proactively judge the WHOLE active word-bank pool (not just served words), so
  // selection can serve only judge-approved words. Caps LLM spend per run; the
  // unjudged backlog drains over a few nights. Runs after the validator (01:30).
  await registerCronJob('sweep-daily-word-bank', '0 2 * * *', async () => {
    const { runWordBankSweep } = await import('../modules/wordBankSweep');
    // 800/lang/night drains the ~10k raw backlog in ~2-3 nights, then just keeps
    // up with new inserts. Concurrency 6 (the Vertex client serializes heavily).
    const summary = await runWordBankSweep({ maxPerLanguage: 800, concurrency: 6 });
    logger.info('BULLMQ', 'Word-bank sweep complete', summary ?? { skipped: 'no-client' });
  });

  // Weekly: extend the pre-assigned daily-word horizon to ~1 year ahead, drawing
  // distinct judge-approved words from the bank (no repeats within the year).
  await registerCronJob('year-ahead-daily-words', '0 5 * * 0', async () => {
    const { runYearAheadAssignment } = await import('../modules/yearAheadAssigner');
    const summary = await runYearAheadAssignment();
    logger.info('BULLMQ', 'Year-ahead assignment complete', summary ?? { skipped: 'no-client' });
  });

  await registerCronJob('bot-difficulty', '0 3 * * 0', async () => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !supabaseServiceKey) return;
    await fetch(`${supabaseUrl}/functions/v1/bot-difficulty-calculator`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${supabaseServiceKey}` },
    });
  });

  await registerCronJob('dictionary-enrichment', '0 4 * * *', async () => {
    await runDictionaryEnrichment();
  });

  // English/Spanish Wiktionary verification (02:00 UTC) — feeds auto-promotion.
  await registerCronJob('word-verification', '0 2 * * *', async () => {
    const { runWordVerification } = await import('../modules/wordVerificationRunner');
    await runWordVerification();
  });

  await registerCronJob('auto-promotion', '0 */4 * * *', async () => {
    const { runAutoPromotion } = await import('../modules/autoPromotion');
    await runAutoPromotion();
  });

  // Dictionary healing sweep (03:30 UTC) — demotes any promoted slurs.
  await registerCronJob('dictionary-healing', '30 3 * * *', async () => {
    const { runDictionaryHealing } = await import('../modules/dictionaryHealing');
    await runDictionaryHealing();
  });

  // Hourly tick: smart per-user scheduler picks recipients whose typical
  // play-time + 30 min lands inside the current hour window. Each user
  // sees at most one push per day (last_daily_push_sent_at dedup).
  await registerCronJob('daily-challenge-reminder', '0 * * * *', async () => {
    const { sendDailyChallengeReminders } = await import('../services/dailyChallengeReminder');
    await sendDailyChallengeReminders();
  });

  // Hourly re-engagement email. Recipient query self-filters by local time
  // (7–9 AM), so an hourly tick covers all timezones. MUST stay in parity with
  // the node-cron path (cronScheduler.startReengagementEmailCron) — omitting it
  // here silently disabled re-engagement email whenever USE_BULLMQ=true.
  await registerCronJob('reengagement-email', '0 * * * *', async () => {
    const { runReengagementEmailBatch } = await import('@/lib/reengagementEmail');
    const result = await runReengagementEmailBatch();
    logger.info('BULLMQ', 'Re-engagement email complete', result);
  });
}

/**
 * Graceful shutdown — close worker and queue connections.
 */
export async function shutdownCronQueue(): Promise<void> {
  if (cronWorker) {
    await cronWorker.close();
    logger.info('BULLMQ', 'Worker closed');
  }
  if (cronQueue) {
    await cronQueue.close();
    logger.info('BULLMQ', 'Queue closed');
  }
}
