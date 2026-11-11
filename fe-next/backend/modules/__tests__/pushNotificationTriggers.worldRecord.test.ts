import { describe, it, expect, vi, beforeEach } from 'vitest';
import { notifyRecordBroken } from '../pushNotificationTriggers';
import { PUSH_STRINGS, SUPPORTED_PUSH_LOCALES } from '../../utils/pushTranslations';
import { RECORD_KEYS } from '@/lib/records/recordKeys';

const { mockSendToUser, mockInsert, mockMaybeSingle } = vi.hoisted(() => ({
  mockSendToUser: vi.fn(),
  mockInsert: vi.fn(),
  mockMaybeSingle: vi.fn(),
}));
vi.mock('../fcmService', () => ({
  sendToUser: (...args: unknown[]) => mockSendToUser(...args),
}));
vi.mock('../supabase', () => ({
  getSupabase: vi.fn(() => ({
    from: vi.fn((table: string) => {
      if (table === 'profiles') {
        return { select: vi.fn(() => ({ eq: vi.fn(() => ({ maybeSingle: mockMaybeSingle })) })) };
      }
      if (table === 'user_notification_preferences') {
        return { select: vi.fn(() => ({ eq: vi.fn(() => ({ maybeSingle: async () => ({ data: null, error: null }) })) })) };
      }
      return { insert: mockInsert };
    }),
  })),
  isSupabaseConfigured: vi.fn(() => true),
}));
vi.mock('../../utils/logger', () => ({ default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), log: vi.fn() } }));

describe('notifyRecordBroken', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInsert.mockResolvedValue({ error: null });
    mockMaybeSingle.mockResolvedValue({ data: { language: 'en' }, error: null });
    mockSendToUser.mockResolvedValue(undefined);
  });

  it('tells the old holder who broke which record, and links to the hall of fame', async () => {
    await notifyRecordBroken('old-holder', 'Maya', 'qp_classic', 'new-holder');

    const payload = mockSendToUser.mock.calls[0][1];
    expect(mockSendToUser.mock.calls[0][0]).toBe('old-holder');
    expect(payload.body).toContain('Maya');
    expect(payload.body).toContain(PUSH_STRINGS.en['worldRecord.mode.qp_classic']);
    expect(payload.data).toEqual({ type: 'world_record_broken', deepLink: '/leaderboard?tab=records', recordKey: 'qp_classic' });
  });

  it('keeps an inbox row as a social notification from the new holder', async () => {
    await notifyRecordBroken('old-holder', 'Maya', 'blast', 'new-holder');

    expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({
      user_id: 'old-holder',
      notification_type: 'social',
      sender_id: 'new-holder',
    }));
  });

  it('writes the push in the old holder\'s language', async () => {
    mockMaybeSingle.mockResolvedValue({ data: { language: 'he' }, error: null });
    await notifyRecordBroken('old-holder', 'Maya', 'tower');

    const payload = mockSendToUser.mock.calls[0][1];
    expect(payload.title).toBe(PUSH_STRINGS.he['worldRecord.title']);
    expect(payload.body).toContain(PUSH_STRINGS.he['worldRecord.mode.tower']);
  });

  it('has a mode label for every record key in every push locale', () => {
    for (const loc of SUPPORTED_PUSH_LOCALES) {
      for (const def of RECORD_KEYS) {
        expect(PUSH_STRINGS[loc][`worldRecord.mode.${def.key}`], `${loc} ${def.key}`).toBeTruthy();
      }
    }
  });

  it('never throws when delivery fails', async () => {
    mockSendToUser.mockRejectedValue(new Error('FCM down'));
    await expect(notifyRecordBroken('old-holder', 'Maya', 'single')).resolves.toBeUndefined();
  });
});
