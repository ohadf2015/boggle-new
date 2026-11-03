import type { HardWord } from '@/lib/education/wordMasteryReport';

export const SNAPSHOT_WORDS = 4;
export const SNAPSHOT_CLASS_CAP = 6;

export interface ClassEvidence {
  classroomId: string;
  classroomName: string;
  sessions: number;
  classAccuracy: number;
  words: HardWord[];
  /** Student ids below the class goal (Pro), or display names in the example. */
  needsHelp: string[];
  /** Free answer: words and totals only, no per-student detail. */
  locked: boolean;
}

interface FetchableClass {
  id: string;
  name: string;
  member_count?: number;
}

export function classesToFetch<C extends FetchableClass>(classes: readonly C[], cap = SNAPSHOT_CLASS_CAP): C[] {
  return classes
    .filter((c) => (c.member_count ?? 0) > 0)
    .sort((a, b) => (b.member_count ?? 0) - (a.member_count ?? 0))
    .slice(0, cap);
}

export function snapshotWords(words: readonly HardWord[], limit = SNAPSHOT_WORDS): HardWord[] {
  return words
    .filter((w) => w.missRate > 0)
    .sort((a, b) => b.missRate - a.missRate)
    .slice(0, limit);
}

export function pickSnapshot(list: readonly ClassEvidence[]): ClassEvidence | null {
  const withMisses = list.filter((c) => snapshotWords(c.words).length > 0);
  if (withMisses.length === 0) return null;
  return withMisses.reduce((best, c) => (c.sessions > best.sessions ? c : best));
}

const EXAMPLE_MISS = [75, 50, 50, 25];
const EXAMPLE_ASKED = 24;

export function exampleSnapshot(words: readonly string[], names: readonly string[]): ClassEvidence {
  return {
    classroomId: 'example',
    classroomName: '',
    sessions: 3,
    classAccuracy: 68,
    words: words.slice(0, EXAMPLE_MISS.length).map((w, i) => ({
      word: w,
      display: w,
      attempts: EXAMPLE_ASKED,
      missed: Math.round((EXAMPLE_MISS[i] / 100) * EXAMPLE_ASKED),
      missRate: EXAMPLE_MISS[i],
      studentsMissing: Math.round((EXAMPLE_MISS[i] / 100) * EXAMPLE_ASKED),
      studentsAsked: EXAMPLE_ASKED,
    })),
    needsHelp: [...names],
    locked: false,
  };
}
