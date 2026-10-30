import React from 'react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AnalyticsDashboard } from '../AnalyticsDashboard';
import * as useClassroomAnalyticsModule from '../useProClassAnalytics';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key, language: 'en', dir: 'ltr' }),
}));
vi.mock('../useProClassAnalytics');

const metrics = {
  studentsNeedingHelp: 2,
  classAverageXp: 40,
  activeStudentsToday: 3,
  totalStudents: 6,
  weeklyEngagement: 50,
  commonMistakes: [{ word: 'river', errorRate: 0.5, studentCount: 3 }],
};

beforeEach(() => {
  vi.spyOn(useClassroomAnalyticsModule, 'useProClassAnalytics').mockReturnValue({
    metrics,
    isLoading: false,
    error: null,
    refresh: vi.fn(),
  } as never);
});

describe('AnalyticsDashboard (summary cards; the page tabs carry the table, chart and heatmap)', () => {
  it('renders the four metric cards and no student table, export or detail dialog', () => {
    render(<AnalyticsDashboard classroomId="c1" showHeader={false} />);

    expect(screen.getByTestId('metric-students-needing-help')).toBeInTheDocument();
    expect(screen.getByTestId('metric-class-average-xp')).toBeInTheDocument();
    expect(screen.getByTestId('metric-active-students')).toBeInTheDocument();
    expect(screen.getByTestId('metric-common-mistakes')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.queryByText('education.analytics.exportReport')).not.toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('does not fetch the per-student list it no longer shows', () => {
    const src = readFileSync(join(process.cwd(), 'components/teacher/analytics/AnalyticsDashboard.tsx'), 'utf8');
    expect(src).not.toMatch(/useStudentProgressMetrics|StudentProgressReport|<Dialog/);
  });

  it('lays the four numbers out in one short row on a phone, so the report sections stay in view', () => {
    render(<AnalyticsDashboard classroomId="c1" />);
    const grid = screen.getByTestId('metric-students-needing-help').parentElement!;
    expect(grid.className).toMatch(/(^|\s)grid-cols-4(\s|$)/);
    expect(screen.getByText('3/6').className).toMatch(/(^|\s)text-lg(\s|$)/);
  });

  it('hands View Students to the host', () => {
    const onViewStudents = vi.fn();
    render(<AnalyticsDashboard classroomId="c1" onViewStudents={onViewStudents} />);
    fireEvent.click(screen.getByText('education.analytics.viewStudents'));
    expect(onViewStudents).toHaveBeenCalledWith('struggling');
  });

  it('renders nothing for a class with no activity yet, so the class pulse empty state is not stacked on four zero tiles', () => {
    vi.spyOn(useClassroomAnalyticsModule, 'useProClassAnalytics').mockReturnValue({
      metrics: { ...metrics, studentsNeedingHelp: 0, classAverageXp: 0, activeStudentsToday: 0, weeklyEngagement: 0, commonMistakes: [] },
      isLoading: false,
      error: null,
      refresh: vi.fn(),
    } as never);
    const { container } = render(<AnalyticsDashboard classroomId="c1" showHeader={false} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('keeps the tiles once one student has been active', () => {
    vi.spyOn(useClassroomAnalyticsModule, 'useProClassAnalytics').mockReturnValue({
      metrics: { ...metrics, studentsNeedingHelp: 0, classAverageXp: 0, activeStudentsToday: 1, commonMistakes: [] },
      isLoading: false,
      error: null,
      refresh: vi.fn(),
    } as never);
    render(<AnalyticsDashboard classroomId="c1" showHeader={false} />);
    expect(screen.getByTestId('metric-active-students')).toBeInTheDocument();
  });
});
