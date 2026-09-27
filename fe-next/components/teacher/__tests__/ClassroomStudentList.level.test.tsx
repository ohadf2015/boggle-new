import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';

/**
 * Per-student differentiation on the roster: a 3-way Support / Core / Challenge
 * segmented control per student, a one-line legend, optimistic update with
 * rollback + toast on failure.
 */

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en' }),
}));
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@/components/Avatar', () => ({ default: () => <div data-testid="avatar" /> }));
vi.mock('@/components/ui/PageLoader', () => ({ PageLoader: () => <div>loading</div> }));

const { mockGetClassroomStudents, mockSetStudentLevel } = vi.hoisted(() => ({
  mockGetClassroomStudents: vi.fn(),
  mockSetStudentLevel: vi.fn(),
}));
vi.mock('@/lib/supabase/education', () => ({
  getClassroomStudents: (...a: unknown[]) => mockGetClassroomStudents(...a),
  setStudentLevel: (...a: unknown[]) => mockSetStudentLevel(...a),
}));

import toast from 'react-hot-toast';
import ClassroomStudentList from '../ClassroomStudentList';

const roster = [
  { id: 'm1', student_id: 's1', classroom_id: 'c1', joined_at: new Date().toISOString(), level: 'core', profiles: { display_name: 'Ada' } },
  { id: 'm2', student_id: 's2', classroom_id: 'c1', joined_at: new Date().toISOString(), level: 'support', profiles: { display_name: 'Ben' } },
];

function rowFor(name: string) {
  return screen.getByText(name).closest('[data-student-row]') as HTMLElement;
}

describe('ClassroomStudentList — differentiation level', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetClassroomStudents.mockResolvedValue({ data: roster, error: null });
  });

  it('renders a Support / Core / Challenge control per student with the current level pressed', async () => {
    render(<ClassroomStudentList classroomId="c1" joinCode="ABC123" />);
    await screen.findByText('Ada');

    const ada = within(rowFor('Ada'));
    const group = ada.getByRole('group', { name: 'teacher.levels.label' });
    const buttons = within(group).getAllByRole('button');
    expect(buttons.map((b) => b.textContent)).toEqual([
      'teacher.levels.support',
      'teacher.levels.core',
      'teacher.levels.challenge',
    ]);
    expect(buttons[1]).toHaveAttribute('aria-pressed', 'true');
    expect(buttons[0]).toHaveAttribute('aria-pressed', 'false');

    const ben = within(rowFor('Ben'));
    expect(ben.getByRole('button', { name: 'teacher.levels.support' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('shows a one-line legend explaining what each level does', async () => {
    render(<ClassroomStudentList classroomId="c1" joinCode="ABC123" />);
    await screen.findByText('Ada');
    expect(screen.getByText('teacher.levels.legend')).toBeInTheDocument();
  });

  it('optimistically presses the new level, then persists via setStudentLevel(classroomId, studentId, level)', async () => {
    let resolve!: (v: { error: null }) => void;
    mockSetStudentLevel.mockReturnValue(new Promise((r) => { resolve = r; }));

    render(<ClassroomStudentList classroomId="c1" joinCode="ABC123" />);
    await screen.findByText('Ada');

    const ada = within(rowFor('Ada'));
    fireEvent.click(ada.getByRole('button', { name: 'teacher.levels.challenge' }));

    // Optimistic: pressed before the request settles.
    expect(ada.getByRole('button', { name: 'teacher.levels.challenge' })).toHaveAttribute('aria-pressed', 'true');
    expect(ada.getByRole('button', { name: 'teacher.levels.core' })).toHaveAttribute('aria-pressed', 'false');
    expect(mockSetStudentLevel).toHaveBeenCalledWith('c1', 's1', 'challenge');

    resolve({ error: null });
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('teacher.levels.saved'));
    expect(ada.getByRole('button', { name: 'teacher.levels.challenge' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('rolls back to the previous level and toasts when the save fails', async () => {
    mockSetStudentLevel.mockResolvedValue({ error: { message: 'Forbidden' } });

    render(<ClassroomStudentList classroomId="c1" joinCode="ABC123" />);
    await screen.findByText('Ben');

    const ben = within(rowFor('Ben'));
    fireEvent.click(ben.getByRole('button', { name: 'teacher.levels.challenge' }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('teacher.levels.saveFailed'));
    expect(ben.getByRole('button', { name: 'teacher.levels.support' })).toHaveAttribute('aria-pressed', 'true');
    expect(ben.getByRole('button', { name: 'teacher.levels.challenge' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('clicking the already-selected level is a no-op (no request)', async () => {
    render(<ClassroomStudentList classroomId="c1" joinCode="ABC123" />);
    await screen.findByText('Ada');

    fireEvent.click(within(rowFor('Ada')).getByRole('button', { name: 'teacher.levels.core' }));
    expect(mockSetStudentLevel).not.toHaveBeenCalled();
  });

  it('uses a large touch target (min 44px tall) on each segment', async () => {
    render(<ClassroomStudentList classroomId="c1" joinCode="ABC123" />);
    await screen.findByText('Ada');
    const btn = within(rowFor('Ada')).getByRole('button', { name: 'teacher.levels.core' });
    expect(btn.className).toMatch(/min-h-\[44px\]|min-h-11/);
  });
});
