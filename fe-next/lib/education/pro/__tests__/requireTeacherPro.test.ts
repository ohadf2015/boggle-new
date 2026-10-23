import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/subscriptions', () => ({ checkTeacherSubscription: vi.fn() }));
vi.mock('@/lib/education/accessTrialServer', () => ({ teacherHasProAccess: vi.fn() }));

import { requireTeacherPro } from '../requireTeacherPro';
import { checkTeacherSubscription } from '@/lib/subscriptions';
import { teacherHasProAccess } from '@/lib/education/accessTrialServer';

beforeEach(() => {
  vi.mocked(checkTeacherSubscription).mockResolvedValue({ has_pro: false } as never);
});

describe('requireTeacherPro', () => {
  it('given a free teacher, then it answers 402 Teacher Pro required', async () => {
    vi.mocked(teacherHasProAccess).mockResolvedValue(false);
    const res = await requireTeacherPro('t1');
    expect(res?.status).toBe(402);
    await expect(res?.json()).resolves.toMatchObject({ ok: false, error: 'Teacher Pro required' });
  });

  it('given paid Pro or a live access trial, then it lets the request through', async () => {
    vi.mocked(teacherHasProAccess).mockResolvedValue(true);
    await expect(requireTeacherPro('t1')).resolves.toBeNull();
    expect(teacherHasProAccess).toHaveBeenCalledWith('t1', { has_pro: false });
  });
});
