import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { mockLoggerError } = vi.hoisted(() => ({ mockLoggerError: vi.fn() }));
vi.mock('@/utils/logger', () => ({
  __esModule: true,
  default: { log: vi.fn(), debug: vi.fn(), warn: vi.fn(), error: mockLoggerError, info: vi.fn() },
}));

type Answer = { data: unknown; error: unknown };
type Row = { student_id: string; achievement_id: string; current_tier: string };

const ALL_DEFINITIONS = [
  { id: 'def-first', key: 'first_lesson' },
  { id: 'def-xp', key: 'xp_collector' },
  { id: 'def-vet', key: 'practice_veteran' },
  { id: 'def-col', key: 'lesson_collector' },
  { id: 'def-lvl', key: 'level_climber' },
];

/** A stateful stand-in that applies eq/in filters and ignoreDuplicates the way PostgREST does; only real client methods. */
function fakeDb({
  lessons = [] as unknown[],
  stored = [] as Row[],
  definitions = ALL_DEFINITIONS,
  failWrite = false,
  hangReads = false,
} = {}) {
  const achievements: Row[] = stored.map((r) => ({ ...r }));
  const selects: string[] = [];
  const signals: AbortSignal[] = [];
  const writes: Array<{ table: string; kind: string; options?: unknown }> = [];

  const query = (table: string, run: (filters: Array<(r: Row) => boolean>) => Answer, isRead: boolean) => {
    const filters: Array<(r: Row) => boolean> = [];
    const self: Record<string, unknown> = {};
    self.select = () => self;
    self.eq = (col: keyof Row, v: string) => { filters.push((r) => r[col] === v); return self; };
    self.in = (col: keyof Row, vs: string[]) => { filters.push((r) => vs.includes(r[col])); return self; };
    self.abortSignal = (s: AbortSignal) => { signals.push(s); return self; };
    self.then = (ok: (v: Answer) => unknown, bad?: (e: unknown) => unknown) =>
      (isRead && hangReads ? new Promise<Answer>(() => {}) : Promise.resolve().then(() => run(filters))).then(ok, bad);
    return self;
  };

  const client = {
    from(table: string) {
      return {
        select() {
          selects.push(table);
          return query(table, (filters) => {
            if (table === 'student_lesson_progress') return { data: lessons, error: null };
            if (table === 'achievement_definitions') return { data: definitions, error: null };
            return { data: achievements.filter((r) => filters.every((f) => f(r))), error: null };
          }, true);
        },
        upsert(rows: Row[] | Row, options?: { ignoreDuplicates?: boolean }) {
          writes.push({ table, kind: 'upsert', options });
          return query(table, () => {
            if (failWrite && table === 'student_achievements') return { data: null, error: { message: 'write failed' } };
            if (table !== 'student_achievements') return { data: null, error: null };
            const inserted: Row[] = [];
            for (const row of Array.isArray(rows) ? rows : [rows]) {
              if (achievements.some((r) => r.student_id === row.student_id && r.achievement_id === row.achievement_id)) continue;
              achievements.push({ ...row });
              inserted.push(row);
            }
            return { data: inserted, error: null };
          }, false);
        },
        update(patch: Partial<Row>) {
          writes.push({ table, kind: 'update' });
          return query(table, (filters) => {
            if (failWrite) return { data: null, error: { message: 'write failed' } };
            const hit = achievements.filter((r) => filters.every((f) => f(r)));
            for (const r of hit) Object.assign(r, patch);
            return { data: hit.map((r) => ({ ...r })), error: null };
          }, false);
        },
      };
    },
  };
  return { client, achievements, selects, signals, writes };
}

async function load() {
  vi.resetModules();
  return import('../grantStudentAwards');
}

async function grant(db: ReturnType<typeof fakeDb>, delta: { lessonId: string; xp: number } | null = null) {
  const { readAwardState, writeAwards } = await load();
  const state = await readAwardState(() => db.client as never, 'S1');
  return state ? writeAwards(state, 'S1', delta) : null;
}

