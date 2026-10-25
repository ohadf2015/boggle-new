import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/utils/supabase/server', () => ({ createClient: vi.fn() }));
vi.mock('@/utils/supabase/admin', () => ({ createAdminClient: vi.fn() }));
vi.mock('@/utils/logger', () => ({ default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));
vi.mock('@/lib/education/pro/requireTeacherPro', () => ({ requireTeacherPro: vi.fn(async () => null) }));

import { DELETE } from '../route';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';

const CLASSROOM = '11111111-1111-4111-8111-111111111111';
const STUDENT = '22222222-2222-4222-8222-222222222222';

const userClient = (owns: boolean, user: { id: string } | null = { id: 'teacher-1' }) => ({
  auth: { getUser: async () => ({ data: { user } }) },
  from: () => ({
    select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: async () => ({ data: owns ? { id: CLASSROOM } : null, error: null }) }) }) }),
  }),
});

let upsert: ReturnType<typeof vi.fn>;
beforeEach(() => {
  vi.clearAllMocks();
  upsert = vi.fn(async () => ({ error: null }));
  (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({ from: vi.fn(() => ({ upsert })) });
});

const ctx = () => ({ params: Promise.resolve({ id: CLASSROOM, studentId: STUDENT }) });
const req = () => new Request('http://t/x', { method: 'DELETE' });

describe('DELETE parent-report: revoke every link for one student', () => {
  it('lets the owning teacher revoke', async () => {
    (createClient as ReturnType<typeof vi.fn>).mockResolvedValue(userClient(true));
    const res = await DELETE(req(), ctx());
    expect(res.status).toBe(200);
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({ classroom_id: CLASSROOM, student_id: STUDENT }),
      expect.anything(),
    );
  });

  it('refuses a teacher who does not own the class', async () => {
    (createClient as ReturnType<typeof vi.fn>).mockResolvedValue(userClient(false));
    const res = await DELETE(req(), ctx());
    expect(res.status).toBe(403);
    expect(upsert).not.toHaveBeenCalled();
  });

  it('refuses a signed-out caller', async () => {
    (createClient as ReturnType<typeof vi.fn>).mockResolvedValue(userClient(true, null));
    expect((await DELETE(req(), ctx())).status).toBe(401);
  });

  it('works without Pro, so a lapsed teacher can still kill old links', async () => {
    const { requireTeacherPro } = await import('@/lib/education/pro/requireTeacherPro');
    (requireTeacherPro as ReturnType<typeof vi.fn>).mockResolvedValue(new Response(null, { status: 402 }));
    (createClient as ReturnType<typeof vi.fn>).mockResolvedValue(userClient(true));
    expect((await DELETE(req(), ctx())).status).toBe(200);
  });
});
