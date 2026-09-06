/**
 * Two vocabulary skills that live outside the original definition / synonym /
 * antonym / context set, and that a middle-school ELA teacher asks for by name:
 *
 *   multiple_meaning — a word that carries two unrelated senses ("bank").
 *                      Prompt shows BOTH senses, the student picks the word.
 *   roots_affixes    — word parts. With a root meaning:  prompt is the part,
 *                      the student picks its meaning. Without one: prompt is
 *                      the word, the student picks the part it carries.
 *
 * Both drafters are pure and take the shared RNG so a question set stays
 * deterministic per seed, exactly like `vocabFocus.ts`.
 *
 * Distractors come from the lesson's OWN words first. Only when that pool is
 * too thin do we top up from the small built-in banks below, and only for
 * English lessons — mixing English fallbacks into a Hebrew or Japanese lesson
 * would hand the student the answer by script alone.
 */
import type { VocabularyWord, WordMorphology } from '@/lib/supabase/education/types';

/** A word needs this many distinct senses before it can drill multiple meanings. */
export const MULTI_MEANING_MIN_SENSES = 2;

/** Senses shown per multiple-meaning question. */
export const SENSES_PER_PROMPT = 2;

export type MorphemeKind = 'root' | 'prefix' | 'suffix';
export const MORPHEME_KINDS: readonly MorphemeKind[] = ['root', 'prefix', 'suffix'];

/** English-only fallbacks. Never used for another lesson language. */
export const BANK_LANGUAGE = 'en';

/** Common English words that carry more than one sense. */
export const MULTI_MEANING_BANK: readonly string[] = [
  'bark', 'bat', 'left', 'light', 'match', 'pitch',
  'ring', 'spring', 'tie', 'trunk', 'wave', 'well',
];

/** Plain-language meanings of common English roots. */
export const ROOT_MEANING_BANK: readonly string[] = [
  'water', 'life', 'sound', 'carry', 'write', 'see',
  'earth', 'far', 'time', 'light', 'people', 'hand',
];

/** Common English prefixes and suffixes, already hyphen-marked. */
export const AFFIX_BANK: readonly string[] = [
  'pre-', 're-', 'un-', 'dis-', 'mis-', 'sub-',
  '-ful', '-less', '-ness', '-able', '-ment', '-tion',
];

const clean = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

