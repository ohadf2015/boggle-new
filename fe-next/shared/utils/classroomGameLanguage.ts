import type { Language } from '@/shared/types';

/**
 * The ONE language a classroom round is dealt and validated in.
 *
 * The teacher's UI locale is deliberately not an input: a Hebrew-speaking
 * teacher running an English list must get an English board, and an English UI
 * on a Hebrew class must not validate Hebrew words against English.
 */

const CLASSROOM_LANGUAGES: readonly Language[] = ['en', 'he', 'sv', 'ja', 'es', 'ru'];

type Script = 'latin' | 'hebrew' | 'cyrillic' | 'kana';

const SCRIPT_OF: Record<string, Script> = { en: 'latin', sv: 'latin', es: 'latin', he: 'hebrew', ru: 'cyrillic', ja: 'kana' };
const DEFAULT_FOR_SCRIPT: Record<Script, Language> = { latin: 'en', hebrew: 'he', cyrillic: 'ru', kana: 'ja' };

const SCRIPT_TEST: Record<Script, RegExp> = {
  hebrew: /[֐-׿]/,
  cyrillic: /[Ѐ-ӿ]/,
  kana: /[぀-ヿ一-鿿]/,
  latin: /[A-Za-zÀ-ɏ]/,
};

function asLanguage(value: unknown): Language | null {
  return typeof value === 'string' && (CLASSROOM_LANGUAGES as readonly string[]).includes(value) ? (value as Language) : null;
}

function scriptOfWord(word: string): Script | null {
  for (const script of ['hebrew', 'cyrillic', 'kana', 'latin'] as const) {
    if (SCRIPT_TEST[script].test(word)) return script;
  }
  return null;
}

function dominantScript(words: readonly string[]): Script | null {
  const counts = new Map<Script, number>();
  for (const word of words) {
    const script = scriptOfWord(word);
    if (script) counts.set(script, (counts.get(script) ?? 0) + 1);
  }
  let best: Script | null = null;
  for (const [script, n] of counts) if (!best || n > (counts.get(best) ?? 0)) best = script;
  return best;
}

/** True when `word` is written in the alphabet a `language` board deals. */
export function wordsMatchLanguage(word: string, language: Language): boolean {
  return scriptOfWord(word) === SCRIPT_OF[language];
}

/** Lesson words a `language` board can carry: a word in another alphabet would plant foreign letters no one can play. */
export function embeddableLessonWords(words: readonly string[], language: Language): string[] {
  return words.filter((w) => wordsMatchLanguage(w, language)).map((w) => w.toUpperCase());
}

export interface ClassroomGameLanguageInput {
  /** Language of the selected word list(s). */
  lessonLanguage?: string | null;
  /** `classrooms.language`. */
  classroomLanguage?: string | null;
  vocabularyWords?: readonly string[];
}

export function resolveClassroomGameLanguage({ lessonLanguage, classroomLanguage, vocabularyWords = [] }: ClassroomGameLanguageInput): Language {
  const lesson = asLanguage(lessonLanguage);
  const classroom = asLanguage(classroomLanguage);
  const declared = lesson ?? classroom ?? 'en';
  const script = dominantScript(vocabularyWords);
  if (!script || SCRIPT_OF[declared] === script) return declared;
  // The words must be on the board and accepted, so their alphabet outranks a mislabeled list.
  if (classroom && SCRIPT_OF[classroom] === script) return classroom;
  return DEFAULT_FOR_SCRIPT[script];
}
