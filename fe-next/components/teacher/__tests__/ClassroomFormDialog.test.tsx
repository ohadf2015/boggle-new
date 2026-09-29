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

  it('prefills the localized default name in create mode, so creating is one tap', () => {
    render(<ClassroomFormDialog {...baseProps} mode="create" />);

    expect(screen.getByPlaceholderText('teacher.classroom.namePlaceholder')).toHaveValue(
      'teacher.classroom.defaultName',
    );
    expect(screen.getByRole('button', { name: 'teacher.classroom.create' })).toBeEnabled();
  });

  it('a custom name replaces the prefilled default via standard select-all', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<ClassroomFormDialog {...baseProps} mode="create" onSubmit={onSubmit} />);

    await user.click(screen.getByPlaceholderText('teacher.classroom.namePlaceholder'));
    await user.keyboard('{Control>}a{/Control}  Period 3  ');
    await user.click(screen.getByRole('button', { name: 'teacher.classroom.create' }));

    expect(onSubmit).toHaveBeenCalledWith('Period 3', 'en');
  });

  it('clearing the prefilled name disables submit again', async () => {
    const user = userEvent.setup();
    render(<ClassroomFormDialog {...baseProps} mode="create" />);

    await user.clear(screen.getByPlaceholderText('teacher.classroom.namePlaceholder'));

    expect(screen.getByRole('button', { name: 'teacher.classroom.create' })).toBeDisabled();
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
