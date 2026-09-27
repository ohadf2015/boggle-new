/**
 * Vocabulary focus practice — pure question builder.
 *
 * A teacher enters per-word data (definition, synonyms, antonyms, an example
 * sentence with `___` for the blank) and can then target ONE skill:
 *
 *   definition       — prompt: definition,        choices: lesson words
 *   synonym          — prompt: word,              choices: 1 true synonym + 3 synonyms of other words
 *   antonym          — prompt: word,              choices: 1 true antonym + 3 antonyms of other words
 *   context          — prompt: sentence w/ blank, choices: the word + 3 other lesson words
 *   multiple_meaning — prompt: two senses,        choices: lesson words
 *   roots_affixes    — prompt: word part or word, choices: meanings or word parts
 *
 * The last two are drafted in `vocabFocusSkills.ts`; everything else lives here.
 *
 * Everything here is deterministic for a given seed so a question set can be
 * rebuilt (restart, tests) without storing it.
 */
import type { VocabularyWord } from '@/lib/supabase/education/types';
import {
  draftMultipleMeaning,
  draftRootsAffixes,
  hasMorphology,
  hasMultipleMeanings,
  type SkillDraft,
} from './vocabFocusSkills';

export type VocabFocus =
  | 'definition'
  | 'synonym'
  | 'antonym'
  | 'context'
  | 'multiple_meaning'
  | 'roots_affixes';
/** What a teacher can pin on an assignment. `any` = student picks. */
export type PracticeFocusSetting = VocabFocus | 'any';

export const VOCAB_FOCUSES: readonly VocabFocus[] = [
  'definition',
  'synonym',
  'antonym',
  'context',
  'multiple_meaning',
  'roots_affixes',
];
export const PRACTICE_FOCUS_SETTINGS: readonly PracticeFocusSetting[] = ['any', ...VOCAB_FOCUSES];

/**
 * A focus needs this many usable words before it can build 4-choice questions.
 * The original four draw every distractor from other lesson words, so they need
 * a full set. The two newer skills can top up from a built-in bank, so one or
 * two well-filled words are already worth practising.
 */
export const MIN_WORDS_PER_FOCUS = 4;
export const MIN_WORDS_PER_SKILL_FOCUS = 2;

const FOCUS_MIN_WORDS: Record<VocabFocus, number> = {
  definition: MIN_WORDS_PER_FOCUS,
  synonym: MIN_WORDS_PER_FOCUS,
  antonym: MIN_WORDS_PER_FOCUS,
  context: MIN_WORDS_PER_FOCUS,
  multiple_meaning: MIN_WORDS_PER_SKILL_FOCUS,
  roots_affixes: MIN_WORDS_PER_SKILL_FOCUS,
};

export function minWordsForFocus(focus: VocabFocus): number {
  return FOCUS_MIN_WORDS[focus] ?? MIN_WORDS_PER_FOCUS;
}
export const CHOICES_PER_QUESTION = 4;
export const DEFAULT_QUESTION_COUNT = 10;
export const BLANK = '___';

export interface FocusQuestion {
  focus: VocabFocus;
  /** The lesson word this question is about. */
  word: string;
  prompt: string;
  choices: string[];
  answerIndex: number;
  /** `choices[answerIndex]` — convenience for feedback. */
  answer: string;
  /** Definition of `word`, shown in the feedback strip when available. */
  definition?: string;
}

export interface BuildOptions {
  count?: number;
  seed: number | string;
  /**
   * Lesson language. Only English lessons top distractors up from the built-in
   * banks — an English fallback in a Hebrew lesson gives the answer away.
   */
  language?: string;
}

export interface LessonWordStats {
  total: number;
  withDefinitions: number;
  withSynonyms: number;
  withAntonyms: number;
  withExamples: number;
  /** Words carrying 2+ distinct senses (multiple-meaning practice). */
  withMeanings: number;
  /** Words carrying at least one word part (roots/affixes practice). */
  withMorphology: number;
}

// ---------------------------------------------------------------------------
// Data helpers
// ---------------------------------------------------------------------------

const clean = (s: unknown): string => (typeof s === 'string' ? s.trim() : '');
const cleanList = (list: unknown): string[] =>
  Array.isArray(list) ? list.map(clean).filter((s) => s.length > 0) : [];

export function isVocabFocus(value: unknown): value is VocabFocus {
  return typeof value === 'string' && (VOCAB_FOCUSES as readonly string[]).includes(value);
}

