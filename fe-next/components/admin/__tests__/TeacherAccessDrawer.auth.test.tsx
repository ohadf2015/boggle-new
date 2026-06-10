/**
 * The approve/decline actions hit Express `adminAuth`-guarded routes and must
 * carry a bearer token via `fetchWithAuth`. A cookie-only plain `fetch()` 401s,
 * so the admin can never approve/decline a request.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { TeacherAccessRequest } from '@/lib/education/types';

vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en' }),
}));

const fetchWithAuth = vi.fn();
vi.mock('@/utils/authFetch', () => ({
  fetchWithAuth: (...args: any[]) => fetchWithAuth(...args),
}));

import { TeacherAccessDrawer } from '../TeacherAccessDrawer';

const row: TeacherAccessRequest = {
  id: 'abc123', email: 'a@x.com', full_name: 'A', role: 'teacher', locale: 'en', country: 'US',
  status: 'pending', use_case: 'reason', created_at: '2026-05-14T00:00:00Z',
  school_or_org: 'School A', admin_note: null, reviewed_at: null, reviewed_by: null, user_id: null,
} as any;

beforeEach(() => {
  fetchWithAuth.mockReset();
  fetchWithAuth.mockResolvedValue({ ok: true, json: async () => ({ ok: true }), text: async () => '' });
  global.fetch = vi.fn(async () => ({ ok: true, text: async () => '' })) as any;
});

describe('<TeacherAccessDrawer> authenticated actions', () => {
  it('approves via fetchWithAuth (sends bearer token)', async () => {
    const user = userEvent.setup();
    render(<TeacherAccessDrawer row={row} onClose={vi.fn()} onActioned={vi.fn()} />);
    await user.click(screen.getByText(/admin\.teacherAccess\.approve/));
    await waitFor(() => expect(fetchWithAuth).toHaveBeenCalled());
    const [url] = fetchWithAuth.mock.calls[0];
    expect(String(url)).toContain('/api/admin/teacher-access/abc123/approve');
    expect((global.fetch as any).mock.calls.length).toBe(0);
  });
});
