export type SampleLevel = 'mastered' | 'learning' | 'struggling';
export type SampleTrend = 'up' | 'flat' | 'down';

export interface SampleStudent {
  accuracy: number;
  trend: SampleTrend;
  games: number;
}

export const SAMPLE_STUDENTS: readonly SampleStudent[] = [
  { accuracy: 94, trend: 'up', games: 6 },
  { accuracy: 71, trend: 'flat', games: 5 },
  { accuracy: 48, trend: 'down', games: 4 },
  { accuracy: 86, trend: 'up', games: 6 },
];

export const SAMPLE_WORD_COUNT = 5;

const GRID: readonly SampleLevel[][] = [
  ['mastered', 'mastered', 'learning', 'mastered', 'mastered'],
  ['learning', 'mastered', 'struggling', 'learning', 'mastered'],
  ['struggling', 'learning', 'struggling', 'struggling', 'learning'],
  ['mastered', 'learning', 'learning', 'mastered', 'mastered'],
];

export function sampleMasteryGrid(): SampleLevel[][] {
  return GRID.map((row) => [...row]);
}

/** Word indices ordered hardest first: most students struggling, then learning. */
export function sampleHardestWords(): number[] {
  const score = (w: number) =>
    GRID.reduce((s, row) => s + (row[w] === 'struggling' ? 2 : row[w] === 'learning' ? 1 : 0), 0);
  return Array.from({ length: SAMPLE_WORD_COUNT }, (_, i) => i).sort((a, b) => score(b) - score(a) || a - b);
}

export function sampleClassAverage(): number {
  return Math.round(SAMPLE_STUDENTS.reduce((s, st) => s + st.accuracy, 0) / SAMPLE_STUDENTS.length);
}

/** Localised comma lists from translations, padded so a short list never breaks the grid. */
export function splitSampleList(raw: string, count: number, fallbackPrefix: string): string[] {
  const parts = raw.split(',').map((s) => s.trim()).filter(Boolean);
  return Array.from({ length: count }, (_, i) => parts[i] ?? `${fallbackPrefix} ${i + 1}`);
}
