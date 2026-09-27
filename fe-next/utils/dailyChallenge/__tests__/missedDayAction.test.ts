import { describe, it, expect } from 'vitest';
import { resolveMissedDayAction } from '../missedDayAction';

describe('resolveMissedDayAction', () => {
  const today = '2026-09-06';

  it('Given a completed day, When resolved, Then it is "done" and links to that day\'s archive results', () => {
    const action = resolveMissedDayAction(
      { date: '2026-09-04', wordHunt: true, wordWheel: false },
      { today, language: 'en' },
    );
    expect(action).toEqual({ kind: 'done', href: '/en/daily/archive/2026-09-04' });
  });

  it('Given today unplayed, When resolved, Then it points at today\'s hub quests', () => {
    const action = resolveMissedDayAction(
      { date: today, wordHunt: false, wordWheel: false },
      { today, language: 'en' },
    );
    expect(action).toEqual({ kind: 'today', href: '/en/daily' });
  });

  it('Given a missed day inside the 3-day window, When resolved, Then it is playable via Word Hunt catch-up', () => {
    const action = resolveMissedDayAction(
      { date: '2026-09-05', wordHunt: false, wordWheel: false },
      { today, language: 'he' },
    );
    expect(action).toEqual({ kind: 'play', href: '/he/daily/word-hunt?date=2026-09-05', mode: 'word-hunt' });
  });

  it('Given Word Hunt done but Word Wheel open inside the window, When resolved, Then it is "done" (day counted) not play', () => {
    // A day counts as complete once either mode is played; we do not nag for the second mode.
    const action = resolveMissedDayAction(
      { date: '2026-09-04', wordHunt: true, wordWheel: false },
      { today, language: 'en' },
    );
    expect(action.kind).toBe('done');
  });

  it('Given a missed day older than the window, When resolved, Then it is "expired" and not playable', () => {
    const action = resolveMissedDayAction(
      { date: '2026-09-01', wordHunt: false, wordWheel: false },
      { today, language: 'en' },
    );
    expect(action).toEqual({ kind: 'expired' });
  });

  it('Given a future date, When resolved, Then it is "pending"', () => {
    const action = resolveMissedDayAction(
      { date: '2026-09-07', wordHunt: false, wordWheel: false },
      { today, language: 'en' },
    );
    expect(action).toEqual({ kind: 'pending' });
  });

  it('Given a preferred mode of word-wheel, When a day is playable, Then the href targets word-wheel', () => {
    const action = resolveMissedDayAction(
      { date: '2026-09-05', wordHunt: false, wordWheel: false },
      { today, language: 'en', preferredMode: 'word-wheel' },
    );
    expect(action).toEqual({ kind: 'play', href: '/en/daily/word-wheel?date=2026-09-05', mode: 'word-wheel' });
  });
});
