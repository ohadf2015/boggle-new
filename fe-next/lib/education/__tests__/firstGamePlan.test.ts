import { describe, expect, it } from 'vitest';
import {
  FIRST_GAME_MINUTES,
  buildFirstGameEvent,
  defaultFirstGameStart,
  firstGameStartUrl,
  fromDatetimeLocal,
  toDatetimeLocal,
} from '../firstGamePlan';

const TEXT = {
  title: 'Word game with Room 7',
  students: 'Students join here, no account: https://x.test/en/join/BLDA7Q (code BLDA7Q)',
  start: 'Start the game: https://x.test/en/teacher/classroom/new?classroomId=c1',
};

describe('defaultFirstGameStart', () => {
  it('Given an evening set-up, Then the first game defaults to 9:00 the next morning, local time', () => {
    const d = defaultFirstGameStart(new Date(2026, 10, 9, 20, 15));
    expect([d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes()]).toEqual([2026, 10, 10, 9, 0]);
  });

  it('Given the last day of a month, Then tomorrow rolls into the next month', () => {
    const d = defaultFirstGameStart(new Date(2026, 10, 30, 7, 0));
    expect([d.getMonth(), d.getDate(), d.getHours()]).toEqual([11, 1, 9]);
  });
});

describe('datetime-local round trip', () => {
  it('Given a local date, Then it formats for the input and parses back to the same minute', () => {
    const d = new Date(2026, 0, 5, 8, 30);
    expect(toDatetimeLocal(d)).toBe('2026-01-05T08:30');
    expect(fromDatetimeLocal('2026-01-05T08:30')?.getTime()).toBe(d.getTime());
  });

  it('Given an empty or broken value, Then parsing returns null', () => {
    expect(fromDatetimeLocal('')).toBeNull();
    expect(fromDatetimeLocal('not a date')).toBeNull();
  });
});

describe('firstGameStartUrl', () => {
  it('Given a class, Then the link opens that class ready to start and is tagged so the return visit is measurable', () => {
    const url = new URL(firstGameStartUrl('https://www.lexiclash.live/', 'he', 'c 1'));
    expect(url.pathname).toBe('/he/teacher/classroom/new');
    expect(url.searchParams.get('classroomId')).toBe('c 1');
    expect(url.searchParams.get('utm_source')).toBe('calendar');
    expect(url.searchParams.get('utm_campaign')).toBe('edu_first_game');
  });
});

describe('buildFirstGameEvent', () => {
  const start = new Date(Date.UTC(2026, 10, 10, 7, 0));

  it('Given a start time, Then the Google link and the .ics share one 15-minute slot', () => {
    const ev = buildFirstGameEvent({ classroomId: 'c1', start, text: TEXT });
    const g = new URL(ev.googleUrl);
    expect(g.hostname).toBe('calendar.google.com');
    expect(g.searchParams.get('dates')).toBe('20261110T070000Z/20261110T071500Z');
    expect(ev.ics).toContain('DTSTART:20261110T070000Z');
    expect(ev.ics).toContain('DTEND:20261110T071500Z');
    expect(FIRST_GAME_MINUTES).toBe(15);
  });

  it('Given the event text, Then both carry the title, the student join line and the teacher start line', () => {
    const ev = buildFirstGameEvent({ classroomId: 'c1', start, text: TEXT });
    const details = new URL(ev.googleUrl).searchParams.get('details') ?? '';
    expect(new URL(ev.googleUrl).searchParams.get('text')).toBe(TEXT.title);
    expect(details).toContain(TEXT.students);
    expect(details).toContain(TEXT.start);
    expect(ev.ics).toContain('SUMMARY:Word game with Room 7');
    expect(ev.ics).toContain('/en/join/BLDA7Q');
  });

  it('Given a class, Then the .ics has a stable per-class uid and a safe file name', () => {
    const ev = buildFirstGameEvent({ classroomId: 'c1', start, text: TEXT });
    expect(ev.ics).toContain('UID:first-game-c1-20261110T070000Z@lexiclash.live');
    expect(ev.filename).toBe('lexiclash-first-game.ics');
  });
});
