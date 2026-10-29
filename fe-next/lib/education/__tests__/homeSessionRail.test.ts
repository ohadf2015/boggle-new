import { describe, it, expect } from 'vitest';
import {
  classLessonProfile,
  homeCoachCue,
  homeSessionRail,
  railLanguages,
  railRunHref,
  weekMascotPose,
} from '@/lib/education/homeSessionRail';

const OCT = new Date(2026, 9, 15, 10).getTime();
const APR = new Date(2026, 3, 15, 10).getTime();
const DAY = 24 * 60 * 60 * 1000;
const ids = (rail: ReturnType<typeof homeSessionRail>) => rail.map((r) => r.session.id);

describe('homeSessionRail', () => {
  it('Given an English class in October that never played, Then the warm-up leads on the autumn list and the rail is 6 cards', () => {
    const rail = homeSessionRail({ language: 'en', gradeBand: null, nowMs: OCT, lastPlayedMs: null });
    expect(rail).toHaveLength(6);
    expect(rail[0].session.id).toBe('warm-up');
    expect(rail[0].theme).toBe('autumn');
    expect(rail[0].packCode).toBe('LC-EN-PK-AUTUMN');
    expect(new Set(ids(rail)).size).toBe(6);
  });

  it('Given October, Then the seasonal exit ticket and the spooky early-finishers list rank ahead of the brain break', () => {
    const order = ids(homeSessionRail({ language: 'en', gradeBand: null, nowMs: OCT, lastPlayedMs: null }));
    expect(order[1]).toBe('exit-ticket');
    expect(order.indexOf('early-finishers')).toBeLessThan(order.indexOf('brain-break'));
  });

  it('Given April, Then the spring list leads and the spooky list gets no boost', () => {
    const rail = homeSessionRail({ language: 'en', gradeBand: null, nowMs: APR, lastPlayedMs: null, limit: 8 });
    expect(rail[0].theme).toBe('spring');
    const order = ids(rail);
    expect(order.indexOf('early-finishers')).toBeGreaterThan(order.indexOf('brain-break'));
  });

  it('Given a K-2 class, Then the spelling bee is near the front and the test review and ESL cards are gone', () => {
    const order = ids(homeSessionRail({ language: 'en', gradeBand: 'k2', nowMs: OCT, lastPlayedMs: null }));
    expect(order.indexOf('spelling-bee')).toBeGreaterThan(-1);
    expect(order.indexOf('spelling-bee')).toBeLessThan(4);
    expect(order).not.toContain('test-review');
    expect(order).not.toContain('esl-starter');
  });

  it('Given a 9-12 class, Then no spelling bee', () => {
    expect(ids(homeSessionRail({ language: 'en', gradeBand: 'g912', nowMs: OCT, lastPlayedMs: null, limit: 8 }))).not.toContain('spelling-bee');
  });

  it('Given a Hebrew class, Then no ESL card, and the review runs on a Hebrew pack', () => {
    const rail = homeSessionRail({ language: 'he', gradeBand: 'g68', nowMs: OCT, lastPlayedMs: null, limit: 8 });
    expect(ids(rail)).not.toContain('esl-starter');
    const review = rail.find((r) => r.session.id === 'test-review');
    expect(review?.packCode).toMatch(/^LC-HE-PK-/);
  });

  it('Given a game earlier today, Then the exit ticket leads instead of a second warm-up', () => {
    const rail = homeSessionRail({ language: 'en', gradeBand: null, nowMs: OCT, lastPlayedMs: OCT - 60 * 60 * 1000 });
    expect(rail[0].session.id).toBe('exit-ticket');
  });

  it('Then a brain break with no list carries no pack code', () => {
    const brk = homeSessionRail({ language: 'en', gradeBand: null, nowMs: OCT, lastPlayedMs: null, limit: 8 }).find((r) => r.session.id === 'brain-break');
    expect(brk?.theme).toBeNull();
    expect(brk?.packCode).toBeNull();
  });

  it('Given a limit, Then the rail never exceeds it, and a zero limit is an empty rail', () => {
    expect(homeSessionRail({ language: 'en', gradeBand: null, nowMs: OCT, lastPlayedMs: null, limit: 4 })).toHaveLength(4);
    expect(homeSessionRail({ language: 'en', gradeBand: null, nowMs: OCT, lastPlayedMs: null, limit: 0 })).toEqual([]);
  });

  it('Then each card minutes match the lobby round math', () => {
    for (const r of homeSessionRail({ language: 'en', gradeBand: null, nowMs: OCT, lastPlayedMs: null, limit: 8 })) {
      expect(r.minutes).toBeGreaterThan(0);
    }
  });
});

