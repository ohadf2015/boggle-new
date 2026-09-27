/**
 * scheduleReteachLive — Kahoot Takeover foil: park miss-gap words +14 days.
 */
import { describe, it, expect } from 'vitest';
import {
  RETEACH_LIVE_DELAY_DAYS,
  RETEACH_LIVE_CALENDAR_MINUTES,
  addDaysUtc,
  buildGoogleCalendarUrl,
  buildReteachIcs,
  buildScheduledReteachLive,
  computeReteachAt,
  readScheduledReteaches,
  toCalendarUtcStamp,
  upsertScheduledReteach,
} from '../scheduleReteachLive';
import { CLASS_GAP_RETEACH_TIMER_SECONDS } from '../classGapShare';

const NOW = new Date('2026-09-21T13:30:00.000Z');

describe('scheduleReteachLive', () => {
  it('schedules ~14 days out keeping the clock time', () => {
    const at = computeReteachAt(NOW);
    expect(at.toISOString()).toBe('2026-10-05T13:30:00.000Z');
    expect(RETEACH_LIVE_DELAY_DAYS).toBe(14);
    expect(addDaysUtc(NOW, 0).toISOString()).toBe(NOW.toISOString());
  });

  it('builds a Google Calendar URL with the miss-gap words in details', () => {
    const start = computeReteachAt(NOW);
    const end = new Date(start.getTime() + RETEACH_LIVE_CALENDAR_MINUTES * 60_000);
    const url = buildGoogleCalendarUrl({
      title: 'LexiClash reteach Live — Year 7',
      details: 'Words: ephemeral, quirk',
      start,
      end,
    });
    expect(url).toContain('calendar.google.com/calendar/render');
    expect(url).toContain('action=TEMPLATE');
    expect(url).toContain(toCalendarUtcStamp(start));
  });

  it('builds a parseable ICS with DTSTART 14 days out', () => {
    const start = computeReteachAt(NOW);
    const end = new Date(start.getTime() + RETEACH_LIVE_CALENDAR_MINUTES * 60_000);
    const ics = buildReteachIcs({
      uid: 'test@lexiclash.live',
      title: 'Reteach',
      description: 'Words: ephemeral',
      start,
      end,
      now: NOW,
    });
    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain(`DTSTART:${toCalendarUtcStamp(start)}`);
    expect(ics).toContain('SUMMARY:Reteach');
  });

  it('returns null when there are no miss-gap words', () => {
    expect(
      buildScheduledReteachLive({
        classroomId: 'c1',
        classroomName: 'Year 7',
        locale: 'en',
        missedWords: [],
        now: NOW,
      }),
    ).toBeNull();
  });

  it('seeds Live data from miss-gap words and parks a calendar invite', () => {
    const record = buildScheduledReteachLive({
      classroomId: 'c1',
      classroomName: 'Year 7',
      locale: 'en',
      missedWords: ['ephemeral', 'quirk', 'ephemeral'],
      now: NOW,
    });
    expect(record).not.toBeNull();
    expect(record!.missedWords).toEqual(['ephemeral', 'quirk']);
    expect(record!.scheduledAt).toBe('2026-10-05T13:30:00.000Z');
    expect(record!.delayDays).toBe(14);
    expect(record!.liveData.vocabularyWords).toEqual(['ephemeral', 'quirk']);
    expect(record!.liveData.templateSettings.timerSeconds).toBe(
      CLASS_GAP_RETEACH_TIMER_SECONDS,
    );
    expect(record!.googleCalendarUrl).toContain('calendar.google.com');
    expect(record!.icsContent).toContain('BEGIN:VEVENT');
    expect(record!.icsFilename).toMatch(/\.ics$/);
  });

  it('upserts one scheduled reteach per classroom', () => {
    const a = buildScheduledReteachLive({
      classroomId: 'c1',
      classroomName: 'Year 7',
      locale: 'en',
      missedWords: ['alpha'],
      now: NOW,
    })!;
    const b = buildScheduledReteachLive({
      classroomId: 'c1',
      classroomName: 'Year 7',
      locale: 'en',
      missedWords: ['beta'],
      now: NOW,
    })!;
    const raw = upsertScheduledReteach(upsertScheduledReteach(null, a), b);
    const list = readScheduledReteaches(raw);
    expect(list).toHaveLength(1);
    expect(list[0].missedWords).toEqual(['beta']);
  });
});
