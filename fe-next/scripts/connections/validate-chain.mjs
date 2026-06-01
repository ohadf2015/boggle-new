// Strict validator for an en bridge chain {word1, bridge, word2}.
// A chain is VALID iff:
//   - word1, bridge, word2 are all real lowercase dictionary words (kills
//     fragments like "app"/"ged" and proper nouns absent from web2)
//   - word1+bridge AND bridge+word2 are BOTH real dictionary words
//   - both compounds clear a Datamuse frequency floor (recognizable)
// Reused by both the generator-filter and the council/harvest validators.
import { readFileSync } from 'node:fs';

const DICT = new Set(
  readFileSync('/usr/share/dict/words', 'utf8')
    .split('\n')
    .map((w) => w.trim())
    .filter((w) => /^[a-z]+$/.test(w)), // lowercase-only → excludes Proper Nouns
);
export const inDict = (w) => DICT.has(w.toLowerCase());

// Bound morphemes / affixes that are technically dict entries but make nonsense
// anchors (e.g. "brush"+"ing"). An anchor matching these is rejected.
const AFFIX_BLOCKLIST = new Set([
  'ing', 'ed', 'er', 'ers', 'est', 'ion', 'ions', 'less', 'ness', 'ment', 'ments',
  'able', 'ible', 'ize', 'ise', 'ful', 'ous', 'ive', 'ity', 'ward', 'wards', 'most',
  'ling', 'ding', 'ting', 'ping', 'ging', 'ned', 'ted', 'led', 'ish', 'age', 'ation',
  'ette', 'dom', 'hood', 'ship', 'sion', 'tion', 'ance', 'ence', 'ent', 'ant', 'ary',
]);
export const isAffix = (w) => AFFIX_BLOCKLIST.has(w.toLowerCase());

const _fc = new Map();
export async function wordFreq(w) {
  const k = w.toLowerCase();
  if (_fc.has(k)) return _fc.get(k);
  for (let a = 0; a < 3; a++) {
    try {
      const r = await fetch(`https://api.datamuse.com/words?sp=${encodeURIComponent(k)}&md=f&max=1`);
      const d = await r.json();
      let f = 0;
      if (d.length && d[0].word.toLowerCase() === k) {
        const t = (d[0].tags || []).find((x) => x.startsWith('f:'));
        f = t ? parseFloat(t.slice(2)) : 0;
      }
      _fc.set(k, f);
      return f;
    } catch { await new Promise((s) => setTimeout(s, 250)); }
  }
  _fc.set(k, 0); return 0;
}

const COMPOUND_FREQ_MIN = 0.20;

export async function validateChain({ word1, bridge, word2 }) {
  const w1 = String(word1 || '').toLowerCase();
  const b = String(bridge || '').toLowerCase();
  const w2 = String(word2 || '').toLowerCase();
  const reasons = [];
  if (!/^[a-z]{2,}$/.test(w1) || !/^[a-z]{2,}$/.test(b) || !/^[a-z]{2,}$/.test(w2)) {
    return { ok: false, reasons: ['nonalpha'] };
  }
  if (w1 === w2 || w1 === b || w2 === b) return { ok: false, reasons: ['dup-word'] };
  if (isAffix(w1) || isAffix(w2) || isAffix(b)) return { ok: false, reasons: ['affix-anchor'] };
  // anchors + bridge must be real words
  if (!inDict(w1)) reasons.push(`word1 "${w1}" not a word`);
  if (!inDict(b)) reasons.push(`bridge "${b}" not a word`);
  if (!inDict(w2)) reasons.push(`word2 "${w2}" not a word`);
  // both compounds must be real words
  const left = w1 + b, right = b + w2;
  if (!inDict(left)) reasons.push(`"${left}" not a compound`);
  if (!inDict(right)) reasons.push(`"${right}" not a compound`);
  if (reasons.length) return { ok: false, reasons };
  // anchors must be COMMON words (kills obscure dict fragments: hap, lin, sion, ire)
  const ANCHOR_FREQ_MIN = 1.0;
  const a1 = await wordFreq(w1), a2 = await wordFreq(w2);
  if (Math.min(a1, a2) < ANCHOR_FREQ_MIN) {
    return { ok: false, reasons: [`anchor too rare ${w1}=${a1.toFixed(2)} ${w2}=${a2.toFixed(2)}`] };
  }
  // both compounds must clear a frequency floor (recognizable, not OCR noise)
  const lf = await wordFreq(left), rf = await wordFreq(right);
  if (Math.min(lf, rf) < COMPOUND_FREQ_MIN) {
    return { ok: false, reasons: [`low-freq ${left}=${lf.toFixed(2)} ${right}=${rf.toFixed(2)}`] };
  }
  return { ok: true, score: Math.min(lf, rf), lf, rf };
}
