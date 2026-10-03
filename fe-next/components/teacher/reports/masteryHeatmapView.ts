import type { MasteryCell, WordMasteryReport } from '@/lib/education/wordMasteryReport';

export type CellTone = 'solid' | 'shaky' | 'missed' | 'unseen';

export function cellTone(cell: MasteryCell | undefined): CellTone {
  if (!cell || cell.attempts === 0) return 'unseen';
  const rate = cell.correct / cell.attempts;
  if (rate >= 1) return 'solid';
  if (rate >= 0.5) return 'shaky';
  return 'missed';
}

/** First names, with a last initial only where two students would otherwise read the same. */
export function shortNames(full: Record<string, string>): Record<string, string> {
  const parts = Object.fromEntries(Object.entries(full).map(([id, n]) => [id, n.trim().split(/\s+/)]));
  const firstCount = new Map<string, number>();
  for (const p of Object.values(parts)) firstCount.set(p[0], (firstCount.get(p[0]) ?? 0) + 1);
  const out: Record<string, string> = {};
  for (const [id, p] of Object.entries(parts)) {
    const last = p.length > 1 ? p[p.length - 1] : '';
    out[id] = (firstCount.get(p[0]) ?? 0) > 1 && last ? `${p[0]} ${Array.from(last)[0]}.` : p[0];
  }
  return out;
}

export interface HeatmapStudent {
  id: string;
  name: string;
  fullName: string;
  accuracy: number;
  needsHelp: number;
}

export interface HeatmapWord {
  word: string;
  display: string;
  asked: number;
  missedBy: string[];
  shakyBy: string[];
  /** Missed + shaky: the same students `HardWord.studentsMissing` counts. */
  struggled: number;
}

export interface HeatmapView {
  students: HeatmapStudent[];
  words: HeatmapWord[];
}

export function buildHeatmapView(report: WordMasteryReport, fullNames: Record<string, string>, fallback: string): HeatmapView {
  const { words, cells } = report.heatmap;
  const short = shortNames(fullNames);

  const students = report.students
    .map((s) => ({
      id: s.studentId,
      name: short[s.studentId] ?? fallback,
      fullName: fullNames[s.studentId]?.trim() || fallback,
      accuracy: s.accuracy,
      needsHelp: words.filter((w) => cellTone(cells[s.studentId]?.[w.word]) === 'missed').length,
    }))
    .sort((a, b) => b.needsHelp - a.needsHelp || a.accuracy - b.accuracy);

  const wordRows = words
    .map((w) => {
      const row: HeatmapWord = { word: w.word, display: w.display, asked: 0, missedBy: [], shakyBy: [], struggled: 0 };
      for (const s of students) {
        const tone = cellTone(cells[s.id]?.[w.word]);
        if (tone === 'unseen') continue;
        row.asked += 1;
        if (tone === 'missed') row.missedBy.push(s.name);
        if (tone === 'shaky') row.shakyBy.push(s.name);
      }
      row.struggled = row.missedBy.length + row.shakyBy.length;
      return row;
    })
    .sort((a, b) => b.struggled - a.struggled || b.missedBy.length - a.missedBy.length);

  return { students, words: wordRows };
}
