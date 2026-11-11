/**
 * Rival ping push trigger
 * Canned rival ping: push + in-app row tagged with the ping id
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  notifyRivalPing,
} from '../pushNotificationTriggers';

// Mock fcmService
const { mockSendToUser } = vi.hoisted(() => {
  const mockSendToUser = vi.fn();
  return { mockSendToUser };
});
vi.mock('../fcmService', () => ({
  sendToUser: (...args: unknown[]) => mockSendToUser(...args),
}));

// Mock supabase for notification history + profile locale lookup
const { mockInsert, mockMaybeSingle } = vi.hoisted(() => ({
  mockInsert: vi.fn(),
  mockMaybeSingle: vi.fn(),
}));
vi.mock('../supabase', () => ({
  getSupabase: vi.fn(() => ({
    from: vi.fn((table: string) => {
      if (table === 'profiles' || table === 'user_notification_preferences') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: mockMaybeSingle,
            })),
          })),
        };
      }
      return { insert: mockInsert };
    }),
  })),
  isSupabaseConfigured: vi.fn(() => true),
}));

// Mock logger
vi.mock('../../utils/logger', () => ({ default: {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
} }));

import { PUSH_STRINGS, SUPPORTED_PUSH_LOCALES } from '../../utils/pushTranslations';
import { RIVAL_PING_IDS } from '@/lib/rivals/pings';

const SENDER = '11111111-1111-4111-8111-111111111111';

describe('notifyRivalPing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInsert.mockResolvedValue({ error: null });
    mockMaybeSingle.mockResolvedValue({ data: { language: 'en' }, error: null });
    mockSendToUser.mockResolvedValue(undefined);
  });

  it('pushes the sender name and the canned line, deep-linking to the sender profile', async () => {
    await notifyRivalPing('target-id', 'Maya', SENDER, 'rematch');

    expect(mockSendToUser).toHaveBeenCalledWith('target-id', expect.objectContaining({
      title: expect.stringContaining('Maya'),
      body: PUSH_STRINGS.en['rivalPing.body.rematch'],
      data: { type: 'rival_ping', deepLink: `/player/${SENDER}`, pingId: 'rematch' },
    }));
  });

  it('writes a social in-app row from the sender, tagged with the ping id', async () => {
    await notifyRivalPing('target-id', 'Maya', SENDER, 'gg');

    expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({
      user_id: 'target-id',
      notification_type: 'social',
      sender_id: SENDER,
      related_entity_type: 'rival_ping:gg',
      action_url: `/player/${SENDER}`,
    }));
  });

  it('writes the in-app row even when pushes are muted', async () => {
    mockMaybeSingle.mockResolvedValue({ data: { language: 'en', push_enabled: true, friend_invites: false }, error: null });
    await notifyRivalPing('target-id', 'Maya', SENDER, 'gg');

    expect(mockSendToUser).not.toHaveBeenCalled();
    expect(mockInsert).toHaveBeenCalled();
  });

  it('has push copy for every ping in every push locale', () => {
    for (const locale of SUPPORTED_PUSH_LOCALES) {
      expect(PUSH_STRINGS[locale]['rivalPing.title'], locale).toContain('{sender}');
      for (const id of RIVAL_PING_IDS) {
        expect(PUSH_STRINGS[locale][`rivalPing.body.${id}`], `${locale} ${id}`).toBeTruthy();
      }
    }
  });
});
