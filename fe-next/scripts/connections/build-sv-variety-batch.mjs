#!/usr/bin/env node
/**
 * One-off builder + OBJECTIVE validator for the 2026-06-04 Swedish "variety
 * wave". Swedish closed compounds let us validate without a native speaker:
 * every survivor must satisfy ALL of —
 *   1. concat alignment: full1 === word1+bridge, full2 === bridge+word2
 *      (lowercase, no separators) — guarantees the bridge is the SAME string in
 *      both compounds, i.e. the puzzle is fair. Rejects linking-s (fogemorfem)
 *      and form-shift cases (kärna vs kärn) automatically.
 *   2. dictionary membership of full1, full2 AND bridge against the bundled
 *      @arvidbt/swedish-words list (410k) — both compounds and the answer are
 *      real Swedish words.
 *   3. word1 / word2 in dict too (--strict) — catches mis-segmentation like
 *      "äggula" wrongly split ägg+ula (ula ∉ dict). Off by default since many
 *      legit compound-PREFIX forms (äppel-, frilufts-) aren't standalone words.
 *
 * Candidates: claude-council (gemini-3-flash + grok-4.20). Run:
 *   node build-sv-variety-batch.mjs           # full1/full2/bridge in dict
 *   node build-sv-variety-batch.mjs --strict   # also word1/word2 in dict
 */
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

const STRICT = process.argv.includes('--strict');

// [word1, bridge, word2, difficulty, full1, full2]
const ROWS = [
  // gemini
  ['äppel', 'kärna', 'reaktor', 'easy', 'äppelkärna', 'kärnreaktor'],
  ['in', 'sjö', 'salt', 'easy', 'insjö', 'sjösalt'],
  ['fisk', 'nät', 'brynja', 'medium', 'fisknät', 'nätbrynja'],
  ['vägg', 'skåp', 'lucka', 'medium', 'väggskåp', 'skåpslucka'],
  ['sand', 'papper', 'massa', 'easy', 'sandpapper', 'pappersmassa'],
  ['frisk', 'luft', 'slott', 'easy', 'friskluft', 'luftslott'],
  ['fram', 'tid', 'tabell', 'easy', 'framtid', 'tidtabell'],
  ['driv', 'kraft', 'verk', 'easy', 'drivkraft', 'kraftverk'],
  ['eker', 'hjul', 'pariser', 'medium', 'ekerhjul', 'pariserhjul'],
  ['hörn', 'fönster', 'post', 'hard', 'hörnfönster', 'fönsterpost'],
  ['vänster', 'hand', 'broms', 'easy', 'vänsterhand', 'handbroms'],
  ['platt', 'fot', 'knöl', 'medium', 'plattfot', 'fotknöl'],
  ['tjur', 'huvud', 'stad', 'medium', 'tjurhuvud', 'huvudstad'],
  ['frilufts', 'liv', 'räddning', 'medium', 'friluftsliv', 'livräddning'],
  ['grund', 'färg', 'penna', 'easy', 'grundfärg', 'färgpenna'],
  ['katt', 'guld', 'gruva', 'easy', 'kattguld', 'guldgruva'],
  ['barr', 'skog', 'vakt', 'medium', 'barrskog', 'skogsvakt'],
  ['is', 'berg', 'kedja', 'easy', 'isberg', 'bergskedja'],
  // grok
  ['morgon', 'kaffe', 'paus', 'easy', 'morgonkaffe', 'kaffepaus'],
  ['bläck', 'fisk', 'pinne', 'medium', 'bläckfisk', 'fiskpinne'],
  ['påsk', 'ägg', 'ula', 'easy', 'påskägg', 'äggula'],
  ['färsk', 'ost', 'kaka', 'medium', 'färskost', 'ostkaka'],
  ['knäcke', 'bröd', 'rost', 'easy', 'knäckebröd', 'brödrost'],
  ['jordnöt', 'smör', 'gås', 'medium', 'jordnötsmör', 'smörgås'],
  ['polis', 'hund', 'koja', 'easy', 'polishund', 'hundkoja'],
  ['bond', 'katt', 'unge', 'easy', 'bondkatt', 'kattunge'],
  ['sång', 'fågel', 'bo', 'easy', 'sångfågel', 'fågelbo'],
  ['dubbel', 'säng', 'kläder', 'easy', 'dubbelsäng', 'sängkläder'],
  ['ytter', 'dörr', 'klocka', 'easy', 'ytterdörr', 'dörrklocka'],
  ['tak', 'fönster', 'bänk', 'medium', 'takfönster', 'fönsterbänk'],
  ['vild', 'blomma', 'kål', 'medium', 'vildblomma', 'blomkål'],
  ['ny', 'snö', 'plog', 'easy', 'nysnö', 'snöplog'],
  ['åsk', 'regn', 'kappa', 'easy', 'åskregn', 'regnkappa'],
  ['läger', 'eld', 'stad', 'medium', 'lägereld', 'eldstad'],
  ['nord', 'vind', 'ruta', 'medium', 'nordvind', 'vindruta'],
  ['svart', 'peppar', 'kaka', 'easy', 'svartpeppar', 'pepparkaka'],
];

