import { describe, it, expect } from 'vitest';
import { buildFindings, type FindingsInput } from '../eduFindings';

const delta = (current: number, prior: number) => ({
  current,
  prior,
  pct: prior === 0 ? null : Math.round(((current - prior) / prior) * 100),
});

const base = (over: Partial<FindingsInput> = {}): FindingsInput => ({
  roundsAvailable: true,
  kpis: { liveRounds: delta(10, 10), newTeachers: delta(0, 0) },
  verdict: null,
  funnelStuck: {},
  teachers: [],
  classes: [],
  dyingClasses: [],
  insights: {
    usage: { rounds: 10, players: 100, avgPlayersPerRound: 10, dailyPlayers: [], byWeekday: [0, 0, 0, 0, 0, 0, 0], peakWeekday: null, modes: [], dailyRounds: [], quietDays: 0, momentumPct: null, fadingIds: [], topTeacherShare: null, topTeachers: [] },
    retention: { priorTeachers: 0, returned: 0, pct: null, newlyTeaching: 0, lostIds: [] },
    classSizes: { buckets: [], avgStudents: null },
    pro: { trialsActive: [], expiringSoon: [], lapsedUnpaid: [], paying: 0, conversionPct: null },
  },
  ...over,
});

const ids = (f: ReturnType<typeof buildFindings>, tone: string) => f.filter((x) => x.tone === tone).map((x) => x.id);

