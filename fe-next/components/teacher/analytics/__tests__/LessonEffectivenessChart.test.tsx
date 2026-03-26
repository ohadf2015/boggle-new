import React from 'react';
import { render, screen } from '@testing-library/react';
// Import the inner component directly to avoid next/dynamic issues in tests
import { LessonEffectivenessChart } from '../LessonEffectivenessChartInner';
import * as useLessonEffectivenessModule from '@/hooks/useLessonEffectiveness';

// Mock LanguageContext
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    language: 'en',
  }),
}));

// Mock useLessonEffectiveness hook
vi.mock('@/hooks/useLessonEffectiveness');

const mockUseLessonEffectiveness = useLessonEffectivenessModule.useLessonEffectiveness as jest.MockedFunction<
  typeof useLessonEffectivenessModule.useLessonEffectiveness
>;

// Mock Recharts to avoid rendering issues in tests
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>,
  BarChart: ({ children }: any) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => <div data-testid="bar" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  Legend: () => <div data-testid="legend" />,
}));

describe('LessonEffectivenessChart', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render loading state', () => {
    // GIVEN: Hook returns loading state
    mockUseLessonEffectiveness.mockReturnValue({
      effectiveness: [],
      isLoading: true,
      error: null,
      refresh: vi.fn(),
    });

    // WHEN
    render(<LessonEffectivenessChart classroomId="classroom-1" />);

    // THEN
    expect(screen.getByText('common.loading')).toBeInTheDocument();
  });

  it('should render bar chart when data loaded', () => {
    // GIVEN: Hook returns effectiveness data
    const mockData = [
      {
        lessonId: 'lesson-1',
        lessonName: 'Basic Vocabulary',
        totalStudents: 10,
        averageXpGain: 150,
        completionRate: 80,
        averageAccuracy: 75,
        avgTimeToMastery: 5,
      },
      {
        lessonId: 'lesson-2',
        lessonName: 'Advanced Verbs',
        totalStudents: 8,
        averageXpGain: 200,
        completionRate: 90,
        averageAccuracy: 85,
        avgTimeToMastery: 7,
      },
    ];

    mockUseLessonEffectiveness.mockReturnValue({
      effectiveness: mockData,
      isLoading: false,
      error: null,
      refresh: vi.fn(),
    });

    // WHEN
    render(<LessonEffectivenessChart classroomId="classroom-1" />);

    // THEN
    expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
    expect(screen.getByText('education.analytics.lessonEffectiveness')).toBeInTheDocument();
  });

  it('should render empty state when no lessons', () => {
    // GIVEN: Hook returns empty array
    mockUseLessonEffectiveness.mockReturnValue({
      effectiveness: [],
      isLoading: false,
      error: null,
      refresh: vi.fn(),
    });

    // WHEN
    render(<LessonEffectivenessChart classroomId="classroom-1" />);

    // THEN
    expect(screen.getByText('education.analytics.noLessons')).toBeInTheDocument();
    expect(screen.getByText('education.analytics.assignLessonsHint')).toBeInTheDocument();
  });

  it('should have correct Y-axis labels', () => {
    // GIVEN: Hook returns effectiveness data
    const mockData = [
      {
        lessonId: 'lesson-1',
        lessonName: 'Basic Vocabulary',
        totalStudents: 10,
        averageXpGain: 150,
        completionRate: 80,
        averageAccuracy: 75,
        avgTimeToMastery: 5,
      },
    ];

    mockUseLessonEffectiveness.mockReturnValue({
      effectiveness: mockData,
      isLoading: false,
      error: null,
      refresh: vi.fn(),
    });

    // WHEN
    render(<LessonEffectivenessChart classroomId="classroom-1" />);

    // THEN
    // Y-axes should be rendered (mocked)
    const yAxes = screen.getAllByTestId('y-axis');
    expect(yAxes).toHaveLength(2); // Left and right Y-axes
  });

  it('should render tooltip', () => {
    // GIVEN: Hook returns effectiveness data
    const mockData = [
      {
        lessonId: 'lesson-1',
        lessonName: 'Basic Vocabulary',
        totalStudents: 10,
        averageXpGain: 150,
        completionRate: 80,
        averageAccuracy: 75,
        avgTimeToMastery: 5,
      },
    ];

    mockUseLessonEffectiveness.mockReturnValue({
      effectiveness: mockData,
      isLoading: false,
      error: null,
      refresh: vi.fn(),
    });

    // WHEN
    render(<LessonEffectivenessChart classroomId="classroom-1" />);

    // THEN
    expect(screen.getByTestId('tooltip')).toBeInTheDocument();
  });
});
