// Japanese Wiktionary definition → crossword clue. definitionToClue hard-cuts CJK mid-word
// (no spaces to break on), so ja keeps only a whole first sentence that is short enough.
import { foldJaKana } from '../answer';
import { endsDangling } from './danglingEnd';
import { rejectNounClueJa } from './nounClueFilter';

const JA_CLUE_MIN = 2;
const JA_CLUE_MAX = 30;

const KANJI = /\p{Script=Han}/u;

// A one-kanji spelling inside a compound (水 in 水素) is a different word; standing alone it is the answer.
function usesForm(clue: string, form: string): boolean {
  if (!form) return false;
  if (form.length > 1) return clue.includes(form);
  for (let i = clue.indexOf(form); i !== -1; i = clue.indexOf(form, i + 1)) {
    if (!KANJI.test(clue[i - 1] ?? '') && !KANJI.test(clue[i + 1] ?? '')) return true;
  }
  return false;
}

export function jaClueFromDefinition(def: string | null | undefined, answer: string, forms: string[]): string | null {
  if (!def) return null;
  // Check the raw sentence first: "愛する (あいする)" only gives itself away in its reading.
  if (foldJaKana(def.split('。')[0]).includes(foldJaKana(answer))) return null;
  const s = def
    .replace(/（[^）]*）|\([^)]*\)/g, '')
    .split('。')[0]
    .replace(/\s+/g, '')
    .replace(/[、，,]+$/, '');
  if (s.length < JA_CLUE_MIN || s.length > JA_CLUE_MAX) return null;
  if (rejectNounClueJa(s) || endsDangling(s, 'ja')) return null;
  if (foldJaKana(s).includes(foldJaKana(answer))) return null;
  if (forms.some((f) => usesForm(s, f))) return null;
  return s;
}
