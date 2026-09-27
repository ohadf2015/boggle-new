/**
 * The preview endpoint is an unauthenticated lookup keyed on a 6-character join code.
 *
 * That makes it an enumeration oracle: anyone can walk the code space and, for every hit, learn a
 * classroom's name and id. Classroom names are teacher-written and routinely personal
 * ("Mrs Cohen's Year 4"), so this is a real disclosure, not a theoretical one.
 *
 * The route's own docstring claimed "Rate limited to prevent code enumeration attempts" and
 * documented a 429 response. Neither existed — no import, no check, no 429 path anywhere in the
 * file. This test exists so that claim is enforced by the suite rather than asserted in a comment.
 * (Same shape as the three false guarantees found in the education module on 2026-08-25: check the
 * system, not the sentence.)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const rpc = vi.fn();
vi.mock('@/utils/supabase/server', () => ({
  createClient: vi.fn(async () => ({ rpc })),
}));
vi.mock('@/utils/logger', () => ({ default: { error: vi.fn(), log: vi.fn(), warn: vi.fn() } }));

import { GET } from '../route';

/** Every request from one caller must look like one caller — same IP header each time. */
const req = (code: string, ip = '203.0.113.9') =>
  new NextRequest(`https://example.com/api/education/classroom/preview?code=${code}`, {
    headers: { 'x-forwarded-for': ip },
  });

describe('GET /api/education/classroom/preview — enumeration guard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    rpc.mockResolvedValue({ data: [{ id: 'c1', name: 'Year 4 Literacy', language: 'en' }], error: null });
  });

  it('stops a caller hammering the code space, with a 429', async () => {
    let sawRateLimit = false;

    // Deliberately well above the configured cap rather than equal to it — the exact number is
    // tuned for a whole class sharing one school IP and will move again. What must not change is
    // that sustained scanning eventually hits a wall.
    for (let i = 0; i < 200; i++) {
      const res = await GET(req(`AAA${String(i).padStart(3, '0')}`));
      if (res.status === 429) {
        sawRateLimit = true;
        break;
      }
    }

    expect(sawRateLimit).toBe(true);
  });

  it('still serves an ordinary student their first look-up', async () => {
    // The guard must not break the feature it protects.
    const res = await GET(req('ABC123', '198.51.100.4'));
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({ name: 'Year 4 Literacy' });
  });

  it('never leaks more than the confirmation UX needs', async () => {
    // A student needs to recognise the room. They do not need the teacher's identity, the roster,
    // or anything else the RPC may return now or later.
    rpc.mockResolvedValue({
      data: [
        {
          id: 'c1',
          name: 'Year 4 Literacy',
          language: 'en',
          teacher_id: 'teacher-uuid',
          member_count: 27,
          join_code: 'ABC123',
        },
      ],
      error: null,
    });

    const res = await GET(req('ABC123', '198.51.100.5'));
    const body = await res.json();

    expect(Object.keys(body).sort()).toEqual(['id', 'language', 'name']);
    expect(body).not.toHaveProperty('teacher_id');
    expect(body).not.toHaveProperty('member_count');
    expect(body).not.toHaveProperty('join_code');
  });
});
