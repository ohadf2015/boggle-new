/**
 * Schedule reteach Live ~14 days out for miss-gap words.
 *
 * Kahoot Teacher Takeover (2025-09-11) foil: rebuild the hard questions and
 * replay ~2 weeks later. One click from the last-lesson digest (#1090) parks
 * the missed words, opens a calendar invite, and keeps a Live seed ready so
 * the teacher can host the same gap as a short reteach when the date hits.
 *
 * Pure — no DOM, no React. Storage + window.open live in the button.
 */

import {
  buildClassGapReteachLiveData,
  normalizeLocale,
  type ClassGapLocale,
  type ClassGapReteachLiveData,
  type ClassGapSharePayload,
} from './classGapShare';

/** Spaced-reteach delay — ~2 weeks, matching Kahoot Takeover replay window. */
export const RETEACH_LIVE_DELAY_DAYS = 14;

/** Default Live block length on the calendar (3-min game + buffer). */
export const RETEACH_LIVE_CALENDAR_MINUTES = 15;

export const SCHEDULED_RETEACH_STORAGE_KEY = 'lexiclash.scheduledReteachLive.v1';

export interface ScheduleReteachLiveInput {
  classroomId: string;
  classroomName: string;
  locale: string;
  missedWords: string[];
  /** Optional lesson title for the Live seed / calendar. */
  lessonName?: string;
  now?: Date;
  durationMinutes?: number;
}

export interface ScheduledReteachLive {
  classroomId: string;
  classroomName: string;
  locale: ClassGapLocale;
  missedWords: string[];
  lessonName: string;
  /** ISO UTC start of the reteach block. */
  scheduledAt: string;
  /** ISO UTC end of the reteach block. */
  endsAt: string;
  delayDays: number;
  liveData: ClassGapReteachLiveData;
  googleCalendarUrl: string;
  icsContent: string;
  icsFilename: string;
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/** UTC stamp for Google Calendar `dates=` and ICS DTSTART/DTEND. */
export function toCalendarUtcStamp(date: Date): string {
  return (
    date.getUTCFullYear().toString() +
    pad2(date.getUTCMonth() + 1) +
    pad2(date.getUTCDate()) +
    'T' +
    pad2(date.getUTCHours()) +
    pad2(date.getUTCMinutes()) +
    pad2(date.getUTCSeconds()) +
    'Z'
  );
}

/**
 * Add whole calendar days in UTC. Keeps the clock time of `now` so a
 * Wednesday 10:15 lesson schedules Wednesday 10:15 two weeks later.
 */
export function addDaysUtc(now: Date, days: number): Date {
  const d = new Date(now.getTime());
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

export function computeReteachAt(
  now: Date = new Date(),
  delayDays: number = RETEACH_LIVE_DELAY_DAYS,
): Date {
  return addDaysUtc(now, delayDays);
}

function icsEscape(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

export function buildReteachIcs(args: {
  uid: string;
  title: string;
  description: string;
  start: Date;
  end: Date;
  now?: Date;
}): string {
  const stamp = toCalendarUtcStamp(args.now ?? new Date());
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//LexiClash//Reteach Live//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${args.uid}`,
    `DTSTAMP:${stamp}`,
    `DTSTART:${toCalendarUtcStamp(args.start)}`,
    `DTEND:${toCalendarUtcStamp(args.end)}`,
    `SUMMARY:${icsEscape(args.title)}`,
    `DESCRIPTION:${icsEscape(args.description)}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}

export function buildGoogleCalendarUrl(args: {
  title: string;
  details: string;
  start: Date;
  end: Date;
}): string {
  const dates = `${toCalendarUtcStamp(args.start)}/${toCalendarUtcStamp(args.end)}`;
  const url = new URL('https://calendar.google.com/calendar/render');
  url.searchParams.set('action', 'TEMPLATE');
  url.searchParams.set('text', args.title);
  url.searchParams.set('dates', dates);
  url.searchParams.set('details', args.details);
  return url.toString();
}

function sanitizeWords(words: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of words) {
    const w = (raw || '').trim();
    if (!w) continue;
    const key = w.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(w);
    if (out.length >= 24) break;
  }
  return out;
}

/**
 * Build the scheduled reteach record. Returns null when there are no miss-gap
 * words — scheduling an empty Live would open the wrong board.
 */
export function buildScheduledReteachLive(
  input: ScheduleReteachLiveInput,
): ScheduledReteachLive | null {
  const missedWords = sanitizeWords(input.missedWords);
  if (missedWords.length === 0) return null;

  const locale = normalizeLocale(input.locale);
  const classroomName = (input.classroomName || '').trim() || 'Class';
  const lessonName =
    (input.lessonName || '').trim() || `Reteach — ${classroomName}`;
  const now = input.now ?? new Date();
  const start = computeReteachAt(now);
  const duration = input.durationMinutes ?? RETEACH_LIVE_CALENDAR_MINUTES;
  const end = new Date(start.getTime() + duration * 60_000);

  const sharePayload: ClassGapSharePayload = {
    locale,
    lesson: lessonName,
    teacher: '',
    found: 0,
    total: missedWords.length,
    missedWords,
  };
  const liveData = buildClassGapReteachLiveData(sharePayload);
  if (!liveData) return null;

  const wordList = missedWords.join(', ');
  const title = `LexiClash reteach Live — ${classroomName}`;
  const details = [
    `Replay miss-gap words ~${RETEACH_LIVE_DELAY_DAYS} days after the lesson (Kahoot Takeover foil).`,
    `Words: ${wordList}`,
    'Open LexiClash teacher reports → last-lesson digest → Start reteach Live when ready.',
  ].join('\n\n');

  const uid = `reteach-${input.classroomId || 'class'}-${toCalendarUtcStamp(start)}@lexiclash.live`;
  const icsContent = buildReteachIcs({
    uid,
    title,
    description: details,
    start,
    end,
    now,
  });
  const safeSlug =
    classroomName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 40) || 'class';

  return {
    classroomId: input.classroomId,
    classroomName,
    locale,
    missedWords,
    lessonName,
    scheduledAt: start.toISOString(),
    endsAt: end.toISOString(),
    delayDays: RETEACH_LIVE_DELAY_DAYS,
    liveData,
    googleCalendarUrl: buildGoogleCalendarUrl({ title, details, start, end }),
    icsContent,
    icsFilename: `lexiclash-reteach-${safeSlug}.ics`,
  };
}

/** Persist one scheduled reteach per classroom (latest wins). */
export function upsertScheduledReteach(
  existingRaw: string | null,
  record: ScheduledReteachLive,
): string {
  let list: ScheduledReteachLive[] = [];
  if (existingRaw) {
    try {
      const parsed = JSON.parse(existingRaw) as unknown;
      if (Array.isArray(parsed)) {
        list = parsed.filter(
          (row): row is ScheduledReteachLive =>
            !!row &&
            typeof row === 'object' &&
            typeof (row as ScheduledReteachLive).classroomId === 'string' &&
            typeof (row as ScheduledReteachLive).scheduledAt === 'string',
        );
      }
    } catch {
      list = [];
    }
  }
  const next = list.filter((r) => r.classroomId !== record.classroomId);
  next.push(record);
  return JSON.stringify(next);
}

export function readScheduledReteaches(raw: string | null): ScheduledReteachLive[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (row): row is ScheduledReteachLive =>
        !!row &&
        typeof row === 'object' &&
        typeof (row as ScheduledReteachLive).classroomId === 'string' &&
        Array.isArray((row as ScheduledReteachLive).missedWords),
    );
  } catch {
    return [];
  }
}
