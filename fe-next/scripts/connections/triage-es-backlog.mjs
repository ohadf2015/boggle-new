// Triage the inactive Spanish backlog against Wiktionary, and activate only
// what a dictionary can actually confirm.
//
// es is the worst daily of the six locales: 53 active puzzles, and
// dailyPuzzleSet draws 5/day as a pure function of (date, locale) with no
// history, so the repeat rate is ~5/poolSize — a daily player re-sees a puzzle
// within a couple of days.
//
// Why Wiktionary rather than a word list: Spanish bridges are mostly
// COLLOCATIONS (vino blanco, muelas del juicio), not fused compounds, so a
// word list validates almost none of them. Wiktionary has entries for
// lexicalised set phrases, which is exactly the property law 1 asks for.
//
// MEASURED LIMIT — read before trusting a rejection: a hand probe of 7 known
// -good Spanish phrases returned only 3 hits (aire libre, media naranja and
// muelas del juicio are all real and all missing). Recall is roughly half, so
// a MISS IS NOT EVIDENCE OF ANYTHING. This script only ever activates on a
// hit; it never culls, exactly as the sv triage doesn't.
//
//   node scripts/connections/triage-es-backlog.mjs          # dry run
//   node scripts/connections/triage-es-backlog.mjs --apply  # write
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
config({ path: '.env.local', override: true });

const APPLY = process.argv.includes('--apply');
const HOST = 'es.wiktionary.org';
const BATCH = 40;          // MediaWiki allows 50 titles/query; stay under it
const PAUSE_MS = 1500;     // one-at-a-time probing tripped the rate limiter

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE,
);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Look up many titles in one query. Returns Map<title, exists>. */
async function probeMany(titles) {
  const url = `https://${HOST}/w/api.php?action=query&titles=${titles.map(encodeURIComponent).join('|')}&format=json&formatversion=2`;
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const r = await fetch(url, { headers: { 'user-agent': 'LexiClash-Connections/1.0 (https://lexiclash.live)' } });
      const text = await r.text();
      if (!text.startsWith('{')) throw new Error(text.slice(0, 60)); // rate-limit page
      const j = JSON.parse(text);
      // MediaWiki normalises titles (case, whitespace) — map back to what we asked for.
      const back = new Map((j.query?.normalized ?? []).map((n) => [n.to, n.from]));
      const out = new Map(titles.map((t) => [t, false]));
      for (const p of j.query?.pages ?? []) {
        if (!p.missing) out.set(back.get(p.title) ?? p.title, true);
      }
      return out;
    } catch {
      await sleep(PAUSE_MS * (attempt + 2));
    }
  }
  return null; // network/rate-limit failure — never classify on a null
}

/**
 * Surface forms a Spanish bridge may legitimately take. The pool displays the
 * bare words, but the lexicalised phrase often carries a particle
 * (copa DE vino, muelas DEL juicio), so probe those too.
 */
function surfaceForms(a, b) {
  const [x, y] = [a.toLowerCase().trim(), b.toLowerCase().trim()];
  return [`${x} ${y}`, `${x} de ${y}`, `${x} del ${y}`, `${x}${y}`];
}

const { data: all, error } = await sb
  .from('connections_puzzles')
  .select('id,word1,bridge,word2,is_active,source,hint,quality_score')
  .eq('locale', 'es');
if (error) { console.error(error.message); process.exit(1); }

const activeKeys = new Set(
  all.filter((p) => p.is_active).map((p) => `${p.word1}|${p.bridge}|${p.word2}`.toLowerCase()),
);
// Only rows that already carry a hint are eligible: no_hint must stay 0 on
// active rows or hintless puzzles silently drop players out of the live
// exp-connections-hint-gate-v1 arm (PuzzleCard only counts an exposure when
// puzzle.hint is truthy).
const backlog = all.filter(
  (p) => !p.is_active && p.hint && !activeKeys.has(`${p.word1}|${p.bridge}|${p.word2}`.toLowerCase()),
);
console.log(`es backlog (inactive, hinted, non-duplicate): ${backlog.length}`);

