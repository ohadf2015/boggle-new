import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockSendToUser, mockInsert, mockAdmins, mockPrefs } = vi.hoisted(() => ({
  mockSendToUser: vi.fn(),
  mockInsert: vi.fn(),
  mockAdmins: vi.fn(),
  mockPrefs: vi.fn(),
}));
vi.mock('../fcmService', () => ({ sendToUser: (...a: unknown[]) => mockSendToUser(...a) }));
vi.mock('../supabase', () => ({
  getSupabase: vi.fn(() => ({
    from: vi.fn((table: string) => {
      if (table === 'profiles') return { select: () => ({ eq: (...a: unknown[]) => mockAdmins(...a) }) };
      if (table === 'user_notification_preferences') return { select: () => ({ eq: () => ({ maybeSingle: mockPrefs }) }) };
      return { insert: mockInsert };
    }),
  })),
  isSupabaseConfigured: vi.fn(() => true),
}));
vi.mock('../../utils/logger', () => ({ default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() } }));

import { notifyAdminAlert } from '../pushNotificationTriggers';

beforeEach(() => {
  vi.clearAllMocks();
  mockAdmins.mockResolvedValue({ data: [{ id: 'a1' }, { id: 'a2' }], error: null });
  mockPrefs.mockResolvedValue({ data: null, error: null });
  mockSendToUser.mockResolvedValue(1);
});

describe('notifyAdminAlert', () => {
  it('pushes the notice to every admin with a deep link to its admin page', async () => {
    await notifyAdminAlert({ title: 'New paying Pro customer', body: 'a@b.com', link: '/admin/teacher-pro' });
    expect(mockAdmins).toHaveBeenCalledWith('is_admin', true);
    expect(mockSendToUser.mock.calls.map(([id]) => id).sort()).toEqual(['a1', 'a2']);
    expect(mockSendToUser).toHaveBeenCalledWith('a1', {
      title: 'New paying Pro customer',
      body: 'a@b.com',
      data: { type: 'admin_alert', deepLink: '/admin/teacher-pro' },
    });
  });

  it('goes to the phone only; the admin bell is its in-app copy', async () => {
    await notifyAdminAlert({ title: 'T' });
    expect(mockInsert).not.toHaveBeenCalled();
    expect(mockSendToUser).toHaveBeenCalledWith('a1', expect.objectContaining({ body: '', data: { type: 'admin_alert', deepLink: '/admin' } }));
  });

  it('respects an admin who turned push off', async () => {
    mockPrefs.mockResolvedValueOnce({ data: { push_enabled: false }, error: null });
    await notifyAdminAlert({ title: 'T' });
    expect(mockSendToUser).toHaveBeenCalledTimes(1);
  });

  it('never throws when the admin lookup fails', async () => {
    mockAdmins.mockResolvedValue({ data: null, error: { message: 'boom' } });
    await expect(notifyAdminAlert({ title: 'T' })).resolves.toBeUndefined();
    expect(mockSendToUser).not.toHaveBeenCalled();
  });
});
