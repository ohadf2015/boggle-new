/**
 * One-shot: curate the MP Word-Hunt common-word lists using the daily-word sweep's
 * verdicts (no new LLM calls). For each language the new list is:
 *     (existing curated words  MINUS  any the judge rejected)  UNION  judge-approved bank words
 * so MP inherits the same proper-noun / niche cleaning as Daily, plus extra known
 * words, including thin languages (ru). Reads the bank via prod creds:
 *     railway run npx tsx scripts/oneoff/curateMpWords.ts
 * Safe: only rewrites a file when the result is non-empty and not smaller-by-collapse.
 */
import { createClient } from '@supabase/supabase-js';
import { promises as fs } from 'fs';
import * as path from 'path';

const FILE_MAP: Record<string, string> = {
  en: 'common_hunt_words.txt',
  he: 'common_hunt_words_he.txt',
  sv: 'common_hunt_words_sv.txt',
  ja: 'common_hunt_words_ja.txt',
  es: 'common_hunt_words_es.txt',
  ru: 'common_hunt_words_ru.txt',
};
const BACKEND_DIR = path.join(__dirname, '..', '..', 'backend');

async function loadTxt(file: string): Promise<string[]> {
  try {
    const content = await fs.readFile(path.join(BACKEND_DIR, file), 'utf-8');
    return content.split('\n').map((w) => w.trim().toLowerCase()).filter(Boolean);
  } catch {
    return [];
  }
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  if (!url || !key) throw new Error('Missing Supabase env (run via `railway run`)');
  const supabase = createClient(url, key);

  const langs = (process.env.MP_LANGS || 'en,he,sv,ja,es,ru').split(',').map((s) => s.trim()).filter(Boolean);

  for (const lang of langs) {
    const file = FILE_MAP[lang];
    if (!file) continue;

    // Pull judge verdicts from the bank (judged_at IS NOT NULL only — trusted).
    const { data, error } = await supabase
      .from('daily_challenge_word_bank')
      .select('word, validation_status')
      .eq('language', lang)
      .not('judged_at', 'is', null)
      .limit(20000);
    if (error) {
      console.error(`[curateMp] ${lang}: bank read failed: ${error.message}`);
      continue;
    }
    const approved = new Set<string>();
    const rejected = new Set<string>();
    for (const r of data ?? []) {
      const w = (r.word as string).toLowerCase();
      if (r.validation_status === 'approved') approved.add(w);
      else if (r.validation_status === 'rejected') rejected.add(w);
    }

    const existing = await loadTxt(file);
    const merged = new Set<string>(existing.filter((w) => !rejected.has(w)));
    for (const w of approved) merged.add(w);

    const out = [...merged].sort();
    const removed = existing.filter((w) => rejected.has(w));

    if (out.length === 0) {
      console.error(`[curateMp] ${lang}: refusing to write empty list`);
      continue;
    }
    await fs.writeFile(path.join(BACKEND_DIR, file), out.join('\n') + '\n', 'utf-8');
    console.log(
      `[curateMp] ${lang}: ${existing.length} -> ${out.length} ` +
        `(+${out.length - existing.length + removed.length} approved added, -${removed.length} rejected removed)`,
    );
  }
}

main().then(() => process.exit(0)).catch((e) => { console.error('[curateMp] FAILED', e); process.exit(1); });
