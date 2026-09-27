import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  refreshBlockList,
  isBlockedSync,
  isBlocked,
  __resetBlockListForTest,
} from '../blockListManager';

const { selectMock } = vi.hoisted(() => ({ selectMock: vi.fn() }));

vi.mock('../supabase', () => ({
  getSupabase: vi.fn(() => ({
    from: vi.fn(() => ({ select: selectMock })),
  })),
}));

vi.mock('../../utils/logger', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

const future = () => new Date(Date.now() + 60_000).toISOString();
const past = () => new Date(Date.now() - 60_000).toISOString();

describe('blockListManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    __resetBlockListForTest();
  });

  it('loads blocks from supabase into the cache on refresh', async () => {
    selectMock.mockResolvedValue({
      data: [
        { block_type: 'auth_user', value: 'user-1', reason: 'cheating', expires_at: null },
      ],
      error: null,
    });

    await refreshBlockList();

    expect(isBlockedSync({ authUserId: 'user-1' })).toEqual({
      blockType: 'auth_user',
      value: 'user-1',
      reason: 'cheating',
    });
  });

  it('returns null when the identifier is not blocked', async () => {
    selectMock.mockResolvedValue({ data: [], error: null });
    await refreshBlockList();

    expect(isBlockedSync({ authUserId: 'nobody', guestSessionId: 'g', ip: '1.2.3.4' })).toBeNull();
  });

  it('matches a blocked guest session id and a blocked ip', async () => {
    selectMock.mockResolvedValue({
      data: [
        { block_type: 'guest_session', value: 'sess-9', reason: null, expires_at: future() },
        { block_type: 'ip', value: '203.0.113.7', reason: 'abuse', expires_at: null },
      ],
      error: null,
    });
    await refreshBlockList();

    expect(isBlockedSync({ guestSessionId: 'sess-9' })?.blockType).toBe('guest_session');
    expect(isBlockedSync({ ip: '203.0.113.7' })?.blockType).toBe('ip');
  });

  it('ignores an expired block (expires_at in the past)', async () => {
    selectMock.mockResolvedValue({
      data: [{ block_type: 'auth_user', value: 'user-2', reason: null, expires_at: past() }],
      error: null,
    });
    await refreshBlockList();

    expect(isBlockedSync({ authUserId: 'user-2' })).toBeNull();
  });

  it('treats empty / missing identifiers as not blocked', async () => {
    selectMock.mockResolvedValue({
      data: [{ block_type: 'ip', value: '', reason: null, expires_at: null }],
      error: null,
    });
    await refreshBlockList();

    expect(isBlockedSync({})).toBeNull();
    expect(isBlockedSync({ ip: '' })).toBeNull();
  });

  it('isBlocked refreshes from the DB when the cache is stale', async () => {
    selectMock.mockResolvedValue({
      data: [{ block_type: 'ip', value: '198.51.100.5', reason: null, expires_at: null }],
      error: null,
    });

    const match = await isBlocked({ ip: '198.51.100.5' });

    expect(selectMock).toHaveBeenCalled();
    expect(match?.blockType).toBe('ip');
  });

  it('leaves the existing cache intact when the DB read errors', async () => {
    selectMock.mockResolvedValueOnce({
      data: [{ block_type: 'auth_user', value: 'user-3', reason: null, expires_at: null }],
      error: null,
    });
    await refreshBlockList();

    selectMock.mockResolvedValueOnce({ data: null, error: { message: 'boom' } });
    await refreshBlockList();

    expect(isBlockedSync({ authUserId: 'user-3' })?.value).toBe('user-3');
  });
});
