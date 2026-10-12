import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('next/navigation', () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
}));
vi.mock('@/lib/auth/isAdminSession', () => ({ isAdminSession: vi.fn() }));
vi.mock('../PageClient', () => ({ PageClient: () => 'EDU_DASHBOARD' }));

import AdminLayout from '../../layout';
import EducationPage from '../page';
import { isAdminSession } from '@/lib/auth/isAdminSession';

const params = Promise.resolve({ locale: 'en' });

describe('/admin/education server gate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('a non-admin is redirected and the dashboard is never rendered', async () => {
    (isAdminSession as ReturnType<typeof vi.fn>).mockResolvedValueOnce(false);
    await expect(AdminLayout({ children: EducationPage(), params })).rejects.toThrow(
      'NEXT_REDIRECT:/en'
    );
  });

  it('an admin gets the dashboard page', async () => {
    (isAdminSession as ReturnType<typeof vi.fn>).mockResolvedValueOnce(true);
    const node = await AdminLayout({ children: EducationPage(), params });
    expect(node).toBeTruthy();
  });
});
