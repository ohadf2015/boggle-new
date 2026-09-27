import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
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
};

describe('ClassroomFormDialog', () => {
  it('offers every language the create route accepts', () => {
    render(<ClassroomFormDialog {...baseProps} mode="create" />);

    const select = screen.getByRole('combobox') as HTMLSelectElement;
    expect(Array.from(select.options).map((o) => o.value)).toEqual([...EDUCATION_LANGUAGES]);
  });

  it('seeds name and language from initial values', () => {
    render(
      <ClassroomFormDialog {...baseProps} mode="edit" initialName="Period 3" initialLanguage="es" />
    );

    expect(screen.getByPlaceholderText('teacher.classroom.namePlaceholder')).toHaveValue('Period 3');
    expect((screen.getByRole('combobox') as HTMLSelectElement).value).toBe('es');
  });

  it('seeds language from the teacher locale when no initial value is given', () => {
    render(<ClassroomFormDialog {...baseProps} mode="create" />);

    expect((screen.getByRole('combobox') as HTMLSelectElement).value).toBe('en');
  });

  it('submit is disabled until the name is non-empty, then calls onSubmit trimmed', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<ClassroomFormDialog {...baseProps} mode="create" onSubmit={onSubmit} />);

    const submit = screen.getByRole('button', { name: 'teacher.classroom.create' });
    expect(submit).toBeDisabled();

    await user.type(screen.getByPlaceholderText('teacher.classroom.namePlaceholder'), '  Period 3  ');
    await user.click(submit);

    expect(onSubmit).toHaveBeenCalledWith('Period 3', 'en');
  });

  it('cancel closes the dialog without submitting', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    const onSubmit = vi.fn();
    render(
      <ClassroomFormDialog {...baseProps} mode="create" onOpenChange={onOpenChange} onSubmit={onSubmit} />
    );

    await user.click(screen.getByRole('button', { name: 'common.cancel' }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('renders nothing in the DOM while closed', () => {
    render(<ClassroomFormDialog {...baseProps} mode="create" open={false} />);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
