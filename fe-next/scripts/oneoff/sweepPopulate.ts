/**
 * One-shot: run the word-bank sweep against prod (judge the unjudged pool).
 * Run via Railway so prod creds (GOOGLE_CREDENTIALS_JSON, Supabase) are injected:
 *   SWEEP_LANGS=en SWEEP_CAP=30 railway run npx tsx scripts/oneoff/sweepPopulate.ts
 * Idempotent: only judges words with judged_at IS NULL, so safe to re-run / resume.
 */
import { runWordBankSweep } from '@/backend/modules/wordBankSweep';

const langs = (process.env.SWEEP_LANGS || 'en,he,sv,ja,es,ru').split(',').map((s) => s.trim()).filter(Boolean);
const cap = parseInt(process.env.SWEEP_CAP || '300', 10);
const concurrency = parseInt(process.env.SWEEP_CONCURRENCY || '8', 10);

(async () => {
  console.log(`[sweepPopulate] langs=${langs.join(',')} cap=${cap} concurrency=${concurrency}`);
  const summary = await runWordBankSweep({ languages: langs, maxPerLanguage: cap, concurrency });
  console.log('[sweepPopulate] RESULT', JSON.stringify(summary));
  process.exit(0);
})().catch((e) => {
  console.error('[sweepPopulate] FAILED', e);
  process.exit(1);
});
