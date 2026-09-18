/**
 * CompletionTracker — completions now come from live `student_lesson_progress`
 * rows, which carry no score/accuracy columns. A bare "%" must not render.
 */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import CompletionTracker from './CompletionTracker';
import { getAssignmentCompletions } from '@/lib/supabase/education/assignments';

vi.mock('@/lib/supabase/education/assignments');
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: vi.fn(() => ({ t: (key: string) => key, language: 'en' })),
}));

describe('CompletionTracker — live progress rows', () => {
  it('Given a completion without score/accuracy, Then the name shows and no empty "%" does', async () => {
    (getAssignmentCompletions as jest.Mock).mockResolvedValue({
      data: [{
        id: 'p1', assignment_id: 'a1', student_id: 's1', completed_at: '2026-09-18T20:46:04Z',
        total_xp: 70, profiles: { display_name: 'Maya WC' },
      }],
      error: null,
    });
    render(<CompletionTracker assignmentId="a1" totalStudents={2} />);
    await waitFor(() => expect(screen.getByText('Maya WC')).toBeInTheDocument());
    expect(screen.queryByText('%')).not.toBeInTheDocument();
  });
});