export function isPracticeFocusSetting(value: unknown): value is PracticeFocusSetting {
  return value === 'any' || isVocabFocus(value);
}

/** Whole-word, case-insensitive match of `word` inside `sentence`. */
function wordPattern(word: string): RegExp {
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // \b is Latin-only; fall back to lookarounds on whitespace/punctuation so
  // Hebrew/Japanese words still match.
  return new RegExp(`(^|[\\s"'(.,;:!?¿¡«»„“”‘’-])(${escaped})(?=$|[\\s"').,;:!?«»„“”‘’-])`, 'iu');
}

/**
 * Normalise an example sentence to contain the blank. Returns null when the
 * sentence neither has a `___` nor mentions the word.
 */
export function withBlank(example: string | undefined, word: string): string | null {
  const sentence = clean(example);
  if (!sentence) return null;
  if (sentence.includes(BLANK)) return sentence;
  const trimmedWord = clean(word);
  if (!trimmedWord) return null;
  const pattern = wordPattern(trimmedWord);
  if (!pattern.test(sentence)) return null;
  return sentence.replace(pattern, `$1${BLANK}`);
}

export function usableForFocus(word: VocabularyWord, focus: VocabFocus): boolean {
  if (!clean(word.word)) return false;
  switch (focus) {
    case 'definition':
      return clean(word.definition).length > 0;
    case 'synonym':
      return cleanList(word.synonyms).length > 0;
    case 'antonym':
      return cleanList(word.antonyms).length > 0;
    case 'context':
      return withBlank(word.example, word.word) !== null;
    case 'multiple_meaning':
      return hasMultipleMeanings(word);
    case 'roots_affixes':
      return hasMorphology(word);
    default:
      return false;
  }
}

export function usableWords(words: VocabularyWord[], focus: VocabFocus): VocabularyWord[] {
  return words.filter((w) => usableForFocus(w, focus));
}

/** Fixed seed so readiness and its badge never disagree with each other. */
export const READINESS_SEED = 'readiness';

export interface FocusScanOptions {
  language?: string;
  seed?: number | string;
  count?: number;
}

/**
 * How many questions each focus can actually produce, straight from the
 * builder. Readiness and the count a student sees must never be two
 * independent calculations — that is how they drift apart.
 */
export function focusQuestionCounts(
  words: VocabularyWord[],
  options: FocusScanOptions = {}
): Record<VocabFocus, number> {
  const seed = options.seed ?? READINESS_SEED;
  const counts = {} as Record<VocabFocus, number>;
  for (const focus of VOCAB_FOCUSES) {
    counts[focus] = buildFocusQuestions(words, focus, {
      seed,
      language: options.language,
      count: options.count,
    }).length;
  }
  return counts;
}

/** Focuses the lesson can actually drive — i.e. that produce at least one question. */
export function availableFocuses(words: VocabularyWord[], options: FocusScanOptions = {}): VocabFocus[] {
  const counts = focusQuestionCounts(words, options);
  return VOCAB_FOCUSES.filter((focus) => counts[focus] > 0);
}

export function lessonWordStats(words: VocabularyWord[]): LessonWordStats {
  return {
    total: words.length,
    withDefinitions: words.filter((w) => clean(w.definition).length > 0).length,
    withSynonyms: words.filter((w) => cleanList(w.synonyms).length > 0).length,
    withAntonyms: words.filter((w) => cleanList(w.antonyms).length > 0).length,
    withExamples: words.filter((w) => clean(w.example).length > 0).length,
    withMeanings: words.filter(hasMultipleMeanings).length,
    withMorphology: words.filter(hasMorphology).length,
  };
}

// ---------------------------------------------------------------------------
// Seeded randomness (mulberry32) — deterministic per seed
// ---------------------------------------------------------------------------

