// Triage the inactive `authored` English backlog and activate what holds up.
//
// 313 en rows sat is_active=false with quality_score NULL and hint NULL since
// the 2026-06-01 seed. 243 of them are NOT duplicates of the active pool, and
// they are good classic bridges (KEY+CHAIN+BOARD, PINE+APPLE+CAKE). They never
// shipped because materialize-puzzles.mjs gates on quality_score >= 60 and
// PostgREST's .gte() excludes NULL — so an unscored row is invisible, silently.
//
// Pool size is the daily's quality ceiling: dailyPuzzleSet draws 5/day with no
// history, so the repeat rate is ~5/poolSize. Activating this backlog takes en
// from 312 to ~550.
//
// Quality signal is the same one audit-bridges.mjs uses: Datamuse Google-Books
// frequency per million. Fake compounds (stonenote) sit at ~0, real ones
// (keystone 0.99) are far higher. Hints come from Datamuse definitions, with a
// leak guard — a hint that contains its own answer is worse than no hint (see
// the 2026-08-07 audit: 120 hints leaked, 71 of them Hebrew).
//
//   node scripts/connections/activate-en-backlog.mjs          # dry run
//   node scripts/connections/activate-en-backlog.mjs --apply  # write
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { writeFileSync } from 'node:fs';
config({ path: '.env.local', override: true });

const APPLY = process.argv.includes('--apply');
// Datamuse returns an exact-spelling match only for words that are actually in
// its dictionary, so the real discriminator is 0.000 (fabricated: ballstorm,
// chestache, headarm) vs anything above it. audit-bridges.mjs's 0.15 "SUSPECT"
// line is an eyeball-it threshold, not a reject line — applying it here cut
// bagpipe (0.138) and backlight (0.067), which are plainly real words.
const ATTESTED_MIN = 0.02;

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE,
);

const cache = new Map();
async function datamuse(word) {
  const key = word.toLowerCase();
  if (cache.has(key)) return cache.get(key);
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const r = await fetch(
        `https://api.datamuse.com/words?sp=${encodeURIComponent(key)}&md=fd&max=1`,
      );
      const d = await r.json();
      let out = { f: 0, defs: [] };
      if (d.length && d[0].word.toLowerCase() === key) {
        const tag = (d[0].tags || []).find((t) => t.startsWith('f:'));
        out = { f: tag ? parseFloat(tag.slice(2)) : 0, defs: d[0].defs || [] };
      }
      cache.set(key, out);
      return out;
    } catch {
      await new Promise((res) => setTimeout(res, 300));
    }
  }
  cache.set(key, null);
  return null; // network failure — never classify on a null
}

/**
 * Half of a real bridge is an OPEN compound — two words with a space. The
 * active pool stores plenty ("rest room", "long shot"), and probing them as a
 * single token reports 0.000 and looks identical to a fake compound. That alone
 * sank 73% of a first pass, including PINE+APPLE+CAKE.
 *
 * Datamuse's rel_bga ("words that frequently FOLLOW this one") is the direct
 * test: if `cake` is in the bigram list for `apple`, then "apple cake" is
 * attested English. A side passes on EITHER signal — closed-form frequency or
 * an attested bigram.
 */
const bgaCache = new Map();
async function followsBigram(first, second) {
  const key = first.toLowerCase();
  if (!bgaCache.has(key)) {
    try {
      const r = await fetch(`https://api.datamuse.com/words?rel_bga=${encodeURIComponent(key)}&max=1000`);
      bgaCache.set(key, new Set((await r.json()).map((w) => w.word.toLowerCase())));
    } catch {
      bgaCache.set(key, null);
    }
  }
  const set = bgaCache.get(key);
  return set ? set.has(second.toLowerCase()) : null;
}

/** Map the weaker of the two compound frequencies onto the 60..92 score band. */
function scoreFor(minFreq) {
  if (minFreq > 1.0) return 92;
  if (minFreq > 0.5) return 88;
  if (minFreq > 0.3) return 82;
  if (minFreq > 0.08) return 75;
  return 68; // attested but uncommon — still above the 60 ship gate
}

/**
 * A hint must never contain its own answer — as a SUBSTRING, not just as a
 * whole word. The bridge hides inside the very compound the definition is
 * describing: "the flesh of a pineapple" gives away PINE+[APPLE]+CAKE, "to play
 * the bagpipes" gives away [BAG], "to work as a cowboy" gives away [BOY]. A
 * word-equality test passes all three, which is how they survived the first
 * pass. Substring containment is the rule that actually holds.
 *
 * Over-rejects the odd innocent case (bridge ARC inside "search"); that only
 * costs us one puzzle, while a leaked hint costs the player the puzzle.
 */
