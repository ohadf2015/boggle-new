import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import CompletionTracker from './CompletionTracker';
import { getAssignmentCompletions } from '@/lib/supabase/education/assignments';

// Mock supabase functions
vi.mock('@/lib/supabase/education/assignments');
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: vi.fn(() => ({
    t: (key: string) => key,
    language: 'en',
  })),
}));

const mockGetAssignmentCompletions = getAssignmentCompletions as jest.MockedFunction<typeof getAssignmentCompletions>;

describe('CompletionTracker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders progress bar with correct percentage', async () => {
    mockGetAssignmentCompletions.mockResolvedValue({
      data: [
        {
          id: '1',
          assignment_id: 'assignment-1',
          student_id: 'student-1',
          completed_at: '2026-02-14',
          score: 100,
          accuracy: 95,
          time_spent_seconds: 120,
          profiles: { display_name: 'Alice', avatar_emoji: '🎓' },
        },
        {
          id: '2',
          assignment_id: 'assignment-1',
          student_id: 'student-2',
          completed_at: '2026-02-14',
          score: 80,
          accuracy: 85,
          time_spent_seconds: 150,
          profiles: { display_name: 'Bob', avatar_emoji: '📚' },
        },
      ],
      error: null,
    });

    render(<CompletionTracker assignmentId="assignment-1" totalStudents={5} />);

    await waitFor(() => {
      expect(screen.getByText('40%')).toBeInTheDocument(); // 2/5 = 40%
    });
  });

  it('shows completed students with scores', async () => {
    mockGetAssignmentCompletions.mockResolvedValue({
      data: [
        {
          id: '1',
          assignment_id: 'assignment-1',
          student_id: 'student-1',
          completed_at: '2026-02-14',
          score: 100,
          accuracy: 95,
          time_spent_seconds: 120,
          profiles: { display_name: 'Alice', avatar_emoji: '🎓' },
        },
      ],
      error: null,
    });

    render(<CompletionTracker assignmentId="assignment-1" totalStudents={3} />);

    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument();
      expect(screen.getByText('100')).toBeInTheDocument();
      expect(screen.getByText('95%')).toBeInTheDocument();
    });
  });

  it('renders struggling words section with error counts', async () => {
    // Mock completion data with word-level errors
    mockGetAssignmentCompletions.mockResolvedValue({
      data: [
        {
          id: '1',
          assignment_id: 'assignment-1',
          student_id: 'student-1',
          completed_at: '2026-02-14',
          score: 100,
          accuracy: 80,
          time_spent_seconds: 120,
          profiles: { display_name: 'Alice', avatar_emoji: '🎓' },
          incorrectWords: ['apple', 'banana', 'cherry'],
        },
        {
          id: '2',
          assignment_id: 'assignment-1',
          student_id: 'student-2',
          completed_at: '2026-02-14',
          score: 90,
          accuracy: 85,
          time_spent_seconds: 150,
          profiles: { display_name: 'Bob', avatar_emoji: '📚' },
          incorrectWords: ['apple', 'banana'],
        },
        {
          id: '3',
          assignment_id: 'assignment-1',
          student_id: 'student-3',
          completed_at: '2026-02-14',
          score: 70,
          accuracy: 70,
          time_spent_seconds: 180,
          profiles: { display_name: 'Charlie', avatar_emoji: '🎯' },
          incorrectWords: ['apple'],
        },
      ],
      error: null,
    });

    render(<CompletionTracker assignmentId="assignment-1" totalStudents={3} />);

    await waitFor(() => {
      expect(screen.getByText('teacher.completion.strugglingAreas')).toBeInTheDocument();
    });

    // Expand the struggling areas section
    const strugglingAreasButton = screen.getByText('teacher.completion.strugglingAreas');
    fireEvent.click(strugglingAreasButton);

    await waitFor(() => {
      // Should show top struggled words: apple (3), banana (2), cherry (1)
      expect(screen.getByText('apple')).toBeInTheDocument();
      expect(screen.getByText('3/3 teacher.completion.studentsMissed')).toBeInTheDocument();
      expect(screen.getByText('banana')).toBeInTheDocument();
      expect(screen.getByText('2/3 teacher.completion.studentsMissed')).toBeInTheDocument();
    });
  });

  it('shows no struggling areas message when no incorrect words', async () => {
    mockGetAssignmentCompletions.mockResolvedValue({
      data: [
        {
          id: '1',
          assignment_id: 'assignment-1',
          student_id: 'student-1',
          completed_at: '2026-02-14',
          score: 100,
          accuracy: 100,
          time_spent_seconds: 120,
          profiles: { display_name: 'Alice', avatar_emoji: '🎓' },
        },
      ],
      error: null,
    });

    render(<CompletionTracker assignmentId="assignment-1" totalStudents={1} />);

    await waitFor(() => {
      expect(screen.getByText('teacher.completion.strugglingAreas')).toBeInTheDocument();
    });

    // Expand the struggling areas section
    const strugglingAreasButton = screen.getByText('teacher.completion.strugglingAreas');
    fireEvent.click(strugglingAreasButton);

    await waitFor(() => {
      expect(screen.getByText('teacher.completion.noStrugglingAreas')).toBeInTheDocument();
    });
  });

  it('handles empty completion data', async () => {
    mockGetAssignmentCompletions.mockResolvedValue({
      data: [],
      error: null,
    });

    render(<CompletionTracker assignmentId="assignment-1" totalStudents={5} />);

    await waitFor(() => {
      expect(screen.getByText('0%')).toBeInTheDocument();
    });
  });
});
