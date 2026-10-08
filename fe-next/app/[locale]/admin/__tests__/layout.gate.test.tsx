import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('next/navigation', () => ({
  notFound: vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  }),
}));
vi.mock('@/lib/auth/isAdminSession', () => ({ isAdminSession: vi.fn() }));

import AdminLayout from '../layout';
import { notFound } from 'next/navigation';
import { isAdminSession } from '@/lib/auth/isAdminSession';

describe('admin layout server gate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 404 before rendering children for a non-admin session', async () => {
    (isAdminSession as ReturnType<typeof vi.fn>).mockResolvedValueOnce(false);
    await expect(AdminLayout({ children: 'secret' })).rejects.toThrow('NEXT_NOT_FOUND');
    expect(notFound).toHaveBeenCalledTimes(1);
  });

  it('renders children for an admin session', async () => {
    (isAdminSession as ReturnType<typeof vi.fn>).mockResolvedValueOnce(true);
    const node = await AdminLayout({ children: 'dashboard' });
    expect(node).toBe('dashboard');
    expect(notFound).not.toHaveBeenCalled();
  });
});
