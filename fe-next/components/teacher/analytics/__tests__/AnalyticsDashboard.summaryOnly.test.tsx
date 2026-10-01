import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AnalyticsDashboard } from '../AnalyticsDashboard';
import * as useClassroomAnalyticsModule from '@/hooks/useClassroomAnalytics';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key, language: 'en', dir: 'ltr' }),
}));
vi.mock('@/hooks/useClassroomAnalytics');
vi.mock('@/hooks/useStudentProgressMetrics', () => ({
  useStudentProgressMetrics: () => ({
    students: [{ studentId: 's1', displayName: 'Ana', currentLevel: 1, vocabularyMastery: 0, overallAccuracy: 0, currentStreak: 0 }],
    isLoading: false,
    error: null,
    refresh: vi.fn(),
  }),
}));
vi.mock('@/components/ui/dialog', () => ({
  Dialog: () => null,
  DialogContent: () => null,
  DialogHeader: () => null,
  DialogTitle: () => null,
}));
vi.mock('@/components/teacher/reports/StudentProgressReport', () => ({ StudentProgressReport: () => null }));
vi.mock('../LessonEffectivenessChart', () => ({ __esModule: true, default: () => <div data-testid="lesson-chart" /> }));
vi.mock('../WordMasteryCard', () => ({ WordMasteryCard: () => <div data-testid="word-mastery-card" /> }));
vi.mock('../VocabularyHeatmap', () => ({ VocabularyHeatmap: () => <div data-testid="vocab-heatmap" /> }));

const metrics = {
  studentsNeedingHelp: 2,
  classAverageXp: 40,
  activeStudentsToday: 3,
  totalStudents: 6,
  weeklyEngagement: 50,
  commonMistakes: [{ word: 'river', errorRate: 0.5, studentCount: 3 }],
};

beforeEach(() => {
  vi.spyOn(useClassroomAnalyticsModule, 'useClassroomAnalytics').mockReturnValue({
    metrics,
    isLoading: false,
    error: null,
    refresh: vi.fn(),
  } as never);
});

describe('AnalyticsDashboard summaryOnly (host page carries the detail tabs)', () => {
  it('renders the four metric cards and none of the detail panels the page tabs already show', () => {
    render(<AnalyticsDashboard classroomId="c1" showHeader={false} summaryOnly />);

    expect(screen.getByTestId('metric-students-needing-help')).toBeInTheDocument();
    expect(screen.getByTestId('metric-common-mistakes')).toBeInTheDocument();
    expect(screen.queryByText('education.analytics.studentProgress')).not.toBeInTheDocument();
    expect(screen.queryByText('education.analytics.exportReport')).not.toBeInTheDocument();
    expect(screen.queryByTestId('lesson-chart')).not.toBeInTheDocument();
    expect(screen.queryByTestId('word-mastery-card')).not.toBeInTheDocument();
    expect(screen.queryByTestId('vocab-heatmap')).not.toBeInTheDocument();
  });

  it('lays the cards out two-up on a phone instead of one tall column', () => {
    render(<AnalyticsDashboard classroomId="c1" summaryOnly />);
    const grid = screen.getByTestId('metric-students-needing-help').parentElement!;
    expect(grid.className).toMatch(/(^|\s)grid-cols-2(\s|$)/);
    expect(screen.getByText('3/6').className).toMatch(/(^|\s)text-2xl(\s|$)/);
  });

  it('still hands View Students to the host', () => {
    const onViewStudents = vi.fn();
    render(<AnalyticsDashboard classroomId="c1" summaryOnly onViewStudents={onViewStudents} />);
    fireEvent.click(screen.getByText('education.analytics.viewStudents'));
    expect(onViewStudents).toHaveBeenCalledWith('struggling');
  });

  it('keeps every panel by default for the HQ tools mount', async () => {
    render(<AnalyticsDashboard classroomId="c1" />);
    expect(screen.getByText('education.analytics.studentProgress')).toBeInTheDocument();
    expect(await screen.findByTestId('lesson-chart')).toBeInTheDocument();
    expect(screen.getByTestId('vocab-heatmap')).toBeInTheDocument();
  });
});
