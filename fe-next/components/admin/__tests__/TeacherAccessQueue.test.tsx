import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en' }),
}));

const rows = [{
  id: 'r1', email: 'a@x.com', full_name: 'A', role: 'teacher', locale: 'en', country: 'US',
  status: 'pending' as const, use_case: 'reason', created_at: '2026-05-14T00:00:00Z',
  school_or_org: 'School A', admin_note: null, reviewed_at: null, reviewed_by: null, user_id: null,
}];

beforeEach(() => {
  global.fetch = vi.fn(async (url: any) => {
    return { ok: true, json: async () => ({ ok: true, rows, count: 1, page: 0, pageSize: 50 }) } as any;
  }) as any;
});

import { TeacherAccessQueue } from '../TeacherAccessQueue';

describe('<TeacherAccessQueue>', () => {
  it('renders rows from API', async () => {
    render(<TeacherAccessQueue />);
    await waitFor(() => expect(screen.getByText('a@x.com')).toBeInTheDocument());
  });

  it('opens drawer on row click', async () => {
    const user = userEvent.setup();
    render(<TeacherAccessQueue />);
    await waitFor(() => screen.getByText('a@x.com'));
    await user.click(screen.getByText('a@x.com'));
    expect(screen.getByText(/admin\.teacherAccess\.drawer_title/)).toBeInTheDocument();
  });
});
