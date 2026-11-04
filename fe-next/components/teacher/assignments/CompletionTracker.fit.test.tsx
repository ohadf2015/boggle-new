import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { AssignmentResultsView } from './AssignmentResultsView';
import { buildAssignmentResults } from '@/lib/education/assignmentCompletionResults';

vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ t: (k: string) => k, language: 'he' }) }));
vi.mock('@/hooks/useTeacherPro', () => ({ useTeacherPro: () => ({ hasPro: true, loading: false }) }));

const roster = Array.from({ length: 32 }, (_, i) => ({ studentId: `s${i}`, name: `תלמיד ${i}` }));
const words = Array.from({ length: 20 }, (_, i) => `word${i}`);
const rows = roster.slice(0, 24).map((s, i) => ({
  student_id: s.studentId,
  words_attempted: Object.fromEntries(words.map((w, j) => [w, { correct: (i + j) % 3 === 0 ? 0 : 1, attempts: 1 }])),
  words_mastered: [],
}));

describe('assignment results fit a calm panel with a full class', () => {
  const results = buildAssignmentResults({ rows, roster, fallbackName: 'x' });

  it('caps need-help at three names and the missed words at five', () => {
    render(<AssignmentResultsView results={results} classroomId="c1" classroomName="5B" />);
    expect(within(screen.getByTestId('results-need-help')).getAllByRole('listitem').length).toBeLessThanOrEqual(3);
    expect(within(screen.getByTestId('results-missed-words')).getAllByTestId('missed-word')).toHaveLength(5);
  });

  it('scrolls the long lists inside their own box instead of growing the page', () => {
    render(<AssignmentResultsView results={results} classroomId="c1" classroomName="5B" />);
    expect(screen.getByTestId('results-played').className).toMatch(/max-h-48 .*overflow-y-auto|overflow-y-auto.*max-h-48/);
    const waiting = within(screen.getByTestId('results-not-played')).getByRole('list');
    expect(waiting.className).toMatch(/max-h-20/);
    expect(waiting.className).toMatch(/overflow-y-auto/);
  });

  it('keeps the per-student list folded so the class summary is what fits on screen', () => {
    render(<AssignmentResultsView results={results} classroomId="c1" classroomName="5B" />);
    expect(screen.getByTestId('results-each-student')).not.toHaveAttribute('open');
  });

  it('shows at most three missed words per student, then a count', () => {
    render(<AssignmentResultsView results={results} classroomId="c1" classroomName="5B" />);
    const row = screen.getByTestId('played-s1');
    expect(within(row).getByText(/^\+\d+$/)).toBeInTheDocument();
  });
});