function leaks(hint, bridge) {
  const flat = (s) => s.toLowerCase().replace(/[^a-z]/g, '');
  const b = flat(bridge);
  if (b.length < 3) return true; // too short to test safely — reject
  const h = flat(hint);
  return h.includes(b) || h.includes(b.replace(/(es|s)$/, ''));
}

/**
 * Senses to avoid picking as a hint. Datamuse does not order definitions by
 * how common the sense is, so the slang reading often comes first and produces
 * an actively misleading clue: COWBOY → "a dishonest tradesman",
 * DRUMSTICK → "a person's leg". Prefer a plain sense whenever one exists.
 */
const MARGINAL_SENSE = /\b(slang|informal|colloquial|dated|archaic|obsolete|derogatory|vulgar|humorous|dialect|rare)\b/i;

/**
 * Junk that reads as a clue but tells the player nothing: cross-references,
 * taxonomy, and hyper-specific trivia senses. Once the leak filter removes the
 * obvious definition, these are what's left at the bottom of the sense list —
 * "A web burrfish" for PINEAPPLE, "a British Rail Class 33/1 locomotive" for
 * BAGPIPE. Shipping one of those is worse than shipping no hint at all.
 */
const JUNK_CLAUSE = /^(synonym|alternative (form|spelling)|abbreviation|initialism|acronym|plural|obsolete|misspelling|while|n )|genus |species |British Rail|Class \d/i;

/**
 * Datamuse defs look like "n\tan enclosed area". Clean one into a clause.
 *
 * Only the first two senses are considered: Datamuse orders roughly by
 * prominence, and anything further down is a rare reading that produces a
 * confusing clue for a word game.
 */
const MAX_SENSE_RANK = 2;

function clause(defs, bridge) {
  const usable = [];
  for (const raw of (defs ?? []).slice(0, MAX_SENSE_RANK)) {
    const text = raw
      .replace(/^[a-z]+\t/, '')      // strip the part-of-speech tag
      .replace(/\([^)]*\)/g, '')     // strip "(uncountable, zoology)" registers
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/\s*[.;:,]+$/, '');   // trim BEFORE stripping punctuation, or a
                                     // trailing space hides the final period
    if (text.length < 6 || text.length > 52) continue;
    if (leaks(text, bridge)) continue;
    if (JUNK_CLAUSE.test(text)) continue;
    usable.push({ text, marginal: MARGINAL_SENSE.test(raw) });
  }
  // Stable: a plain sense always beats a marginal one, ties keep Datamuse order.
  const best = usable.find((d) => !d.marginal) ?? usable[0];
  return best ? best.text.charAt(0).toLowerCase() + best.text.slice(1) : null;
}

/**
 * Hint the two FORMED COMPOUNDS, never the bridge itself.
 *
 * The active pool's house style is "Enclosed garden and measurement stick"
 * for COURT+[YARD]+STICK — it describes courtyard and yardstick, so it points
 * at the connection without handing over the answer. Hinting the bridge is a
 * giveaway by construction: a clean definition of APPLE ("a common, firm,
 * round fruit...") solves PINE+[APPLE]+CAKE outright even though it never
 * literally says "apple", which is exactly the leak the literal filter misses.
 *
 * No usable compound definition → return null and leave the puzzle inactive.
 * A giveaway hint is worse than shipping nothing.
 */
function hintFrom(leftDefs, rightDefs, bridge) {
  const l = clause(leftDefs, bridge);
  const r = clause(rightDefs, bridge);
  if (l && r) return `${l.charAt(0).toUpperCase() + l.slice(1)} and ${r}`;
  const only = l || r;
  return only ? only.charAt(0).toUpperCase() + only.slice(1) : null;
}

const { data: all, error } = await sb
  .from('connections_puzzles')
  .select('id,word1,bridge,word2,is_active,source,quality_score,hint')
  .eq('locale', 'en');
if (error) { console.error(error.message); process.exit(1); }

const activeKeys = new Set(
  all.filter((p) => p.is_active).map((p) => `${p.word1}|${p.bridge}|${p.word2}`.toUpperCase()),
);
const backlog = all.filter(
  (p) => !p.is_active && p.source === 'authored' &&
    !activeKeys.has(`${p.word1}|${p.bridge}|${p.word2}`.toUpperCase()),
);
console.log(`backlog candidates (non-duplicate, inactive, authored): ${backlog.length}`);

