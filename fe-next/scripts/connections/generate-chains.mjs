// Generate high-quality en bridge puzzles, valid BY CONSTRUCTION.
// For each productive bridge B, Datamuse wildcard search yields real compounds:
//   sp=*B  → words ending in B   → A = W minus B  (puzzle word1)
//   sp=B*  → words starting w/ B  → C = W minus B  (puzzle word2)
// A chain A+B+C is valid iff "A+B" and "B+C" are both real frequent words and
// A, C are themselves real words. Output ranked by the weaker side's frequency.
import { writeFileSync } from 'node:fs';

const BRIDGES = [
  'ball','bird','board','book','box','cake','cap','card','case','cast','chair','corn','cup',
  'dog','door','down','dream','drop','ear','eye','fall','fire','fish','flow','foot','game',
  'gate','ground','hair','hand','head','heart','hill','hold','hole','home','horse','house',
  'ice','key','land','life','light','line','lock','man','mark','milk','mill','mind','moon',
  'mouth','net','note','nut','out','pack','paper','park','pen','pin','pipe','place','play',
  'pot','rain','ring','road','rock','room','rope','sand','sea','set','shell','ship','shoe',
  'shop','side','snow','song','space','spot','star','stone','stop','store','storm','sun',
  'table','tail','tea','time','tooth','top','town','tree','wall','watch','water','wave','way',
  'web','wheel','wind','wing','wood','work','world','yard','back','bath','bed','bell','berry',
  'blood','brain','bread','brush','candle','cat','clock','cloud','coat','cross','day','farm',
  'flower','grass','green','gun','jam','lamp','leaf','match','milk','news','nail','oat','pea',
];

const FREQ_MIN_COMPOUND = 0.30; // per-million; keep recognizable compounds
const FREQ_MIN_PART = 0.50;     // A and C must be real, reasonably common words
const MAX_PER_BRIDGE = 4;

const cache = new Map();
async function dm(params) {
  const url = `https://api.datamuse.com/words?${params}`;
  if (cache.has(url)) return cache.get(url);
  for (let a = 0; a < 3; a++) {
    try {
      const r = await fetch(url);
      const d = await r.json();
      cache.set(url, d);
      return d;
    } catch { await new Promise((s) => setTimeout(s, 300)); }
  }
  return [];
}
const fOf = (item) => {
  const t = (item.tags || []).find((x) => x.startsWith('f:'));
  return t ? parseFloat(t.slice(2)) : 0;
};
async function freqOfWord(w) {
  const d = await dm(`sp=${encodeURIComponent(w)}&md=f&max=1`);
  if (d.length && d[0].word.toLowerCase() === w.toLowerCase()) return fOf(d[0]);
  return 0;
}

const isAlpha = (s) => /^[a-z]+$/.test(s);
const puzzles = [];
const seenChain = new Set();

for (const B of BRIDGES) {
  const ending = await dm(`sp=*${B}&md=f&max=120`);
  const starting = await dm(`sp=${B}*&md=f&max=120`);

  // A+B compounds: word W ends in B, prefix A = W without B is a real word.
  const lefts = [];
  for (const it of ending) {
    const W = it.word.toLowerCase();
    if (!isAlpha(W) || !W.endsWith(B) || W === B) continue;
    const A = W.slice(0, W.length - B.length);
    if (A.length < 3 || !isAlpha(A)) continue;
    if (fOf(it) < FREQ_MIN_COMPOUND) continue;
    lefts.push({ A, W, f: fOf(it) });
  }
  // B+C compounds: word W starts with B, suffix C = W without B is a real word.
  const rights = [];
  for (const it of starting) {
    const W = it.word.toLowerCase();
    if (!isAlpha(W) || !W.startsWith(B) || W === B) continue;
    const C = W.slice(B.length);
    if (C.length < 3 || !isAlpha(C)) continue;
    if (fOf(it) < FREQ_MIN_COMPOUND) continue;
    rights.push({ C, W, f: fOf(it) });
  }
  if (!lefts.length || !rights.length) continue;

  // verify A and C are real standalone words (freq-gated), cache results
  const partFreq = new Map();
  for (const p of [...lefts.map((l) => l.A), ...rights.map((r) => r.C)]) {
    if (!partFreq.has(p)) partFreq.set(p, await freqOfWord(p));
  }
  const goodL = lefts.filter((l) => (partFreq.get(l.A) ?? 0) >= FREQ_MIN_PART);
  const goodR = rights.filter((r) => (partFreq.get(r.C) ?? 0) >= FREQ_MIN_PART);

  const combos = [];
  for (const l of goodL) for (const r of goodR) {
    if (l.A === r.C || l.A === B || r.C === B) continue;
    combos.push({ word1: l.A, bridge: B, word2: r.C, score: Math.min(l.f, r.f), lf: l.f, rf: r.f, lw: l.W, rw: r.W });
  }
  combos.sort((a, b) => b.score - a.score);
  // diversify: distinct word1 and word2 per bridge
  const usedA = new Set(), usedC = new Set();
  let taken = 0;
  for (const c of combos) {
    if (taken >= MAX_PER_BRIDGE) break;
    if (usedA.has(c.word1) || usedC.has(c.word2)) continue;
    const chainKey = `${c.word1}-${c.bridge}-${c.word2}`;
    if (seenChain.has(chainKey)) continue;
    seenChain.add(chainKey); usedA.add(c.word1); usedC.add(c.word2);
    puzzles.push(c);
    taken++;
  }
  process.stderr.write(`${B}:${taken} `);
}

// difficulty by weaker-side frequency (common→easy)
for (const p of puzzles) {
  p.difficulty = p.score >= 2.0 ? 'easy' : p.score >= 0.7 ? 'medium' : 'hard';
}
puzzles.sort((a, b) => b.score - a.score);
console.log(`\n\ngenerated ${puzzles.length} validated chains`);
const byD = {}; for (const p of puzzles) byD[p.difficulty] = (byD[p.difficulty] || 0) + 1;
console.log('by difficulty', byD);
console.log('\ntop 30:');
for (const p of puzzles.slice(0, 30)) {
  console.log(`  ${p.word1}+${p.bridge}+${p.word2}  (${p.lw} ${p.lf.toFixed(2)} / ${p.rw} ${p.rf.toFixed(2)})`);
}
writeFileSync('/tmp/generated-en-chains.json', JSON.stringify(puzzles, null, 2));
