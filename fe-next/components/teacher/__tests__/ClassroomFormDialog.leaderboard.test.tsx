import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en' }),
}));

const getVisibility = vi.fn();
vi.mock('@/lib/supabase/education/classrooms', () => ({
  getClassroomLeaderboardVisibility: (id: string) => getVisibility(id),
}));

import { ClassroomFormDialog } from '../ClassroomFormDialog';

const baseProps = { open: true, onOpenChange: vi.fn(), isSaving: false, initialName: 'Period 3', initialLanguage: 'en' as const };

describe('ClassroomFormDialog: class leaderboard setting', () => {
  beforeEach(() => getVisibility.mockReset());

  it('shows the saved setting for the class being edited', async () => {
    getVisibility.mockResolvedValue('hidden');
    render(<ClassroomFormDialog {...baseProps} classroomId="c1" onSubmit={vi.fn()} />);
    const group = screen.getByTestId('leaderboard-visibility-picker');
    await waitFor(() => expect(within(group).getByRole('radio', { name: /teacher.classroom.leaderboard.off\b/ })).toBeChecked());
    expect(getVisibility).toHaveBeenCalledWith('c1');
  });

  it('offers top 3 first, then everyone, just you and off', async () => {
    getVisibility.mockResolvedValue('top3');
    render(<ClassroomFormDialog {...baseProps} classroomId="c1" onSubmit={vi.fn()} />);
    const radios = within(screen.getByTestId('leaderboard-visibility-picker')).getAllByRole('radio') as HTMLInputElement[];
    expect(radios.map((r) => r.value)).toEqual(['top3', 'full', 'personal_only', 'hidden']);
  });

  it('saves the picked setting with the name and language', async () => {
    getVisibility.mockResolvedValue('top3');
    const onSubmit = vi.fn();
    render(<ClassroomFormDialog {...baseProps} classroomId="c1" onSubmit={onSubmit} />);
    const group = screen.getByTestId('leaderboard-visibility-picker');
    await waitFor(() => expect(within(group).getByRole('radio', { name: /teacher.classroom.leaderboard.top3\b/ })).toBeChecked());
    await userEvent.click(within(group).getByRole('radio', { name: /teacher.classroom.leaderboard.personal\b/ }));
    await userEvent.click(screen.getAllByRole('button', { name: 'teacher.classroom.edit' }).at(-1)!);
    expect(onSubmit).toHaveBeenCalledWith('Period 3', 'en', 'personal_only');
  });

  it('leaves the setting alone when the teacher only renames', async () => {
    getVisibility.mockResolvedValue('full');
    const onSubmit = vi.fn();
    render(<ClassroomFormDialog {...baseProps} classroomId="c1" onSubmit={onSubmit} />);
    await userEvent.click(screen.getAllByRole('button', { name: 'teacher.classroom.edit' }).at(-1)!);
    expect(onSubmit).toHaveBeenCalledWith('Period 3', 'en');
  });

  it('has no leaderboard picker without a class id', () => {
    render(<ClassroomFormDialog {...baseProps} onSubmit={vi.fn()} />);
    expect(screen.queryByTestId('leaderboard-visibility-picker')).toBeNull();
  });
});
