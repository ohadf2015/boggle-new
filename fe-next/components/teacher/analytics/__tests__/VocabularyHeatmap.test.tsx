import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { VocabularyHeatmap } from '../VocabularyHeatmap';
import { useVocabularyMastery } from '@/hooks/useVocabularyMastery';
import { useLanguage } from '@/contexts/LanguageContext';

// Mock hooks
vi.mock('@/hooks/useVocabularyMastery');
vi.mock('@/contexts/LanguageContext');

const mockT = (key: string) => {
  const translations: Record<string, string> = {
    'education.analytics.vocabularyMastery': 'Vocabulary Mastery',
    'education.analytics.masteryLevels': 'Mastery Levels',
    'education.analytics.mastered': 'Mastered',
    'education.analytics.practicing': 'Practicing',
    'education.analytics.struggling': 'Struggling',
    'education.analytics.notStarted': 'Not Started',
    'education.analytics.accuracyTooltip': '{{student}}: {{accuracy}}% on "{{word}}"',
    'education.analytics.noVocabularyData': 'No vocabulary data yet',
    'education.analytics.practiceToSee': 'Students need to practice to see mastery',
  };
  return translations[key] || key;
};

describe('VocabularyHeatmap', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useLanguage as jest.Mock).mockReturnValue({
      t: mockT,
      language: 'en',
      setLanguage: vi.fn(),
    });
  });

  it('should render loading state', () => {
    // GIVEN: Hook returns loading
    (useVocabularyMastery as jest.Mock).mockReturnValue({
      heatmapData: null,
      isLoading: true,
      error: null,
      refresh: vi.fn(),
    });

    // WHEN
    render(<VocabularyHeatmap classroomId="classroom-1" />);

    // THEN
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('should render grid with correct dimensions', () => {
    // GIVEN: Hook returns heatmap data
    const mockData = {
      students: [
        { id: 'student-1', name: 'Alice' },
        { id: 'student-2', name: 'Bob' },
      ],
      words: ['word1', 'word2', 'word3'],
      cells: [
        {
          studentId: 'student-1',
          studentName: 'Alice',
          word: 'word1',
          masteryLevel: 'mastered' as const,
          accuracy: 90,
          attempts: 5,
        },
        {
          studentId: 'student-1',
          studentName: 'Alice',
          word: 'word2',
          masteryLevel: 'practicing' as const,
          accuracy: 65,
          attempts: 3,
        },
        {
          studentId: 'student-1',
          studentName: 'Alice',
          word: 'word3',
          masteryLevel: 'struggling' as const,
          accuracy: 40,
          attempts: 2,
        },
        {
          studentId: 'student-2',
          studentName: 'Bob',
          word: 'word1',
          masteryLevel: 'not-started' as const,
          accuracy: 0,
          attempts: 0,
        },
        {
          studentId: 'student-2',
          studentName: 'Bob',
          word: 'word2',
          masteryLevel: 'mastered' as const,
          accuracy: 85,
          attempts: 4,
        },
        {
          studentId: 'student-2',
          studentName: 'Bob',
          word: 'word3',
          masteryLevel: 'practicing' as const,
          accuracy: 70,
          attempts: 5,
        },
      ],
    };

    (useVocabularyMastery as jest.Mock).mockReturnValue({
      heatmapData: mockData,
      isLoading: false,
      error: null,
      refresh: vi.fn(),
    });

    // WHEN
    render(<VocabularyHeatmap classroomId="classroom-1" />);

    // THEN
    // Check student names (horizontal header)
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();

    // Check words (vertical header)
    expect(screen.getByText('word1')).toBeInTheDocument();
    expect(screen.getByText('word2')).toBeInTheDocument();
    expect(screen.getByText('word3')).toBeInTheDocument();
  });

  it('should render empty state when no data', () => {
    // GIVEN: Hook returns empty data
    (useVocabularyMastery as jest.Mock).mockReturnValue({
      heatmapData: {
        students: [],
        words: [],
        cells: [],
      },
      isLoading: false,
      error: null,
      refresh: vi.fn(),
    });

    // WHEN
    render(<VocabularyHeatmap classroomId="classroom-1" />);

    // THEN
    expect(screen.getByText('No vocabulary data yet')).toBeInTheDocument();
    expect(screen.getByText('Students need to practice to see mastery')).toBeInTheDocument();
  });

  it('should apply correct color for each mastery level', () => {
    // GIVEN: Hook returns data with all mastery levels
    const mockData = {
      students: [{ id: 'student-1', name: 'Alice' }],
      words: ['word1', 'word2', 'word3', 'word4'],
      cells: [
        {
          studentId: 'student-1',
          studentName: 'Alice',
          word: 'word1',
          masteryLevel: 'mastered' as const,
          accuracy: 90,
          attempts: 5,
        },
        {
          studentId: 'student-1',
          studentName: 'Alice',
          word: 'word2',
          masteryLevel: 'practicing' as const,
          accuracy: 65,
          attempts: 3,
        },
        {
          studentId: 'student-1',
          studentName: 'Alice',
          word: 'word3',
          masteryLevel: 'struggling' as const,
          accuracy: 40,
          attempts: 2,
        },
        {
          studentId: 'student-1',
          studentName: 'Alice',
          word: 'word4',
          masteryLevel: 'not-started' as const,
          accuracy: 0,
          attempts: 0,
        },
      ],
    };

    (useVocabularyMastery as jest.Mock).mockReturnValue({
      heatmapData: mockData,
      isLoading: false,
      error: null,
      refresh: vi.fn(),
    });

    // WHEN
    const { container } = render(<VocabularyHeatmap classroomId="classroom-1" />);

    // THEN
    const cells = container.querySelectorAll('[data-cell]');
    expect(cells).toHaveLength(4);

    // Check for mastery level classes (mastered = cyan, practicing = yellow, struggling = orange, not-started = navy)
    const masteredCell = container.querySelector('[data-mastery="mastered"]');
    const practicingCell = container.querySelector('[data-mastery="practicing"]');
    const strugglingCell = container.querySelector('[data-mastery="struggling"]');
    const notStartedCell = container.querySelector('[data-mastery="not-started"]');

    expect(masteredCell).toHaveClass('bg-neo-cyan');
    expect(practicingCell).toHaveClass('bg-neo-lime');
    expect(strugglingCell).toHaveClass('bg-neo-orange');
    expect(notStartedCell).toHaveClass('bg-neo-navy/50');
  });

  it('should show tooltip on hover', async () => {
    // GIVEN: Hook returns heatmap data
    const mockData = {
      students: [{ id: 'student-1', name: 'Alice' }],
      words: ['word1'],
      cells: [
        {
          studentId: 'student-1',
          studentName: 'Alice',
          word: 'word1',
          masteryLevel: 'mastered' as const,
          accuracy: 90,
          attempts: 5,
        },
      ],
    };

    (useVocabularyMastery as jest.Mock).mockReturnValue({
      heatmapData: mockData,
      isLoading: false,
      error: null,
      refresh: vi.fn(),
    });

    // WHEN
    const { container } = render(<VocabularyHeatmap classroomId="classroom-1" />);
    const cell = container.querySelector('[data-cell]');

    if (cell) {
      fireEvent.mouseEnter(cell);
    }

    // THEN
    await waitFor(() => {
      expect(screen.getByText(/Alice.*90.*word1/)).toBeInTheDocument();
    });
  });

  it('should call onCellClick when cell clicked', () => {
    // GIVEN: Hook returns heatmap data and onCellClick callback
    const mockOnCellClick = vi.fn();
    const mockData = {
      students: [{ id: 'student-1', name: 'Alice' }],
      words: ['word1'],
      cells: [
        {
          studentId: 'student-1',
          studentName: 'Alice',
          word: 'word1',
          masteryLevel: 'mastered' as const,
          accuracy: 90,
          attempts: 5,
        },
      ],
    };

    (useVocabularyMastery as jest.Mock).mockReturnValue({
      heatmapData: mockData,
      isLoading: false,
      error: null,
      refresh: vi.fn(),
    });

    // WHEN
    const { container } = render(
      <VocabularyHeatmap classroomId="classroom-1" onCellClick={mockOnCellClick} />
    );
    const cell = container.querySelector('[data-cell]');

    if (cell) {
      fireEvent.click(cell);
    }

    // THEN
    expect(mockOnCellClick).toHaveBeenCalledWith('student-1', 'word1');
  });

  it('should render legend', () => {
    // GIVEN: Hook returns data
    const mockData = {
      students: [{ id: 'student-1', name: 'Alice' }],
      words: ['word1'],
      cells: [
        {
          studentId: 'student-1',
          studentName: 'Alice',
          word: 'word1',
          masteryLevel: 'mastered' as const,
          accuracy: 90,
          attempts: 5,
        },
      ],
    };

    (useVocabularyMastery as jest.Mock).mockReturnValue({
      heatmapData: mockData,
      isLoading: false,
      error: null,
      refresh: vi.fn(),
    });

    // WHEN
    const { container } = render(<VocabularyHeatmap classroomId="classroom-1" />);

    // THEN
    expect(screen.getByText(/Mastery Levels/i)).toBeInTheDocument();
    expect(screen.getByText(/Mastered/i)).toBeInTheDocument();
    expect(screen.getByText(/Practicing/i)).toBeInTheDocument();
    expect(screen.getByText(/Struggling/i)).toBeInTheDocument();
    expect(screen.getByText(/Not Started/i)).toBeInTheDocument();
  });

  it('should show error state', () => {
    // GIVEN: Hook returns error
    (useVocabularyMastery as jest.Mock).mockReturnValue({
      heatmapData: null,
      isLoading: false,
      error: new Error('Failed to load data'),
      refresh: vi.fn(),
    });

    // WHEN
    render(<VocabularyHeatmap classroomId="classroom-1" />);

    // THEN
    expect(screen.getByText(/Failed to load data/)).toBeInTheDocument();
  });
});
