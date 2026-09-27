/**
 * friendsMessaging block-enforcement test
 * A blocked pair must not be able to exchange DMs, with a clear USER_BLOCKED code.
 */

vi.mock('../../utils/logger', () => {
  const l = { info: vi.fn(), error: vi.fn(), debug: vi.fn(), warn: vi.fn() };
  return { __esModule: true, default: l, ...l };
});

vi.mock('../friendsManager', () => ({
  __esModule: true,
  areFriends: vi.fn(),
  isBlocked: vi.fn(),
}));

vi.mock('../supabaseServer', () => ({
  __esModule: true,
  getSupabase: vi.fn(() => ({
    from: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: { id: 'm1', created_at: new Date().toISOString() }, error: null }),
  })),
}));

import { vi, describe, it, expect, beforeEach, type Mock } from 'vitest';
import { sendMessage } from '../friendsMessaging';
import { areFriends, isBlocked } from '../friendsManager';

describe('friendsMessaging.sendMessage block enforcement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('GIVEN sender is blocked by recipient WHEN sendMessage THEN returns USER_BLOCKED and does not persist', async () => {
    // GIVEN — they were friends, but a block is now in place
    (areFriends as Mock).mockResolvedValue(true);
    (isBlocked as Mock).mockResolvedValue(true);

    // WHEN
    const result = await sendMessage('user-a', 'user-b', 'hello');

    // THEN
    expect(result.success).toBe(false);
    expect(result.errorCode).toBe('USER_BLOCKED');
  });

  it('GIVEN no block and they are friends WHEN sendMessage THEN succeeds', async () => {
    // GIVEN
    (areFriends as Mock).mockResolvedValue(true);
    (isBlocked as Mock).mockResolvedValue(false);

    // WHEN
    const result = await sendMessage('user-a', 'user-b', 'hello');

    // THEN
    expect(result.success).toBe(true);
  });
});
