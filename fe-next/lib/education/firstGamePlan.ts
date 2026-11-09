/**
 * "Not with your class right now?" — put the first live game on the teacher's calendar.
 *
 * Nov 2026: 13 of 31 new classes never got a student. Their teachers set up in the
 * evening, saw the code, left, and 4 of 25 ever came back on a later day. A calendar
 * event at class time, carrying the join link and a one-tap start link, is the
 * reminder that arrives when the class is actually in the room.
 *
 * Pure: no DOM, no React. The card handles window.open and the .ics download.
 */
import { buildGoogleCalendarUrl, buildReteachIcs, toCalendarUtcStamp } from './scheduleReteachLive';

export const FIRST_GAME_MINUTES = 15;
const DEFAULT_HOUR = 9;

/** 9:00 tomorrow in the teacher's own time zone. */
export function defaultFirstGameStart(now: Date = new Date()): Date {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, DEFAULT_HOUR, 0, 0, 0);
}

const pad = (n: number) => String(n).padStart(2, '0');

/** Value for <input type="datetime-local">, in local time. */
export function toDatetimeLocal(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function fromDatetimeLocal(value: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value.trim());
  if (!m) return null;
  const [, y, mo, d, h, mi] = m.map(Number);
  const out = new Date(y, mo - 1, d, h, mi, 0, 0);
  return Number.isNaN(out.getTime()) ? null : out;
}

/** Opens this class's ready screen (code, projector, start). Tagged so the return visit shows in analytics. */
export function firstGameStartUrl(origin: string, language: string, classroomId: string): string {
  const url = new URL(`${origin.replace(/\/$/, '')}/${language}/teacher/classroom/new`);
  url.searchParams.set('classroomId', classroomId);
  url.searchParams.set('utm_source', 'calendar');
  url.searchParams.set('utm_medium', 'teacher');
  url.searchParams.set('utm_campaign', 'edu_first_game');
  return url.toString();
}

export interface FirstGameEventText {
  title: string;
  /** "Students join here, no account: <url> (code <code>)" */
  students: string;
  /** "Start the game: <url>" */
  start: string;
}

export interface FirstGameEvent {
  googleUrl: string;
  ics: string;
  filename: string;
}

export function buildFirstGameEvent(args: { classroomId: string; start: Date; text: FirstGameEventText; now?: Date }): FirstGameEvent {
  const end = new Date(args.start.getTime() + FIRST_GAME_MINUTES * 60_000);
  const details = [args.text.start, args.text.students].join('\n\n');
  return {
    googleUrl: buildGoogleCalendarUrl({ title: args.text.title, details, start: args.start, end }),
    ics: buildReteachIcs({
      uid: `first-game-${args.classroomId}-${toCalendarUtcStamp(args.start)}@lexiclash.live`,
      title: args.text.title,
      description: details,
      start: args.start,
      end,
      now: args.now,
    }),
    filename: 'lexiclash-first-game.ics',
  };
}
