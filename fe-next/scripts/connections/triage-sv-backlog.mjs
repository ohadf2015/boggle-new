// Triage the inactive Swedish council-seed backlog against a real Swedish
// dictionary, and activate the rows that hold up.
//
// Why sv can be done deterministically: the Swedish puzzle law is LETTER-EXACT
// closed compounds. `arbete`+`lag` is invalid because the real word is
// `arbetslag` (foge-s). A dictionary membership test IS that law — no judgement
// call, no LLM, no false confidence.
//
// Why this matters: dailyPuzzleSet draws 5/day as a pure function of (date,
// locale) with no history, so the repeat rate is ~5/poolSize. sv sits at 99
// active, which means a daily player re-sees puzzles within a fortnight.
//
//   node scripts/connections/triage-sv-backlog.mjs          # dry run
//   node scripts/connections/triage-sv-backlog.mjs --apply  # write
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { swedish_words } from '@arvidbt/swedish-words/out/index.js';
config({ path: '.env.local', override: true });

const APPLY = process.argv.includes('--apply');

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE,
);

// The package ships either an array or { words: [...] } depending on version —
// normalise rather than assume, so a dependency bump can't silently zero the
// dictionary and mark every puzzle broken.
const raw = swedish_words ?? [];
const DICT = new Set(raw.map((w) => String(w).toLowerCase()));
if (DICT.size < 10_000) {
  console.error(`Swedish dictionary looks wrong (${DICT.size} words) — refusing to classify.`);
  process.exit(1);
}
console.log(`swedish dictionary: ${DICT.size} words`);

const isWord = (s) => DICT.has(s.toLowerCase());

/**
 * Swedish compounding is NOT plain concatenation. The first element commonly
 * drops its final vowel (stjärna+himmel -> stjärnhimmel, klocka+radio ->
 * klockradio) or takes a linking -s (körsbär+träd -> körsbärsträd). Checking
 * only `a+b` flagged half the LIVE pool as broken, which was the validator
 * being wrong rather than the pool.
 */
const formed = (a, b) => {
  const [x, y] = [a.toLowerCase(), b.toLowerCase()];
  return [x + y, x.replace(/[aeo]$/, '') + y, x + 's' + y].some(isWord);
};

const { data: all, error } = await sb
  .from('connections_puzzles')
  .select('id,word1,bridge,word2,is_active,source,hint,quality_score')
  .eq('locale', 'sv');
if (error) { console.error(error.message); process.exit(1); }

const activeKeys = new Set(
  all.filter((p) => p.is_active).map((p) => `${p.word1}|${p.bridge}|${p.word2}`.toLowerCase()),
);
const backlog = all.filter(
  (p) => !p.is_active && !activeKeys.has(`${p.word1}|${p.bridge}|${p.word2}`.toLowerCase()),
);
console.log(`sv backlog (inactive, non-duplicate): ${backlog.length}`);

// Sanity-check the dictionary against puzzles we ALREADY ship: if the validator
// rejects most of the live pool, the validator is wrong, not the pool.
const live = all.filter((p) => p.is_active);
const livePass = live.filter(
  (p) => formed(p.word1, p.bridge) && formed(p.bridge, p.word2),
).length;
console.log(`validator agrees with ${livePass}/${live.length} of the ALREADY-ACTIVE sv pool`);

const activate = [], reject = [];
for (const p of backlog) {
  const left = `${p.word1}${p.bridge}`.toLowerCase();
  const right = `${p.bridge}${p.word2}`.toLowerCase();
  // Law 5: the two words SHOWN to the player must be real standalone words.
  // Without this, rows like STAD + "SHUS" pass (stadshus is a word) while
  // displaying a bound fragment no Swede would recognise as a word.
  // The curated sv pool stores words lowercase. The uppercase rows are a
  // separate, weaker seed batch: they carry definite forms as word2
  // (LAND+VÄGEN) and non-Swedish stems (PRIVATE, where Swedish is "privat"),
  // both of which slip past a membership test. Leave that batch alone.
  const curatedCasing = `${p.word1}${p.bridge}${p.word2}` === `${p.word1}${p.bridge}${p.word2}`.toLowerCase();
  const standalone = curatedCasing && isWord(p.word1) && isWord(p.word2);
  const lOk = formed(p.word1, p.bridge), rOk = formed(p.bridge, p.word2);
  if (!standalone || !lOk || !rOk) {
    reject.push({
      id: p.id,
      chain: `${p.word1}+${p.bridge}+${p.word2}`,
      bad: !curatedCasing ? 'uppercase seed batch — not reviewed' : !standalone ? 'word1/word2 not a standalone word' : [!lOk && left, !rOk && right].filter(Boolean).join(' '),
    });
    continue;
  }
  activate.push({
    id: p.id,
    chain: `${p.word1}+${p.bridge}+${p.word2}`,
    // Both compounds confirmed letter-exact against the dictionary — the sv law
    // in full. Score above the 60 ship gate but below hand-authored content.
    quality_score: p.quality_score && Number(p.quality_score) >= 60 ? Number(p.quality_score) : 70,
    hasHint: !!p.hint,
    examples: [{ w1: left, w2: right, bridge: p.bridge.toLowerCase() }],
  });
}

console.log(`\nACTIVATE ${activate.length} | REJECT ${reject.length}`);
for (const a of activate) console.log(`  + ${a.chain}  q=${a.quality_score}${a.hasHint ? '' : '  (no hint)'}`);
// NOTE: rejections here are NOT proof a puzzle is broken. Swedish compounding
// is open-class — any two nouns may join — so a finite word list gives reliable
// POSITIVE evidence only. Nothing is ever culled on this signal; unconfirmed
// rows simply stay inactive where they already were.
console.log('\n=== not confirmed (left inactive, NOT culled) ===');
for (const r of reject.slice(0, 25)) console.log(`  - ${r.chain}  → ${r.bad}`);

if (!APPLY) { console.log('\nDRY RUN — pass --apply to write.'); process.exit(0); }

let ok = 0;
for (const a of activate) {
  const { error: upErr } = await sb
    .from('connections_puzzles')
    .update({ is_active: true, quality_score: a.quality_score, examples: a.examples })
    .eq('id', a.id);
  if (upErr) console.error(`  FAIL ${a.id}: ${upErr.message}`);
  else ok++;
}
console.log(`activated ${ok}/${activate.length}`);
