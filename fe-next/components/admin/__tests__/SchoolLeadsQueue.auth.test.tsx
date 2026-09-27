/**
 * Same regression as TeacherAccessQueue: the school-leads admin list is behind
 * Express `adminAuth` and must be fetched with a bearer token via `fetchWithAuth`,
 * not a cookie-only plain `fetch()` (which 401s and renders an empty list).
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

import { SchoolLeadsQueue } from '../SchoolLeadsQueue';

beforeEach(() => {
  fetchWithAuth.mockReset();
  fetchWithAuth.mockResolvedValue({
    ok: true,
    json: async () => ({ ok: true, rows: [], count: 0, page: 0, pageSize: 50 }),
  });
  global.fetch = vi.fn(async () => ({ ok: true, json: async () => ({ ok: true, rows: [] }) })) as any;
});

describe('<SchoolLeadsQueue> authenticated fetch', () => {
  it('loads the leads list via fetchWithAuth (sends bearer token)', async () => {
    render(<SchoolLeadsQueue />);
    await waitFor(() => expect(fetchWithAuth).toHaveBeenCalled());
    const urls = fetchWithAuth.mock.calls.map((c) => String(c[0]));
    expect(urls.some((u) => u.includes('/api/admin/school-leads'))).toBe(true);
  });

  it('does not use unauthenticated global.fetch for the admin API', async () => {
    render(<SchoolLeadsQueue />);
    await waitFor(() => expect(fetchWithAuth).toHaveBeenCalled());
    const globalUrls = (global.fetch as any).mock.calls.map((c: any[]) => String(c[0]));
    expect(globalUrls.some((u: string) => u.includes('/api/admin/school-leads'))).toBe(false);
  });
});
