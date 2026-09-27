// @vitest-environment node
/**
 * Real react-pdf render — no mocks. The jsdom tests prove the right strings
 * reach the tree; only a real render proves the document builds and embeds a
 * font that has the glyphs (Helvetica cannot draw Hebrew or Japanese).
 */
import React from 'react';
import { join } from 'node:path';
import { renderToBuffer } from '@react-pdf/renderer';
import { ProgressReportPDF, type StudentReportPDFData, type ClassReportPDFData } from '../ProgressReportPDF';
import { registerReportFonts } from '../reportPdfFonts';

const PUBLIC_DIR = join(process.cwd(), 'public');
const t = (key: string) => key;

const STUDENT: StudentReportPDFData = {
  type: 'student',
  studentName: 'מאיה כהן',
  classroomName: 'ז׳ 2',
  generatedAt: new Date('2026-09-05T10:00:00Z'),
  metrics: {
    wordsLearned: 12, totalWords: 20, accuracy: 84, practiceTimeMinutes: 65,
    currentStreak: 3, longestStreak: 9, sessionsCompleted: 7, averageScore: 310, masteryLevel: 'developing',
  },
  wordMastery: Array.from({ length: 40 }, (_, i) => ({
    word: `מילה${i}`, mastered: i % 3 === 0, accuracy: (i * 7) % 101, attempts: i + 1,
  })),
  recommendations: ['mastery_work'],
};

const CLASS: ClassReportPDFData = {
  type: 'class',
  classroomName: '国語 3年',
  teacherName: '山田先生',
  generatedAt: new Date('2026-09-05T10:00:00Z'),
  metrics: {
    totalStudents: 3, activeStudents: 2, classAverageAccuracy: 71,
    classAverageWordsLearned: 9, completionRate: 40, participationRate: 66,
  },
  topPerformers: [{ studentName: '佐藤', accuracy: 94, wordsLearned: 21 }],
  studentsNeedingAttention: [{ studentName: '田中', accuracy: 30, issue: 'inactive' }],
  studentRankings: [{ rank: 1, studentName: '佐藤', score: 310, accuracy: 94, wordsLearned: 21 }],
};

async function build(data: StudentReportPDFData | ClassReportPDFData, language: string) {
  const fontFamily = registerReportFonts(language, PUBLIC_DIR);
  const dir = language === 'he' ? 'rtl' : 'ltr';
  const buf = await renderToBuffer(
    <ProgressReportPDF data={data} t={t} language={language} dir={dir} fontFamily={fontFamily} />
  );
  return buf.toString('latin1');
}

describe('ProgressReportPDF real render', () => {
  it('builds a multi-page Hebrew student report with Rubik embedded', async () => {
    const pdf = await build(STUDENT, 'he');
    expect(pdf.startsWith('%PDF')).toBe(true);
    expect(pdf).toContain('Rubik-Regular');
    expect(pdf).toContain('Rubik-Bold');
    expect(pdf).not.toContain('/Helvetica');
  }, 60_000);

  it('builds a Japanese class report with Noto Sans JP embedded', async () => {
    const pdf = await build(CLASS, 'ja');
    expect(pdf).toContain('NotoSansJP');
    expect(pdf).not.toContain('/Helvetica');
  }, 60_000);
});
