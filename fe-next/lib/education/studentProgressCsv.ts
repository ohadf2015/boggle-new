import type { StudentProgressSummary } from '@/lib/supabase/analytics';

/**
 * Column header labels for the student-progress CSV export.
 * Passed in from the component so the headers stay localized and match
 * the on-screen table exactly.
 */
export interface StudentCsvColumns {
  student: string;
  level: string;
  mastery: string;
  accuracy: string;
  streak: string;
}

/**
 * Escape a single CSV cell per RFC 4180: wrap in double quotes when the value
 * contains a comma, quote, or newline, and double any embedded quotes.
 */
export function escapeCsvCell(value: string | number): string {
  const str = String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Build a CSV string (CRLF line endings, RFC 4180) from student progress rows.
 * Always emits the header row, even when there are no students.
 */
export function studentsToCsv(
  students: StudentProgressSummary[],
  columns: StudentCsvColumns
): string {
  const header = [
    columns.student,
    columns.level,
    columns.mastery,
    columns.accuracy,
    columns.streak,
  ]
    .map(escapeCsvCell)
    .join(',');

  const rows = students.map((s) =>
    [
      escapeCsvCell(s.displayName),
      escapeCsvCell(s.currentLevel),
      escapeCsvCell(`${s.vocabularyMastery}%`),
      escapeCsvCell(`${s.overallAccuracy}%`),
      escapeCsvCell(s.currentStreak),
    ].join(',')
  );

  return [header, ...rows].join('\r\n');
}