const rows = [];
let idx = 0;
async function worker() {
  while (idx < backlog.length) {
    const p = backlog[idx++];
    const left = `${p.word1}${p.bridge}`.toLowerCase();
    const right = `${p.bridge}${p.word2}`.toLowerCase();
    const [l, r, b, lBg, rBg] = await Promise.all([
      datamuse(left),
      datamuse(right),
      datamuse(p.bridge),
      followsBigram(p.word1, p.bridge),
      followsBigram(p.bridge, p.word2),
    ]);
    rows.push({
      p, left, right,
      lf: l?.f ?? null, rf: r?.f ?? null,
      lBg, rBg,
      leftDefs: l?.defs ?? [], rightDefs: r?.defs ?? [], bridgeDefs: b?.defs ?? [],
    });
  }
}
await Promise.all(Array.from({ length: 6 }, worker));

const activate = [], reject = [], noHint = [];
for (const row of rows) {
  const { p, lf, rf, lBg, rBg } = row;
  if (lf == null || rf == null) { reject.push({ ...row, why: 'UNKNOWN (network)' }); continue; }

  // Law 1 (both sides real AS WRITTEN): a side is attested if it is a real
  // closed compound OR a real open compound. Failing BOTH signals is what
  // separates a genuine bridge from an invented one (headarm, chestache).
  const leftOk = lf > ATTESTED_MIN || lBg === true;
  const rightOk = rf > ATTESTED_MIN || rBg === true;
  if (!leftOk || !rightOk) {
    const bad = [];
    if (!leftOk) bad.push(`${row.left}=${lf.toFixed(3)}/bigram:${lBg}`);
    if (!rightOk) bad.push(`${row.right}=${rf.toFixed(3)}/bigram:${rBg}`);
    reject.push({ ...row, why: `unattested side — ${bad.join(' ')}` });
    continue;
  }

  // A hintless puzzle RENDERS fine — PuzzleCard gates the reveal button on
  // `puzzle.hint`. But it does not MEASURE fine: the live experiment
  // exp-connections-hint-gate-v1 (100% rollout, 50/50) only counts an exposure
  // when `puzzle.hint` is truthy, so a hintless puzzle silently drops that
  // player out of the arm. Every active puzzle in every locale had a hint
  // before this script ran; that invariant is load-bearing, so keep it.
  const hint = hintFrom(row.leftDefs, row.rightDefs, p.bridge);
  if (!hint) { noHint.push({ ...row, why: 'no non-leaking clue — left inactive' }); continue; }
  // Score off the closed-compound frequency where we have it; an open compound
  // carried only by the bigram signal lands in the "attested but uncommon" band.
  activate.push({
    id: p.id,
    chain: `${p.word1}+${p.bridge}+${p.word2}`,
    quality_score: scoreFor(Math.min(lf, rf)),
    hint,
    examples: [{ w1: row.left, w2: row.right, bridge: p.bridge.toLowerCase() }],
  });
}

console.log(`\nACTIVATE ${activate.length} | REJECT ${reject.length} | NO CLEAN HINT (left inactive) ${noHint.length}`);
console.log('\n=== sample activations ===');
for (const a of activate.slice(0, 15)) console.log(`  ${a.id}  ${a.chain}  q=${a.quality_score}  "${a.hint}"`);
console.log('\n=== sample rejects ===');
for (const r of reject.slice(0, 15)) console.log(`  ${r.p.id}  ${r.p.word1}+${r.p.bridge}+${r.p.word2}  → ${r.why}`);
console.log('\n=== sample no-hint (kept inactive) ===');
for (const r of noHint.slice(0, 10)) console.log(`  ${r.p.id}  ${r.p.word1}+${r.p.bridge}+${r.p.word2}`);

writeFileSync('/tmp/en-backlog-activation.json', JSON.stringify({ activate, reject: reject.map((r) => ({ id: r.p.id, why: r.why })), noHint: noHint.map((r) => r.p.id) }, null, 2));
console.log('\nwrote /tmp/en-backlog-activation.json');

if (!APPLY) {
  console.log('\nDRY RUN — pass --apply to write.');
  process.exit(0);
}

let ok = 0;
for (const a of activate) {
  const { error: upErr } = await sb
    .from('connections_puzzles')
    .update({ is_active: true, quality_score: a.quality_score, hint: a.hint, examples: a.examples })
    .eq('id', a.id);
  if (upErr) console.error(`  FAIL ${a.id}: ${upErr.message}`);
  else ok++;
}
console.log(`activated ${ok}/${activate.length}`);
