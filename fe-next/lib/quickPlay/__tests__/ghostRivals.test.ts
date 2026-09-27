/**
 * Ghost rivals turn a solo quick round into a race: three real players'
 * recent results on the same mode, paced across the round clock.
 *
 * Seeds are per-round UUIDs, so a same-board cohort is always empty — the
 * comparison axis is score_pct remapped onto MY board's perfectScore.
 */
import {
  pickGhostRivals,
  ghostPaceFactor,
  buildGhostRows,
  ghostsToWheelRivals,
  type QuickGhostRival,
} from '../ghostRivals';
import { fetchGhostRivals } from '../fetchGhostRivals';

const rival = (id: string, scorePct: number, name = `p-${id}`): QuickGhostRival => ({
  userId: id,
  name,
  customAvatar: null,
  scorePct,
});

describe('pickGhostRivals', () => {
  const pool = Array.from({ length: 30 }, (_, i) => rival(`u${i}`, i + 1));

  it('is deterministic for the same seed', () => {
    expect(pickGhostRivals(pool, 'seed-a')).toEqual(pickGhostRivals(pool, 'seed-a'));
  });

  it('picks different faces for different seeds', () => {
    const a = pickGhostRivals(pool, 'seed-a').map((g) => g.userId);
    const b = pickGhostRivals(pool, 'seed-zzz').map((g) => g.userId);
    expect(a).not.toEqual(b);
  });

  it('spreads picks across the distribution instead of clustering', () => {
    const picks = pickGhostRivals(pool, 'seed-a').map((g) => g.scorePct).sort((x, y) => x - y);
    expect(picks).toHaveLength(3);
    // One from each third of a 30-row pool.
    expect(picks[0]).toBeLessThanOrEqual(10);
    expect(picks[1]).toBeGreaterThan(10);
    expect(picks[1]).toBeLessThanOrEqual(20);
    expect(picks[2]).toBeGreaterThan(20);
  });

  it('keeps one row per player — a grinder cannot occupy every slot', () => {
    const spammed = [rival('same', 10), rival('same', 90), rival('same', 50), rival('other', 40)];
    const ids = pickGhostRivals(spammed, 's').map((g) => g.userId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('keeps a repeated player at their best result', () => {
    const picked = pickGhostRivals([rival('same', 10), rival('same', 90)], 's');
    expect(picked).toEqual([expect.objectContaining({ userId: 'same', scorePct: 90 })]);
  });

  it('drops zero-score rows — a blank round is not a rival', () => {
    expect(pickGhostRivals([rival('a', 0), rival('b', 42)], 's')).toEqual([
      expect.objectContaining({ userId: 'b' }),
    ]);
  });

  it('returns what it has when the pool is thin — pickGhostRivals is pure', () => {
    // pickGhostRivals returns only real rivals; padding happens upstream in fetchGhostRivals.
    expect(pickGhostRivals([rival('a', 5)], 's')).toHaveLength(1);
    expect(pickGhostRivals([], 's')).toEqual([]);
  });
});

describe('ghostPaceFactor', () => {
  it('starts at zero and ends at full', () => {
    expect(ghostPaceFactor(0)).toBe(0);
    expect(ghostPaceFactor(1)).toBe(1);
  });

  it('clamps out-of-range progress', () => {
    expect(ghostPaceFactor(-0.5)).toBe(0);
    expect(ghostPaceFactor(2)).toBe(1);
  });

  it('runs ahead of linear — players score fast early, then slow', () => {
    expect(ghostPaceFactor(0.5)).toBeGreaterThan(0.5);
  });

  it('never goes backwards', () => {
    const steps = [0, 0.1, 0.25, 0.5, 0.75, 0.9, 1];
    const vals = steps.map(ghostPaceFactor);
    expect(vals).toEqual([...vals].sort((a, b) => a - b));
  });
});

describe('buildGhostRows', () => {
  const ghosts = [rival('a', 50, 'Ada'), rival('b', 100, 'Bo')];
  const opts = { perfectScore: 200, totalWords: 40, progress: 1, selfUsername: 'You' };

  it('remaps score_pct onto MY board so the race is comparable', () => {
    const rows = buildGhostRows(ghosts, opts);
    expect(rows.map((r) => r.score)).toEqual([100, 200]);
  });

  it('scales with the clock — nobody has their whole score at the buzzer-start', () => {
    const rows = buildGhostRows(ghosts, { ...opts, progress: 0 });
    expect(rows.every((r) => r.score === 0)).toBe(true);
  });

  it('grows monotonically over the round', () => {
    const at = (p: number) => buildGhostRows(ghosts, { ...opts, progress: p })[0].score;
    expect(at(0.25)).toBeLessThan(at(0.6));
    expect(at(0.6)).toBeLessThan(at(1));
  });

  it('reports a word count that tracks the pace', () => {
    const [ada] = buildGhostRows(ghosts, opts);
    expect(ada.wordsFound).toBe(20); // 50% of 40 words
    expect(ada.wordCount).toBe(ada.wordsFound);
  });

  it('drops a ghost whose name collides with mine — rank matching is by username', () => {
    const rows = buildGhostRows([rival('x', 60, 'You')], opts);
    expect(rows).toEqual([]);
  });

  it('drops nameless rows rather than rendering a blank rival', () => {
    expect(buildGhostRows([rival('x', 60, '')], opts)).toEqual([]);
  });

  it('carries the avatar through so ghosts read as people', () => {
    const rows = buildGhostRows([{ ...rival('a', 50, 'Ada'), customAvatar: { skin: 1 } as never }], opts);
    expect(rows[0].avatar.customAvatar).toEqual({ skin: 1 });
  });
});

describe('ghostsToWheelRivals', () => {
  const ghosts = [rival('a', 50, 'Ada'), rival('b', 90, 'Bo')];

  it('gives the wheel pill each rivals FINISHED score — it is a "player to beat", not a live racer', () => {
    const rows = ghostsToWheelRivals(ghosts, 200);
    expect(rows.map((r) => r.score)).toEqual([100, 180]);
  });

  it('sorts ascending so the wheel picks the nearest player above me', () => {
    const rows = ghostsToWheelRivals([rival('b', 90, 'Bo'), rival('a', 50, 'Ada')], 200);
    expect(rows.map((r) => r.name)).toEqual(['Ada', 'Bo']);
  });

  it('carries an id so the pill avatar has an identity to seed from', () => {
    expect(ghostsToWheelRivals(ghosts, 200)[0].playerId).toBe('a');
  });

  it('drops rivals that round to zero on this board — nothing to chase', () => {
    expect(ghostsToWheelRivals([rival('a', 0.1, 'Ada')], 10)).toEqual([]);
  });

  it('drops a ghost named like my own row — word hunt ranks by username string', () => {
    // SurvivalHeader prepends {username: t('mp.rivals.you')}; a real player
    // actually named "You" would then produce two rows that both match me.
    const rows = ghostsToWheelRivals([rival('x', 60, 'You'), rival('a', 50, 'Ada')], 200, 'You');
    expect(rows.map((r) => r.name)).toEqual(['Ada']);
  });

  it('keeps every named rival when no self label is given (the wheel has no self row)', () => {
    expect(ghostsToWheelRivals([rival('x', 60, 'You')], 200)).toHaveLength(1);
  });
});

describe('fetchGhostRivals', () => {
  const profiles = [
    { id: 'u1', username: 'Ada', avatar_config: { skin: 2 } as never },
    { id: 'u2', username: 'Bo', avatar_config: null },
  ];

  function fakeDb(results: unknown[], profileRows: unknown[] = profiles) {
    const calls: string[] = [];
    const db = {
      calls,
      from(table: string) {
        calls.push(table);
        const rows = table === 'quick_play_results' ? results : profileRows;
        const chain: Record<string, unknown> = {};
        for (const m of ['select', 'eq', 'gt', 'order', 'in', 'neq']) {
          chain[m] = () => chain;
        }
        chain.limit = () => Promise.resolve({ data: rows, error: null });
        chain.then = (res: (v: unknown) => unknown) => Promise.resolve({ data: rows, error: null }).then(res);
        return chain;
      },
    };
    return db;
  }

  it('resolves display names and avatars for the picked rivals, then pads to GHOST_COUNT', async () => {
    const db = fakeDb([
      { user_id: 'u1', score_pct: 40 },
      { user_id: 'u2', score_pct: 80 },
    ]);
    const ghosts = await fetchGhostRivals(db as never, 'classic', 'seed-1', undefined, null, 'en');
    // Two real rivals plus one synthetic = GHOST_COUNT (3).
    expect(ghosts).toHaveLength(3);
    expect(ghosts.filter((g) => !g.userId.startsWith('synthetic:')).map((g) => g.name).sort()).toEqual([
      'Ada',
      'Bo',
    ]);
    expect(ghosts.find((g) => g.name === 'Ada')?.customAvatar).toEqual({ skin: 2 });
  });

  it('gives an avatar-less player a deterministic face — a ghost must never render as a skeleton', async () => {
    const db = fakeDb([{ user_id: 'u2', score_pct: 60 }]);
    const [bo] = await fetchGhostRivals(db as never, 'classic', 's', undefined, null, 'en');
    // Bo's profile has avatar_config: null. Avatar renders a skeleton when it has
    // neither a config nor a userId, and GameLeaderboard passes no userId.
    expect(bo.customAvatar).toBeTruthy();

    const again = await fetchGhostRivals(
      fakeDb([{ user_id: 'u2', score_pct: 60 }]) as never,
      'classic',
      's',
      undefined,
      null,
      'en'
    );
    expect(again[0].customAvatar).toEqual(bo.customAvatar);
  });

  it('skips players with no profile row rather than showing "undefined"', async () => {
    const db = fakeDb([{ user_id: 'ghosted', score_pct: 40 }], []);
    const ghosts = await fetchGhostRivals(db as never, 'classic', 's', undefined, null, 'en');
    // Even though the real player has no profile, fetchGhostRivals now returns
    // GHOST_COUNT synthetic rivals instead of empty.
    expect(ghosts).toHaveLength(3);
    expect(ghosts.every((g) => g.userId.startsWith('synthetic:'))).toBe(true);
  });

  it('returns GHOST_COUNT synthetics when the query fails — a round must still start', async () => {
    const db = {
      from: () => {
        throw new Error('boom');
      },
    };
    const ghosts = await fetchGhostRivals(db as never, 'classic', 's', undefined, null, 'en');
    // Never throws, and never returns empty — always GHOST_COUNT rivals.
    expect(ghosts).toHaveLength(3);
    expect(ghosts.every((g) => g.userId.startsWith('synthetic:'))).toBe(true);
    expect(ghosts.every((g) => g.name && g.name.length > 0)).toBe(true);
  });

  it('pads thin real rivals to GHOST_COUNT with synthetics', async () => {
    const db = fakeDb([{ user_id: 'u1', score_pct: 50 }]);
    const ghosts = await fetchGhostRivals(db as never, 'classic', 'seed-1', undefined, null, 'en');
    // One real rival + two synthetics = GHOST_COUNT.
    expect(ghosts).toHaveLength(3);
    expect(ghosts[0].userId).toBe('u1');
    expect(ghosts[0].name).toBe('Ada');
    expect(ghosts.slice(1).every((g) => g.userId.startsWith('synthetic:'))).toBe(true);
  });

  it('is deterministic for the same seed and mode', async () => {
    const db = fakeDb([{ user_id: 'u1', score_pct: 50 }]);
    const ghosts1 = await fetchGhostRivals(db as never, 'classic', 'seed-a', undefined, null, 'en');
    const ghosts2 = await fetchGhostRivals(
      fakeDb([{ user_id: 'u1', score_pct: 50 }]) as never,
      'classic',
      'seed-a',
      undefined,
      null,
      'en'
    );
    // Same seed → same synthetic names and scores.
    expect(ghosts1.map((g) => ({ name: g.name, scorePct: g.scorePct }))).toEqual(
      ghosts2.map((g) => ({ name: g.name, scorePct: g.scorePct }))
    );
  });

  it('picks different synthetics for different seeds', async () => {
    const db = fakeDb([{ user_id: 'u1', score_pct: 50 }]);
    const a = await fetchGhostRivals(db as never, 'classic', 'seed-aaa', undefined, null, 'en');
    const b = await fetchGhostRivals(
      fakeDb([{ user_id: 'u1', score_pct: 50 }]) as never,
      'classic',
      'seed-zzz',
      undefined,
      null,
      'en'
    );
    const aNames = a.slice(1).map((g) => g.name).sort().join(',');
    const bNames = b.slice(1).map((g) => g.name).sort().join(',');
    expect(aNames).not.toBe(bNames);
  });

  it('does not query profiles when all synthetics are needed', async () => {
    const db = fakeDb([]);
    await fetchGhostRivals(db as never, 'classic', 's', undefined, null, 'en');
    // Even with empty results, we still return GHOST_COUNT synthetics.
    expect(db.calls).toContain('quick_play_results');
    // But we should NOT query profiles since there are no real rivals.
    expect(db.calls).not.toContain('public_profiles');
  });

  it('respects language parameter for synthetic bot names', async () => {
    const db = fakeDb([]);
    const en = await fetchGhostRivals(db as never, 'classic', 'seed-1', undefined, null, 'en');
    const he = await fetchGhostRivals(
      fakeDb([]) as never,
      'classic',
      'seed-1',
      undefined,
      null,
      'he'
    );
    // Same seed, different language → different bot names.
    const enNames = en.map((g) => g.name).sort().join(',');
    const heNames = he.map((g) => g.name).sort().join(',');
    expect(enNames).not.toBe(heNames);
  });
});
