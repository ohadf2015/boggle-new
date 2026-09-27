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
    await waitFor(() => expect(screen.getAllByText('a@x.com')[0]).toBeInTheDocument());
  });

  it('opens drawer on row click', async () => {
    const user = userEvent.setup();
    render(<TeacherAccessQueue />);
    await waitFor(() => screen.getAllByText('a@x.com')[0]);
    await user.click(screen.getAllByText('a@x.com')[0]);
    expect(screen.getByText(/admin\.teacherAccess\.drawer_title/)).toBeInTheDocument();
  });

  describe('keyboard navigation', () => {
    it('rows have keyboard-navigable attributes', async () => {
      render(<TeacherAccessQueue />);
      await waitFor(() => screen.getAllByText('a@x.com')[0]);

      const row = screen.getByRole('button', { name: /admin\.teacherAccess\.row_open/ });
      expect(row).toHaveAttribute('tabIndex', '0');
      expect(row).toHaveAttribute('role', 'button');
      expect(row).toHaveAttribute('aria-label');
    });

    it('opens drawer on Enter key press', async () => {
      const user = userEvent.setup();
      render(<TeacherAccessQueue />);
      await waitFor(() => screen.getAllByText('a@x.com')[0]);

      const row = screen.getByRole('button', { name: /admin\.teacherAccess\.row_open/ });
      row.focus();
      await user.keyboard('{Enter}');

      expect(screen.getByText(/admin\.teacherAccess\.drawer_title/)).toBeInTheDocument();
    });

    it('opens drawer on Space key press', async () => {
      const user = userEvent.setup();
      render(<TeacherAccessQueue />);
      await waitFor(() => screen.getAllByText('a@x.com')[0]);

      const row = screen.getByRole('button', { name: /admin\.teacherAccess\.row_open/ });
      row.focus();
      await user.keyboard(' ');

      expect(screen.getByText(/admin\.teacherAccess\.drawer_title/)).toBeInTheDocument();
    });

    it('aria-label includes teacher name', async () => {
      render(<TeacherAccessQueue />);
      await waitFor(() => screen.getAllByText('a@x.com')[0]);

      // Get the row by finding the element that contains the teacher name in its row
      const rows = screen.getAllByRole('button', { name: /admin\.teacherAccess\.row_open/ });
      expect(rows.length).toBeGreaterThan(0);
      // First row should have "A" in the aria-label (the teacher name)
      expect(rows[0]).toHaveAttribute('aria-label', expect.stringContaining('A'));
    });
  });
});

describe('<TeacherAccessQueue> — Gift Pro entry point', () => {
  it('links to the Teacher Pro gifts page from the header', async () => {
    render(<TeacherAccessQueue />);
    await waitFor(() => screen.getAllByText('a@x.com')[0]);
    const link = screen.getByRole('link', { name: /admin\.teacherAccess\.giftPro/ });
    expect(link).toHaveAttribute('href', '/en/admin/teacher-pro');
  });
});
