/**
 * isPushAllowed — preference-gated push delivery
 *
 * Policy: missing row = defaults (all on); query errors fail-open (deliver).
 * Master kill-switch (push_enabled=false) blocks every type, including unmapped
 * ones (achievement, level_up). Category booleans only gate mapped types.
 */

import { vi, describe, it, expect, beforeEach } from 'vitest';
import { isPushAllowed } from '../pushNotificationTriggers';

const { mockMaybeSingle } = vi.hoisted(() => ({
  mockMaybeSingle: vi.fn(),
}));

vi.mock('../supabase', () => ({
  getSupabase: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: mockMaybeSingle,
        })),
      })),
    })),
  })),
  isSupabaseConfigured: vi.fn(() => true),
}));

vi.mock('../../utils/logger', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

describe('isPushAllowed', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns true when no preference row exists (defaults on)', async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });
    expect(await isPushAllowed('uid', 'friend_request')).toBe(true);
  });

  it('returns false when master push_enabled is off', async () => {
    mockMaybeSingle.mockResolvedValue({
      data: {
        push_enabled: false,
        daily_challenge: true,
        streak_warning: true,
        friend_invites: true,
        weekly_summary: true,
      },
      error: null,
    });
    expect(await isPushAllowed('uid', 'friend_request')).toBe(false);
  });

  it('master off blocks unmapped types too (achievement)', async () => {
    mockMaybeSingle.mockResolvedValue({
      data: {
        push_enabled: false,
        daily_challenge: true,
        streak_warning: true,
        friend_invites: true,
        weekly_summary: true,
      },
      error: null,
    });
    expect(await isPushAllowed('uid', 'achievement')).toBe(false);
  });

  it('returns false when category toggle is off (friend_invites)', async () => {
    mockMaybeSingle.mockResolvedValue({
      data: {
        push_enabled: true,
        daily_challenge: true,
        streak_warning: true,
        friend_invites: false,
        weekly_summary: true,
      },
      error: null,
    });
    expect(await isPushAllowed('uid', 'game_invite')).toBe(false);
  });

  it('returns false when daily_challenge toggle is off', async () => {
    mockMaybeSingle.mockResolvedValue({
      data: {
        push_enabled: true,
        daily_challenge: false,
        streak_warning: true,
        friend_invites: true,
        weekly_summary: true,
      },
      error: null,
    });
    expect(await isPushAllowed('uid', 'daily_challenge')).toBe(false);
  });

  it('unmapped types (achievement) pass when master is on, regardless of category flags', async () => {
    mockMaybeSingle.mockResolvedValue({
      data: {
        push_enabled: true,
        daily_challenge: false,
        streak_warning: false,
        friend_invites: false,
        weekly_summary: false,
      },
      error: null,
    });
    expect(await isPushAllowed('uid', 'achievement')).toBe(true);
    expect(await isPushAllowed('uid', 'level_up')).toBe(true);
  });

  it('fails open (returns true) when supabase returns an error', async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: { message: 'db down' } });
    expect(await isPushAllowed('uid', 'friend_request')).toBe(true);
  });

  it('fails open (returns true) when the query throws', async () => {
    mockMaybeSingle.mockRejectedValue(new Error('network'));
    expect(await isPushAllowed('uid', 'friend_request')).toBe(true);
  });

  it('all categories on → mapped type passes', async () => {
    mockMaybeSingle.mockResolvedValue({
      data: {
        push_enabled: true,
        daily_challenge: true,
        streak_warning: true,
        friend_invites: true,
        weekly_summary: true,
      },
      error: null,
    });
    expect(await isPushAllowed('uid', 'friend_request')).toBe(true);
    expect(await isPushAllowed('uid', 'daily_challenge')).toBe(true);
  });
});
