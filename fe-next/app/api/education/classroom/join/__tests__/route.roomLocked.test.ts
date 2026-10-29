import { describe, it, expect, vi, beforeEach } from 'vitest';

const { insert, signInAnonymously, getAuthedUser } = vi.hoisted(() => ({
  insert: vi.fn(async () => ({ error: null })),
  signInAnonymously: vi.fn(async () => ({ data: { user: { id: 'guest-1' } }, error: null })),
  getAuthedUser: vi.fn(),
}));

vi.mock('@/utils/supabase/server', () => ({ createClient: vi.fn() }));
vi.mock('@/utils/supabase/admin', () => ({ createAdminClient: () => ({ from: () => ({ insert }) }) }));
vi.mock('@/lib/auth/getAuthedUser', () => ({ getAuthedUser }));
vi.mock('@/lib/subscriptions', () => ({
  canAddStudent: vi.fn(async () => ({ allowed: true, currentCount: 0, limit: 50 })),
}));
vi.mock('@/lib/education/joinTelemetry', () => ({ captureStudentJoinEvents: vi.fn() }));
vi.mock('@/lib/education/classroomGameLookup', () => ({ lookupLiveClassroomGame: vi.fn(async () => null) }));
vi.mock('@/lib/education/liveGameForClassroom', () => ({ lookupLiveGameForClassroom: vi.fn(async () => null) }));
vi.mock('../endedSessionCode', () => ({ lookupEndedClassroomSession: vi.fn(async () => null), recordEndedCodeTry: vi.fn() }));

import { POST } from '../route';
import { createClient } from '@/utils/supabase/server';
import { lookupLiveClassroomGame } from '@/lib/education/classroomGameLookup';
import { lookupLiveGameForClassroom } from '@/lib/education/liveGameForClassroom';

const asMock = (fn: unknown) => fn as unknown as ReturnType<typeof vi.fn>;

const post = (body: Record<string, unknown>) =>
  new Request('https://x.test/api/education/classroom/join', { method: 'POST', body: JSON.stringify(body) }) as never;

const lockedGame = (over: Record<string, unknown> = {}) => ({
  classroomId: 'c1',
  lessonIds: [],
  teacherName: 'Ms. G',
  lessonNames: [],
  teacherId: 'teacher-1',
  status: 'waiting',
  playerUserIds: ['seated-1'],
  settings: { lobbyLocked: true, lobbyLockedSeats: ['a:early-1'] },
  ...over,
});

const mockDb = (rosterHit: boolean) => {
  asMock(createClient).mockResolvedValue({
    auth: { signInAnonymously },
    rpc: vi.fn(async () => ({ data: rosterHit ? [{ id: 'c1' }] : [], error: null })),
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({ eq: vi.fn(() => ({ maybeSingle: vi.fn(async () => ({ data: null })) })) })),
      })),
    })),
  });
};

const as = (id: string | null) => getAuthedUser.mockResolvedValue(id ? { id } : null);

beforeEach(() => {
  vi.clearAllMocks();
  asMock(lookupLiveClassroomGame).mockResolvedValue(null);
  asMock(lookupLiveGameForClassroom).mockResolvedValue(null);
});

describe('join route — a locked live game typed from the projector', () => {
  it('refuses a stranger with 423 ROOM_LOCKED and enrols nobody', async () => {
    mockDb(false);
    as('stranger-1');
    asMock(lookupLiveClassroomGame).mockResolvedValue(lockedGame());

    const res = await POST(post({ joinCode: 'TZCOQ7' }));

    expect(res.status).toBe(423);
    expect(await res.json()).toMatchObject({ code: 'ROOM_LOCKED' });
    expect(insert).not.toHaveBeenCalled();
  });

  it('refuses a guest before any anonymous account is minted', async () => {
    mockDb(false);
    as(null);
    asMock(lookupLiveClassroomGame).mockResolvedValue(lockedGame());

    const res = await POST(post({ joinCode: 'TZCOQ7', guestName: 'Dana' }));

    expect(res.status).toBe(423);
    expect(signInAnonymously).not.toHaveBeenCalled();
  });

  it.each([
    ['the teacher', 'teacher-1'],
    ['a student already on the record', 'seated-1'],
    ['a student seated when the lock went on', 'early-1'],
  ])('lets %s in with the game code', async (_who, id) => {
    mockDb(false);
    as(id);
    asMock(lookupLiveClassroomGame).mockResolvedValue(lockedGame());

    const res = await POST(post({ joinCode: 'TZCOQ7' }));

    expect(res.status).toBe(200);
    expect((await res.json()).gameCode).toBe('TZCOQ7');
  });

  it('does not apply mid-round: the late-join switch governs a running round', async () => {
    mockDb(false);
    as('stranger-1');
    asMock(lookupLiveClassroomGame).mockResolvedValue(lockedGame({ status: 'playing' }));

    expect((await POST(post({ joinCode: 'TZCOQ7' }))).status).toBe(200);
  });

  it('an unlocked game still lets a stranger in', async () => {
    mockDb(false);
    as('stranger-1');
    asMock(lookupLiveClassroomGame).mockResolvedValue(lockedGame({ settings: {} }));

    expect((await POST(post({ joinCode: 'TZCOQ7' }))).status).toBe(200);
  });
});

describe('join route — roster code while the live game is locked', () => {
  it('still enrols the student but hands back no game code', async () => {
    mockDb(true);
    as('stranger-1');
    asMock(lookupLiveGameForClassroom).mockResolvedValue('TZCOQ7');
    asMock(lookupLiveClassroomGame).mockResolvedValue(lockedGame());

    const res = await POST(post({ joinCode: '9GA8WV' }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.classroomId).toBe('c1');
    expect(body.gameCode).toBeUndefined();
    expect(insert).toHaveBeenCalled();
  });

  it('keeps the game code for a student already seated', async () => {
    mockDb(true);
    as('seated-1');
    asMock(lookupLiveGameForClassroom).mockResolvedValue('TZCOQ7');
    asMock(lookupLiveClassroomGame).mockResolvedValue(lockedGame());

    expect((await (await POST(post({ joinCode: '9GA8WV' }))).json()).gameCode).toBe('TZCOQ7');
  });
});
