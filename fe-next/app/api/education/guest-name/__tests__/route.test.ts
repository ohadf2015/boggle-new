/**
 * The duplicate-name check is scoped to ONE CLASSROOM.
 *
 * The first version asked whether the derived username was free ANYWHERE, since
 * `profiles.username` is globally unique. The critic caught what that means for
 * a real child: the first Priya in a brand-new class was refused because a
 * student at another school had the name. `deriveGuestUsername` now appends a
 * random suffix, so usernames never collide and this route is only about the
 * cosmetic, local question — two Priyas in the same room.
 *
 * It stays server-side because `classroom_memberships` and `profiles` are not
 * readable by an unauthenticated browser (own-row RLS returns zero rows with a
 * null error, which would call every name free), and it FAILS OPEN everywhere:
 * a cosmetic duplicate must never become a locked door.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockFrom = vi.fn();
const mockCreateAdminClient = vi.fn(() => ({ from: mockFrom }));
vi.mock('@/utils/supabase/admin', () => ({
  createAdminClient: () => mockCreateAdminClient(),
}));
vi.mock('@/utils/logger', () => ({
  default: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

import { POST } from '../route';

const CLASSROOM_ID = 'c-1';

/**
 * A double that behaves like the REAL database, which is the point of this
 * rewrite.
 *
 * `classroom_memberships` has exactly two foreign keys: `classroom_id` ->
 * `public.classrooms`, and `student_id` -> **`auth.users`**. There is NO FK to
 * `public.profiles`, so PostgREST cannot resolve a `profiles(...)` embed off
 * this table and answers with a PGRST200 relationship error. The route treated
 * that as "lookup failed", failed open, and called every name available —
 * proven live: POST {"name":"FirstTapAda","joinCode":"UY6W8L"} returned
 * available:true while FirstTapAda was one of that classroom's 7 members.
 *
 * So this double REFUSES an embed and only answers a two-step read. A mock that
 * cheerfully returns embedded rows is fiction, and fiction is what let the
 * broken query ship green.
 */
function mockDb(opts = {}) {
  mockFrom.mockImplementation((table) => {
    if (table === 'classrooms') {
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({
              data: opts.classroom === undefined ? { id: CLASSROOM_ID } : opts.classroom,
              error: opts.classroomError ?? null,
            }),
          }),
        }),
      };
    }

    if (table === 'classroom_memberships') {
      return {
        select: (cols) => {
          if (String(cols).includes('profiles')) {
            // Exactly what PostgREST returns when no FK joins the two tables.
            return {
              eq: async () => ({
                data: null,
                error: {
                  code: 'PGRST200',
                  message:
                    "Could not find a relationship between 'classroom_memberships' and 'profiles' in the schema cache",
                },
              }),
            };
          }
          return {
            eq: async () => ({
              data: (opts.studentIds ?? []).map((id) => ({ student_id: id })),
              error: opts.membershipError ?? null,
            }),
          };
        },
      };
    }

    // `profiles`, read by id.
    return {
      select: () => ({
        in: async () => ({ data: opts.profiles ?? [], error: opts.profilesError ?? null }),
      }),
    };
  });
}

const req = (body: unknown) =>
  new Request('http://localhost/api/education/guest-name', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }) as never;

