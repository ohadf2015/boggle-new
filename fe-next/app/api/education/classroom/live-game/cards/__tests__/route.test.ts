import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const lookupLiveClassroomGame = vi.fn();
vi.mock('@/lib/education/classroomGameLookup', () => ({
  lookupLiveClassroomGame: (code: string) => lookupLiveClassroomGame(code),
}));
const getAuthedUser = vi.fn();
vi.mock('@/lib/auth/getAuthedUser', () => ({ getAuthedUser: (...a: unknown[]) => getAuthedUser(...a) }));
vi.mock('@/utils/logger', () => ({ default: { error: vi.fn(), log: vi.fn(), warn: vi.fn() } }));

import { GET } from '../route';

const req = (code: string, ip = '203.0.113.9') =>
  new NextRequest(`https://example.com/api/education/classroom/live-game/cards?code=${code}`, {
    headers: { 'x-forwarded-for': ip },
  });

const cards = [{ word: 'orbit', definition: 'a curved path around a planet' }, { word: 'comet' }];

describe('GET /api/education/classroom/live-game/cards', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getAuthedUser.mockResolvedValue({ id: 'teacher-1' });
    lookupLiveClassroomGame.mockResolvedValue({ classroomId: 'c1', teacherId: 'teacher-1', studyCards: cards });
  });

  it('Given the room teacher, Then the projector gets the lesson words with their definitions', async () => {
    const res = await GET(req('TZCOQ7'));
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ cards });
  });

  it('Given no session, Then 401 and the room is never read', async () => {
    getAuthedUser.mockResolvedValue(null);
    const res = await GET(req('TZCOQ7'));
    expect(res.status).toBe(401);
    expect(lookupLiveClassroomGame).not.toHaveBeenCalled();
  });

  it('Given a signed-in student, Then 403 with no words', async () => {
    getAuthedUser.mockResolvedValue({ id: 'student-1' });
    const res = await GET(req('TZCOQ7'));
    expect(res.status).toBe(403);
    expect(JSON.stringify(await res.json())).not.toContain('orbit');
  });

  it('Given a record with no teacher id, Then it fails closed', async () => {
    lookupLiveClassroomGame.mockResolvedValue({ classroomId: 'c1', studyCards: cards });
    expect((await GET(req('TZCOQ7'))).status).toBe(403);
  });

  it('Given no live game, Then 204', async () => {
    lookupLiveClassroomGame.mockResolvedValue(null);
    expect((await GET(req('ZZZZZZ'))).status).toBe(204);
  });

  it('Given a malformed code, Then 400 without auth or Redis', async () => {
    expect((await GET(req('nope'))).status).toBe(400);
    expect(getAuthedUser).not.toHaveBeenCalled();
    expect(lookupLiveClassroomGame).not.toHaveBeenCalled();
  });

  it('Given a caller walking the code space, Then it is rate limited', async () => {
    let limited = false;
    for (let i = 0; i < 300 && !limited; i++) {
      limited = (await GET(req(`CCC${String(i).padStart(3, '0')}`, '198.51.100.12'))).status === 429;
    }
    expect(limited).toBe(true);
  });
});
