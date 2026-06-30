/**
 * logrocket — identifyUser / identifyGuest / trackEvent
 *
 * Verifies trait extraction so LogRocket sessions are filterable
 * by username, locale, role, score totals, rank, prestige, etc.
 *
 * LogRocket is loaded lazily on `window.LogRocket`; these helpers
 * must no-op silently when it isn't there.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { identifyGuest, identifyUser, trackEvent } from '../logrocket';

type Traits = Record<string, string | number | boolean>;

interface LRMock {
  identify: ReturnType<typeof vi.fn>;
  track: ReturnType<typeof vi.fn>;
  getSessionURL: ReturnType<typeof vi.fn>;
}

function installLR(): LRMock {
  const lr: LRMock = {
    identify: vi.fn(),
    track: vi.fn(),
    getSessionURL: vi.fn(),
  };
  (window as unknown as { LogRocket?: LRMock }).LogRocket = lr;
  return lr;
}

function uninstallLR(): void {
  delete (window as unknown as { LogRocket?: unknown }).LogRocket;
}

describe('identifyUser', () => {
  let lr: LRMock;

  beforeEach(() => {
    lr = installLR();
  });

  afterEach(() => {
    uninstallLR();
    vi.clearAllMocks();
  });

  it('no-ops when LogRocket is not loaded', () => {
    uninstallLR();
    expect(() => identifyUser({ userId: 'u1' })).not.toThrow();
  });

  it('calls identify with the userId and an empty trait set when only userId is given', () => {
    identifyUser({ userId: 'u1' });
    expect(lr.identify).toHaveBeenCalledWith('u1', {});
  });

  it('maps displayName → name and forwards email + role flags', () => {
    identifyUser({
      userId: 'u1',
      displayName: 'Ohad',
      email: 'o@x.com',
      isAdmin: true,
      isTeacher: true,
    });
    const traits = lr.identify.mock.calls[0]?.[1] as Traits;
    expect(traits.name).toBe('Ohad');
    expect(traits.email).toBe('o@x.com');
    expect(traits.isAdmin).toBe(true);
    expect(traits.isTeacher).toBe(true);
  });

  it('forwards username as a distinct filterable trait', () => {
    identifyUser({ userId: 'u1', username: 'ohad_f' });
    const traits = lr.identify.mock.calls[0]?.[1] as Traits;
    expect(traits.username).toBe('ohad_f');
  });

  it('forwards locale, userRole, timezone, and rankTier as strings', () => {
    identifyUser({
      userId: 'u1',
      language: 'he',
      userRole: 'teacher',
      timezone: 'Asia/Jerusalem',
      rankTier: 'gold',
    });
    const traits = lr.identify.mock.calls[0]?.[1] as Traits;
    expect(traits.language).toBe('he');
    expect(traits.userRole).toBe('teacher');
    expect(traits.timezone).toBe('Asia/Jerusalem');
    expect(traits.rankTier).toBe('gold');
  });

  it('forwards score/word/XP totals and longest-word stats as numbers', () => {
    identifyUser({
      userId: 'u1',
      totalScore: 1234,
      totalWords: 567,
      totalXp: 8910,
      longestWordLength: 11,
      streakDays: 4,
      rankedMmr: 1320,
    });
    const traits = lr.identify.mock.calls[0]?.[1] as Traits;
    expect(traits.totalScore).toBe(1234);
    expect(traits.totalWords).toBe(567);
    expect(traits.totalXp).toBe(8910);
    expect(traits.longestWordLength).toBe(11);
    expect(traits.streakDays).toBe(4);
    expect(traits.rankedMmr).toBe(1320);
  });

  it('forwards economy, win, and skill-ceiling totals as numbers', () => {
    identifyUser({
      userId: 'u1',
      coins: 250,
      lifetimeCoins: 4800,
      rankedWins: 17,
      casualWins: 33,
      rankedGames: 40,
      casualGames: 120,
      peakMmr: 1450,
      lifetimeXp: 50000,
      prestigeMultiplier: 1.5,
      totalTimePlayed: 86400,
      birthYear: 1995,
    });
    const traits = lr.identify.mock.calls[0]?.[1] as Traits;
    expect(traits.coins).toBe(250);
    expect(traits.lifetimeCoins).toBe(4800);
    expect(traits.rankedWins).toBe(17);
    expect(traits.casualWins).toBe(33);
    expect(traits.rankedGames).toBe(40);
    expect(traits.casualGames).toBe(120);
    expect(traits.peakMmr).toBe(1450);
    expect(traits.lifetimeXp).toBe(50000);
    expect(traits.prestigeMultiplier).toBe(1.5);
    expect(traits.totalTimePlayed).toBe(86400);
    expect(traits.birthYear).toBe(1995);
  });

  it('forwards beta-tester flag, avatar-customized flag, and player style', () => {
    identifyUser({
      userId: 'u1',
      isBetaTester: true,
      avatarCustomized: true,
      playerStyle: 'competitive',
    });
    const traits = lr.identify.mock.calls[0]?.[1] as Traits;
    expect(traits.isBetaTester).toBe(true);
    expect(traits.avatarCustomized).toBe(true);
    expect(traits.playerStyle).toBe('competitive');
  });

  it('forwards customization, feature-access, and graduation flags', () => {
    identifyUser({
      userId: 'u1',
      hasCustomizedProfile: true,
      blastAccess: true,
      practiceGraduated: true,
    });
    const traits = lr.identify.mock.calls[0]?.[1] as Traits;
    expect(traits.hasCustomizedProfile).toBe(true);
    expect(traits.blastAccess).toBe(true);
    expect(traits.practiceGraduated).toBe(true);
  });

  it('forwards UTM medium/campaign and referrer alongside source', () => {
    identifyUser({
      userId: 'u1',
      utmSource: 'twitter',
      utmMedium: 'social',
      utmCampaign: 'launch-q2',
      referrer: 'https://t.co/abc',
    });
    const traits = lr.identify.mock.calls[0]?.[1] as Traits;
    expect(traits.utmSource).toBe('twitter');
    expect(traits.utmMedium).toBe('social');
    expect(traits.utmCampaign).toBe('launch-q2');
    expect(traits.referrer).toBe('https://t.co/abc');
  });

  it('forwards platform, appVersion, and accountAgeDays as filterable session metadata', () => {
    identifyUser({
      userId: 'u1',
      platform: 'android',
      appVersion: '0.1.0',
      accountAgeDays: 42,
    });
    const traits = lr.identify.mock.calls[0]?.[1] as Traits;
    expect(traits.platform).toBe('android');
    expect(traits.appVersion).toBe('0.1.0');
    expect(traits.accountAgeDays).toBe(42);
  });

  it('omits undefined fields rather than sending the literal undefined', () => {
    identifyUser({
      userId: 'u1',
      displayName: undefined,
      email: undefined,
      language: undefined,
      totalScore: undefined,
    });
    const traits = lr.identify.mock.calls[0]?.[1] as Traits;
    expect('name' in traits).toBe(false);
    expect('email' in traits).toBe(false);
    expect('language' in traits).toBe(false);
    expect('totalScore' in traits).toBe(false);
  });

  it('preserves zero values (totalGames=0 is a valid signal, not absence)', () => {
    identifyUser({ userId: 'u1', totalGames: 0, totalScore: 0, streakDays: 0 });
    const traits = lr.identify.mock.calls[0]?.[1] as Traits;
    expect(traits.totalGames).toBe(0);
    expect(traits.totalScore).toBe(0);
    expect(traits.streakDays).toBe(0);
  });

  it('merges experiment cohort traits passed via the experiments map', () => {
    identifyUser({
      userId: 'u1',
      experiments: { 'exp_signup-cta': 'urgency', 'exp_drag-hint': 'control' },
    });
    const traits = lr.identify.mock.calls[0]?.[1] as Traits;
    expect(traits['exp_signup-cta']).toBe('urgency');
    expect(traits['exp_drag-hint']).toBe('control');
  });

  it('ignores an empty experiments map (no flags resolved yet)', () => {
    identifyUser({ userId: 'u1', experiments: {} });
    expect(lr.identify).toHaveBeenCalledWith('u1', {});
  });

  it('isGuest=false is preserved, not dropped, so authed sessions are filterable', () => {
    identifyUser({ userId: 'u1', isGuest: false });
    const traits = lr.identify.mock.calls[0]?.[1] as Traits;
    expect(traits.isGuest).toBe(false);
  });
});

describe('identifyGuest', () => {
  let lr: LRMock;

  beforeEach(() => {
    lr = installLR();
  });

  afterEach(() => {
    uninstallLR();
    vi.clearAllMocks();
  });

  it('prefixes the id with guest- and marks isGuest', () => {
    identifyGuest('fp-abc');
    expect(lr.identify).toHaveBeenCalledWith('guest-fp-abc', { isGuest: true });
  });

  it('includes the name + language + platform when provided', () => {
    identifyGuest('fp-abc', { name: 'Anon', language: 'es', platform: 'web' });
    expect(lr.identify).toHaveBeenCalledWith('guest-fp-abc', {
      isGuest: true,
      name: 'Anon',
      language: 'es',
      platform: 'web',
    });
  });
});

describe('trackEvent', () => {
  let lr: LRMock;

  beforeEach(() => {
    lr = installLR();
  });

  afterEach(() => {
    uninstallLR();
    vi.clearAllMocks();
  });

  it('forwards event name and payload', () => {
    trackEvent('game_start', { mode: 'blast' });
    expect(lr.track).toHaveBeenCalledWith('game_start', { mode: 'blast' });
  });

  it('no-ops when LogRocket is absent', () => {
    uninstallLR();
    expect(() => trackEvent('game_start')).not.toThrow();
  });
});