function hashSeed(seed: number | string): number {
  if (typeof seed === 'number') return seed >>> 0;
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function createRng(seed: number | string): () => number {
  let a = hashSeed(seed) || 0x9e3779b9;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(items: readonly T[], rng: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function pick<T>(items: readonly T[], rng: () => number): T {
  return items[Math.floor(rng() * items.length)];
}

/** Unique by lowercase, preserving first occurrence. */
function uniqueCi(items: string[]): string[] {
  const seen = new Set<string>();
  return items.filter((s) => {
    const key = s.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ---------------------------------------------------------------------------
// Question building
// ---------------------------------------------------------------------------

type Draft = SkillDraft;

const lessonOnly = (prompt: string, answer: string, pool: string[]): Draft => ({
  prompt,
  answer,
  pool,
  fallbackPool: [],
});

function draftFor(
  target: VocabularyWord,
  focus: VocabFocus,
  all: VocabularyWord[],
  rng: () => number,
  options: BuildOptions
): Draft | null {
  const others = all.filter((w) => w !== target && clean(w.word).length > 0);
  const targetWord = clean(target.word);
  const exclude = new Set<string>([targetWord.toLowerCase()]);

  switch (focus) {
    case 'definition': {
      const definition = clean(target.definition);
      if (!definition) return null;
      return lessonOnly(definition, targetWord, uniqueCi(others.map((w) => clean(w.word))));
    }
    case 'context': {
      const prompt = withBlank(target.example, target.word);
      if (!prompt) return null;
      return lessonOnly(prompt, targetWord, uniqueCi(others.map((w) => clean(w.word))));
    }
    case 'synonym':
    case 'antonym': {
      const key = focus === 'synonym' ? 'synonyms' : 'antonyms';
      const own = cleanList(target[key]);
      if (own.length === 0) return null;
      own.forEach((s) => exclude.add(s.toLowerCase()));
      const answer = pick(own, rng);
      const pool = uniqueCi(others.flatMap((w) => cleanList(w[key]))).filter((s) => !exclude.has(s.toLowerCase()));
      return lessonOnly(targetWord, answer, pool);
    }
    case 'multiple_meaning':
      return draftMultipleMeaning(target, others, rng, { language: options.language });
    case 'roots_affixes':
      return draftRootsAffixes(target, others, rng, { language: options.language });
    default:
      return null;
  }
}

/**
 * Fill the choice slots: the lesson's own material first, the built-in bank
 * only for what is left over.
 */
function chooseDistractors(draft: Draft, rng: () => number): string[] | null {
  const needed = CHOICES_PER_QUESTION - 1;
  const taken = new Set<string>([draft.answer.toLowerCase()]);
  const out: string[] = [];
  for (const candidate of [...shuffle(draft.pool, rng), ...shuffle(draft.fallbackPool, rng)]) {
    const key = candidate.toLowerCase();
    if (!candidate || taken.has(key)) continue;
    taken.add(key);
    out.push(candidate);
    if (out.length === needed) return out;
  }
  return null;
}

/**
 * Build a deterministic set of 4-choice questions for one focus.
 * Returns [] when the lesson does not have enough usable words.
 */
export function buildFocusQuestions(
  words: VocabularyWord[],
  focus: VocabFocus,
  options: BuildOptions
): FocusQuestion[] {
  const usable = usableWords(words, focus);
  if (usable.length < minWordsForFocus(focus)) return [];

  const rng = createRng(`${focus}:${String(options.seed)}`);
  const count = Math.min(options.count ?? DEFAULT_QUESTION_COUNT, usable.length);
  // Distractors may come from any lesson word, not only the ones usable for
  // this focus (a word with no synonyms is still a fine "wrong word" choice).
  const order = shuffle(usable, rng);
  const questions: FocusQuestion[] = [];

  for (const target of order) {
    if (questions.length >= count) break;
    const draft = draftFor(target, focus, words, rng, options);
    if (!draft) continue;
    const distractors = chooseDistractors(draft, rng);
    if (!distractors) continue;
    const choices = shuffle([draft.answer, ...distractors], rng);
    const definition = clean(target.definition) || undefined;
    questions.push({
      focus,
      word: clean(target.word),
      prompt: draft.prompt,
      choices,
      answerIndex: choices.indexOf(draft.answer),
      answer: draft.answer,
      definition,
    });
  }

  return questions;
}

// ---------------------------------------------------------------------------
// URL / assignment plumbing
// ---------------------------------------------------------------------------

export function parseFocusParam(value: string | null | undefined): VocabFocus | null {
  return isVocabFocus(value) ? value : null;
}

/**
 * Read `practice_focus` off any assignment-shaped row without depending on
 * the row's TypeScript type (lesson_assignments and teacher_assignments both
 * carry the column). `any`/missing → null.
 */
export function readAssignmentFocus(assignment: unknown): VocabFocus | null {
  if (!assignment || typeof assignment !== 'object') return null;
  return parseFocusParam((assignment as { practice_focus?: unknown }).practice_focus as string | undefined);
}

export function focusPracticeHref(locale: string, lessonId: string, focus: VocabFocus | null): string {
  const base = `/${locale}/student/lessons/${lessonId}?mode=vocab_focus`;
  return focus ? `${base}&focus=${focus}` : base;
}
