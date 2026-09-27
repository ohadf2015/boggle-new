import { describe, it, expect } from 'vitest';
import { mpExit, MP_EXIT_REASONS, isInAppPreviousPath } from '../exitDestination';

/**
 * Every way out of a multiplayer screen goes through `mpExit(reason, ctx)`.
 * The invariant: nothing unexpectedly bounces a player to the LexiClash
 * homepage. In-room exits reset to the MP entry IN PLACE (a hard nav blanks
 * the Capacitor static-export WebView); only leaving MP from the entry screen
 * leaves the section, and then to where the player came from.
 */
const arcade = { isClassroomMode: false, isHost: false, locale: 'en' } as const;

describe('mpExit — in-room reasons reset to the MP entry in place', () => {
  const inRoom = ['leave-room', 'room-gone', 'aborted', 'kicked', 'host-left', 'error'] as const;

  it.each(inRoom)('%s → reset-to-entry for an arcade game', (reason) => {
    expect(mpExit(reason, arcade)).toEqual({ kind: 'reset-to-entry' });
  });

  it.each(inRoom)('%s → the classroom hub for a classroom host', (reason) => {
    expect(mpExit(reason, { ...arcade, isClassroomMode: true, isHost: true })).toEqual({
      kind: 'navigate',
      href: '/en/teacher',
    });
  });

  it.each(inRoom)('%s → the student hub for a classroom student', (reason) => {
    expect(mpExit(reason, { ...arcade, isClassroomMode: true, locale: 'he' })).toEqual({
      kind: 'navigate',
      href: '/he/student',
    });
  });
});

describe('mpExit — back-from-entry', () => {
  it('returns to the previous in-app route when there is one', () => {
    expect(mpExit('back-from-entry', { ...arcade, previousPath: '/en/daily' })).toEqual({
      kind: 'navigate',
      href: '/en/daily',
    });
  });

  it('falls back to the locale root when there is no previous route', () => {
    expect(mpExit('back-from-entry', arcade)).toEqual({ kind: 'navigate', href: '/en' });
    expect(mpExit('back-from-entry', { ...arcade, locale: 'ja', previousPath: null })).toEqual({
      kind: 'navigate',
      href: '/ja',
    });
  });

  it('ignores an external or MP previous path (no loop back into MP, no open redirect)', () => {
    for (const previousPath of ['https://evil.example/x', '//evil.example', '/en/multiplayer?room=AB', 'javascript:alert(1)']) {
      expect(mpExit('back-from-entry', { ...arcade, previousPath })).toEqual({ kind: 'navigate', href: '/en' });
    }
  });

  it('a classroom entry still goes to its hub', () => {
    expect(mpExit('back-from-entry', { ...arcade, isClassroomMode: true, isHost: true, previousPath: '/en/daily' }))
      .toEqual({ kind: 'navigate', href: '/en/teacher' });
  });
});

describe('mpExit — continue-solo', () => {
  it('hands off to singleplayer with the mpHandoff flag, in locale', () => {
    expect(mpExit('continue-solo', { ...arcade, locale: 'es' })).toEqual({
      kind: 'navigate',
      href: '/es/singleplayer?mpHandoff=1',
    });
  });
});

describe('mpExit — never the bare homepage from inside a room', () => {
  it('no in-room reason for any role/locale resolves to `/{locale}`', () => {
    for (const reason of MP_EXIT_REASONS) {
      if (reason === 'back-from-entry') continue;
      for (const isClassroomMode of [true, false]) {
        for (const isHost of [true, false]) {
          for (const locale of ['en', 'he', 'sv', 'ja', 'es']) {
            const action = mpExit(reason, { isClassroomMode, isHost, locale });
            if (action.kind === 'navigate') expect(action.href).not.toBe(`/${locale}`);
          }
        }
      }
    }
  });
});

describe('isInAppPreviousPath', () => {
  it('accepts same-origin non-MP paths only', () => {
    expect(isInAppPreviousPath('/en/leaderboard')).toBe(true);
    expect(isInAppPreviousPath('/en/multiplayer')).toBe(false);
    expect(isInAppPreviousPath('/he/multiplayer/x')).toBe(false);
    expect(isInAppPreviousPath('//x.com')).toBe(false);
    expect(isInAppPreviousPath('')).toBe(false);
    expect(isInAppPreviousPath(undefined)).toBe(false);
  });
});