describe('student award grant', () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => vi.useRealTimers());

  it('GIVEN a first practiced lesson WHEN granted THEN the row is inserted without overwriting and the unlock returned', async () => {
    const db = fakeDb({ lessons: [{ lesson_id: 'L1', total_xp: 60, total_practice_sessions: 1 }] });
    expect(await grant(db)).toEqual([{ achievementKey: 'first_lesson', tier: 'bronze', icon: '📚', isNew: true, isUpgrade: false }]);
    expect(db.achievements).toEqual([expect.objectContaining({ student_id: 'S1', achievement_id: 'def-first', current_tier: 'bronze' })]);
    expect(db.writes.find((w) => w.table === 'student_achievements')?.options).toEqual({ onConflict: 'student_id,achievement_id', ignoreDuplicates: true });
  });

  it('GIVEN a stored tier above what the totals reach WHEN granted THEN it stays and nothing is announced', async () => {
    const db = fakeDb({
      lessons: [{ lesson_id: 'L1', total_xp: 60, total_practice_sessions: 1 }],
      stored: [{ student_id: 'S1', achievement_id: 'def-first', current_tier: 'gold' }],
    });
    expect(await grant(db)).toEqual([]);
    expect(db.achievements[0].current_tier).toBe('gold');
  });

  it('GIVEN a lower stored tier WHEN the totals pass the next one THEN it is upgraded and announced as an upgrade', async () => {
    const db = fakeDb({
      lessons: ['L1', 'L2', 'L3'].map((id) => ({ lesson_id: id, total_xp: 60, total_practice_sessions: 1 })),
      stored: [{ student_id: 'S1', achievement_id: 'def-first', current_tier: 'bronze' }],
    });
    expect(await grant(db)).toContainEqual(expect.objectContaining({ achievementKey: 'first_lesson', tier: 'silver', isUpgrade: true }));
    expect(db.achievements.find((r) => r.achievement_id === 'def-first')?.current_tier).toBe('silver');
  });

  it('GIVEN two completions read the same snapshot WHEN both write THEN exactly one of them announces the award', async () => {
    const db = fakeDb({ lessons: [{ lesson_id: 'L1', total_xp: 60, total_practice_sessions: 1 }] });
    const { readAwardState, writeAwards } = await load();
    const [a, b] = await Promise.all([readAwardState(() => db.client as never, 'S1'), readAwardState(() => db.client as never, 'S1')]);
    const [first, second] = await Promise.all([writeAwards(a!, 'S1', null), writeAwards(b!, 'S1', null)]);
    expect([...first!, ...second!]).toHaveLength(1);
  });

  it('GIVEN a racing completion already stored a higher tier WHEN a stale upgrade writes THEN the tier is not lowered and nothing is announced', async () => {
    const db = fakeDb({
      lessons: ['L1', 'L2', 'L3'].map((id) => ({ lesson_id: id, total_xp: 60, total_practice_sessions: 1 })),
      stored: [{ student_id: 'S1', achievement_id: 'def-first', current_tier: 'bronze' }],
    });
    const { readAwardState, writeAwards } = await load();
    const state = await readAwardState(() => db.client as never, 'S1');
    db.achievements[0].current_tier = 'gold';
    expect((await writeAwards(state!, 'S1', null))?.map((u) => u.achievementKey)).not.toContain('first_lesson');
    expect(db.achievements[0].current_tier).toBe('gold');
  });

  it('GIVEN the XP this completion earned WHEN written with it THEN the award counts it', async () => {
    const unlocks = await grant(fakeDb(), { lessonId: 'L9', xp: 500 });
    expect(unlocks?.map((u) => u.achievementKey).sort()).toEqual(['first_lesson', 'xp_collector']);
  });

  it('GIVEN the achievement write fails WHEN granted THEN it returns null and logs, never an empty success', async () => {
    const db = fakeDb({ lessons: [{ lesson_id: 'L1', total_xp: 60, total_practice_sessions: 1 }], failWrite: true });
    expect(await grant(db)).toBeNull();
    expect(mockLoggerError).toHaveBeenCalled();
  });

  it('GIVEN no service-role client WHEN read THEN it returns null and logs', async () => {
    const { readAwardState } = await load();
    expect(await readAwardState(() => null, 'S1')).toBeNull();
    expect(mockLoggerError).toHaveBeenCalled();
  });

  it('GIVEN the reads hang WHEN the time cap passes THEN the reads are aborted and the state is null', async () => {
    vi.useFakeTimers();
    const { readAwardState, AWARD_READ_TIMEOUT_MS } = await load();
    const db = fakeDb({ hangReads: true });
    const pending = readAwardState(() => db.client as never, 'S1');
    await vi.advanceTimersByTimeAsync(AWARD_READ_TIMEOUT_MS + 1);
    expect(await pending).toBeNull();
    expect(db.signals.length).toBeGreaterThan(0);
    expect(db.signals.every((s) => s.aborted)).toBe(true);
    expect(mockLoggerError).toHaveBeenCalled();
  });

  it('GIVEN the write has started WHEN it takes longer than the read cap THEN it is not aborted', async () => {
    const db = fakeDb({ lessons: [{ lesson_id: 'L1', total_xp: 60, total_practice_sessions: 1 }] });
    const { readAwardState, writeAwards } = await load();
    const state = await readAwardState(() => db.client as never, 'S1');
    const readSignals = db.signals.length;
    await writeAwards(state!, 'S1', null);
    expect(db.signals.length).toBe(readSignals);
  });

  it('GIVEN definitions were read once WHEN reading again THEN the definitions table is not queried again', async () => {
    const db = fakeDb();
    const { readAwardState } = await load();
    await readAwardState(() => db.client as never, 'S1');
    await readAwardState(() => db.client as never, 'S2');
    expect(db.selects.filter((t) => t === 'achievement_definitions')).toHaveLength(1);
  });

  it('GIVEN a definition row is missing WHEN read THEN the gap is logged and the partial map is not cached', async () => {
    const db = fakeDb({ definitions: ALL_DEFINITIONS.slice(0, 2) });
    const { readAwardState } = await load();
    await readAwardState(() => db.client as never, 'S1');
    await readAwardState(() => db.client as never, 'S2');
    expect(db.selects.filter((t) => t === 'achievement_definitions')).toHaveLength(2);
    expect(mockLoggerError).toHaveBeenCalledWith(expect.stringContaining('practice_veteran'));
  });
});
