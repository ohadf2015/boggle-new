import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

/**
 * The classroom-create dialog listed its language options by hand and stopped at four
 * (en/he/sv/ja) while the app ships six. Combined with `formData.language` seeding from the
 * teacher's UI locale, a Spanish teacher opened a `<select>` whose value ('es') matched no
 * option — the control showed someone else's language and submitting produced a 400 from
 * the create route. The dropdown must offer every language the route accepts.
 */

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'es' }),
}));

const createClassroom = vi.fn(async () => ({ success: true }));
vi.mock('@/hooks/useClassroom', () => ({
  useClassrooms: () => ({
    classrooms: [],
    isLoading: false,
    createClassroom,
    updateClassroom: vi.fn(),
    deleteClassroom: vi.fn(),
    refresh: vi.fn(),
  }),
}));

vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));

import ClassroomManager from '../ClassroomManager';
import { EDUCATION_LANGUAGES } from '@/lib/supabase/education/types';

const openCreateDialog = async () => {
  const user = userEvent.setup();
  render(<ClassroomManager />);
  await user.click(screen.getAllByRole('button', { name: /teacher\.classroom\.create/i })[0]);
  return user;
};

describe('ClassroomManager language picker', () => {
  it('offers every language the create route accepts', async () => {
    await openCreateDialog();

    const select = screen.getByRole('combobox') as HTMLSelectElement;
    const offered = Array.from(select.options).map((o) => o.value);

    expect(offered).toEqual([...EDUCATION_LANGUAGES]);
  });

  it("defaults to the teacher's own locale rather than a language they did not pick", async () => {
    await openCreateDialog();

    expect((screen.getByRole('combobox') as HTMLSelectElement).value).toBe('es');
  });
});
