/**
 * One-shot: pre-assign ~1 year of daily words from the judge-approved bank.
 *   YEAR_LANGS=en,he,es YEAR_DAYS=365 railway run npx tsx scripts/oneoff/yearAheadPopulate.ts
 * Run AFTER the sweep has populated enough approved words. Idempotent.
 */
import { runYearAheadAssignment } from '@/backend/modules/yearAheadAssigner';

const langs = (process.env.YEAR_LANGS || 'en,he,sv,ja,es').split(',').map((s) => s.trim()).filter(Boolean);
const days = parseInt(process.env.YEAR_DAYS || '365', 10);

(async () => {
  console.log(`[yearAhead] langs=${langs.join(',')} days=${days}`);
  const summary = await runYearAheadAssignment({ languages: langs, days });
  console.log('[yearAhead] RESULT', JSON.stringify(summary));
  process.exit(0);
})().catch((e) => {
  console.error('[yearAhead] FAILED', e);
  process.exit(1);
});
