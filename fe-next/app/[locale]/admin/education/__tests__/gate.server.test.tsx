import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('next/navigation', () => ({
  notFound: vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  }),
}));
vi.mock('@/lib/auth/isAdminSession', () => ({ isAdminSession: vi.fn() }));
vi.mock('../PageClient', () => ({ PageClient: () => 'EDU_DASHBOARD' }));

import AdminLayout from '../../layout';
import EducationPage from '../page';
import { isAdminSession } from '@/lib/auth/isAdminSession';

describe('/admin/education server gate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('a non-admin gets notFound and the dashboard is never rendered', async () => {
    (isAdminSession as ReturnType<typeof vi.fn>).mockResolvedValueOnce(false);
    await expect(AdminLayout({ children: EducationPage() })).rejects.toThrow('NEXT_NOT_FOUND');
  });

  it('an admin gets the dashboard page', async () => {
    (isAdminSession as ReturnType<typeof vi.fn>).mockResolvedValueOnce(true);
    const node = await AdminLayout({ children: EducationPage() });
    expect(node).toBeTruthy();
  });
});
