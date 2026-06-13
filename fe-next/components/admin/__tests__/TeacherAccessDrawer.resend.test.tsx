import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { TeacherAccessRequest } from '@/lib/education/types';

const fetchWithAuth = vi.fn(async () => ({ ok: true, text: async () => '' }));
vi.mock('@/utils/authFetch', () => ({
  fetchWithAuth: (...args: any[]) => fetchWithAuth(...args),
}));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string, fb?: string) => fb || k, language: 'en' }),
}));
vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

import { TeacherAccessDrawer } from '../TeacherAccessDrawer';

const baseRow: TeacherAccessRequest = {
  id: 'req-1',
  user_id: null,
  email: 'teacher@school.edu',
  full_name: 'Ada Teacher',
  school_or_org: 'PS 118',
  country: 'US',
  role: 'teacher',
  locale: 'en',
  use_case: 'Vocabulary practice for my class.',
  status: 'approved',
  admin_note: null,
  reviewed_at: '2026-06-10T00:00:00Z',
  reviewed_by: 'admin-1',
  created_at: '2026-06-09T00:00:00Z',
};

describe('TeacherAccessDrawer resend', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows a resend button for an approved request and POSTs to the resend endpoint with the note', async () => {
    const user = userEvent.setup();
    render(<TeacherAccessDrawer row={baseRow} onClose={() => {}} onActioned={() => {}} />);

    const note = screen.getByLabelText(/admin_note|note/i);
    await user.type(note, 'Welcome back!');

    const resendBtn = screen.getByRole('button', { name: /resend/i });
    await user.click(resendBtn);

    await waitFor(() => expect(fetchWithAuth).toHaveBeenCalled());
    const [url, opts] = fetchWithAuth.mock.calls[0] as any;
    expect(url).toBe('/api/admin/teacher-access/req-1/resend');
    expect(JSON.parse(opts.body)).toEqual({ message: 'Welcome back!' });
  });

  it('does not show the resend button for a pending request', () => {
    render(<TeacherAccessDrawer row={{ ...baseRow, status: 'pending' }} onClose={() => {}} onActioned={() => {}} />);
    expect(screen.queryByRole('button', { name: /resend/i })).toBeNull();
  });
});
