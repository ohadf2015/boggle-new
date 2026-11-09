// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/utils/supabase/server', () => ({ createClient: vi.fn() }));
vi.mock('@/utils/supabase/admin', () => ({ createAdminClient: vi.fn() }));
vi.mock('@/lib/auth/getAuthedUser', () => ({ getAuthedUser: vi.fn(async () => null) }));
vi.mock('@/lib/subscriptions', () => ({ canAddStudent: vi.fn(async () => ({ allowed: true, currentCount: 0, limit: 50 })) }));
vi.mock('@/lib/education/classroomGameLookup', () => ({ lookupLiveClassroomGame: vi.fn(async () => null) }));
vi.mock('@/lib/education/liveGameForClassroom', () => ({ lookupLiveGameForClassroom: vi.fn(async () => null) }));
vi.mock('@/lib/education/joinTelemetry', () => ({ captureStudentJoinEvents: vi.fn(async () => undefined) }));
vi.mock('@/utils/onboardingNameSuggestions', () => ({ suggestPlayerName: vi.fn((l: string) => `Fun-${l}`) }));
vi.mock('../endedSessionCode', () => ({
  lookupEndedClassroomSession: vi.fn(async () => null),
  recordEndedCodeTry: vi.fn(async () => undefined),
}));

import { POST } from '../route';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { getAuthedUser } from '@/lib/auth/getAuthedUser';

const mocked = (fn: unknown) => fn as ReturnType<typeof vi.fn>;
let ip = 0;
const req = (body: unknown, referer = 'https://www.lexiclash.live/he/join/ABC123') =>
  new Request('https://x.test/api/education/classroom/join', {
    method: 'POST',
    headers: { 'x-forwarded-for': `10.9.${++ip}.1`, referer },
    body: JSON.stringify(body),
  }) as never;

let signInAnonymously: ReturnType<typeof vi.fn>;
let adminInsert: ReturnType<typeof vi.fn>;
let profileUpdate: ReturnType<typeof vi.fn>;
let classroomTeacher: string | null;
let updateUserById: ReturnType<typeof vi.fn>;
let updateEqs: unknown[][];

function setup() {
  signInAnonymously = vi.fn(async () => ({ data: { user: { id: 'guest-1' } }, error: null }));
  adminInsert = vi.fn(async () => ({ error: null }));
  updateEqs = [];
  updateUserById = vi.fn(async () => ({ error: null }));
  const updateChain: { eq: (...a: unknown[]) => unknown; then: (r: (v: unknown) => void) => void } = {
    eq: (...a: unknown[]) => { updateEqs.push(a); return updateChain; },
    then: (r) => r({ error: null }),
  };
  profileUpdate = vi.fn(() => updateChain);
  mocked(createClient).mockResolvedValue({
    auth: { signInAnonymously },
    rpc: vi.fn(async () => ({ data: [{ id: 'c-1' }], error: null })),
    from: vi.fn(() => ({
      select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }) }),
    })),
  });
  mocked(createAdminClient).mockReturnValue({
    auth: { admin: { updateUserById } },
    from: vi.fn((table: string) => {
      if (table === 'classrooms') {
        return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: classroomTeacher ? { teacher_id: classroomTeacher } : null, error: null }) }) }) };
      }
      if (table === 'profiles') return { update: profileUpdate };
      const counted = { eq: () => counted, then: (r: (v: unknown) => void) => r({ count: 0, error: null }) };
      return { insert: adminInsert, select: () => counted };
    }),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  classroomTeacher = 'teacher-1';
  mocked(getAuthedUser).mockResolvedValue(null);
  setup();
});

describe('join route: names on the projector wall', () => {
  it('Given a guest types a profane name, When the server signs them in, Then a generated name in the page language is used instead', async () => {
    const res = await POST(req({ joinCode: 'ABC123', guestName: 'fuck you' }));
    expect(res.status).toBe(200);
    expect(signInAnonymously).toHaveBeenCalledWith({ options: { data: expect.objectContaining({ full_name: 'Fun-he' }) } });
    expect((await res.json()).displayName).toBe('Fun-he');
  });

  it('Given a client-minted guest whose profile carries a profane name, When they join, Then the profile name is replaced before enrolment', async () => {
    mocked(getAuthedUser).mockResolvedValue({ id: 'guest-2' });
    const res = await POST(req({ joinCode: 'ABC123', guestName: 'shit' }, 'https://www.lexiclash.live/en/join'));
    expect(res.status).toBe(200);
    expect(profileUpdate).toHaveBeenCalledWith(expect.objectContaining({ display_name: 'Fun-en' }));
    expect(profileUpdate.mock.invocationCallOrder[0]).toBeLessThan(adminInsert.mock.invocationCallOrder[0]);
    expect(updateEqs).toEqual([['id', 'guest-2']]);
    expect(updateUserById).toHaveBeenCalledWith('guest-2', { user_metadata: expect.objectContaining({ full_name: 'Fun-en' }) });
    expect((await res.json()).displayName).toBe('Fun-en');
  });

  it('Given a clean name, Then nothing is rewritten and no display name is echoed', async () => {
    const res = await POST(req({ joinCode: 'ABC123', guestName: 'Dana' }));
    expect(signInAnonymously).toHaveBeenCalledWith({ options: { data: expect.objectContaining({ full_name: 'Dana' }) } });
    expect(profileUpdate).not.toHaveBeenCalled();
    expect((await res.json()).displayName).toBeUndefined();
  });
});

describe('join route: a teacher cannot enrol in their own class', () => {
  it('Given the class teacher opens their own code, Then the route refuses with TEACHER_OWN_CLASS and enrols nobody', async () => {
    mocked(getAuthedUser).mockResolvedValue({ id: 'teacher-1', email: 't@school.edu' });
    const res = await POST(req({ joinCode: 'ABC123' }));
    expect(res.status).toBe(409);
    expect((await res.json()).code).toBe('TEACHER_OWN_CLASS');
    expect(adminInsert).not.toHaveBeenCalled();
  });

  it('Given the teacher tests the room on their own phone (rehearsal link), Then the seat is still allowed', async () => {
    mocked(getAuthedUser).mockResolvedValue({ id: 'teacher-1', email: 't@school.edu' });
    const res = await POST(req({ joinCode: 'ABC123', rehearsal: true }));
    expect(res.status).toBe(200);
  });

  it('Given a teacher of a different class, Then they may still join as a student', async () => {
    mocked(getAuthedUser).mockResolvedValue({ id: 'other-teacher', email: 'o@school.edu' });
    const res = await POST(req({ joinCode: 'ABC123' }));
    expect(res.status).toBe(200);
    expect(adminInsert).toHaveBeenCalled();
  });
});
