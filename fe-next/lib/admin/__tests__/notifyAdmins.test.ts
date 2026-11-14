import { describe, it, expect, vi, beforeEach } from 'vitest';

const sendTelegramMessage = vi.fn();
vi.mock('@/lib/telegram', () => ({
  sendTelegramMessage: (...a: unknown[]) => sendTelegramMessage(...a),
  escapeTelegramMarkdownV2: (s?: string | null) => (s ?? '').replace(/[.!-]/g, '\\$&'),
}));
const notifyAdminAlert = vi.fn();
vi.mock('@/backend/modules/pushNotificationTriggers', () => ({ notifyAdminAlert: (...a: unknown[]) => notifyAdminAlert(...a) }));
vi.mock('@/utils/logger', () => ({ default: { error: vi.fn(), warn: vi.fn() } }));

const insert = vi.fn();
const upsert = vi.fn();
let client: unknown;
vi.mock('@/lib/admin/server', () => ({ getSupabaseAdmin: () => client }));

import { notifyAdmins } from '../adminNotifications';

const chain = (result: unknown) => ({ select: () => Promise.resolve(result) });

beforeEach(() => {
  vi.clearAllMocks();
  client = { from: () => ({ insert, upsert }) };
  insert.mockReturnValue(chain({ data: [{ id: '1' }], error: null }));
  upsert.mockReturnValue(chain({ data: [{ id: '1' }], error: null }));
  sendTelegramMessage.mockResolvedValue(true);
  notifyAdminAlert.mockResolvedValue(undefined);
});

const base = { kind: 'k', severity: 'normal' as const, title: 'T' };

describe('notifyAdmins', () => {
  it('inserts a plain row without a dedupe key', async () => {
    expect(await notifyAdmins({ ...base, body: 'b', link: '/admin/x' })).toBe(true);
    expect(insert).toHaveBeenCalledWith({ kind: 'k', severity: 'normal', title: 'T', body: 'b', link: '/admin/x', dedupe_key: null });
    expect(upsert).not.toHaveBeenCalled();
  });

  it('upserts on the dedupe key so a replayed webhook adds nothing', async () => {
    await notifyAdmins({ ...base, dedupeKey: 'pro:paid:1' });
    expect(upsert).toHaveBeenCalledWith(expect.objectContaining({ dedupe_key: 'pro:paid:1' }), { onConflict: 'dedupe_key', ignoreDuplicates: true });
  });

  it('reports a duplicate as not sent and does not ping Telegram again', async () => {
    upsert.mockReturnValue(chain({ data: [], error: null }));
    expect(await notifyAdmins({ ...base, severity: 'high', dedupeKey: 'd' })).toBe(false);
    expect(sendTelegramMessage).not.toHaveBeenCalled();
  });

  it('sends Telegram only for high priority', async () => {
    await notifyAdmins(base);
    expect(sendTelegramMessage).not.toHaveBeenCalled();
    await notifyAdmins({ ...base, severity: 'high', title: 'Paid.', body: 'a-b' });
    expect(sendTelegramMessage).toHaveBeenCalledWith('*Paid\\.*\na\\-b');
  });

  it('never throws: a database error, a thrown error, or no client all resolve false', async () => {
    insert.mockReturnValue(chain({ data: null, error: { message: 'relation does not exist' } }));
    expect(await notifyAdmins(base)).toBe(false);
    insert.mockImplementation(() => { throw new Error('boom'); });
    expect(await notifyAdmins(base)).toBe(false);
    client = null;
    expect(await notifyAdmins(base)).toBe(false);
  });

  it('a failed Telegram send does not turn a stored notification into a failure', async () => {
    sendTelegramMessage.mockRejectedValue(new Error('down'));
    expect(await notifyAdmins({ ...base, severity: 'high' })).toBe(true);
  });

  it('pushes every stored notice, any severity, to the admins’ phones', async () => {
    await notifyAdmins({ ...base, body: 'b', link: '/admin/x' });
    expect(notifyAdminAlert).toHaveBeenCalledWith({ title: 'T', body: 'b', link: '/admin/x' });
  });

  it('a duplicate or failed store pushes nothing', async () => {
    upsert.mockReturnValue(chain({ data: [], error: null }));
    await notifyAdmins({ ...base, dedupeKey: 'd' });
    insert.mockReturnValue(chain({ data: null, error: { message: 'x' } }));
    await notifyAdmins(base);
    expect(notifyAdminAlert).not.toHaveBeenCalled();
  });

  it('a failed push does not turn a stored notification into a failure', async () => {
    notifyAdminAlert.mockRejectedValue(new Error('fcm down'));
    expect(await notifyAdmins(base)).toBe(true);
  });
});
