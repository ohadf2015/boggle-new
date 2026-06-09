/**
 * reportManager tests
 * Social Apps & Features policy: users must be able to report a user or a message.
 * Persists to user_reports; service-role insert (RLS bypassed) — handler enforces auth.
 */

vi.mock('../../utils/logger', () => {
  const l = { info: vi.fn(), error: vi.fn(), debug: vi.fn(), warn: vi.fn() };
  return { __esModule: true, default: l, ...l };
});

vi.mock('../supabaseServer', () => ({
  __esModule: true,
  getSupabase: vi.fn(),
}));

import { vi, describe, it, expect, beforeEach, type Mock } from 'vitest';
import { reportUser, reportMessage } from '../reportManager';
import { getSupabase } from '../supabaseServer';

const mockGetSupabase = getSupabase as Mock;

function makeSupabase(result: { data: unknown; error: unknown } = { data: { id: 'r1' }, error: null }) {
  const calls: unknown[][] = [];
  const builder: Record<string, unknown> = { _calls: calls };
  for (const m of ['from', 'insert', 'select']) {
    builder[m] = vi.fn((...args: unknown[]) => {
      calls.push([m, ...args]);
      return builder;
    });
  }
  builder.single = vi.fn(() => Promise.resolve(result));
  builder.then = (resolve: (v: unknown) => unknown) => resolve(result);
  return builder;
}

describe('reportManager.reportUser', () => {
  beforeEach(() => vi.clearAllMocks());

  it('GIVEN a valid reason WHEN reportUser THEN inserts a user-type report row', async () => {
    const supabase = makeSupabase();
    mockGetSupabase.mockReturnValue(supabase);

    const result = await reportUser('reporter-1', 'target-9', 'harassment', 'kept spamming me');

    expect(result.success).toBe(true);
    const insert = (supabase as { _calls: unknown[][] })._calls.find((c) => c[0] === 'insert');
    expect((supabase as { _calls: unknown[][] })._calls[0]).toEqual(['from', 'user_reports']);
    expect(insert![1]).toMatchObject({
      reporter_id: 'reporter-1',
      target_user_id: 'target-9',
      target_type: 'user',
      reason: 'harassment',
      context: 'kept spamming me',
    });
  });

  it('GIVEN an invalid reason WHEN reportUser THEN returns INVALID_REASON without inserting', async () => {
    const supabase = makeSupabase();
    mockGetSupabase.mockReturnValue(supabase);

    const result = await reportUser('reporter-1', 'target-9', 'because-i-said-so');

    expect(result.success).toBe(false);
    expect(result.errorCode).toBe('INVALID_REASON');
    expect((supabase as { _calls: unknown[][] })._calls.length).toBe(0);
  });

  it('GIVEN reporting yourself WHEN reportUser THEN returns CANNOT_REPORT_SELF', async () => {
    const supabase = makeSupabase();
    mockGetSupabase.mockReturnValue(supabase);

    const result = await reportUser('me', 'me', 'spam');

    expect(result.success).toBe(false);
    expect(result.errorCode).toBe('CANNOT_REPORT_SELF');
  });
});

describe('reportManager.reportMessage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('GIVEN a room-chat message WHEN reportMessage THEN persists a snapshot + game code', async () => {
    const supabase = makeSupabase();
    mockGetSupabase.mockReturnValue(supabase);

    const result = await reportMessage('reporter-1', {
      surface: 'room_chat',
      reason: 'inappropriate',
      gameCode: 'ABCD',
      messageSnapshot: { senderName: 'Troll', message: 'bad words', timestamp: 123 },
    });

    expect(result.success).toBe(true);
    const insert = (supabase as { _calls: unknown[][] })._calls.find((c) => c[0] === 'insert');
    expect(insert![1]).toMatchObject({
      reporter_id: 'reporter-1',
      target_type: 'room_chat',
      reason: 'inappropriate',
      game_code: 'ABCD',
    });
    expect((insert![1] as { message_snapshot: unknown }).message_snapshot).toMatchObject({ senderName: 'Troll' });
  });

  it('GIVEN a DM message WHEN reportMessage THEN persists target_ref + target_user_id', async () => {
    const supabase = makeSupabase();
    mockGetSupabase.mockReturnValue(supabase);

    const result = await reportMessage('reporter-1', {
      surface: 'direct_message',
      reason: 'harassment',
      messageId: 'msg-7',
      targetUserId: 'target-9',
    });

    expect(result.success).toBe(true);
    const insert = (supabase as { _calls: unknown[][] })._calls.find((c) => c[0] === 'insert');
    expect(insert![1]).toMatchObject({
      target_type: 'direct_message',
      target_ref: 'msg-7',
      target_user_id: 'target-9',
    });
  });

  it('GIVEN an invalid reason WHEN reportMessage THEN returns INVALID_REASON', async () => {
    const supabase = makeSupabase();
    mockGetSupabase.mockReturnValue(supabase);

    const result = await reportMessage('reporter-1', { surface: 'room_chat', reason: 'nope' as never, gameCode: 'AB' });

    expect(result.success).toBe(false);
    expect(result.errorCode).toBe('INVALID_REASON');
  });
});