describe('POST /api/education/guest-name', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateAdminClient.mockReturnValue({ from: mockFrom });
  });

  it('reads the roster WITHOUT a profiles embed', async () => {
    // GIVEN a roster that only a two-step read can reach. The double refuses an
    // embed the way PostgREST does, so a route that still tries one gets an
    // error, fails open, and this assertion fails.
    mockDb({ studentIds: ['s1'], profiles: [{ display_name: 'FirstTapAda' }] });

    const res = await POST(req({ name: 'FirstTapAda', joinCode: 'UY6W8L' }));

    // THEN the roster was reached, which only the two-step read can do
    expect(res.status).toBe(409);
    // `profiles` is queried as its own table rather than embedded.
    expect(mockFrom.mock.calls.map((c) => c[0])).toEqual([
      'classrooms',
      'classroom_memberships',
      'profiles',
    ]);
  });

  it('sees a member whose name matches — the live repro', async () => {
    // The exact live case: FirstTapAda is one of 7 members of UY6W8L, and the
    // route said available:true.
    mockDb({
      studentIds: ['s1', 's2'],
      profiles: [{ display_name: 'FirstTapAda' }, { display_name: 'Sam' }],
    });

    const res = await POST(req({ name: 'FirstTapAda', joinCode: 'UY6W8L' }));

    expect(res.status).toBe(409);
    await expect(res.json()).resolves.toMatchObject({
      code: 'NAME_TAKEN',
      suggestedName: 'FirstTapAda 2',
    });
  });

  it('lets the first Priya in a brand-new classroom keep her name', async () => {
    // GIVEN an empty roster — the case the old global check wrongly refused
    mockDb({ studentIds: [], profiles: [] });

    const res = await POST(req({ name: 'Priya', joinCode: 'P45KRT' }));

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ available: true, name: 'Priya' });
  });

  it('ignores a name that is only taken in some OTHER classroom', async () => {
    mockDb({ studentIds: ['s1'], profiles: [{ display_name: 'Sam' }] });

    const res = await POST(req({ name: 'Priya', joinCode: 'P45KRT' }));

    expect(res.status).toBe(200);
  });

  it('treats a different capitalisation as the same name in the room', async () => {
    mockDb({ studentIds: ['s1'], profiles: [{ display_name: 'Priya' }] });

    const res = await POST(req({ name: 'priya', joinCode: 'P45KRT' }));

    expect(res.status).toBe(409);
    await expect(res.json()).resolves.toMatchObject({ suggestedName: 'priya 2' });
  });

  it('skips the profiles read entirely when the class has no members', async () => {
    // No ids means nothing to look up; a `.in('id', [])` round trip is wasted
    // work on the join path, which a student is waiting on.
    mockDb({ studentIds: [] });

    const res = await POST(req({ name: 'Priya', joinCode: 'P45KRT' }));

    expect(res.status).toBe(200);
    expect(mockFrom.mock.calls.map((c) => c[0])).not.toContain('profiles');
  });

  it('passes when no joinCode is supplied', async () => {
    const res = await POST(req({ name: 'Priya' }));

    expect(res.status).toBe(200);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('passes when the join code matches no classroom', async () => {
    // An unknown code is the join route's error to report; it must never read
    // to the student as "that name is taken".
    mockDb({ classroom: null });

    const res = await POST(req({ name: 'Priya', joinCode: 'NOPE12' }));

    expect(res.status).toBe(200);
  });

  it('rejects an empty name without touching the database', async () => {
    const res = await POST(req({ name: '   ', joinCode: 'P45KRT' }));

    expect(res.status).toBe(400);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('fails open when the membership read breaks', async () => {
    mockDb({ membershipError: { message: 'boom' } });

    const res = await POST(req({ name: 'Priya', joinCode: 'P45KRT' }));

    expect(res.status).toBe(200);
  });

  it('fails open when the profiles read breaks', async () => {
    mockDb({ studentIds: ['s1'], profilesError: { message: 'boom' } });

    const res = await POST(req({ name: 'Priya', joinCode: 'P45KRT' }));

    expect(res.status).toBe(200);
  });

  it('fails open when the service role is unavailable', async () => {
    mockCreateAdminClient.mockReturnValue(null);

    const res = await POST(req({ name: 'Priya', joinCode: 'P45KRT' }));

    expect(res.status).toBe(200);
  });

  it("never returns anybody else's names", async () => {
    mockDb({
      studentIds: ['s1', 's2', 's3'],
      profiles: [
        { display_name: 'Priya' },
        { display_name: 'Ravi' },
        { display_name: null },
      ],
    });

    const res = await POST(req({ name: 'Priya', joinCode: 'P45KRT' }));
    const bodyJson = await res.json();

    // A suggestion and nothing else — no roster, no count, no other student.
    expect(Object.keys(bodyJson).sort()).toEqual(['available', 'code', 'name', 'suggestedName']);
    expect(JSON.stringify(bodyJson)).not.toContain('Ravi');
  });
});
