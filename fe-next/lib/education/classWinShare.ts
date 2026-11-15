import type { ClassroomSummary } from '@/shared/types/classroom';
import type { PlayerResult } from '@/types/components';
import { classStats } from '@/components/education/live/eduResultsModel';
import { teacherGameMode } from '@/lib/education/gameModes';
import { CLASS_GAP_ORIGIN, normalizeLocale } from '@/lib/education/classGapShare';
import { toClassWinNumbers, toClassWinQuery, type ClassWinNumbers } from '@/lib/education/classWinOgModel';

type Translate = (key: string, params?: Record<string, string | number>) => string;

export const CLASS_WIN_UTM = { utm_source: 'share', utm_medium: 'teacher', utm_campaign: 'edu_class_win' } as const;

/** English until every locale carries the keys. */
export const CLASS_WIN_FALLBACK: Record<string, string> = {
  'brag2.classWin.title': 'Our class win on LexiClash',
  'brag2.classWin.text': 'Our class of {students} found {words} words together in {mode}!',
  'brag2.classWin.textNoMode': 'Our class of {students} found {words} words together on LexiClash!',
};

export interface ClassWinShareInput {
  summary: ClassroomSummary;
  players: PlayerResult[] | undefined;
  /** Accepted so callers can pass the room as-is; it never reaches the share. */
  gameCode?: string | null;
  locale: string;
  t: Translate;
}

export interface ClassWinShare {
  title: string;
  text: string;
  url: string;
  numbers: ClassWinNumbers;
}

/** Class totals only: lesson and teacher names are teacher free text that can name the class, so they stay out. */
export function buildClassWinShare({ summary, players, locale, t }: ClassWinShareInput): ClassWinShare | null {
  const stats = classStats(summary, players);
  if (stats.students === 0 || stats.words === 0) return null;
  const numbers = toClassWinNumbers({
    words: stats.words,
    students: stats.students,
    found: stats.lesson?.found,
    total: stats.lesson?.total,
    mode: summary.gameMode,
  });
  const nameKey = numbers.mode ? teacherGameMode(numbers.mode)?.nameKey : undefined;
  const text = nameKey
    ? t('brag2.classWin.text', { words: numbers.words, students: numbers.students, mode: t(nameKey) })
    : t('brag2.classWin.textNoMode', { words: numbers.words, students: numbers.students });

  const url = new URL(`/${normalizeLocale(locale)}/education/class-win`, CLASS_GAP_ORIGIN);
  const query = toClassWinQuery(numbers);
  for (const [k, v] of Object.entries(CLASS_WIN_UTM)) query.set(k, v);
  url.search = query.toString();

  return { title: t('brag2.classWin.title'), text, url: url.toString(), numbers };
}
