/**
 * AssignmentTrackingPanel — a real `lesson_assignments` row has no
 * assignment_type column. A Word Craft assignment (practice_focus 'wordcraft')
 * must read as Word Craft; a legacy NULL row must not, and never as '?'.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import AssignmentTrackingPanel from './AssignmentTrackingPanel';
import { useAssignments } from '@/hooks/useAssignments';

vi.mock('@/hooks/useAssignments');
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: vi.fn(() => ({ t: (key: string) => key, language: 'en' })),
}));

const row = (id: string, practice_focus: string | null) => ({
  id,
  classroom_id: 'c1',
  lesson_id: `l${id}`,
  due_date: '2027-02-20',
  created_at: '2026-09-18',
  practice_focus,
  vocabulary_lessons: { name: `Lesson ${id}` },
  completion_count: 1,
  student_count: 3,
});

describe('AssignmentTrackingPanel — Word Craft', () => {
  beforeEach(() => {
    (useAssignments as jest.Mock).mockReturnValue({
      assignments: [row('1', 'wordcraft'), row('2', null)],
      isLoading: false,
      error: null,
      getAssignmentStatus: () => 'active',
    });
  });

  it("Given a 'wordcraft' row and a legacy NULL row, Then only the first badge says Word Craft", () => {
    render(<AssignmentTrackingPanel classroomId="c1" onCreateAssignment={vi.fn()} />);
    const badges = screen.getAllByTestId('assignment-type-badge');
    expect(badges[0]).toHaveTextContent('education.wordcraftAssignment.title');
    expect(badges[1]).toHaveTextContent('teacher.tracking.practice');
    expect(screen.queryByText('?')).not.toBeInTheDocument();
  });
});
