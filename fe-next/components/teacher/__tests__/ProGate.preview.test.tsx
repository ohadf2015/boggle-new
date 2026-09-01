import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ProGate } from '../ProGate';

const mockUseTeacherPro = vi.fn();
vi.mock('@/hooks/useTeacherPro', () => ({
  useTeacherPro: () => mockUseTeacherPro(),
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key, language: 'en' }),
}));

const mockTrackGrowthEvent = vi.fn();
vi.mock('@/utils/growthTracking', () => ({
  trackGrowthEvent: (...a: unknown[]) => mockTrackGrowthEvent(...a),
}));

const mockUseClassroomAnalytics = vi.fn();
vi.mock('@/hooks/useClassroomAnalytics', () => ({
  useClassroomAnalytics: () => mockUseClassroomAnalytics(),
}));

describe('ProGate preview mode', () => {
  beforeEach(() => {
    mockTrackGrowthEvent.mockClear();
    mockUseClassroomAnalytics.mockReturnValue({
      metrics: {
        studentsNeedingHelp: 3,
        classAverageXp: 1200,
        activeStudentsToday: 8,
        totalStudents: 12,
        commonMistakes: [
          { word: 'achieve', count: 5 },
          { word: 'believe', count: 4 },
        ],
      },
      isLoading: false,
      error: null,
      refresh: vi.fn(),
    });
  });

  it('renders only headline metrics for free teachers in preview mode (no paid content)', () => {
    mockUseTeacherPro.mockReturnValue({ hasPro: false, loading: false });
    const { container } = render(
      <ProGate feature="analytics" preview={true} classroomId="class-123">
        <div data-testid="paid-content">Full analytics dashboard with student table, charts, heatmap</div>
      </ProGate>,
    );

    // Paid content (the children) should NOT be in the DOM
    expect(screen.queryByTestId('paid-content')).not.toBeInTheDocument();

    // Preview should show the summary metrics
    expect(screen.getByTestId('pro-gate-preview-analytics')).toBeInTheDocument();

    // Headline metrics should be visible
    expect(screen.getByText('education.analytics.studentsNeedingHelp')).toBeInTheDocument();
    expect(screen.getByText('education.analytics.classAverageXp')).toBeInTheDocument();
    expect(screen.getByText('education.analytics.activeStudentsToday')).toBeInTheDocument();
    expect(screen.getByText('education.analytics.commonMistakes')).toBeInTheDocument();

    // Upsell should be visible
    expect(screen.getByText('teacher.proGate.analytics.title')).toBeInTheDocument();
  });

  it('renders full content for a Pro teacher in preview mode', () => {
    mockUseTeacherPro.mockReturnValue({ hasPro: true, loading: false });
    render(
      <ProGate feature="analytics" preview={true} classroomId="class-123">
        <div data-testid="paid-content">Full analytics dashboard</div>
      </ProGate>,
    );

    // Pro teachers get the full content, no upsell
    expect(screen.getByTestId('paid-content')).toBeInTheDocument();
    expect(screen.queryByText('teacher.proGate.analytics.title')).not.toBeInTheDocument();
  });

  it('renders full upsell for free teachers without preview mode', () => {
    mockUseTeacherPro.mockReturnValue({ hasPro: false, loading: false });
    render(
      <ProGate feature="analytics" preview={false}>
        <div data-testid="paid-content">Full analytics dashboard</div>
      </ProGate>,
    );

    // Without preview, paid content is not rendered
    expect(screen.queryByTestId('paid-content')).not.toBeInTheDocument();

    // Only lock card upsell shown
    expect(screen.getByText('teacher.proGate.analytics.title')).toBeInTheDocument();
  });
});
