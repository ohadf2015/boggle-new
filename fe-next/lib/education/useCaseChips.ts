/**
 * The "why do you want this" example chips offered by the access-request form.
 *
 * AccessRequestForm renders `education.access.use_case_ex1..3` as one-tap chips that
 * fill the textarea. So a use_case reading "Weekly vocabulary battles with my class"
 * may be a teacher's own words — or it may be LexiClash's marketing copy, tapped once
 * and submitted unchanged.
 *
 * On 2026-08-21 that mattered: 10 of 29 real requests were verbatim chip text (ex1 ×3,
 * ex2 ×2, ex3 ×2, plus their Spanish translations). Aggregating that corpus without
 * separating the two would have ranked our own landing-page copy as the top reason
 * teachers want the product, and any SEO/FAQ built on it would have been optimising
 * for what we already say.
 *
 * Mirrors translations/<locale>.js `education.access.use_case_ex1..3` — kept as a flat
 * list rather than importing six 11k-line translation modules into an admin route.
 * useCaseChips.test.ts asserts it still matches the translations, so drift fails loudly.
 */

export const USE_CASE_CHIP_KEYS = ['use_case_ex1', 'use_case_ex2', 'use_case_ex3'] as const;

export const USE_CASE_CHIPS: string[] = [
  // en
  'Weekly vocabulary battles with my class',
  'Homework practice my students actually enjoy',
  'Live team games to review spelling',
  // es
  'Batallas de vocabulario semanales con mi clase',
  'Tareas que mis estudiantes disfrutan de verdad',
  'Juegos en equipo en vivo para repasar ortografía',
  // he
  'קרבות אוצר מילים שבועיים עם הכיתה',
  'תרגול בית שהתלמידים באמת נהנים ממנו',
  'משחקים קבוצתיים חיים לתרגול איות',
  // ja
  'クラスで毎週の単語バトル',
  '生徒が楽しめる宿題の練習',
  'スペル復習のライブチーム対戦',
  // ru
  'Еженедельные словарные баттлы с классом',
  'Домашние задания, которые нравятся ученикам',
  'Живые командные игры для повторения орфографии',
  // sv
  'Veckovisa ordförrådsmatcher med klassen',
  'Läxor som eleverna faktiskt gillar',
  'Live-lagspel för att öva stavning',
];

/**
 * Collapse whitespace, drop case and trailing punctuation so "For puzzles, quizzes,
 * live games " and "for puzzles, quizzes, live games" count as the same answer. Kept
 * deliberately dumb: it groups identical answers, it does not cluster similar ones.
 */
export function normalizeUseCase(text: string | null | undefined): string {
  return (text ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[.!]+$/, '')
    .toLocaleLowerCase();
}

const CHIP_SET = new Set(USE_CASE_CHIPS.map(normalizeUseCase));

export function isChipEcho(text: string | null | undefined): boolean {
  const n = normalizeUseCase(text);
  return n.length > 0 && CHIP_SET.has(n);
}
