/**
 * Guard tests for sendFriendRequest — you cannot befriend yourself.
 * The friends table schema is not in migrations, so there is no DB CHECK
 * backstop; this app-level guard is the only thing preventing a self-row.
 */
vi.mock('../../utils/logger', () => {
  const l = { info: vi.fn(), error: vi.fn(), debug: vi.fn(), warn: vi.fn() };
  return { __esModule: true, default: l, ...l };
});
vi.mock('../supabaseServer', () => ({
  __esModule: true,
  getSupabase: vi.fn(() => null),
}));

import { vi } from 'vitest';
import { sendFriendRequest } from '../friendsManager';
import { getSupabase } from '../supabaseServer';

describe('sendFriendRequest — self-request guard', () => {
  it('rejects a request to yourself with CANNOT_ADD_SELF, before touching the DB', async () => {
    const result = await sendFriendRequest('user-a', 'user-a');
    expect(result.success).toBe(false);
    expect(result.errorCode).toBe('CANNOT_ADD_SELF');
    // Guard must short-circuit before any DB access.
    expect(getSupabase).not.toHaveBeenCalled();
  });
});
