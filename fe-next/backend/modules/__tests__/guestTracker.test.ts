import { describe, it, expect, vi, beforeEach } from 'vitest';

const singleMock = vi.fn();
const abortSignalMock = vi.fn();
const eqMock = vi.fn();
const selectMock = vi.fn();
const insertSelectMock = vi.fn();
const insertMock = vi.fn();
const fromMock = vi.fn();

vi.mock('@/utils/supabase/admin', () => ({
  createAdminClient: () => ({ from: fromMock }),
}));

vi.mock('../../utils/logger', () => ({
  default: { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

function setupChain({ fetchResult, insertResult, refetchResult }: {
  fetchResult: { data: unknown; error: unknown };
  insertResult?: { data: unknown; error: unknown };
  refetchResult?: { data: unknown; error: unknown };
}) {
  abortSignalMock.mockReturnThis();
  eqMock.mockReturnValue({ abortSignal: abortSignalMock, single: singleMock });
  selectMock.mockReturnValue({ eq: eqMock });

  // First select (existence check), optional second select (post-conflict refetch)
  singleMock
    .mockResolvedValueOnce(fetchResult)
    .mockResolvedValueOnce(refetchResult ?? fetchResult);

  insertSelectMock.mockReturnValue({ abortSignal: abortSignalMock, single: vi.fn().mockResolvedValue(insertResult ?? { data: null, error: null }) });
  insertMock.mockReturnValue({ select: insertSelectMock });

  fromMock.mockReturnValue({ select: selectMock, insert: insertMock });
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.resetModules();
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://test';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
});

describe('getOrCreateGuestSession', () => {
  it('returns the existing row instead of null when insert races on a duplicate session_id', async () => {
    const existing = { id: '1', session_id: 'abc', created_at: 'now' };
    setupChain({
      fetchResult: { data: null, error: { message: 'not found' } },
      insertResult: { data: null, error: { code: '23505', message: 'duplicate key value violates unique constraint "guest_sessions_session_id_key"' } },
      refetchResult: { data: existing, error: null },
    });

    const { getOrCreateGuestSession } = await import('../guestTracker');
    const result = await getOrCreateGuestSession({ sessionId: 'abc' });

    expect(result).toEqual(existing);
  });

  it('still returns null on a non-23505 insert error', async () => {
    setupChain({
      fetchResult: { data: null, error: { message: 'not found' } },
      insertResult: { data: null, error: { code: '500', message: 'boom' } },
    });

    const { getOrCreateGuestSession } = await import('../guestTracker');
    const result = await getOrCreateGuestSession({ sessionId: 'abc' });

    expect(result).toBeNull();
  });
});