// Bridges already in the sv pool — never duplicate.
const AVOID = new Set([
  'boll', 'ros', 'bil', 'stjärna', 'tak', 'klocka', 'häst', 'hus', 'bär',
  'brand', 'glas', 'bok', 'väska', 'kniv', 'märke', 'däck', 'ring', 'maskin',
  'korg', 'storm', 'biljett', 'glass', 'gran', 'träd', 'saft', 'pass', 'grupp',
  'kopp', 'album', 'lök', 'karm', 'lampa', 'fläkt', 'spegel', 'stång', 'lov',
  'nyckel', 'temperatur', 'stol', 'dag', 'vagn', 'väg', 'slang', 'båt',
  'vatten', 'mat', 'hylla', 'kruka', 'kaka', 'björn', 'gås', 'kött', 'lås',
]);

// Load the Swedish dictionary (lowercase set).
const mod = require('@arvidbt/swedish-words/out/index.js');
const list = mod.swedish_words || mod.default?.swedish_words || mod.default || mod.words;
if (!Array.isArray(list)) {
  console.error('Could not load swedish_words array; keys=' + Object.keys(mod));
  process.exit(2);
}
const DICT = new Set(list.map((w) => String(w).toLowerCase()));
console.error(`dict loaded: ${DICT.size} words`);

const sqlStr = (s) => `'${s.replace(/'/g, "''")}'`;
const kept = [];
const dropped = [];

for (const [w1, bridge, w2, diff, f1, f2] of ROWS) {
  const reasons = [];
  if (f1 !== w1 + bridge) reasons.push(`align f1 (${f1}!=${w1}+${bridge})`);
  if (f2 !== bridge + w2) reasons.push(`align f2 (${f2}!=${bridge}+${w2})`);
  if (!DICT.has(f1)) reasons.push(`f1 not in dict (${f1})`);
  if (!DICT.has(f2)) reasons.push(`f2 not in dict (${f2})`);
  if (!DICT.has(bridge)) reasons.push(`bridge not in dict (${bridge})`);
  if (STRICT && !DICT.has(w1)) reasons.push(`w1 not in dict (${w1})`);
  if (STRICT && !DICT.has(w2)) reasons.push(`w2 not in dict (${w2})`);
  if (w1 === bridge || bridge === w2 || w1 === w2) reasons.push('degenerate');
  if (AVOID.has(bridge)) reasons.push(`bridge reused (${bridge})`);
  if (reasons.length) dropped.push(`${w1}·${bridge}·${w2}: ${reasons.join('; ')}`);
  else kept.push([w1, bridge, w2, diff, f1, f2]);
}

console.error(`\nKEPT ${kept.length}/${ROWS.length}:`);
kept.forEach(([w1, b, w2]) => console.error(`  ✓ ${w1}·${b}·${w2}`));
console.error(`\nDROPPED ${dropped.length}:`);
dropped.forEach((d) => console.error('  ✗ ' + d));

if (kept.length === 0) process.exit(1);

const values = kept.map(([w1, bridge, w2, diff, f1, f2], i) => {
  const id = `sv-v-${String(i + 1).padStart(3, '0')}`;
  const examples = JSON.stringify([{ w1: f1, w2: f2, bridge }]);
  return (
    `(${sqlStr(id)}, 'sv', ${sqlStr(w1)}, ${sqlStr(bridge)}, ${sqlStr(w2)}, ` +
    `${sqlStr(examples)}::jsonb, ${sqlStr(diff)}, 'council-seed', true)`
  );
});

const sql =
  `INSERT INTO public.connections_puzzles\n` +
  `  (id, locale, word1, bridge, word2, examples, difficulty, source, is_active)\n` +
  `VALUES\n  ${values.join(',\n  ')}\nON CONFLICT (id) DO NOTHING;`;
console.log(sql);
