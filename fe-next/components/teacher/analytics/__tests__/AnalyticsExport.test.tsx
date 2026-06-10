/**
 * AnalyticsDashboard — Export Report behavior
 *
 * Guards the formerly-dead "Export Report" button: it must build a CSV blob
 * and trigger a download when students exist, and be disabled when empty.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AnalyticsDashboard } from '../AnalyticsDashboard';
import * as useClassroomAnalyticsModule from '@/hooks/useClassroomAnalytics';
import * as useStudentProgressMetricsModule from '@/hooks/useStudentProgressMetrics';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        'education.analytics.exportReport': 'Export Report',
        'education.analytics.student': 'Student',
        'education.analytics.colLevel': 'Level',
        'education.analytics.mastery': 'Mastery',
        'education.analytics.accuracy': 'Accuracy',
        'education.analytics.colStreak': 'Streak',
        'education.analytics.studentDetail': 'Student Details',
      };
      return map[key] ?? key;
    },
    language: 'en',
    dir: 'ltr',
  }),
  LanguageProvider: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock('@/hooks/useClassroomAnalytics');
vi.mock('@/hooks/useStudentProgressMetrics');
vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open?: boolean }) =>
    open ? <div>{children}</div> : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
}));
vi.mock('@/components/teacher/reports/StudentProgressReport', () => ({
  StudentProgressReport: () => null,
}));
vi.mock('../LessonEffectivenessChart', () => ({ __esModule: true, default: () => null }));
vi.mock('../VocabularyHeatmap', () => ({ VocabularyHeatmap: () => null }));

const metrics = {
  studentsNeedingHelp: 1,
  classAverageXp: 1000,
  activeStudentsToday: 2,
  totalStudents: 2,
  weeklyEngagement: 80,
  commonMistakes: [],
};

const sampleStudents = [
  {
    studentId: 's1', displayName: 'Ada Lovelace', avatarUrl: null, totalXp: 1200,
    currentLevel: 4, vocabularyMastery: 87, overallAccuracy: 91, wordsAttempted: 120,
    wordsMastered: 104, lastPracticeDate: null, isStruggling: false, currentStreak: 5,
  },
];

function mockStudents(students: typeof sampleStudents) {
  vi.spyOn(useClassroomAnalyticsModule, 'useClassroomAnalytics').mockReturnValue({
    metrics, isLoading: false, error: null, refresh: vi.fn(),
  } as ReturnType<typeof useClassroomAnalyticsModule.useClassroomAnalytics>);
  vi.spyOn(useStudentProgressMetricsModule, 'useStudentProgressMetrics').mockReturnValue({
    students, isLoading: false, error: null, refresh: vi.fn(),
  } as ReturnType<typeof useStudentProgressMetricsModule.useStudentProgressMetrics>);
}

describe('AnalyticsDashboard - Export Report', () => {
  let createObjectURL: ReturnType<typeof vi.fn>;
  let revokeObjectURL: ReturnType<typeof vi.fn>;
  let clickSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    createObjectURL = vi.fn(() => 'blob:mock');
    revokeObjectURL = vi.fn();
    // jsdom has no object-URL impl
    (URL as unknown as { createObjectURL: unknown }).createObjectURL = createObjectURL;
    (URL as unknown as { revokeObjectURL: unknown }).revokeObjectURL = revokeObjectURL;
    clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('builds a CSV blob and triggers a download when students exist', () => {
    mockStudents(sampleStudents);
    render(<AnalyticsDashboard classroomId="class-1" />);

    fireEvent.click(screen.getByRole('button', { name: 'Export Report' }));

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    const blobArg = createObjectURL.mock.calls[0][0] as Blob;
    expect(blobArg).toBeInstanceOf(Blob);
    expect(blobArg.type).toContain('text/csv');
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledTimes(1);
  });

  it('disables the export button when there are no students', () => {
    mockStudents([]);
    render(<AnalyticsDashboard classroomId="class-1" />);

    const button = screen.getByRole('button', { name: 'Export Report' });
    expect(button).toBeDisabled();

    fireEvent.click(button);
    expect(createObjectURL).not.toHaveBeenCalled();
  });
});
