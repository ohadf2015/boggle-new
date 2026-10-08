import { endsDangling } from './danglingEnd';

/** Russian crossword clue gate: non-circular, length-bounded, free of Wiktionary markup. */

const MIN_LEN = 12;
const MAX_LEN = 64;
const STEM_LEN = 4;

const MARKUP = /\[\[|\]\]|\{\{|\}\}|<[^>]*>|''|&\w+;|\||\[\d+\]/;
const DANGLING = /(?:см\.?(?:\s+также)?|—|–|-|,|:)\s*$|^\s*(?:см\.?|то же что)\b/i;

const LABEL_START = /^(только|то\s+же|зоол|орнитол|геол|неисч|неол|рекл|одуш|разг|устар|прост|бран|спец|книжн|мед|бот|хим|физ|мат|перен|уменьш|собир)(?!\p{L})/iu;
const META = /по значению|(?<!\p{L})значени[ея](?!\p{L})|как правило$/iu;

/** Stubs left by Wiktionary tag lists: only one-word comma parts ("Зоол., орнитол") or a lone word. */
function isTagStub(text: string): boolean {
  const parts = text.split(',').map((p) => p.trim()).filter(Boolean);
  return parts.every((p) => !/\s/.test(p));
}

/** Cut inside an abbreviation ("и т", "по значению гл", "Только ед"): last token is 1-2 letters or a known abbr. */
function endsInAbbreviation(text: string): boolean {
  const last = (text.toLowerCase().match(/\p{L}+/gu) ?? []).pop() ?? '';
  return last.length <= 2 || ['гл', 'ед', 'мн', 'неисч'].includes(last);
}

const fold = (s: string) => s.toLowerCase().replace(/ё/g, 'е');

export function evaluateRuClue(answer: string, clue: string): { score: 0 | 1; reason: string } {
  const text = clue.trim();
  if (MARKUP.test(text)) return { score: 0, reason: 'Leftover Wiktionary markup' };
  if (DANGLING.test(text)) return { score: 0, reason: 'Dangling reference or punctuation' };
  if (endsDangling(text, 'ru')) return { score: 0, reason: 'Dangling reference or punctuation' };
  if (LABEL_START.test(text) || META.test(text) || isTagStub(text) || endsInAbbreviation(text)) {
    return { score: 0, reason: 'Grammar-tag or truncated Wiktionary junk' };
  }
  if (text.length < MIN_LEN || text.length > MAX_LEN) return { score: 0, reason: 'Length out of bounds' };

  const ans = fold(answer);
  const stem = ans.slice(0, STEM_LEN);
  const tokens = fold(text).match(/\p{L}+/gu) ?? [];
  if (tokens.some((t) => t.includes(ans) || t.startsWith(stem))) {
    return { score: 0, reason: 'Circular: clue echoes the answer' };
  }
  return { score: 1, reason: 'ok' };
}
