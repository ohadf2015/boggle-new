import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import AssignmentTrackingPanel from './AssignmentTrackingPanel';
import { useAssignments } from '@/hooks/useAssignments';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('@/lib/analytics/lazyPosthog', () => ({ default: { capture: vi.fn(), register: vi.fn(), __loaded: true } }));
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@/hooks/useAssignments');
vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ t: (key: string) => key, language: 'en' }) }));

const tracker = vi.fn();
vi.mock('./CompletionTracker', () => ({
  default: (props: Record<string, unknown>) => {
    tracker(props);
    return <div data-testid="assignment-results" />;
  },
}));

describe('AssignmentTrackingPanel results', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useAssignments as Mock).mockReturnValue({
      assignments: [
        { id: 'a1', classroom_id: 'c1', due_date: '2027-02-20', vocabulary_lessons: { name: 'Animals' }, completion_count: 1, student_count: 3 },
      ],
      isLoading: false,
      error: null,
      getAssignmentStatus: () => 'active',
    });
  });

  it('opens the results for this class when the teacher taps an assignment', () => {
    render(<AssignmentTrackingPanel classroomId="c1" classroomName="5B" />);
    const card = screen.getByRole('button', { name: /Animals/ });
    expect(card).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(card);
    expect(card).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByTestId('assignment-results')).toBeInTheDocument();
    expect(tracker).toHaveBeenCalledWith(expect.objectContaining({ assignmentId: 'a1', classroomId: 'c1', classroomName: '5B', totalStudents: 3 }));
  });
});