describe('railRunHref', () => {
  it('Then Run opens the host flow for the selected class with the session and its pack', () => {
    const [warm] = homeSessionRail({ language: 'en', gradeBand: null, nowMs: OCT, lastPlayedMs: null });
    const url = new URL(railRunHref('he', warm, 'class-1'), 'https://x.test');
    expect(url.pathname.startsWith('/he/')).toBe(true);
    expect(url.searchParams.get('classroomId')).toBe('class-1');
    expect(url.searchParams.get('session')).toBe('warm-up');
    expect(url.searchParams.get('pack')).toBe('LC-EN-PK-AUTUMN');
  });
});

describe('classLessonProfile', () => {
  const lessons = [
    { classroom_id: 'a', language: 'en' as const, grade_band: 'g35' },
    { classroom_id: 'a', language: 'en' as const, grade_band: 'g35' },
    { classroom_id: 'a', language: 'es' as const, grade_band: 'g68' },
    { classroom_id: 'a', language: 'en' as const, grade_band: 'bogus' },
    { classroom_id: 'b', language: 'he' as const, grade_band: 'k2' },
    { classroom_id: 'b', language: 'he' as const, grade_band: 'k2' },
    { classroom_id: 'b', language: 'he' as const, grade_band: 'k2' },
  ];

  it("Then the class's most common valid grade wins and other classes' lessons are ignored", () => {
    expect(classLessonProfile(lessons, 'a')).toEqual({ gradeBand: 'g35', languages: ['en', 'es'] });
  });

  it('Given a class with no lessons, Then grade is unknown and no languages', () => {
    expect(classLessonProfile(lessons, 'zzz')).toEqual({ gradeBand: null, languages: [] });
    expect(classLessonProfile([], 'a')).toEqual({ gradeBand: null, languages: [] });
  });
});

describe('railLanguages', () => {
  it('Then the class language comes first and lesson languages follow once each', () => {
    expect(railLanguages('en', ['es', 'en', 'es'])).toEqual(['en', 'es']);
  });

  it('Given only the class language, Then one language (no chip row)', () => {
    expect(railLanguages('he', [])).toEqual(['he']);
    expect(railLanguages('he', ['he'])).toEqual(['he']);
  });
});

describe('homeCoachCue', () => {
  const rail = homeSessionRail({ language: 'en', gradeBand: null, nowMs: OCT, lastPlayedMs: null });

  it('Given no game yet, Then the cue offers the first easy start', () => {
    expect(homeCoachCue({ nowMs: OCT, lastPlayedMs: null, rail })?.key).toBe('eduShell.home.cue.first');
  });

  it('Given a game today, Then the cue offers to close out the lesson', () => {
    const today = homeSessionRail({ language: 'en', gradeBand: null, nowMs: OCT, lastPlayedMs: OCT - 1000 });
    expect(homeCoachCue({ nowMs: OCT, lastPlayedMs: OCT - 1000, rail: today })?.key).toBe('eduShell.home.cue.closeOut');
  });

  it('Given an earlier game, Then the cue names the season, not the days-since count the hero already shows', () => {
    expect(homeCoachCue({ nowMs: OCT, lastPlayedMs: OCT - 3 * DAY, rail })?.key).toBe('eduShell.home.cue.season.autumn');
    expect(homeCoachCue({ nowMs: APR, lastPlayedMs: APR - 21 * DAY, rail })?.key).toBe('eduShell.home.cue.season.spring');
  });

  it('Given a class idle past the activity window but played before, Then the season cue, never "first game"', () => {
    expect(homeCoachCue({ nowMs: OCT, lastPlayedMs: null, everPlayed: true, rail })?.key).toBe('eduShell.home.cue.season.autumn');
  });

  it('Given an empty rail, Then no cue', () => {
    expect(homeCoachCue({ nowMs: OCT, lastPlayedMs: null, rail: [] })).toBeNull();
  });
});

describe('weekMascotPose', () => {
  it('Then a week with games cheers, a quiet week after earlier games nudges, and no data is the empty pose', () => {
    expect(weekMascotPose({ gamesPlayed: 2, lastPlayedAt: { a: 'x' } })).toBe('success');
    expect(weekMascotPose({ gamesPlayed: 0, lastPlayedAt: { a: 'x' } })).toBe('tip');
    expect(weekMascotPose({ gamesPlayed: 0, lastPlayedAt: {} })).toBe('empty');
    expect(weekMascotPose(null)).toBe('empty');
  });
});
