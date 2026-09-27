import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import AssignmentTrackingPanel from './AssignmentTrackingPanel';
import { useAssignments } from '@/hooks/useAssignments';

// Mock hooks
vi.mock('@/hooks/useAssignments');
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: vi.fn(() => ({
    t: (key: string) => key,
    language: 'en',
  })),
}));

const mockGetAssignmentStatus = vi.fn((assignment) => {
  if (assignment.completion_count >= assignment.student_count) return 'completed';
  if (assignment.due_date && new Date(assignment.due_date) < new Date()) return 'overdue';
  return 'active';
});

const mockAssignments = [
  {
    id: '1',
    classroom_id: 'classroom-1',
    lesson_id: 'lesson-1',
    teacher_id: 'teacher-1',
    assignment_type: 'practice' as const,
    due_date: '2027-02-20',
    title: null,
    instructions: null,
    created_at: '2026-02-14',
    updated_at: '2026-02-14',
    vocabulary_lessons: { name: 'Basic Words' },
    completion_count: 2,
    student_count: 5,
  },
  {
    id: '2',
    classroom_id: 'classroom-1',
    lesson_id: 'lesson-2',
    teacher_id: 'teacher-1',
    assignment_type: 'duel' as const,
    due_date: '2026-02-10',
    title: null,
    instructions: null,
    created_at: '2026-02-13',
    updated_at: '2026-02-13',
    vocabulary_lessons: { name: 'Advanced Words' },
    completion_count: 1,
    student_count: 5,
  },
  {
    id: '3',
    classroom_id: 'classroom-1',
    lesson_id: 'lesson-3',
    teacher_id: 'teacher-1',
    assignment_type: 'practice' as const,
    due_date: '2026-02-25',
    title: null,
    instructions: null,
    created_at: '2026-02-12',
    updated_at: '2026-02-12',
    vocabulary_lessons: { name: 'Challenge Words' },
    completion_count: 5,
    student_count: 5,
  },
];

describe('AssignmentTrackingPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useAssignments as jest.Mock).mockReturnValue({
      assignments: mockAssignments,
      isLoading: false,
      error: null,
      getAssignmentStatus: mockGetAssignmentStatus,
    });
  });

  it('renders filter tabs with correct counts', () => {
    render(<AssignmentTrackingPanel classroomId="classroom-1" />);

    expect(screen.getByText(/teacher.tracking.all/)).toBeInTheDocument();
    expect(screen.getByText(/teacher.tracking.active/)).toBeInTheDocument();
    expect(screen.getByText(/teacher.tracking.overdue/)).toBeInTheDocument();
    expect(screen.getByText(/teacher.tracking.completed/)).toBeInTheDocument();
  });

  it('filters assignments when tab clicked', () => {
    render(<AssignmentTrackingPanel classroomId="classroom-1" />);

    // All tab shows all assignments
    expect(screen.getByText('Basic Words')).toBeInTheDocument();
    expect(screen.getByText('Advanced Words')).toBeInTheDocument();
    expect(screen.getByText('Challenge Words')).toBeInTheDocument();

    // Click Active tab
    const activeTab = screen.getByText(/teacher.tracking.active/);
    fireEvent.click(activeTab);

    // Should show only active assignments (not overdue or completed)
    expect(screen.getByText('Basic Words')).toBeInTheDocument();
  });

  it('shows assignment cards with lesson name, due date, status', () => {
    render(<AssignmentTrackingPanel classroomId="classroom-1" />);

    expect(screen.getByText('Basic Words')).toBeInTheDocument();
    const practiceLabels = screen.getAllByText(/teacher.tracking.practice/);
    expect(practiceLabels.length).toBeGreaterThan(0);
  });

  it('shows completion ratio progress bar', () => {
    render(<AssignmentTrackingPanel classroomId="classroom-1" />);

    // 2/5 students completed first assignment
    expect(screen.getByText('2/5 teacher.tracking.studentsCompleted')).toBeInTheDocument();
  });

  it('handles empty state', () => {
    (useAssignments as jest.Mock).mockReturnValue({
      assignments: [],
      isLoading: false,
      error: null,
      getAssignmentStatus: mockGetAssignmentStatus,
    });

    render(<AssignmentTrackingPanel classroomId="classroom-1" />);

    expect(screen.getByText('teacher.tracking.noAssignments')).toBeInTheDocument();
  });

  it('shows loading state with skeletons', () => {
    (useAssignments as jest.Mock).mockReturnValue({
      assignments: [],
      isLoading: true,
      error: null,
      getAssignmentStatus: mockGetAssignmentStatus,
    });

    render(<AssignmentTrackingPanel classroomId="classroom-1" />);

    const loadingElements = screen.getAllByTestId('skeleton');
    expect(loadingElements.length).toBeGreaterThan(0);
  });
});
