/**
 * Handing a class off to Google Classroom without asking Google for anything.
 *
 * Measured 2026-08-27: the create-flow is 3 clicks to a join code (Google Classroom's own is 6),
 * and 33 of 35 teachers still finished nothing. The step they stall on is the one after the code —
 * getting 28 children to type it. Classroom already holds that class and every student is already
 * signed in to it.
 *
 * `https://classroom.google.com/share` is Google's own share dialog. `url` is the only required
 * parameter and it involves no OAuth, no API key and no credential: Google prompts the teacher
 * inside its own dialog and we never learn which class they picked. That is the whole appeal —
 * no sensitive scopes to get verified, no student PII, no tokens to store.
 */
import { describe, it, expect } from 'vitest';
import { buildGoogleClassroomShareUrl } from '../googleClassroomShare';

const parse = (u: string) => new URL(u);

describe('buildGoogleClassroomShareUrl', () => {
  it('points at Google\'s share dialog', () => {
    const u = parse(buildGoogleClassroomShareUrl({ joinUrl: 'https://lexiclash.live/en/join/ABC123' }));
    expect(u.origin + u.pathname).toBe('https://classroom.google.com/share');
  });

  it('carries the join link, which is the only thing Google requires', () => {
    const joinUrl = 'https://lexiclash.live/en/join/ABC123';
    const u = parse(buildGoogleClassroomShareUrl({ joinUrl }));
    expect(u.searchParams.get('url')).toBe(joinUrl);
  });

  it('posts as an announcement so it lands on the Stream, where students actually look', () => {
    const u = parse(buildGoogleClassroomShareUrl({ joinUrl: 'https://x.test/join/A' }));
    expect(u.searchParams.get('itemtype')).toBe('announcement');
  });

  it('passes the title and body through as given, already localised by the caller', () => {
    const u = parse(
      buildGoogleClassroomShareUrl({
        joinUrl: 'https://x.test/join/A',
        title: 'Year 4 Literacy',
        body: 'Tap to join our class on LexiClash.',
      }),
    );
    expect(u.searchParams.get('title')).toBe('Year 4 Literacy');
    expect(u.searchParams.get('body')).toBe('Tap to join our class on LexiClash.');
  });

  it('omits title and body rather than sending empty ones', () => {
    // Google renders whatever it is given; a blank title makes a blank post.
    const u = parse(buildGoogleClassroomShareUrl({ joinUrl: 'https://x.test/join/A', title: '   ' }));
    expect(u.searchParams.has('title')).toBe(false);
    expect(u.searchParams.has('body')).toBe(false);
  });

  it('encodes a class name that contains characters a teacher would really type', () => {
    // Apostrophes, ampersands and non-Latin scripts are all normal classroom names.
    const title = "Mrs O'Brien's 4B & 4C — כיתה ד";
    const u = parse(buildGoogleClassroomShareUrl({ joinUrl: 'https://x.test/join/A', title }));
    expect(u.searchParams.get('title')).toBe(title);
  });

  it('refuses a join URL that is not http(s)', () => {
    // The value is placed in a link a teacher clicks; never let a javascript: URL through.
    expect(() => buildGoogleClassroomShareUrl({ joinUrl: 'javascript:alert(1)' })).toThrow();
    expect(() => buildGoogleClassroomShareUrl({ joinUrl: 'not a url' })).toThrow();
    expect(() => buildGoogleClassroomShareUrl({ joinUrl: '' })).toThrow();
  });

  it('never leaks the raw join code as a separate parameter', () => {
    // The code lives inside the URL path. Repeating it as its own query param would put it in
    // referrer logs and browser history for no benefit.
    const u = parse(buildGoogleClassroomShareUrl({ joinUrl: 'https://x.test/en/join/ABC123' }));
    expect([...u.searchParams.keys()].sort()).toEqual(['itemtype', 'url']);
  });
});