/** Unique by lowercase, first spelling wins. */
function uniqueCi(items: string[]): string[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = item.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** The word's distinct senses, blanks and duplicates removed. */
export function cleanMeanings(word: VocabularyWord): string[] {
  if (!Array.isArray(word.meanings)) return [];
  return uniqueCi(word.meanings.map(clean).filter((s) => s.length > 0));
}

/** The word's word parts, blanks removed. Returns null when nothing is usable. */
export function cleanMorphology(word: VocabularyWord): WordMorphology | null {
  const source = word.morphology;
  if (!source || typeof source !== 'object') return null;
  const out: WordMorphology = {};
  for (const kind of MORPHEME_KINDS) {
    const value = stripHyphens(clean(source[kind]));
    if (value) out[kind] = value;
  }
  const rootMeaning = clean(source.rootMeaning);
  if (rootMeaning && out.root) out.rootMeaning = rootMeaning;
  return MORPHEME_KINDS.some((kind) => out[kind]) ? out : null;
}

/** `un-` → `un`, `-ful` → `ful`. Teachers type the hyphen about half the time. */
export function stripHyphens(value: string): string {
  return value.replace(/^[-–—]+|[-–—]+$/g, '').trim();
}

/** Show where the part attaches: `un-`, `-ful`, or a bare root. */
export function formatMorpheme(kind: MorphemeKind, value: string): string {
  const bare = stripHyphens(clean(value));
  if (!bare) return '';
  if (kind === 'prefix') return `${bare}-`;
  if (kind === 'suffix') return `-${bare}`;
  return bare;
}

export function hasMultipleMeanings(word: VocabularyWord): boolean {
  return cleanMeanings(word).length >= MULTI_MEANING_MIN_SENSES;
}

export function hasMorphology(word: VocabularyWord): boolean {
  return cleanMorphology(word) !== null;
}

/** The morpheme a roots/affixes question is built around: root first, then prefix, then suffix. */
export function primaryMorpheme(word: VocabularyWord): { kind: MorphemeKind; value: string } | null {
  const morphology = cleanMorphology(word);
  if (!morphology) return null;
  for (const kind of MORPHEME_KINDS) {
    const value = morphology[kind];
    if (value) return { kind, value };
  }
  return null;
}

/** Every formatted morpheme a word carries — the distractor supply for other words. */
export function allMorphemes(word: VocabularyWord): string[] {
  const morphology = cleanMorphology(word);
  if (!morphology) return [];
  return MORPHEME_KINDS.map((kind) => formatMorpheme(kind, morphology[kind] ?? '')).filter((s) => s.length > 0);
}

/**
 * A question draft. `pool` is the lesson's own material and is always spent
 * first; `fallbackPool` only tops up what the lesson could not supply.
 */
export interface SkillDraft {
  prompt: string;
  answer: string;
  pool: string[];
  fallbackPool: string[];
}

export interface SkillDraftOptions {
  /** Lesson language. The built-in banks apply to English only. */
  language?: string;
}

const bankFor = (bank: readonly string[], options: SkillDraftOptions): string[] =>
  options.language === BANK_LANGUAGE ? [...bank] : [];

/**
 * "Which word can mean BOTH of these?" — prompt carries two of the word's
 * senses, choices are lesson words.
 */
export function draftMultipleMeaning(
  target: VocabularyWord,
  others: VocabularyWord[],
  rng: () => number,
  options: SkillDraftOptions = {}
): SkillDraft | null {
  const senses = cleanMeanings(target);
  if (senses.length < MULTI_MEANING_MIN_SENSES) return null;
  const answer = clean(target.word);
  if (!answer) return null;

  // Pick which senses to show, deterministically, when the teacher gave more than two.
  const offset = senses.length > SENSES_PER_PROMPT ? Math.floor(rng() * senses.length) : 0;
  const shown = Array.from({ length: SENSES_PER_PROMPT }, (_, i) => senses[(offset + i) % senses.length]);

  const exclude = new Set([answer.toLowerCase()]);
  return {
    prompt: shown.join(' • '),
    answer,
    pool: uniqueCi(others.map((w) => clean(w.word)).filter((s) => s && !exclude.has(s.toLowerCase()))),
    fallbackPool: bankFor(MULTI_MEANING_BANK, options).filter((s) => !exclude.has(s.toLowerCase())),
  };
}

/**
 * Roots / affixes. Two shapes, chosen by what the teacher supplied:
 *   root + rootMeaning → prompt `aqua (aquarium)`, choices are meanings
 *   any morpheme       → prompt `unhappy`,         choices are word parts
 */
export function draftRootsAffixes(
  target: VocabularyWord,
  others: VocabularyWord[],
  _rng: () => number,
  options: SkillDraftOptions = {}
): SkillDraft | null {
  const morphology = cleanMorphology(target);
  const morpheme = primaryMorpheme(target);
  if (!morphology || !morpheme) return null;
  const word = clean(target.word);
  if (!word) return null;

  if (morphology.root && morphology.rootMeaning) {
    const answer = morphology.rootMeaning;
    const exclude = new Set([answer.toLowerCase()]);
    const lessonMeanings = others
      .map((w) => cleanMorphology(w)?.rootMeaning ?? '')
      .filter((s) => s.length > 0 && !exclude.has(s.toLowerCase()));
    return {
      prompt: `${formatMorpheme('root', morphology.root)} (${word})`,
      answer,
      pool: uniqueCi(lessonMeanings),
      fallbackPool: bankFor(ROOT_MEANING_BANK, options).filter((s) => !exclude.has(s.toLowerCase())),
    };
  }

  const answer = formatMorpheme(morpheme.kind, morpheme.value);
  const exclude = new Set([answer.toLowerCase()]);
  const lessonMorphemes = others.flatMap(allMorphemes).filter((s) => !exclude.has(s.toLowerCase()));
  return {
    prompt: word,
    answer,
    pool: uniqueCi(lessonMorphemes),
    fallbackPool: bankFor(AFFIX_BANK, options).filter((s) => !exclude.has(s.toLowerCase())),
  };
}
