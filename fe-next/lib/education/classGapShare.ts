/**
 * Class missed-word gap share — the parent/Slack companion to ClassroomResultsCard.
 *
 * The reteach round (#896) is for the room. This is the thing a teacher pastes into
 * Slack or a parent chat: a URL whose OG unfurl shows today's class coverage and the
 * words nobody found. CLASS-level only — student names never leave the results screen.
 */

export const CLASS_GAP_ORIGIN = 'https://www.lexiclash.live';

export const MAX_MISSED_WORDS = 12;
export const MAX_WORD_LENGTH = 32;
export const MAX_LESSON_LENGTH = 80;
export const MAX_TEACHER_LENGTH = 40;


export type ClassGapLocale = 'en' | 'he' | 'sv' | 'ja' | 'es' | 'ru';

const LOCALES = new Set<ClassGapLocale>(['en', 'he', 'sv', 'ja', 'es', 'ru']);

export interface ClassGapShareInput {
  locale: string;
  lessonNames: string[];
  teacherName: string;
  found: number;
  total: number;
  missedWords: string[];
}

export interface ClassGapSharePayload {
  locale: ClassGapLocale;
  lesson: string;
  teacher: string;
  found: number;
  total: number;
  missedWords: string[];
}

export function normalizeLocale(locale: string | undefined | null): ClassGapLocale {
  const l = (locale || 'en').toLowerCase().split('-')[0] as ClassGapLocale;
  return LOCALES.has(l) ? l : 'en';
}

function sanitizeText(value: string, max: number): string {
  return value
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

function sanitizeWord(value: string): string {
  return sanitizeText(value, MAX_WORD_LENGTH);
}

function clampInt(value: unknown): number {
  const n = typeof value === 'number' ? value : parseInt(String(value ?? '0'), 10);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.min(Math.floor(n), 9999);
}

export function toClassGapPayload(input: ClassGapShareInput): ClassGapSharePayload {
  return {
    locale: normalizeLocale(input.locale),
    lesson: sanitizeText((input.lessonNames || []).filter(Boolean).join(', '), MAX_LESSON_LENGTH),
    teacher: sanitizeText(input.teacherName || '', MAX_TEACHER_LENGTH),
    found: clampInt(input.found),
    total: clampInt(input.total),
    missedWords: (input.missedWords || [])
      .map(sanitizeWord)
      .filter(Boolean)
      .slice(0, MAX_MISSED_WORDS),
  };
}

function applyParams(url: URL, payload: ClassGapSharePayload): void {
  if (payload.lesson) url.searchParams.set('lesson', payload.lesson);
  if (payload.teacher) url.searchParams.set('teacher', payload.teacher);
  url.searchParams.set('found', String(payload.found));
  url.searchParams.set('total', String(payload.total));
  if (payload.missedWords.length > 0) {
    url.searchParams.set('missed', payload.missedWords.join(','));
  }
  url.searchParams.set('lang', payload.locale);
}

export function buildClassGapShareUrl(input: ClassGapShareInput): string {
  const payload = toClassGapPayload(input);
  const url = new URL(`/${payload.locale}/education/class-gap`, CLASS_GAP_ORIGIN);
  applyParams(url, payload);
  return url.toString();
}

export function buildClassGapOgImageUrl(input: ClassGapShareInput): string {
  const payload = toClassGapPayload(input);
  const url = new URL('/api/og/class-gap', CLASS_GAP_ORIGIN);
  applyParams(url, payload);
  return url.toString();
}

export function parseClassGapShareParams(searchParams: URLSearchParams): ClassGapSharePayload {
  const missedRaw = searchParams.get('missed') || '';
  return {
    locale: normalizeLocale(searchParams.get('lang') || searchParams.get('locale')),
    lesson: sanitizeText(searchParams.get('lesson') || '', MAX_LESSON_LENGTH),
    teacher: sanitizeText(searchParams.get('teacher') || '', MAX_TEACHER_LENGTH),
    found: clampInt(searchParams.get('found')),
    total: clampInt(searchParams.get('total')),
    missedWords: missedRaw
      .split(',')
      .map(sanitizeWord)
      .filter(Boolean)
      .slice(0, MAX_MISSED_WORDS),
  };
}

export function searchRecordToParams(
  query: Record<string, string | string[] | undefined>,
): URLSearchParams {
  const sp = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    const s = Array.isArray(value) ? value[0] : value;
    if (s) sp.set(key, s);
  }
  return sp;
}

/**
 * Fill catalogue strings for the class-gap page / metadata.
 *
 * `loadTranslation` runs messages through `normalizeMessages`, which converts
 * legacy `{{var}}` / `${var}` into ICU `{var}`. Prefer `{key}`; still accept
 * `{{key}}` so raw catalogue fallbacks keep working.
 */
export function interpClassGapTemplate(
  template: string,
  params: Record<string, string | number>,
): string {
  let out = template;
  for (const key of Object.keys(params)) {
    const value = String(params[key] ?? '');
    const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    out = out.replace(new RegExp('\\{\\{' + escaped + '\\}\\}', 'g'), value);
    out = out.replace(new RegExp('\\{' + escaped + '\\}', 'g'), value);
  }
  return out;
}

/** Session-storage lesson id for a class-gap → Live handoff. Not a real lesson row. */
export const CLASS_GAP_RETEACH_LIVE_LESSON_ID = 'class-gap-reteach';

/** Fixed 3-minute reteach Live timer (Google Classroom add-on MVP). */
export const CLASS_GAP_RETEACH_TIMER_SECONDS = 180;

/**
 * Payload the multiplayer session reader accepts (`lessonId` + `lessonName` +
 * `vocabularyWords`). Built from the PUBLIC class-gap card: missed words only,
 * never student names. Returns null when there is nothing to seed — staging an
 * empty list would start a Live room with the wrong (empty/full) board.
 *
 * Timer is always 3 minutes so a Google Classroom Stream post is a short reteach,
 * not a full lesson rematch. Reuses the lessonGameData shape from reteach #896.
 */
export interface ClassGapReteachLiveData {
  lessonId: string;
  lessonName: string;
  vocabularyWords: string[];
  language: ClassGapLocale;
  targetWord: string;
  templateSettings: {
    timerSeconds: number;
    difficulty: string;
    minWordLength: number;
    allowLateJoin: boolean;
  };
}

export function buildClassGapReteachLiveData(
  payload: ClassGapSharePayload,
): ClassGapReteachLiveData | null {
  if (!payload.missedWords.length) return null;
  return {
    lessonId: CLASS_GAP_RETEACH_LIVE_LESSON_ID,
    lessonName: payload.lesson || 'Class gap',
    vocabularyWords: [...payload.missedWords],
    language: payload.locale,
    // Do not pin a Word Hunt target — it may be a word the class already found.
    targetWord: '',
    templateSettings: {
      timerSeconds: CLASS_GAP_RETEACH_TIMER_SECONDS,
      difficulty: 'medium',
      minWordLength: 3,
      allowLateJoin: true,
    },
  };
}

/**
 * NEW Live room (create-modal as host), not the same-room restage of reteach #896.
 * `fromLesson=true` is the existing sessionStorage gate in shouldLoadLessonData.
 */
export function classGapReteachLivePath(locale: string): string {
  return `/${normalizeLocale(locale)}/multiplayer?fromLesson=true&autoCreate=true`;
}
