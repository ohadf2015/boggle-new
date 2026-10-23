import { describe, it, expect } from 'vitest';
import { MP_EXIT_REASONS, mpExit, multiplayerExitDestination } from '@/lib/multiplayer/exitDestination';

const LOCALES = ['en', 'he', 'sv', 'ja', 'es', 'ru'];
const consumer = (href: string, locale: string) =>
  href === `/${locale}` || href.startsWith(`/${locale}/singleplayer`) || href.startsWith(`/${locale}/multiplayer`);

describe('mpExit from a classroom never leaves edu', () => {
  it('continue-solo in a classroom goes to the hub, not singleplayer', () => {
    expect(mpExit('continue-solo', { isClassroomMode: true, isHost: true, locale: 'he' }))
      .toEqual({ kind: 'navigate', href: '/he/teacher' });
    expect(mpExit('continue-solo', { isClassroomMode: true, isHost: false, locale: 'es' }))
      .toEqual({ kind: 'navigate', href: '/es/student' });
  });

  it('an unresolved context on /education/live still resolves to a hub for every reason', () => {
    for (const reason of MP_EXIT_REASONS) {
      for (const locale of LOCALES) {
        for (const isHost of [true, false]) {
          const action = mpExit(reason, {
            isClassroomMode: false, isHost, locale, pathname: `/${locale}/education/live`, previousPath: `/${locale}/daily`,
          });
          expect(action, `${reason} ${locale} host=${isHost}`).toEqual({
            kind: 'navigate', href: isHost ? `/${locale}/teacher` : `/${locale}/student`,
          });
        }
      }
    }
  });

  it('no classroom exit for any reason resolves to a consumer surface', () => {
    for (const reason of MP_EXIT_REASONS) {
      for (const locale of LOCALES) {
        for (const isHost of [true, false]) {
          const action = mpExit(reason, { isClassroomMode: true, isHost, locale, previousPath: `/${locale}` });
          expect(action.kind).toBe('navigate');
          if (action.kind === 'navigate') expect(consumer(action.href, locale), `${reason} ${action.href}`).toBe(false);
        }
      }
    }
  });

  it('multiplayerExitDestination treats the live route as classroom when the flag has not resolved', () => {
    expect(multiplayerExitDestination({ isClassroomMode: false, isHost: true, locale: 'en', pathname: '/en/education/live' }))
      .toBe('/en/teacher');
    expect(multiplayerExitDestination({ isClassroomMode: false, isHost: false, locale: 'he', pathname: '/he/education/live/' }))
      .toBe('/he/student');
  });

  it('arcade exits are unchanged', () => {
    const arcade = { isClassroomMode: false, isHost: false, locale: 'en', pathname: '/en/multiplayer' };
    expect(mpExit('continue-solo', arcade)).toEqual({ kind: 'navigate', href: '/en/singleplayer?mpHandoff=1' });
    expect(mpExit('leave-room', arcade)).toEqual({ kind: 'reset-to-entry' });
    expect(mpExit('back-from-entry', arcade)).toEqual({ kind: 'navigate', href: '/en' });
    expect(multiplayerExitDestination(arcade)).toBeNull();
  });
});
