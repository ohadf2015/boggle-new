/**
 * Regression: the admin teacher-access list is served by Express `/api/admin/*`
 * routes guarded by `adminAuth`, which requires `Authorization: Bearer <token>`.
 * A plain `fetch()` (cookie-only) gets a 401 "Missing authorization header", which
 * the queue silently collapses into an empty "No requests" state — so a real
 * pending request (e.g. Agáta) never appears. The queue MUST fetch via
 * `fetchWithAuth`, which attaches the bearer token from the Supabase session.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en' }),
}));

const fetchWithAuth = vi.fn();
vi.mock('@/utils/authFetch', () => ({
  fetchWithAuth: (...args: any[]) => fetchWithAuth(...args),
}));

import { TeacherAccessQueue } from '../TeacherAccessQueue';

beforeEach(() => {
  fetchWithAuth.mockReset();
  fetchWithAuth.mockResolvedValue({
    ok: true,
    json: async () => ({ ok: true, rows: [], count: 0, page: 0, pageSize: 50 }),
  });
  // If the component wrongly used global.fetch, this would be hit instead.
  global.fetch = vi.fn(async () => ({ ok: true, json: async () => ({ ok: true, rows: [] }) })) as any;
});

describe('<TeacherAccessQueue> authenticated fetch', () => {
  it('loads the request list via fetchWithAuth (sends bearer token)', async () => {
    render(<TeacherAccessQueue />);
    await waitFor(() => expect(fetchWithAuth).toHaveBeenCalled());
    const urls = fetchWithAuth.mock.calls.map((c) => String(c[0]));
    expect(urls.some((u) => u.includes('/api/admin/teacher-access'))).toBe(true);
  });

  it('does not use unauthenticated global.fetch for the admin API', async () => {
    render(<TeacherAccessQueue />);
    await waitFor(() => expect(fetchWithAuth).toHaveBeenCalled());
    const globalUrls = (global.fetch as any).mock.calls.map((c: any[]) => String(c[0]));
    expect(globalUrls.some((u: string) => u.includes('/api/admin/teacher-access'))).toBe(false);
  });
});