describe('buildFindings', () => {
  it('returns nothing for a quiet, neutral dashboard', () => {
    expect(buildFindings(base())).toEqual([]);
  });

  it('flags a games surge as a win and a slump as a problem', () => {
    expect(ids(buildFindings(base({ kpis: { liveRounds: delta(30, 10), newTeachers: delta(0, 0) } })), 'win')).toContain('rounds_up');
    const down = buildFindings(base({ kpis: { liveRounds: delta(4, 10), newTeachers: delta(0, 0) } }));
    expect(ids(down, 'problem')).toContain('rounds_down');
  });

  it('does not call a null kpi (rounds table missing) up or down', () => {
    expect(buildFindings(base({ roundsAvailable: false, kpis: { liveRounds: null, newTeachers: delta(0, 0) } }))).toEqual([]);
  });

  it('splits retention into win and problem, with the lost teachers to drill into', () => {
    const mk = (pct: number, lostIds: string[]) =>
      base({ insights: { ...base().insights, retention: { priorTeachers: 10, returned: pct / 10, pct, newlyTeaching: 0, lostIds } } });
    expect(ids(buildFindings(mk(70, [])), 'win')).toContain('retention_good');
    const low = buildFindings(mk(20, ['a', 'b'])).find((f) => f.id === 'retention_low')!;
    expect(low.tone).toBe('problem');
    expect(low.drill).toEqual({ kind: 'teachers', ids: ['a', 'b'] });
  });

  it('names the biggest funnel drop and drills to teachers stuck before it', () => {
    const f = buildFindings(
      base({
        verdict: { stepKey: 'student', fromKey: 'classroom', fromCount: 11, toCount: 1, lost: 10, pct: 9, cohortAvailable: true },
        funnelStuck: { classroom: ['x', 'y'] },
      }),
    ).find((x) => x.id === 'funnel_drop')!;
    expect(f.tone).toBe('problem');
    expect(f.params).toMatchObject({ lost: 10, from: 'classroom', to: 'student' });
    expect(f.drill).toEqual({ kind: 'teachers', ids: ['x', 'y'] });
  });

  it('warns about trials ending soon and trials that lapsed unpaid', () => {
    const pro = { trialsActive: ['a'], expiringSoon: ['a'], lapsedUnpaid: ['b'], paying: 1, conversionPct: 10 };
    const f = buildFindings(base({ insights: { ...base().insights, pro } }));
    expect(ids(f, 'early')).toContain('trials_expiring');
    expect(ids(f, 'problem')).toEqual(expect.arrayContaining(['trials_lapsed', 'conversion_low']));
  });

  it('celebrates good trial conversion', () => {
    const pro = { trialsActive: [], expiringSoon: [], lapsedUnpaid: [], paying: 4, conversionPct: 40 };
    expect(ids(buildFindings(base({ insights: { ...base().insights, pro } })), 'win')).toContain('conversion_good');
  });

  it('flags many dormant teachers only with enough teachers to judge', () => {
    const t = (id: string, health: 'dormant' | 'thriving') => ({ id, health, students: 0, roundsLast7d: 0, trialExpiresAt: null });
    expect(ids(buildFindings(base({ teachers: [t('a', 'dormant'), t('b', 'dormant')] })), 'problem')).not.toContain('dormant_many');
    const many = ['a', 'b', 'c', 'd', 'e'].map((id) => t(id, 'dormant')).concat(t('z', 'thriving'));
    const f = buildFindings(base({ teachers: many })).find((x) => x.id === 'dormant_many')!;
    expect(f.drill!.ids).toHaveLength(5);
    expect(ids(buildFindings(base({ teachers: many })), 'win')).toContain('thriving');
  });

  it('flags classes that stopped playing and mostly-empty class lists', () => {
    const f = buildFindings(
      base({
        dyingClasses: [{ id: 'c1', students: 5 }],
        classes: [0, 0, 0, 3].map((students, i) => ({ id: `e${i}`, students })),
      }),
    );
    expect(f.find((x) => x.id === 'classes_dying')!.drill).toEqual({ kind: 'classes', ids: ['c1'] });
    expect(ids(f, 'problem')).toContain('empty_classes');
  });

  it('adds fun facts: peak teaching weekday and most active teacher', () => {
    const f = buildFindings(
      base({
        insights: {
          ...base().insights,
          usage: { ...base().insights.usage!, byWeekday: [0, 0, 5, 1, 0, 0, 0], peakWeekday: 2, topTeachers: [{ teacherId: 't9', rounds: 7, players: 70 }] },
        },
      }),
    );
    expect(f.find((x) => x.id === 'peak_day')).toMatchObject({ tone: 'fact', params: { weekday: 2 } });
    expect(f.find((x) => x.id === 'top_teacher')).toMatchObject({ tone: 'fact', params: { teacherId: 't9', rounds: 7 } });
  });

  it('orders problems first, then early warnings, wins, facts', () => {
    const pro = { trialsActive: ['a'], expiringSoon: ['a'], lapsedUnpaid: [], paying: 0, conversionPct: null };
    const f = buildFindings(
      base({
        kpis: { liveRounds: delta(30, 10), newTeachers: delta(0, 0) },
        dyingClasses: [{ id: 'c', students: 2 }],
        insights: { ...base().insights, pro },
      }),
    );
    expect(f.map((x) => x.tone)).toEqual(['problem', 'early', 'win']);
  });

  describe('early warnings', () => {
    const withUsage = (u: Record<string, unknown>) =>
      base({ insights: { ...base().insights, usage: { ...base().insights.usage!, ...u } } });
    const teacher = (id: string, over: Record<string, unknown> = {}) => ({
      id, health: 'at_risk' as const, students: 5, roundsLast7d: 0, trialExpiresAt: null, ...over,
    });

    it('flags teachers fading before they go dormant', () => {
      const f = buildFindings(withUsage({ fadingIds: ['a', 'b'] })).find((x) => x.id === 'teachers_fading')!;
      expect(f.tone).toBe('early');
      expect(f.drill).toEqual({ kind: 'teachers', ids: ['a', 'b'] });
    });

    it('flags at-risk teachers who already have students (about to be lost)', () => {
      const f = buildFindings(base({ teachers: [teacher('a'), teacher('b', { students: 0 }), teacher('c', { health: 'thriving' })] }));
      const at = f.find((x) => x.id === 'at_risk_with_students')!;
      expect(at.tone).toBe('early');
      expect(at.drill!.ids).toEqual(['a']);
    });

    it('flags trials ending soon on teachers who barely used the product', () => {
      const pro = { trialsActive: ['a', 'b'], expiringSoon: ['a', 'b'], lapsedUnpaid: [], paying: 0, conversionPct: null };
      const f = buildFindings(
        base({
          insights: { ...base().insights, pro },
          teachers: [teacher('a', { roundsLast7d: 0 }), teacher('b', { roundsLast7d: 6 })],
        }),
      ).find((x) => x.id === 'trial_idle')!;
      expect(f.drill!.ids).toEqual(['a']);
    });

    it('warns when games stop mid-window after a busy start (possible outage or lost tracking)', () => {
      const f = buildFindings(withUsage({ rounds: 12, quietDays: 3 })).find((x) => x.id === 'activity_stopped')!;
      expect(f.tone).toBe('early');
      expect(f.params.days).toBe(3);
      expect(buildFindings(withUsage({ rounds: 12, quietDays: 1 })).find((x) => x.id === 'activity_stopped')).toBeUndefined();
      expect(buildFindings(withUsage({ rounds: 1, quietDays: 6 })).find((x) => x.id === 'activity_stopped')).toBeUndefined();
    });

    it('warns on a sharp drop in the last 3 days before the weekly total shows it', () => {
      expect(buildFindings(withUsage({ momentumPct: -60 })).find((x) => x.id === 'momentum_drop')!.params.pct).toBe(60);
      expect(buildFindings(withUsage({ momentumPct: -20 })).find((x) => x.id === 'momentum_drop')).toBeUndefined();
    });

    it('does not double-report a stopped period as a momentum drop', () => {
      const f = buildFindings(withUsage({ rounds: 12, quietDays: 3, momentumPct: -100 }));
      expect(f.map((x) => x.id)).toContain('activity_stopped');
      expect(f.map((x) => x.id)).not.toContain('momentum_drop');
    });

    it('flags dependence on one teacher', () => {
      const f = buildFindings(withUsage({ rounds: 20, topTeacherShare: 70, topTeachers: [{ teacherId: 'z', rounds: 14, players: 1 }] })).find((x) => x.id === 'one_teacher_carries')!;
      expect(f.tone).toBe('early');
      expect(f.params).toMatchObject({ pct: 70, teacherId: 'z' });
      expect(buildFindings(withUsage({ rounds: 5, topTeacherShare: 90 })).find((x) => x.id === 'one_teacher_carries')).toBeUndefined();
    });
  });

  describe('weak modes', () => {
    const mode = (over: Record<string, unknown>) => ({ mode: 'x', rounds: 10, priorRounds: 10, teachers: 5, avgPlayers: 10, oneAndDone: 0, ...over });
    const withModes = (modes: unknown[], avg = 10) =>
      base({ insights: { ...base().insights, usage: { ...base().insights.usage!, avgPlayersPerRound: avg, modes: modes as never } } });
    const find = (f: ReturnType<typeof buildFindings>, id: string) => f.find((x) => x.id === id);

    it('flags modes whose games are far smaller than the average game', () => {
      const f = find(buildFindings(withModes([mode({ mode: 'blast', avgPlayers: 3 }), mode({ mode: 'classic' })])), 'mode_small')!;
      expect(f.tone).toBe('problem');
      expect(f.params).toMatchObject({ modes: 'blast', count: 1 });
    });

    it('flags modes most teachers try once and never repeat', () => {
      const f = find(buildFindings(withModes([mode({ mode: 'duel', teachers: 5, oneAndDone: 4 })])), 'mode_one_and_done')!;
      expect(f.tone).toBe('problem');
      expect(f.params).toMatchObject({ modes: 'duel' });
    });

    it('flags modes losing ground: half the games of the previous period', () => {
      const f = find(buildFindings(withModes([mode({ mode: 'wheel', rounds: 4, priorRounds: 12 })])), 'mode_fading')!;
      expect(f.tone).toBe('early');
    });

    it('ignores modes too thin to judge', () => {
      const thin = mode({ mode: 'tiny', teachers: 2, avgPlayers: 1, oneAndDone: 2, rounds: 2, priorRounds: 9 });
      expect(buildFindings(withModes([thin])).filter((x) => x.id.startsWith('mode_'))).toEqual([]);
    });

    it('names the favourite mode as a fun fact', () => {
      const f = find(buildFindings(withModes([mode({ mode: 'classic', rounds: 30 }), mode({ mode: 'blast', rounds: 10 })])), 'top_mode')!;
      expect(f).toMatchObject({ tone: 'fact', params: { mode: 'classic', pct: 75 } });
    });
  });

  describe('stuck stages', () => {
    it('breaks stuck teachers out by stage, each with its own drill', () => {
      const f = buildFindings(base({ funnelStuck: { approved: ['l1'], signin: ['n1', 'n2'], classroom: ['s1'] } }));
      expect(f.find((x) => x.id === 'stuck_locked_out')).toMatchObject({ tone: 'problem', drill: { kind: 'teachers', ids: ['l1'] } });
      expect(f.find((x) => x.id === 'stuck_no_class')!.drill!.ids).toEqual(['n1', 'n2']);
      expect(f.find((x) => x.id === 'stuck_no_students')!.drill!.ids).toEqual(['s1']);
    });

    it('does not repeat the stage the funnel-drop finding already covers', () => {
      const f = buildFindings(
        base({
          verdict: { stepKey: 'student', fromKey: 'classroom', fromCount: 3, toCount: 1, lost: 2, pct: 33, cohortAvailable: true },
          funnelStuck: { classroom: ['s1', 's2'], signin: ['n1'] },
        }),
      );
      expect(f.map((x) => x.id)).toContain('funnel_drop');
      expect(f.map((x) => x.id)).not.toContain('stuck_no_students');
      expect(f.map((x) => x.id)).toContain('stuck_no_class');
    });
  });

  describe('small games', () => {
    const withAvg = (avg: number | null, rounds: number) =>
      base({ insights: { ...base().insights, usage: { ...base().insights.usage!, avgPlayersPerRound: avg, rounds } } });

    it('flags games averaging under 5 students once there are at least 3 games', () => {
      expect(buildFindings(withAvg(2, 4)).find((x) => x.id === 'small_games')).toMatchObject({ tone: 'problem', params: { avg: 2 } });
    });

    it('stays quiet for big games, too few games, or no games', () => {
      for (const f of [withAvg(8, 10), withAvg(2, 2), withAvg(null, 0)]) {
        expect(buildFindings(f).find((x) => x.id === 'small_games')).toBeUndefined();
      }
    });
  });
});
