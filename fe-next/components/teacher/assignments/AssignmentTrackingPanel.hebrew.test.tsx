import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import type { Mock } from 'vitest';
import AssignmentTrackingPanel from './AssignmentTrackingPanel';
import { useAssignments } from '@/hooks/useAssignments';
import { getCachedTranslation } from '@/translations/loadTranslation';

vi.mock('@/hooks/useAssignments');
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => {
    const he = getCachedTranslation('he') as Record<string, unknown>;
    const t = (key: string) => {
      const v = key.split('.').reduce<unknown>((o, p) => (o as Record<string, unknown> | undefined)?.[p], he);
      return typeof v === 'string' ? v : key;
    };
    return { t, language: 'he' };
  },
}));

describe('AssignmentTrackingPanel in Hebrew', () => {
  it('labels a practice assignment in Hebrew', () => {
    (useAssignments as Mock).mockReturnValue({
      assignments: [
        { id: '1', classroom_id: 'c1', lesson_id: 'l1', assignment_type: 'practice', due_date: null, created_at: '2026-11-01', practice_focus: null, vocabulary_lessons: { name: 'חיות' }, completion_count: 9, student_count: 14 },
        { id: '2', classroom_id: 'c1', lesson_id: 'l2', due_date: null, created_at: '2026-11-01', practice_focus: null, vocabulary_lessons: { name: 'צבעים' }, completion_count: 1, student_count: 14 },
      ],
      isLoading: false,
      error: null,
      getAssignmentStatus: () => 'active',
    });
    render(<AssignmentTrackingPanel classroomId="c1" onCreateAssignment={vi.fn()} />);
    for (const badge of screen.getAllByTestId('assignment-type-badge')) {
      expect(badge).toHaveTextContent('תרגול');
      expect(badge).not.toHaveTextContent(/practice/i);
    }
  });
});
