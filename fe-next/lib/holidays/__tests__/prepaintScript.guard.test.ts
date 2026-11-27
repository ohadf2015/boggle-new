import { afterEach, describe, expect, it, vi } from 'vitest';
import { CHRISTMAS_LOCALES, holidayWindows } from '../calendar';
import { HOLIDAY_PREPAINT_SCRIPT, HOLIDAY_WINDOW_TABLE, buildPrepaintScript } from '../prepaintScript';

interface Env {
  now: string;
  timeZone?: string;
  lang?: string;
  search?: string;
  cookie?: string;
  dev?: boolean;
}

function run({ now, timeZone = 'Europe/London', lang = 'en', search = '', cookie = '', dev = false }: Env) {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(now));
  const classes = new Set<string>();
  const attrs: Record<string, string> = {};
  const writes: string[] = [];
  const doc = {
    documentElement: {
      lang,
      classList: { add: (c: string) => classes.add(c) },
      setAttribute: (k: string, v: string) => (attrs[k] = v),
    },
    get cookie() {
      return cookie;
    },
    set cookie(v: string) {
      writes.push(v);
    },
  };
  const intl = { DateTimeFormat: () => ({ resolvedOptions: () => ({ timeZone }) }) };
  new Function('document', 'location', 'Intl', buildPrepaintScript(dev))(doc, { search }, intl);
  return { classes: [...classes], attrs, writes };
}

afterEach(() => vi.useRealTimers());

