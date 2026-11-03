/**
 * This round's class report, shaped for the existing class-report PDF
 * (components/teacher/reports/ProgressReportPDF, type 'class').
 *
 * Built from what the projector already holds at round end: each student's
 * found / total lesson words (summary.masteryByPlayer) and their round score
 * (players). The host and bots are never students. Mapping onto the PDF tiles:
 *   total students      -> students in the round
 *   active students     -> students who found a word or scored
 *   class avg accuracy  -> average share of the lesson words each student found
 *   completion rate     -> share of the lesson words the class found between them
 * Students under half the words are listed as needing attention (no word and no
 * points -> inactive).
 */
import type { ClassroomSummary } from '@/shared/types/classroom';
import type { PlayerResult } from '@/types/components';
import type { ClassReportPDFData } from '@/components/teacher/reports/ProgressReportPDF';
import { percentOf } from '@/components/teacher/reports/reportLabels';

type RoundSummary = Pick<ClassroomSummary, 'teacherName' | 'lessonNames' | 'totalWords' | 'classFoundCount' | 'masteryByPlayer'>;

interface Row {
  studentName: string;
  found: number;
  total: number;
  score: number;
  accuracy: number;
}

const norm = (s: string) => s.trim().toLowerCase();

export function buildRoundReportPdfData(
  summary: RoundSummary,
  players: readonly PlayerResult[] | undefined,
  opts: { fallbackName: string; now?: Date },
): ClassReportPDFData {
  const host = norm(summary.teacherName ?? '');
  const skip = new Set<string>(host ? [host] : []);
  for (const p of players ?? []) if (p.isHost || p.isBot) skip.add(norm(p.username));

  const rows = new Map<string, Row>();
  const row = (name: string): Row => {
    const key = norm(name);
    let r = rows.get(key);
    if (!r) {
      r = { studentName: name.trim(), found: 0, total: 0, score: 0, accuracy: 0 };
      rows.set(key, r);
    }
    return r;
  };
  for (const [name, m] of Object.entries(summary.masteryByPlayer ?? {})) {
    if (!name.trim() || skip.has(norm(name)) || !m) continue;
    const r = row(name);
    r.found = Math.max(0, m.found || 0);
    r.total = Math.max(0, m.total || 0);
  }
  for (const p of players ?? []) {
    if (!p.username?.trim() || skip.has(norm(p.username))) continue;
    row(p.username).score = Math.max(0, Math.round(p.score || 0));
  }

  const list = [...rows.values()];
  for (const r of list) r.accuracy = percentOf(r.found, r.total);
  const active = list.filter((r) => r.found > 0 || r.score > 0);
  const measured = list.filter((r) => r.total > 0);
  const avg = (xs: number[]) => (xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : 0);

  const ranked = [...list].sort(
    (a, b) => b.score - a.score || b.accuracy - a.accuracy || a.studentName.localeCompare(b.studentName),
  );
  const lessons = (summary.lessonNames ?? []).map((n) => n.trim()).filter(Boolean);

  return {
    type: 'class',
    classroomName: lessons.length ? lessons.join(' · ') : opts.fallbackName,
    teacherName: (summary.teacherName ?? '').trim(),
    generatedAt: opts.now ?? new Date(),
    metrics: {
      totalStudents: list.length,
      activeStudents: active.length,
      classAverageAccuracy: avg(measured.map((r) => r.accuracy)),
      classAverageWordsLearned: avg(list.map((r) => r.found)),
      completionRate: percentOf(summary.classFoundCount ?? 0, summary.totalWords ?? 0),
      participationRate: percentOf(active.length, list.length),
    },
    topPerformers: ranked
      .filter((r) => r.score > 0 || r.found > 0)
      .slice(0, 3)
      .map(({ studentName, accuracy, found }) => ({ studentName, accuracy, wordsLearned: found })),
    studentsNeedingAttention: measured
      .filter((r) => r.accuracy < 50)
      .sort((a, b) => a.accuracy - b.accuracy || a.studentName.localeCompare(b.studentName))
      .map(({ studentName, accuracy, found, score }) => ({
        studentName,
        accuracy,
        issue: found === 0 && score === 0 ? ('inactive' as const) : ('low_accuracy' as const),
      })),
    studentRankings: ranked.map((r, i) => ({
      rank: i + 1,
      studentName: r.studentName,
      score: r.score,
      accuracy: r.accuracy,
      wordsLearned: r.found,
    })),
  };
}
