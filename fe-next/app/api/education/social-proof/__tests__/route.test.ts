import { describe, it, expect, vi, beforeEach } from 'vitest';

let sessions: Array<{ classroom_id: string; game_code: string | null }> = [];
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
              if (table === 'classrooms') return { data: classrooms, error: null };
              return { data: testProfiles, error: null };
            };
            const chain: Record<string, unknown> = {};
            for (const m of ['select', 'gte', 'not', 'in', 'eq', 'order', 'limit']) chain[m] = () => chain;
            chain.abortSignal = async () => result();
            chain.then = (res: (v: unknown) => unknown) => Promise.resolve(result()).then(res);
            return chain;
          },
        }
      : null,
}));

import { GET, __resetTeacherProofCache } from '../route';

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
