/**
 * Scheduled word-verification runner.
 *
 * Pulls pending rejected words (from `invalid_word_submissions`, prioritised by
 * submission_count via `get_verification_queue`) and verifies each against an
 * external authority, writing `verification_status`. The every-4h auto-promotion
 * cron then promotes anything `verified` (gated by the offensive filter).
 *
 *   en / es / sv → Wiktionary  (REST definition API, `body.<lang>`)
 *   ja           → Jisho/JMdict (hiragana; Wiktionary can't verify kana)
 *   he           → milog, owned by startDictionaryEnrichmentCron (not here)
 *
 * Without this runner those statuses only changed on manual admin clicks, which
 * is why English sat at ~3.5% promoted while Hebrew (scheduled) reached ~78%.
 */

import logger from '../utils/logger';
import { emitDictionaryRun } from './dictionaryPipelineTelemetry';
import type { ProcessQueueResult } from '../services/wiktionaryEnVerifier';

type Lang = 'en' | 'es' | 'sv' | 'ja';
const LANGS: readonly Lang[] = ['en', 'es', 'sv', 'ja'] as const;

export type WordVerificationSummary = Record<Lang, ProcessQueueResult> & { totalVerified: number };

const EMPTY: ProcessQueueResult = { processed: 0, verified: 0, notFound: 0, rejectedType: 0, errors: 0 };

export async function runWordVerification(): Promise<WordVerificationSummary> {
  const results = {} as Record<Lang, ProcessQueueResult>;
  for (const lang of LANGS) {
    results[lang] = await verifyLang(lang);
  }
  const totalVerified = LANGS.reduce((sum, l) => sum + results[l].verified, 0);
  const totalProcessed = LANGS.reduce((sum, l) => sum + results[l].processed, 0);

  logger.info('WORD_VERIFY', 'Verification run complete', {
    verified: Object.fromEntries(LANGS.map(l => [l, results[l].verified])),
  });
  await emitDictionaryRun('verify', { processed: totalProcessed, verified: totalVerified });

  return { ...results, totalVerified };
}

/** Run one language's queue; on failure log and return zeros so the others still run. */
async function verifyLang(lang: Lang): Promise<ProcessQueueResult> {
  try {
    switch (lang) {
      case 'en': {
        const { processWiktionaryEnVerificationQueue } = await import('../services/wiktionaryEnVerifier');
        return await processWiktionaryEnVerificationQueue();
      }
      case 'es': {
        const { processWiktionaryEsVerificationQueue } = await import('../services/wiktionaryEsVerifier');
        return await processWiktionaryEsVerificationQueue();
      }
      case 'sv': {
        const { processWiktionaryVerificationQueue } = await import('../services/wiktionaryVerifier');
        return await processWiktionaryVerificationQueue('sv');
      }
      case 'ja': {
        const { processJishoVerificationQueue } = await import('../services/jishoVerifier');
        return await processJishoVerificationQueue();
      }
    }
  } catch (error) {
    logger.error('WORD_VERIFY', `${lang} verification failed`, {
      error: error instanceof Error ? error.message : String(error),
    });
    return { ...EMPTY };
  }
}
