import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { StudentProgressTable } from '../StudentProgressTable';
import { useStudentProgressMetrics } from '@/hooks/useStudentProgressMetrics';
import type { StudentProgressSummary } from '@/lib/supabase/analytics';

// Mock the hook
vi.mock('@/hooks/useStudentProgressMetrics');
const mockUseStudentProgressMetrics = useStudentProgressMetrics as jest.MockedFunction<
  typeof useStudentProgressMetrics
>;

// Mock LanguageContext
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string, params?: any) => {
      if (key === 'education.analytics.daysAgo' && params) {
        return `${params.count} days ago`;
      }
      return key;
    },
    language: 'en',
  }),
}));

// Mock PageLoader
vi.mock('@/components/ui/PageLoader', () => ({
  PageLoader: () => <div data-testid="page-loader">Loading...</div>,
}));

describe('StudentProgressTable', () => {
  const mockStudents: StudentProgressSummary[] = [
    {
      studentId: 'student-1',
      displayName: 'Alice',
      avatarUrl: null,
      totalXp: 250,
      currentLevel: 3,
      vocabularyMastery: 80,
      overallAccuracy: 85,
      wordsAttempted: 50,
      wordsMastered: 40,
      lastPracticeDate: '2026-01-29',
      isStruggling: false,
      currentStreak: 5,
    },
    {
      studentId: 'student-2',
      displayName: 'Bob',
      avatarUrl: null,
      totalXp: 150,
      currentLevel: 2,
      vocabularyMastery: 50,
      overallAccuracy: 55,
      wordsAttempted: 30,
      wordsMastered: 15,
      lastPracticeDate: '2026-01-28',
      isStruggling: true,
      currentStreak: 2,
    },
    {
      studentId: 'student-3',
      displayName: 'Charlie',
      avatarUrl: null,
      totalXp: 300,
      currentLevel: 4,
      vocabularyMastery: 90,
      overallAccuracy: 92,
      wordsAttempted: 60,
      wordsMastered: 54,
      lastPracticeDate: '2026-01-29',
      isStruggling: false,
      currentStreak: 10,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render loading state', () => {
    // GIVEN: Loading state
    mockUseStudentProgressMetrics.mockReturnValue({
      students: [],
      isLoading: true,
      error: null,
      refresh: vi.fn(),
    });

    // WHEN
    render(<StudentProgressTable classroomId="classroom-1" />);

    // THEN
    expect(screen.getByTestId('page-loader')).toBeInTheDocument();
  });

  it('should render table with student rows', () => {
    // GIVEN: Students data
    mockUseStudentProgressMetrics.mockReturnValue({
      students: mockStudents,
      isLoading: false,
      error: null,
      refresh: vi.fn(),
    });

    // WHEN
    render(<StudentProgressTable classroomId="classroom-1" />);

    // THEN
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.getByText('Charlie')).toBeInTheDocument();
    expect(screen.getByText('250')).toBeInTheDocument(); // Alice's XP
    expect(screen.getByText('85%')).toBeInTheDocument(); // Alice's accuracy
  });

  it('should render empty state when no students', () => {
    // GIVEN: No students
    mockUseStudentProgressMetrics.mockReturnValue({
      students: [],
      isLoading: false,
      error: null,
      refresh: vi.fn(),
    });

    // WHEN
    render(<StudentProgressTable classroomId="classroom-1" />);

    // THEN
    expect(screen.getByText('education.analytics.noStudents')).toBeInTheDocument();
    expect(screen.getByText('education.analytics.inviteStudents')).toBeInTheDocument();
  });

  it('should sort by XP when XP header clicked', async () => {
    // GIVEN: Students data
    mockUseStudentProgressMetrics.mockReturnValue({
      students: mockStudents,
      isLoading: false,
      error: null,
      refresh: vi.fn(),
    });

    // WHEN
    render(<StudentProgressTable classroomId="classroom-1" />);

    // Initial render should have Charlie first (XP desc is default)
    const rows1 = screen.getAllByRole('row');
    expect(rows1[1]).toHaveTextContent('Charlie'); // 300 XP

    // Click XP header to toggle to ASC (may have sort indicator appended)
    const xpHeader = screen.getByText(/^XP/);
    fireEvent.click(xpHeader);

    // THEN
    await waitFor(() => {
      const rows = screen.getAllByRole('row');
      // Skip header row, check first data row has lowest XP
      expect(rows[1]).toHaveTextContent('Bob'); // 150 XP (lowest)
    });
  });

  it('should sort by accuracy when accuracy header clicked', async () => {
    // GIVEN: Students data
    mockUseStudentProgressMetrics.mockReturnValue({
      students: mockStudents,
      isLoading: false,
      error: null,
      refresh: vi.fn(),
    });

    // WHEN
    render(<StudentProgressTable classroomId="classroom-1" />);

    const accuracyHeader = screen.getByText('education.analytics.accuracy');
    fireEvent.click(accuracyHeader);

    // THEN
    await waitFor(() => {
      const rows = screen.getAllByRole('row');
      // Skip header row, check first data row has highest accuracy
      expect(rows[1]).toHaveTextContent('Charlie'); // 92% accuracy
    });
  });

  it('should highlight struggling students', () => {
    // GIVEN: Students data with struggling student
    mockUseStudentProgressMetrics.mockReturnValue({
      students: mockStudents,
      isLoading: false,
      error: null,
      refresh: vi.fn(),
    });

    // WHEN
    render(<StudentProgressTable classroomId="classroom-1" />);

    // THEN
    const bobRow = screen.getByText('Bob').closest('tr');
    expect(bobRow).toHaveClass('struggling-row'); // Or check for bg-neo-orange class
  });

  it('should call onStudentClick when row clicked', () => {
    // GIVEN: Students data and click handler
    const mockOnClick = vi.fn();
    mockUseStudentProgressMetrics.mockReturnValue({
      students: mockStudents,
      isLoading: false,
      error: null,
      refresh: vi.fn(),
    });

    // WHEN
    render(<StudentProgressTable classroomId="classroom-1" onStudentClick={mockOnClick} />);

    const aliceRow = screen.getByText('Alice').closest('tr');
    if (aliceRow) {
      fireEvent.click(aliceRow);
    }

    // THEN
    expect(mockOnClick).toHaveBeenCalledWith('student-1');
  });

  it('should hide columns on mobile', () => {
    // GIVEN: Mobile viewport (mock with CSS class)
    mockUseStudentProgressMetrics.mockReturnValue({
      students: mockStudents,
      isLoading: false,
      error: null,
      refresh: vi.fn(),
    });

    // WHEN
    render(<StudentProgressTable classroomId="classroom-1" />);

    // THEN
    const streakHeader = screen.getByText('education.analytics.streak');
    expect(streakHeader).toHaveClass('hidden', 'md:table-cell'); // Hidden on mobile, visible on md+
  });
});
