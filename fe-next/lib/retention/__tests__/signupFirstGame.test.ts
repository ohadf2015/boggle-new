import { describe, expect, it } from 'vitest';
import {
  SIGNUP_FIRST_GAME_KEY,
  SIGNUP_FIRST_GAME_TREATMENT,
  consumeAccountFirstGamePending,
  isSignupFirstGameSurface,
  isTeacherRole,
  markFreshSignup,
  offerFromRead,
  shouldShowSignupFirstGame,
  signupDailyHref,
  signupFirstName,
  signupQuickPlayHref,
  type SignupFirstGameRead,
} from '../signupFirstGame';

function installStorage() {
  const local = new Map<string, string>();
  const session = new Map<string, string>();
  const make = (map: Map<string, string>) => ({
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => { map.set(key, value); },
    removeItem: (key: string) => { map.delete(key); },
    clear: () => { map.clear(); },
  });
  const g = globalThis as Record<string, unknown>;
  g.localStorage = make(local);
  g.sessionStorage = make(session);
  g.window = g;
}

function read(overrides: Partial<SignupFirstGameRead> = {}): SignupFirstGameRead {
  return {
    landedHome: true,
    fresh: { userId: 'u1', surface: 'header_or_menu' },
    pendingGame: false,
    role: 'student',
    userId: 'u1',
    stillPending: true,
    ...overrides,
  };
}

describe('signup first game', () => {
  it('sends the primary tap to quick play and the second to today\'s wheel, no setup', () => {
    expect(signupQuickPlayHref('he')).toBe('/he/multiplayer?quickPlay=true');
    expect(signupDailyHref('es')).toBe('/es/daily/word-wheel?start=1');
    expect(signupQuickPlayHref('')).toBe('/en/multiplayer?quickPlay=true');
  });

  it('uses the first name and nothing when the profile has no name', () => {
    expect(signupFirstName('Maya Cohen', 'maya')).toBe('Maya');
    expect(signupFirstName(null, 'player_one')).toBe('player_one');
    expect(signupFirstName('  ', null)).toBe('');
  });

  it('treats header, edu, and a first-win with nothing to resume as the test population', () => {
    expect(isSignupFirstGameSurface('header_or_menu', false)).toBe(true);
    expect(isSignupFirstGameSurface(null, false)).toBe(true);
    expect(isSignupFirstGameSurface('edu_access', false)).toBe(true);
    expect(isSignupFirstGameSurface('first_win_sheet', false)).toBe(true);
    expect(isSignupFirstGameSurface('first_win_prompt', false)).toBe(true);
    expect(isSignupFirstGameSurface('first_win_sheet', true)).toBe(false);
    expect(isSignupFirstGameSurface('results_inline', false)).toBe(false);
    expect(isSignupFirstGameSurface('multi_games_sheet', false)).toBe(false);
    expect(isSignupFirstGameSurface('multi_game_prompt', false)).toBe(false);
    expect(isSignupFirstGameSurface('mp_sheet', false)).toBe(false);
  });

  it('exposes only a fresh student who landed on home with no game waiting', () => {
    expect(offerFromRead(read())?.expose).toBe(true);
    expect(offerFromRead(read({ landedHome: false }))).toBeNull();
    expect(offerFromRead(read({ role: 'teacher' }))).toBeNull();
    expect(offerFromRead(read({ role: 'admin' }))).toBeNull();
    expect(isTeacherRole('student')).toBe(false);
    expect(offerFromRead(read({ fresh: { userId: 'u1', surface: 'results_inline' } }))).toBeNull();
    expect(offerFromRead(read({
      fresh: { userId: 'u1', surface: 'first_win_sheet' },
      pendingGame: true,
    }))).toBeNull();
    expect(offerFromRead(read({
      fresh: { userId: 'u1', surface: 'edu_access' },
      role: 'student',
    }))?.surface).toBe('edu_access');
    expect(offerFromRead(read({ userId: 'other' }))).toBeNull();
    expect(offerFromRead(read({ stillPending: false }))).toBeNull();
    expect(offerFromRead(read({ fresh: null }))).toBeNull();
  });

  it('renders the card only for the play variant', () => {
    const offer = offerFromRead(read());
    expect(shouldShowSignupFirstGame(offer, SIGNUP_FIRST_GAME_TREATMENT)).toBe(true);
    expect(shouldShowSignupFirstGame(offer, 'control')).toBe(false);
    expect(shouldShowSignupFirstGame(offer, null)).toBe(false);
    expect(shouldShowSignupFirstGame(null, SIGNUP_FIRST_GAME_TREATMENT)).toBe(false);
    expect(SIGNUP_FIRST_GAME_KEY).toBe('signup-first-game');
  });

  it('fires the account goal once, and does not re-arm it', () => {
    installStorage();
    markFreshSignup('u1', 'header_or_menu');
    expect(consumeAccountFirstGamePending()).toEqual({ userId: 'u1', surface: 'header_or_menu' });
    expect(consumeAccountFirstGamePending()).toBeNull();
    markFreshSignup('u1', 'header_or_menu');
    expect(consumeAccountFirstGamePending()).toBeNull();
  });
});
