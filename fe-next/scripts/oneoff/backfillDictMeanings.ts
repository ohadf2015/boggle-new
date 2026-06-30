/**
 * One-off: backfill daily_target_words.meaning with native Wiktionary glosses.
 *
 * The nightly validator is idempotent, so already-validated rows keep their old
 * LLM meaning. This refills upcoming served words with dictionary meanings
 * (dict wins; on miss leave the existing value). Sets validated_at=updated_at so
 * the next validator run stays idempotent (no Vertex re-judge).
 *
 * Run with PROD creds:  railway run npx tsx scripts/oneoff/backfillDictMeanings.ts [--dry] [--limit=N]
 */
import { createServiceClient } from '@/lib/ai-service/client';
import { fetchWiktionaryMeaning } from '@/lib/dictionary/wiktionaryMeaning';

const DRY = process.argv.includes('--dry');
const limitArg = process.argv.find((a) => a.startsWith('--limit='));
const LIMIT = limitArg ? parseInt(limitArg.split('=')[1], 10) : Infinity;
const DELAY_MS = 120; // polite to Wikimedia

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const sb = createServiceClient();
  if (!sb) throw new Error('No Supabase service client (need prod env — use `railway run`)');

  const today = new Date().toISOString().slice(0, 10);
  // Paginate — PostgREST caps a single response at ~1000 rows.
  const all: Array<{ language: string; puzzle_date: string; target_word: string | null; override_word: string | null; meaning: string | null }> = [];
  const PAGE = 1000;
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await sb
      .from('daily_target_words')
      .select('language, puzzle_date, target_word, override_word, meaning')
      .gte('puzzle_date', today)
      .order('puzzle_date', { ascending: true })
      .order('language', { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) throw error;
    all.push(...(data ?? []));
    if (!data || data.length < PAGE) break;
  }

  const rows = all.filter((r) => (r.override_word || r.target_word || '').trim());
  console.log(`${DRY ? '[DRY] ' : ''}backfilling ${Math.min(rows.length, LIMIT)} / ${rows.length} upcoming served rows`);

  const stat: Record<string, { hit: number; miss: number; updated: number }> = {};
  let processed = 0;
  for (const row of rows) {
    if (processed >= LIMIT) break;
    processed++;
    const word = (row.override_word || row.target_word || '').trim();
    const lang = row.language as string;
    stat[lang] ??= { hit: 0, miss: 0, updated: 0 };

    let dict: string | null = null;
    try { dict = await fetchWiktionaryMeaning(word, lang); } catch { dict = null; }

    if (!dict) { stat[lang].miss++; await sleep(DELAY_MS); continue; }
    stat[lang].hit++;
    if (dict !== row.meaning) {
      if (DRY) {
        console.log(`  ${lang} ${row.puzzle_date} "${word}": "${row.meaning ?? '∅'}" -> "${dict}"`);
      } else {
        const now = new Date().toISOString();
        const { error: uErr } = await sb
          .from('daily_target_words')
          .update({ meaning: dict, validated_at: now, updated_at: now })
          .eq('language', lang)
          .eq('puzzle_date', row.puzzle_date);
        if (uErr) console.error(`  UPDATE FAIL ${lang} ${row.puzzle_date}:`, uErr.message);
        else stat[lang].updated++;
      }
    }
    await sleep(DELAY_MS);
  }

  console.log('DONE', DRY ? '(dry)' : '');
  for (const [lang, s] of Object.entries(stat)) {
    console.log(`  ${lang}: hit ${s.hit}, miss ${s.miss}, updated ${s.updated}`);
  }
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
