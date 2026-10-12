import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('next/navigation', () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
}));
vi.mock('@/lib/auth/isAdminSession', () => ({ isAdminSession: vi.fn() }));

import AdminLayout from '../layout';
import { redirect } from 'next/navigation';
import { isAdminSession } from '@/lib/auth/isAdminSession';

const params = Promise.resolve({ locale: 'en' });

describe('admin layout server gate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('redirects a non-admin session to the locale home before rendering children', async () => {
    (isAdminSession as ReturnType<typeof vi.fn>).mockResolvedValueOnce(false);
    await expect(AdminLayout({ children: 'secret', params })).rejects.toThrow('NEXT_REDIRECT:/en');
    expect(redirect).toHaveBeenCalledWith('/en');
  });

  it('renders children for an admin session', async () => {
    (isAdminSession as ReturnType<typeof vi.fn>).mockResolvedValueOnce(true);
    const node = await AdminLayout({ children: 'dashboard', params });
    expect(node).toBe('dashboard');
    expect(redirect).not.toHaveBeenCalled();
  });
});
