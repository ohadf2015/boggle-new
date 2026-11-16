import { CLASSROOM_GAME_MODES, type ClassroomGameMode } from '@/shared/types/vocabQuiz';
import { CLASS_GAP_ORIGIN } from '@/lib/education/classGapShare';

const MAX_COUNT = 9999;

/** English on purpose: the OG renderer's default font has no Hebrew or Japanese glyphs. */
const MODE_LABELS: Partial<Record<ClassroomGameMode, string>> = {
  classic: 'Classic',
  'word-hunt': 'Word Hunt',
  blast: 'Blast',
  'wheel-rush': 'Wheel Rush',
  'vocab-quiz': 'Vocab Quiz',
  wordcraft: 'Wordcraft',
  crossword: 'Crossword',
};

export interface ClassWinNumbers {
  words: number;
  students: number;
  found: number;
  total: number;
  mode: ClassroomGameMode | null;
}

export interface ClassWinOgPayload extends ClassWinNumbers {
  modeLabel: string | null;
}

export function clampCount(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(String(value ?? ''));
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.min(Math.floor(n), MAX_COUNT);
}

export function knownMode(value: unknown): ClassroomGameMode | null {
  return typeof value === 'string' && (CLASSROOM_GAME_MODES as readonly string[]).includes(value) ? (value as ClassroomGameMode) : null;
}

export function toClassWinNumbers(raw: { words?: unknown; students?: unknown; found?: unknown; total?: unknown; mode?: unknown }): ClassWinNumbers {
  const total = clampCount(raw.total);
  return {
    words: clampCount(raw.words),
    students: clampCount(raw.students),
    found: Math.min(clampCount(raw.found), total),
    total,
    mode: knownMode(raw.mode),
  };
}

export function parseClassWinParams(sp: URLSearchParams): ClassWinOgPayload {
  const numbers = toClassWinNumbers({
    words: sp.get('words'),
    students: sp.get('students'),
    found: sp.get('found'),
    total: sp.get('total'),
    mode: sp.get('mode'),
  });
  return { ...numbers, modeLabel: numbers.mode ? MODE_LABELS[numbers.mode] ?? null : null };
}

export function toClassWinQuery(n: ClassWinNumbers): URLSearchParams {
  const sp = new URLSearchParams();
  sp.set('words', String(n.words));
  sp.set('students', String(n.students));
  if (n.total > 0) {
    sp.set('found', String(n.found));
    sp.set('total', String(n.total));
  }
  if (n.mode) sp.set('mode', n.mode);
  return sp;
}

export function buildClassWinOgImageUrl(n: ClassWinNumbers): string {
  const url = new URL('/api/og/class-win', CLASS_GAP_ORIGIN);
  url.search = toClassWinQuery(toClassWinNumbers(n)).toString();
  return url.toString();
}
