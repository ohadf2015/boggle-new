/**
 * useAsyncChallenge Hook Tests
 *
 * Tests async board challenge CRUD: fetch, create, accept, submit, decline.
 */

import { vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

// --- Mocks (must be before imports) ---

const mockUser = { id: 'test-user-id' };
const mockUseAuth = vi.fn(() => ({ user: mockUser }));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

const mockSelect = vi.fn();
const mockInsert = vi.fn();
const mockUpdate = vi.fn();
const mockDelete = vi.fn();
const { mockFrom } = vi.hoisted(() => {
  const mockFrom = vi.fn();
  return { mockFrom };
});
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

import { useAsyncChallenge } from '../useAsyncChallenge';

// --- Helpers ---

function makeChallengeRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'ch-1',
    challenger_id: 'test-user-id',
    challenger_name: 'Alice',
    challenger_avatar: null,
    challenged_id: 'other-user',
    challenged_name: 'Bob',
    challenged_avatar: null,
    game_mode: 'classic',
    letter_grid: JSON.stringify([['A', 'B'], ['C', 'D']]),
    grid_size: 4,
    challenger_score: 100,
    challenger_words: JSON.stringify(['ABC', 'CAB']),
    challenger_best_word: 'ABC',
    challenged_score: null,
    challenged_words: null,
    challenged_best_word: null,
    status: 'pending',
    message: 'Beat this!',
    created_at: '2026-01-01T00:00:00Z',
    played_at: null,
    expires_at: '2026-01-08T00:00:00Z',
    ...overrides,
  };
}

function setupFetchSuccess(rows: Record<string, unknown>[]) {
  const orderFn = vi.fn().mockResolvedValue({ data: rows, error: null });
  const inFn = vi.fn().mockReturnValue({ order: orderFn });
  const orFn = vi.fn().mockReturnValue({ in: inFn });
  const selectFn = vi.fn().mockReturnValue({ or: orFn });
  mockFrom.mockReturnValue({ select: selectFn, insert: mockInsert, update: mockUpdate });
}

function setupFetchError() {
  const orderFn = vi.fn().mockResolvedValue({ data: null, error: { message: 'fail' } });
  const inFn = vi.fn().mockReturnValue({ order: orderFn });
  const orFn = vi.fn().mockReturnValue({ in: inFn });
  const selectFn = vi.fn().mockReturnValue({ or: orFn });
  mockFrom.mockReturnValue({ select: selectFn, insert: mockInsert, update: mockUpdate });
}

// --- Tests ---

