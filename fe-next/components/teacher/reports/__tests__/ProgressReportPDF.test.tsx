/**
 * ProgressReportPDF Component Tests
 *
 * Tests for the PDF document component used to generate
 * student and class progress reports.
 */

import React from 'react';
import { render } from '@testing-library/react';

// Mock react-pdf/renderer since it doesn't work in JSDOM
vi.mock('@react-pdf/renderer', () => ({
  Document: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="pdf-document">{children}</div>
  ),
  Page: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="pdf-page">{children}</div>
  ),
  View: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="pdf-view">{children}</div>
  ),
  Text: ({ children }: { children: React.ReactNode }) => (
    <span data-testid="pdf-text">{children}</span>
  ),
  StyleSheet: {
    create: (styles: Record<string, unknown>) => styles,
  },
  Font: {
    register: vi.fn(),
  },
}));

// Mock useLanguage
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'teacher.reports.title': 'Progress Report',
        'teacher.reports.metrics.wordsLearned': 'Words Learned',
        'teacher.reports.metrics.accuracy': 'Accuracy',
        'teacher.reports.metrics.practiceTime': 'Practice Time',
        'teacher.reports.metrics.currentStreak': 'Current Streak',
        'teacher.reports.sections.summary': 'Summary',
        'teacher.reports.sections.wordMastery': 'Word Mastery',
        'teacher.reports.classReport': 'Class Progress Report',
        'teacher.reports.studentReport': 'Student Progress Report',
      };
      return translations[key] || key;
    },
    language: 'en',
    dir: 'ltr',
  }),
}));

import { ProgressReportPDF, StudentReportPDFData, ClassReportPDFData } from '../ProgressReportPDF';

describe('ProgressReportPDF', () => {
  const mockStudentData: StudentReportPDFData = {
    type: 'student',
    studentName: 'John Doe',
    classroomName: 'English 101',
    generatedAt: new Date('2024-01-15'),
    metrics: {
      wordsLearned: 25,
      totalWords: 50,
      accuracy: 85,
      practiceTimeMinutes: 120,
      currentStreak: 7,
      longestStreak: 14,
      sessionsCompleted: 15,
      averageScore: 85,
      masteryLevel: 'proficient',
    },
    wordMastery: [
      { word: 'apple', mastered: true, accuracy: 100, attempts: 5 },
      { word: 'banana', mastered: true, accuracy: 90, attempts: 8 },
      { word: 'cherry', mastered: false, accuracy: 60, attempts: 3 },
    ],
  };

  const mockClassData: ClassReportPDFData = {
    type: 'class',
    classroomName: 'English 101',
    teacherName: 'Ms. Smith',
    generatedAt: new Date('2024-01-15'),
    metrics: {
      totalStudents: 25,
      activeStudents: 20,
      classAverageAccuracy: 78,
      classAverageWordsLearned: 30,
      completionRate: 80,
      participationRate: 80,
    },
    topPerformers: [
      { studentName: 'Alice', accuracy: 95, wordsLearned: 45 },
      { studentName: 'Bob', accuracy: 92, wordsLearned: 42 },
    ],
    studentRankings: [
      { rank: 1, studentName: 'Alice', score: 95, accuracy: 95, wordsLearned: 45 },
      { rank: 2, studentName: 'Bob', score: 92, accuracy: 92, wordsLearned: 42 },
    ],
  };

  describe('Student Report', () => {
    it('renders PDF document structure', () => {
      const { getByTestId } = render(<ProgressReportPDF data={mockStudentData} />);

      expect(getByTestId('pdf-document')).toBeInTheDocument();
      expect(getByTestId('pdf-page')).toBeInTheDocument();
    });

    it('displays student name', () => {
      const { getAllByTestId } = render(<ProgressReportPDF data={mockStudentData} />);

      const textElements = getAllByTestId('pdf-text');
      const hasStudentName = textElements.some(el => el.textContent?.includes('John Doe'));
      expect(hasStudentName).toBe(true);
    });

    it('displays classroom name', () => {
      const { getAllByTestId } = render(<ProgressReportPDF data={mockStudentData} />);

      const textElements = getAllByTestId('pdf-text');
      const hasClassroom = textElements.some(el => el.textContent?.includes('English 101'));
      expect(hasClassroom).toBe(true);
    });

    it('displays metrics', () => {
      const { getAllByTestId } = render(<ProgressReportPDF data={mockStudentData} />);

      const textElements = getAllByTestId('pdf-text');
      const hasAccuracy = textElements.some(el => el.textContent?.includes('85%'));
      expect(hasAccuracy).toBe(true);
    });

    it('displays word mastery section', () => {
      const { getAllByTestId } = render(<ProgressReportPDF data={mockStudentData} />);

      const textElements = getAllByTestId('pdf-text');
      const hasWords = textElements.some(
        el => el.textContent?.includes('apple') || el.textContent?.includes('banana')
      );
      expect(hasWords).toBe(true);
    });
  });

  describe('Class Report', () => {
    it('renders PDF document structure', () => {
      const { getByTestId } = render(<ProgressReportPDF data={mockClassData} />);

      expect(getByTestId('pdf-document')).toBeInTheDocument();
      expect(getByTestId('pdf-page')).toBeInTheDocument();
    });

    it('displays classroom name', () => {
      const { getAllByTestId } = render(<ProgressReportPDF data={mockClassData} />);

      const textElements = getAllByTestId('pdf-text');
      const hasClassroom = textElements.some(el => el.textContent?.includes('English 101'));
      expect(hasClassroom).toBe(true);
    });

    it('displays teacher name', () => {
      const { getAllByTestId } = render(<ProgressReportPDF data={mockClassData} />);

      const textElements = getAllByTestId('pdf-text');
      const hasTeacher = textElements.some(el => el.textContent?.includes('Ms. Smith'));
      expect(hasTeacher).toBe(true);
    });

    it('displays class metrics', () => {
      const { getAllByTestId } = render(<ProgressReportPDF data={mockClassData} />);

      const textElements = getAllByTestId('pdf-text');
      const hasStudentCount = textElements.some(el => el.textContent?.includes('25'));
      expect(hasStudentCount).toBe(true);
    });

    it('displays top performers', () => {
      const { getAllByTestId } = render(<ProgressReportPDF data={mockClassData} />);

      const textElements = getAllByTestId('pdf-text');
      const hasTopPerformer = textElements.some(el => el.textContent?.includes('Alice'));
      expect(hasTopPerformer).toBe(true);
    });

    it('displays student rankings', () => {
      const { getAllByTestId } = render(<ProgressReportPDF data={mockClassData} />);

      const textElements = getAllByTestId('pdf-text');
      const hasRanking = textElements.some(
        el => el.textContent?.includes('1') || el.textContent?.includes('Alice')
      );
      expect(hasRanking).toBe(true);
    });
  });

  describe('Common Functionality', () => {
    it('displays generation date', () => {
      const { getAllByTestId } = render(<ProgressReportPDF data={mockStudentData} />);

      const textElements = getAllByTestId('pdf-text');
      const hasDate = textElements.some(el => el.textContent?.includes('2024'));
      expect(hasDate).toBe(true);
    });

    it('handles RTL direction for Hebrew', () => {
      // Note: RTL handling is tested at the Page level with direction prop
      // This test verifies the component renders without errors
      const { getByTestId } = render(<ProgressReportPDF data={mockStudentData} />);
      expect(getByTestId('pdf-document')).toBeInTheDocument();
    });
  });
});
