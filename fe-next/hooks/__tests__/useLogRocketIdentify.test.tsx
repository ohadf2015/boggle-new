/**
 * useLogRocketIdentify — verifies that profile fields are wired through
 * to LogRocket so sessions can be filtered by name/username/role/locale/
 * progression/acquisition without us having to extend the call site each
 * time a new trait is needed.
 */

import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { identifyUserMock, identifyGuestMock } = vi.hoisted(() => ({
  identifyUserMock: vi.fn(),
  identifyGuestMock: vi.fn(),
}));

vi.mock('@/utils/logrocket', () => ({
  identifyUser: (...a: unknown[]) => identifyUserMock(...a),
  identifyGuest: (...a: unknown[]) => identifyGuestMock(...a),
}));

const mockUseAuth = vi.fn();
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    getPlatform: () => 'web',
    isNativePlatform: () => false,
  },
}));

import { useLogRocketIdentify } from '../useLogRocketIdentify';

beforeEach(() => {
  identifyUserMock.mockClear();
  identifyGuestMock.mockClear();
  mockUseAuth.mockReset();
});

function authedAuth(profileOverrides: Record<string, unknown> = {}) {
  return {
    user: { id: 'user-abc', email: 'ohad@x.com' },
    profile: {
      id: 'user-abc',
      username: 'ohad_f',
      display_name: 'Ohad',
      current_level: 7,
      total_games: 42,
      total_score: 9999,
      total_words: 321,
      total_xp: 12000,
      longest_word_length: 11,
      streak_days: 4,
      rank_tier: 'gold',
      ranked_mmr: 1320,
      prestige_level: 1,
      country_code: 'IL',
      language: 'he',
      timezone: 'Asia/Jerusalem',
      user_role: 'student',
      has_customized_profile: true,
      blast_access: true,
      practice_graduated_at: '2026-04-01T00:00:00Z',
      utm_source: 'twitter',
      utm_medium: 'social',
      utm_campaign: 'launch-q2',
      referrer: 'https://t.co/abc',
      created_at: '2026-04-15T00:00:00Z',
      ...profileOverrides,
    },
    isAuthenticated: true,
    isGuest: false,
    isAdmin: false,
    isTeacher: false,
  };
}

describe('useLogRocketIdentify', () => {
  it('passes username, display name, email, and role flags on auth', () => {
    mockUseAuth.mockReturnValue(authedAuth());
    renderHook(() => useLogRocketIdentify());

    expect(identifyUserMock).toHaveBeenCalled();
    const call = identifyUserMock.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(call.userId).toBe('user-abc');
    expect(call.displayName).toBe('Ohad');
    expect(call.username).toBe('ohad_f');
    expect(call.email).toBe('ohad@x.com');
    expect(call.isGuest).toBe(false);
  });

  it('forwards locale, userRole, timezone, country', () => {
    mockUseAuth.mockReturnValue(authedAuth());
    renderHook(() => useLogRocketIdentify());
    const call = identifyUserMock.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(call.language).toBe('he');
    expect(call.userRole).toBe('student');
    expect(call.timezone).toBe('Asia/Jerusalem');
    expect(call.country).toBe('IL');
  });

  it('forwards score/word/XP totals and rank info', () => {
    mockUseAuth.mockReturnValue(authedAuth());
    renderHook(() => useLogRocketIdentify());
    const call = identifyUserMock.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(call.totalScore).toBe(9999);
    expect(call.totalWords).toBe(321);
    expect(call.totalXp).toBe(12000);
    expect(call.longestWordLength).toBe(11);
    expect(call.streakDays).toBe(4);
    expect(call.rankTier).toBe('gold');
    expect(call.rankedMmr).toBe(1320);
  });

  it('forwards customization, access, and graduation flags', () => {
    mockUseAuth.mockReturnValue(authedAuth());
    renderHook(() => useLogRocketIdentify());
    const call = identifyUserMock.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(call.hasCustomizedProfile).toBe(true);
    expect(call.blastAccess).toBe(true);
    expect(call.practiceGraduated).toBe(true);
  });

  it('converts practice_graduated_at=null to practiceGraduated=false', () => {
    mockUseAuth.mockReturnValue(authedAuth({ practice_graduated_at: null }));
    renderHook(() => useLogRocketIdentify());
    const call = identifyUserMock.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(call.practiceGraduated).toBe(false);
  });

  it('forwards utm medium/campaign/referrer alongside source', () => {
    mockUseAuth.mockReturnValue(authedAuth());
    renderHook(() => useLogRocketIdentify());
    const call = identifyUserMock.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(call.utmMedium).toBe('social');
    expect(call.utmCampaign).toBe('launch-q2');
    expect(call.referrer).toBe('https://t.co/abc');
  });

  it('computes accountAgeDays from profile.created_at', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-15T00:00:00Z'));
    mockUseAuth.mockReturnValue(authedAuth({ created_at: '2026-04-15T00:00:00Z' }));
    renderHook(() => useLogRocketIdentify());
    const call = identifyUserMock.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(call.accountAgeDays).toBe(30);
    vi.useRealTimers();
  });

  it('sets platform from Capacitor.getPlatform()', () => {
    mockUseAuth.mockReturnValue(authedAuth());
    renderHook(() => useLogRocketIdentify());
    const call = identifyUserMock.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(call.platform).toBe('web');
  });

  it('routes guests to identifyGuest with name + language + platform', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      profile: {
        id: 'guest-fp-xyz',
        username: 'PartyKitten',
        display_name: 'PartyKitten',
        language: 'es',
      },
      isAuthenticated: false,
      isGuest: true,
      isAdmin: false,
      isTeacher: false,
    });
    renderHook(() => useLogRocketIdentify());

    expect(identifyGuestMock).toHaveBeenCalledWith('guest-fp-xyz', {
      name: 'PartyKitten',
      language: 'es',
      platform: 'web',
    });
    expect(identifyUserMock).not.toHaveBeenCalled();
  });

  it('does nothing when there is no user and no profile', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      profile: null,
      isAuthenticated: false,
      isGuest: false,
      isAdmin: false,
      isTeacher: false,
    });
    renderHook(() => useLogRocketIdentify());
    expect(identifyUserMock).not.toHaveBeenCalled();
    expect(identifyGuestMock).not.toHaveBeenCalled();
  });
});