// Collect every surface form we need, dedup, and probe in batches.
const needed = new Set();
for (const p of backlog) {
  for (const f of surfaceForms(p.word1, p.bridge)) needed.add(f);
  for (const f of surfaceForms(p.bridge, p.word2)) needed.add(f);
}
const titles = [...needed];
console.log(`probing ${titles.length} surface forms in ${Math.ceil(titles.length / BATCH)} batches...`);

const exists = new Map();
let failed = 0;
for (let i = 0; i < titles.length; i += BATCH) {
  const res = await probeMany(titles.slice(i, i + BATCH));
  if (!res) { failed++; } else { for (const [k, v] of res) exists.set(k, v); }
  await sleep(PAUSE_MS);
}
if (failed) console.warn(`WARNING: ${failed} batch(es) failed — those forms count as unknown, never as invalid.`);

const attested = (a, b) => surfaceForms(a, b).some((f) => exists.get(f) === true);

// Sanity-check against puzzles we ALREADY ship: if the validator disagrees with
// most of the live pool, the validator is wrong, not the pool. (This is what
// caught the naive Swedish concatenation test.)
const live = all.filter((p) => p.is_active);
console.log(`(live es pool: ${live.length} — not probed, backlog only)`);

/**
 * Law 5: the two words SHOWN to the player must be real standalone words.
 * Without this the confirmed set includes SANTO + "Y SEÑA" and VIENTO +
 * "EN POPA" — the phrase is real, but the tile shows a fragment no Spanish
 * speaker reads as a word — and "A" + MANO, where word1 is a bare preposition.
 */
const standaloneWord = (w) => /^[a-záéíóúüñ]{3,}$/.test(w.toLowerCase().trim());

const activate = [], unconfirmed = [], fragments = [];
for (const p of backlog) {
  const lOk = attested(p.word1, p.bridge);
  const rOk = attested(p.bridge, p.word2);
  if (lOk && rOk && !(standaloneWord(p.word1) && standaloneWord(p.word2))) {
    fragments.push({ chain: `${p.word1}+${p.bridge}+${p.word2}` });
    continue;
  }
  if (lOk && rOk) {
    activate.push({
      id: p.id,
      chain: `${p.word1}+${p.bridge}+${p.word2}`,
      // Both sides confirmed as Wiktionary entries — strong evidence, but the
      // rows are unreviewed seed content, so score just above the ship gate.
      quality_score: p.quality_score && Number(p.quality_score) >= 70 ? Number(p.quality_score) : 72,
    });
  } else {
    unconfirmed.push({ chain: `${p.word1}+${p.bridge}+${p.word2}`, lOk, rOk });
  }
}

console.log(`\nACTIVATE ${activate.length} | UNCONFIRMED ${unconfirmed.length} (left inactive, NOT culled) | PHRASE-REAL BUT FRAGMENT WORD ${fragments.length}`);
for (const f of fragments) console.log(`  ~ ${f.chain}  (both sides attested, but a shown word is not standalone)`);
for (const a of activate) console.log(`  + ${a.chain}  q=${a.quality_score}`);
console.log('\n=== sample unconfirmed ===');
for (const u of unconfirmed.slice(0, 20)) console.log(`  - ${u.chain}  [left:${u.lOk} right:${u.rOk}]`);

if (!APPLY) { console.log('\nDRY RUN — pass --apply to write.'); process.exit(0); }

let ok = 0;
for (const a of activate) {
  const { error: upErr } = await sb
    .from('connections_puzzles')
    .update({ is_active: true, quality_score: a.quality_score })
    .eq('id', a.id);
  if (upErr) console.error(`  FAIL ${a.id}: ${upErr.message}`);
  else ok++;
}
console.log(`activated ${ok}/${activate.length}`);