describe('useAsyncChallenge', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: mockUser });
  });

  describe('Given no authenticated user', () => {
    it('should return empty challenges and stop loading', async () => {
      mockUseAuth.mockReturnValue({ user: null as any });
      setupFetchSuccess([]);

      const { result } = renderHook(() => useAsyncChallenge());

      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.challenges).toEqual([]);
      expect(result.current.pendingCount).toBe(0);
    });
  });

  describe('Given an authenticated user', () => {
    it('should fetch challenges on mount', async () => {
      const row = makeChallengeRow();
      setupFetchSuccess([row]);

      const { result } = renderHook(() => useAsyncChallenge());

      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.challenges).toHaveLength(1);
      expect(result.current.challenges[0].id).toBe('ch-1');
      expect(result.current.challenges[0].challengerId).toBe('test-user-id');
      expect(result.current.challenges[0].letterGrid).toEqual([['A', 'B'], ['C', 'D']]);
    });

    it('should set empty challenges on fetch error', async () => {
      setupFetchError();

      const { result } = renderHook(() => useAsyncChallenge());

      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.challenges).toEqual([]);
    });
  });

  describe('createChallenge', () => {
    it('should insert a new challenge and prepend to state', async () => {
      setupFetchSuccess([]);

      const { result } = renderHook(() => useAsyncChallenge());
      await waitFor(() => expect(result.current.loading).toBe(false));

      // Setup insert mock for createChallenge call
      const createdRow = makeChallengeRow({ id: 'ch-new' });
      const singleFn = vi.fn().mockResolvedValue({ data: createdRow, error: null });
      const selectAfterInsert = vi.fn().mockReturnValue({ single: singleFn });
      mockFrom.mockReturnValue({
        insert: vi.fn().mockReturnValue({ select: selectAfterInsert }),
        select: vi.fn(),
        update: vi.fn(),
      });

      let created: unknown;
      await act(async () => {
        created = await result.current.createChallenge({
          challengedId: 'other-user',
          gameMode: 'classic',
          letterGrid: [['A', 'B'], ['C', 'D']],
          gridSize: 4,
          score: 100,
          words: ['ABC'],
          bestWord: 'ABC',
        });
      });

      expect(created).not.toBeNull();
      expect(result.current.challenges).toHaveLength(1);
      expect(result.current.challenges[0].id).toBe('ch-new');
    });

    it('should return null when no user', async () => {
      mockUseAuth.mockReturnValue({ user: null as any });
      setupFetchSuccess([]);

      const { result } = renderHook(() => useAsyncChallenge());
      await waitFor(() => expect(result.current.loading).toBe(false));

      let created: unknown;
      await act(async () => {
        created = await result.current.createChallenge({
          challengedId: 'x',
          gameMode: 'classic',
          letterGrid: [],
          gridSize: 4,
          score: 0,
          words: [],
        });
      });

      expect(created).toBeNull();
    });
  });

  describe('acceptChallenge', () => {
    it('should update challenge status to accepted', async () => {
      const row = makeChallengeRow({ challenged_id: 'test-user-id' });
      setupFetchSuccess([row]);

      const { result } = renderHook(() => useAsyncChallenge());
      await waitFor(() => expect(result.current.loading).toBe(false));

      // Setup update mock
      const eqChained = vi.fn().mockResolvedValue({ error: null });
      const eqFirst = vi.fn().mockReturnValue({ eq: eqChained });
      mockFrom.mockReturnValue({
        update: vi.fn().mockReturnValue({ eq: eqFirst }),
        select: vi.fn(),
        insert: vi.fn(),
      });

      let success: boolean = false;
      await act(async () => {
        success = await result.current.acceptChallenge('ch-1');
      });

      expect(success).toBe(true);
      expect(result.current.challenges[0].status).toBe('accepted');
    });
  });

  describe('submitResult', () => {
    it('should complete challenge with score and words', async () => {
      const row = makeChallengeRow({ status: 'accepted', challenged_id: 'test-user-id' });
      setupFetchSuccess([row]);

      const { result } = renderHook(() => useAsyncChallenge());
      await waitFor(() => expect(result.current.loading).toBe(false));

      const eqChained = vi.fn().mockResolvedValue({ error: null });
      const eqFirst = vi.fn().mockReturnValue({ eq: eqChained });
      mockFrom.mockReturnValue({
        update: vi.fn().mockReturnValue({ eq: eqFirst }),
        select: vi.fn(),
        insert: vi.fn(),
      });

      let success: boolean = false;
      await act(async () => {
        success = await result.current.submitResult({
          challengeId: 'ch-1',
          score: 150,
          words: ['DOG', 'CAT'],
          bestWord: 'DOG',
        });
      });

      expect(success).toBe(true);
      expect(result.current.challenges[0].status).toBe('completed');
      expect(result.current.challenges[0].challengedScore).toBe(150);
      expect(result.current.challenges[0].challengedWords).toEqual(['DOG', 'CAT']);
    });
  });

  describe('declineChallenge', () => {
    it('should remove declined challenge from list', async () => {
      const row = makeChallengeRow({ challenged_id: 'test-user-id' });
      setupFetchSuccess([row]);

      const { result } = renderHook(() => useAsyncChallenge());
      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.challenges).toHaveLength(1);

      const eqChained = vi.fn().mockResolvedValue({ error: null });
      const eqFirst = vi.fn().mockReturnValue({ eq: eqChained });
      mockFrom.mockReturnValue({
        update: vi.fn().mockReturnValue({ eq: eqFirst }),
        select: vi.fn(),
        insert: vi.fn(),
      });

      let success: boolean = false;
      await act(async () => {
        success = await result.current.declineChallenge('ch-1');
      });

      expect(success).toBe(true);
      expect(result.current.challenges).toHaveLength(0);
    });
  });

  describe('pendingCount', () => {
    it('should count only pending challenges addressed to the current user', async () => {
      const pending1 = makeChallengeRow({ id: 'ch-1', challenged_id: 'test-user-id', status: 'pending' });
      const pending2 = makeChallengeRow({ id: 'ch-2', challenged_id: 'test-user-id', status: 'pending' });
      const accepted = makeChallengeRow({ id: 'ch-3', challenged_id: 'test-user-id', status: 'accepted' });
      const sentByMe = makeChallengeRow({ id: 'ch-4', challenger_id: 'test-user-id', challenged_id: 'other', status: 'pending' });
      setupFetchSuccess([pending1, pending2, accepted, sentByMe]);

      const { result } = renderHook(() => useAsyncChallenge());

      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.pendingCount).toBe(2);
    });
  });
});
