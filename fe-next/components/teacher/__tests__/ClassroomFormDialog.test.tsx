import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en' }),
}));

import { ClassroomFormDialog } from '../ClassroomFormDialog';
import { EDUCATION_LANGUAGES } from '@/lib/supabase/education/types';

const baseProps = {
  open: true,
  onOpenChange: vi.fn(),
  isSaving: false,
  onSubmit: vi.fn(),
  initialName: 'Period 3',
};

describe('ClassroomFormDialog (edit a class)', () => {
  it('offers every language the classroom routes accept', () => {
    render(<ClassroomFormDialog {...baseProps} />);

    const group = screen.getByRole('radiogroup', { name: 'teacher.classroom.language' });
    const radios = within(group).getAllByRole('radio') as HTMLInputElement[];
    expect(radios.map((r) => r.value)).toEqual([...EDUCATION_LANGUAGES]);
  });

  it('seeds name and language from the class being edited', () => {
    render(<ClassroomFormDialog {...baseProps} initialLanguage="es" />);

    expect(screen.getByPlaceholderText('teacher.classroom.namePlaceholder')).toHaveValue('Period 3');
    expect(screen.getByRole('radio', { name: /Español/ })).toBeChecked();
  });

  it('seeds language from the teacher locale when the class has none', () => {
    render(<ClassroomFormDialog {...baseProps} />);

    expect(screen.getByRole('radio', { name: /English/ })).toBeChecked();
  });

  it('is an edit dialog, never a create one', () => {
    render(<ClassroomFormDialog {...baseProps} />);

    expect(screen.getByRole('heading', { name: 'teacher.classroom.edit' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'teacher.classroom.create' })).toBeNull();
  });

  it('submits the trimmed new name', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<ClassroomFormDialog {...baseProps} onSubmit={onSubmit} />);

    const input = screen.getByPlaceholderText('teacher.classroom.namePlaceholder');
    await user.clear(input);
    await user.type(input, '  Period 4  ');
    await user.click(screen.getByRole('button', { name: 'teacher.classroom.edit' }));

    expect(onSubmit).toHaveBeenCalledWith('Period 4', 'en');
  });

  it('clearing the name disables submit', async () => {
    const user = userEvent.setup();
    render(<ClassroomFormDialog {...baseProps} />);

    await user.clear(screen.getByPlaceholderText('teacher.classroom.namePlaceholder'));

    expect(screen.getByRole('button', { name: 'teacher.classroom.edit' })).toBeDisabled();
  });

  it('cancel closes the dialog without submitting', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    const onSubmit = vi.fn();
    render(<ClassroomFormDialog {...baseProps} onOpenChange={onOpenChange} onSubmit={onSubmit} />);

    await user.click(screen.getByRole('button', { name: 'common.cancel' }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('renders nothing in the DOM while closed', () => {
    render(<ClassroomFormDialog {...baseProps} open={false} />);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