describe('holiday pre-paint script', () => {
  it('carries exactly the windows of holidayWindows() for 2026-2028', () => {
    for (const year of [2026, 2027, 2028]) {
      for (const w of holidayWindows(year)) {
        expect(HOLIDAY_WINDOW_TABLE).toContainEqual([w.key, w.previewStart, w.start, w.end, '']);
      }
      for (const l of CHRISTMAS_LOCALES) {
        const w = holidayWindows(year, l).find((x) => x.key === 'christmas')!;
        expect(HOLIDAY_WINDOW_TABLE).toContainEqual([w.key, w.previewStart, w.start, w.end, l]);
      }
    }
    const inScript = JSON.parse(HOLIDAY_PREPAINT_SCRIPT.match(/var W=(\[.*?\]\]);/)![1]);
    expect(inScript).toEqual(HOLIDAY_WINDOW_TABLE);
  });

  it('given an Israeli time zone on night 1 local time, adds holiday-hanukkah', () => {
    const r = run({ now: '2026-12-04T09:00:00', timeZone: 'Asia/Jerusalem' });
    expect(r.classes).toEqual(['holiday-hanukkah', 'holiday-live']);
    expect(r.attrs['data-holiday-region']).toBe('IL');
  });

  it('given Hebrew lang and no Israeli zone, still picks hanukkah', () => {
    expect(run({ now: '2026-12-06T12:00:00', lang: 'he' }).classes).toEqual(['holiday-hanukkah', 'holiday-live']);
  });

  it('given a world visitor, Dec 1-12 is the christmas preview and Dec 13 the live event', () => {
    expect(run({ now: '2026-11-30T23:30:00' }).classes).toEqual([]);
    expect(run({ now: '2026-12-01T00:30:00' }).classes).toEqual(['holiday-christmas', 'holiday-preview']);
    expect(run({ now: '2026-12-12T23:30:00' }).classes).toEqual(['holiday-christmas', 'holiday-preview']);
    expect(run({ now: '2026-12-13T00:30:00' }).classes).toEqual(['holiday-christmas', 'holiday-live']);
  });

  it('given an Israeli visitor, Dec 1-3 is the hanukkah preview', () => {
    expect(run({ now: '2026-12-01T09:00:00', timeZone: 'Asia/Jerusalem' }).classes).toEqual(['holiday-hanukkah', 'holiday-preview']);
    expect(run({ now: '2026-12-03T23:00:00', timeZone: 'Asia/Jerusalem' }).classes).toEqual(['holiday-hanukkah', 'holiday-preview']);
    expect(run({ now: '2027-12-10T09:00:00', timeZone: 'Asia/Jerusalem' }).classes).toEqual(['holiday-hanukkah', 'holiday-preview']);
  });

  it('given a world visitor on Jan 1 2027, adds holiday-christmas (year wrap)', () => {
    expect(run({ now: '2027-01-01T23:30:00' }).classes).toEqual(['holiday-christmas', 'holiday-live']);
    expect(run({ now: '2027-01-02T00:30:00' }).classes).toEqual([]);
  });

  it('given hanukkah 2027 crossing into 2028, an IL visitor sees it on Jan 1 2028', () => {
    expect(run({ now: '2028-01-01T10:00:00', timeZone: 'Asia/Jerusalem' }).classes).toEqual(['holiday-hanukkah', 'holiday-live']);
  });

  it('given es, christmas stays on through the Jan 7 grace day and is off Jan 8', () => {
    expect(run({ now: '2027-01-06T12:00:00', lang: 'es' }).classes).toEqual(['holiday-christmas', 'holiday-live']);
    expect(run({ now: '2027-01-07T12:00:00', lang: 'es' }).classes).toEqual(['holiday-christmas', 'holiday-live']);
    expect(run({ now: '2027-01-08T12:00:00', lang: 'es' }).classes).toEqual([]);
  });

  it('given ru, christmas stays on Jan 7 and is off Jan 8; en is off Jan 2', () => {
    expect(run({ now: '2027-01-07T12:00:00', lang: 'ru' }).classes).toEqual(['holiday-christmas', 'holiday-live']);
    expect(run({ now: '2027-01-08T12:00:00', lang: 'ru' }).classes).toEqual([]);
    expect(run({ now: '2027-01-02T12:00:00', lang: 'en' }).classes).toEqual([]);
  });

  it('given a stale cookie off from the retired picker, falls back to the location holiday', () => {
    expect(run({ now: '2026-12-20T12:00:00', cookie: 'lx_holiday=off' }).classes).toEqual(['holiday-christmas', 'holiday-live']);
  });

  it('given cookie hanukkah for a world visitor in hanukkah, switches theme', () => {
    expect(run({ now: '2026-12-06T12:00:00', cookie: 'x=1; lx_holiday=hanukkah' }).classes).toEqual(['holiday-hanukkah', 'holiday-live']);
  });

  it('given ?holiday=, writes the cookie and applies it', () => {
    const r = run({ now: '2026-12-06T12:00:00', search: '?holiday=hanukkah', cookie: 'lx_holiday=christmas' });
    expect(r.classes).toEqual(['holiday-hanukkah', 'holiday-live']);
    expect(r.writes).toEqual(['lx_holiday=hanukkah; path=/; max-age=5184000; samesite=lax']);
  });

  it('given ?holiday= out of season without preview in production, adds nothing', () => {
    expect(run({ now: '2026-07-01T12:00:00', search: '?holiday=christmas' }).classes).toEqual([]);
  });

  it('given ?holiday= with holidayPreview=1, forces the theme out of season', () => {
    const r = run({ now: '2026-07-01T12:00:00', search: '?holiday=christmas&holidayPreview=1' });
    expect(r.classes).toEqual(['holiday-christmas', 'holiday-live']);
    expect(r.attrs['data-holiday-preview']).toBe('1');
  });

  it('given ?holidayPreview=1 during the Dec 1 coming-soon days, shows the full live event for screenshots', () => {
    const r = run({ now: '2026-12-05T12:00:00', search: '?holiday=christmas&holidayPreview=1' });
    expect(r.classes).toEqual(['holiday-christmas', 'holiday-live']);
    expect(r.attrs['data-holiday-preview']).toBe('1');
    expect(run({ now: '2026-12-05T12:00:00', search: '?holiday=christmas' }).classes).toEqual(['holiday-christmas', 'holiday-preview']);
  });

  it('given a dev build, ?holiday= forces the theme without the preview flag', () => {
    expect(run({ now: '2026-07-01T12:00:00', search: '?holiday=hanukkah', dev: true }).classes).toEqual(['holiday-hanukkah', 'holiday-live']);
  });

  it('given an unknown ?holiday= value, ignores it and the cookie wins', () => {
    const r = run({ now: '2026-12-06T12:00:00', search: '?holiday=off', cookie: 'lx_holiday=hanukkah' });
    expect(r.classes).toEqual(['holiday-hanukkah', 'holiday-live']);
    expect(r.writes).toEqual([]);
  });

  it('covers next year, so the table is extended before it runs out', () => {
    const next = new Date().getFullYear() + 1;
    expect(HOLIDAY_WINDOW_TABLE.some(([, start]) => start.startsWith(String(next)))).toBe(true);
  });

  it('stays tiny', () => {
    expect(HOLIDAY_PREPAINT_SCRIPT.length).toBeLessThan(2048);
  });
});
