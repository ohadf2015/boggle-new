/**
 * One-shot: drain the Hebrew milog-verified promotion backlog.
 *
 * 2026-07-15 incident: startDictionaryEnrichmentCron() raced
 * startAutoPromotionCron() for the same `approved_at IS NULL` rows and lost
 * silently to a broken __dirname file write (see dictionaryEnrichment.ts).
 * 1028 verified Hebrew words got `approved_at` set with no matching
 * word_scores row, so they stayed rejected in live gameplay forever. Fixed
 * going forward (runDictionaryEnrichment now delegates to runAutoPromotion)
 * and the stuck rows were reset to `approved_at = NULL` in the DB. This
 * drains that backlog now instead of waiting ~11 four-hourly cron cycles.
 *
 *   railway run npx tsx scripts/oneoff/backfillHebrewPromotion.ts
 *
 * Idempotent: safe to re-run, exits as soon as a pass promotes 0 Hebrew words.
 */
import { runAutoPromotion } from '@/backend/modules/autoPromotion';

async function main() {
  let totalPromoted = 0;
  for (let pass = 1; pass <= 20; pass++) {
    const result = await runAutoPromotion();
    const heCount = result.words.milogBased.length;
    totalPromoted += heCount;
    console.log(`[backfill] pass ${pass}: ${heCount} he promoted (${result.failed} failed, ${result.blocked} blocked)`);
    if (heCount === 0) break;
  }
  console.log(`[backfill] done. total he words promoted: ${totalPromoted}`);
}

main().catch((err) => {
  console.error('[backfill] fatal:', err);
  process.exit(1);
});
