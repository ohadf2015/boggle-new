import { describe, it, expect, vi, beforeEach } from 'vitest';

let sessions: Array<{ classroom_id: string | null; game_code: string | null }> = [];
let classroomsError = false;
let classrooms: Array<{ id: string; teacher_id: string }> = [];
let testProfiles: Array<{ id: string }> = [];
let failSessions = false;
let adminAvailable = true;
let calls: string[] = [];

vi.mock('@/utils/logger', () => ({ default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));
vi.mock('@/utils/supabase/admin', () => ({
  createAdminClient: () =>
    adminAvailable
      ? {
          from: (table: string) => {
            calls.push(table);
            const result = () => {
              if (table === 'practice_sessions') return failSessions ? { data: null, error: { message: 'boom' } } : { data: sessions, error: null };
              if (table === 'classrooms') return classroomsError ? { data: null, error: { message: 'invalid input syntax for type uuid: "null"' } } : { data: classrooms, error: null };
              return { data: testProfiles, error: null };
            };
            const chain: Record<string, unknown> = {};
            for (const m of ['select', 'gte', 'not', 'eq', 'order', 'limit']) chain[m] = () => chain;
            // Postgres rejects a null in a uuid IN list, exactly like production did.
            chain.in = (_col: string, ids: unknown[]) => {
              if (table === 'classrooms' && ids.some((id) => id == null)) classroomsError = true;
              return chain;
            };
            chain.abortSignal = async () => result();
            chain.then = (res: (v: unknown) => unknown) => Promise.resolve(result()).then(res);
            return chain;
          },
        }
      : null,
}));

import { GET } from '../route';
import { resetTeacherProofCache as __resetTeacherProofCache } from '@/lib/education/teacherProof';

function bigWorld() {
  sessions = [];
  classrooms = [];
  for (let t = 0; t < 30; t++) {
    classrooms.push({ id: `c${t}`, teacher_id: `t${t}` });
    for (let g = 0; g < 3; g++) sessions.push({ classroom_id: `c${t}`, game_code: `G${g}` });
  }
}

describe('GET /api/education/social-proof', () => {
  beforeEach(() => {
    sessions = [];
    classrooms = [];
    testProfiles = [];
    failSessions = false;
    classroomsError = false;
    adminAvailable = true;
    calls = [];
    __resetTeacherProofCache();
  });

  it('shows nothing while the real numbers are small (this is the honest default)', async () => {
    sessions = [{ classroom_id: 'c1', game_code: 'A' }];
    classrooms = [{ id: 'c1', teacher_id: 't1' }];
    const body = await (await GET()).json();
    expect(body).toEqual({ show: false });
  });

  it('exposes the real counts once they clear the bar, with a public cache header', async () => {
    bigWorld();
    const res = await GET();
    expect(await res.json()).toEqual({ show: true, teachers: 30, games: 90 });
    expect(res.headers.get('cache-control')).toContain('s-maxage=3600');
  });

  it('survives practice rows with no classroom (null ids must never reach the uuid IN list)', async () => {
    bigWorld();
    sessions.push({ classroom_id: null, game_code: 'ORPHAN' }, { classroom_id: null, game_code: 'ORPHAN2' });
    expect(await (await GET()).json()).toEqual({ show: true, teachers: 30, games: 90 });
  });

  it('fails closed AND says so when the owner lookup errors, instead of silently counting zero', async () => {
    bigWorld();
    classroomsError = true;
    expect(await (await GET()).json()).toEqual({ show: false });
    const logger = (await import('@/utils/logger')).default as unknown as { warn: { mock: { calls: unknown[][] } } };
    expect(logger.warn.mock.calls.length).toBeGreaterThan(0);
  });

  it('excludes test-account teachers', async () => {
    bigWorld();
    testProfiles = Array.from({ length: 28 }, (_, i) => ({ id: `t${i}` }));
    const body = await (await GET()).json();
    expect(body).toEqual({ show: false });
  });

  it('fails closed: a failed read, or no admin client, shows nothing and never throws', async () => {
    bigWorld();
    failSessions = true;
    expect(await (await GET()).json()).toEqual({ show: false });
    __resetTeacherProofCache();
    failSessions = false;
    adminAvailable = false;
    expect(await (await GET()).json()).toEqual({ show: false });
  });

  it('serves the second request from cache, without touching the database again', async () => {
    bigWorld();
    await GET();
    const before = calls.length;
    await GET();
    expect(calls.length).toBe(before);
  });
});
