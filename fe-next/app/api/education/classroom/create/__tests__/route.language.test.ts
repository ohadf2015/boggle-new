import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * The classroom-create body schema enumerated languages by hand and stopped at four
 * (en/he/sv/ja) while `lib/supabase/education` type Language, the access-request route and
 * the app itself are all six. Spanish and Russian teachers therefore 400'd on
 * "Invalid input".
 *
 * That is not theoretical: ClassroomManager seeds the form's language from the teacher's UI
 * locale (`useState({ language: language as Language })`), so a Spanish teacher submits
 * 'es' by default and cannot create a classroom at all. 7 of 28 teacher access requests are
 * locale 'es' — about a quarter of the teacher base, against 1 classroom ever created.
 *
 * `classrooms.language` has no CHECK constraint, so the schema was the only gate.
 */

vi.mock('@/utils/supabase/server', () => ({ createClient: vi.fn() }));
vi.mock('@/lib/auth/getAuthedUser', () => ({ getAuthedUser: vi.fn(async () => ({ id: 'teacher-1' })) }));
vi.mock('@/lib/subscriptions', () => ({
  canCreateClass: vi.fn(async () => ({ allowed: true, currentCount: 0, limit: 2 })),
}));

import { POST } from '../route';
import { createClient } from '@/utils/supabase/server';

const insert = vi.fn(() => ({ select: () => ({ single: async () => ({ data: { id: 'c-1' }, error: null }) }) }));

const req = (body: unknown) =>
  new Request('http://t/api/education/classroom/create', { method: 'POST', body: JSON.stringify(body) }) as never;

describe('POST /api/education/classroom/create — language coverage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (createClient as any).mockResolvedValue({ from: vi.fn(() => ({ insert })) });
  });

  it.each(['en', 'he', 'sv', 'ja', 'es', 'ru'])('accepts a %s classroom', async (language) => {
    const res = await POST(req({ name: 'Class A', language }));

    expect(res.status).toBe(201);
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ language }));
  });

  it('still rejects a language the app does not ship', async () => {
    const res = await POST(req({ name: 'Class A', language: 'fr' }));

    expect(res.status).toBe(400);
    expect(insert).not.toHaveBeenCalled();
  });
});
