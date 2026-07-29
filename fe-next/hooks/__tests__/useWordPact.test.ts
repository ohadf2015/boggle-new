/**
 * Tests for useWordPact hook
 */

import { vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useWordPact } from '../useWordPact';
import { useAuth } from '@/contexts/AuthContext';

// Mock supabase
const { mockSingle, mockFrom, mockOr, mockEq, mockSelect, mockInsert, mockUpdate } = vi.hoisted(() => {
  const mockSingle = vi.fn();
  const mockInsert = vi.fn().mockResolvedValue({ data: null, error: null });
  const mockUpdate = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: null, error: null }) });
  const mockOr = vi.fn().mockReturnValue({ single: mockSingle });
  const mockEq = vi.fn().mockReturnValue({ or: mockOr, single: mockSingle });
  const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
  const mockFrom = vi.fn().mockReturnValue({
    select: mockSelect,
    insert: mockInsert,
    update: mockUpdate,
  });
  return { mockSingle, mockFrom, mockOr, mockEq, mockSelect, mockInsert, mockUpdate };
});
vi.mock('@/lib/supabase', () => ({
  supabase: { from: (...args: unknown[]) => mockFrom(...args) },
}));

vi.mock('@/contexts/AuthContext');

const USER_ID = 'user-123';
const FRIEND_ID = 'friend-456';

describe('useWordPact', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useAuth as any).mockReturnValue({ user: { id: USER_ID } });
  });

  it('returns loading=true initially then false after fetch', async () => {
    mockSingle.mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } });

    const { result } = renderHook(() => useWordPact());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.pact).toBeNull();
  });

  it('returns pact data when active pact exists', async () => {
    const pactData = {
      id: 'pact-1',
      player1_id: USER_ID,
      player2_id: FRIEND_ID,
      player1_played_today: true,
      player2_played_today: false,
      active: true,
      streak: 3,
    };

    mockSingle
      .mockResolvedValueOnce({ data: pactData, error: null })
      .mockResolvedValueOnce({ data: { username: 'MyFriend', avatar_image: 'avi.png' }, error: null });

    const { result } = renderHook(() => useWordPact());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.pact).not.toBeNull();
    expect(result.current.youPlayed).toBe(true);
    expect(result.current.partnerPlayed).toBe(false);
    expect(result.current.multiplier).toBe(2.0);
    expect(result.current.streak).toBe(3);
    expect(result.current.partnerName).toBe('MyFriend');
  });

  it('returns multiplier 1.5 when both played', async () => {
    const pactData = {
      id: 'pact-1',
      player1_id: USER_ID,
      player2_id: FRIEND_ID,
      player1_played_today: true,
      player2_played_today: true,
      active: true,
      streak: 5,
    };

    mockSingle
      .mockResolvedValueOnce({ data: pactData, error: null })
      .mockResolvedValueOnce({ data: { username: 'Buddy', avatar_image: null }, error: null });

    const { result } = renderHook(() => useWordPact());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.bothPlayed).toBe(true);
    expect(result.current.multiplier).toBe(1.5);
  });

  it('handles no user gracefully', async () => {
    (useAuth as any).mockReturnValue({ user: null });

    const { result } = renderHook(() => useWordPact());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.pact).toBeNull();
    expect(result.current.multiplier).toBe(1.0);
  });

  it('dissolvePact sets pact to null', async () => {
    const pactData = {
      id: 'pact-1',
      player1_id: USER_ID,
      player2_id: FRIEND_ID,
      player1_played_today: false,
      player2_played_today: false,
      active: true,
      streak: 0,
    };

    mockSingle
      .mockResolvedValueOnce({ data: pactData, error: null })
      .mockResolvedValueOnce({ data: { username: 'Pal', avatar_image: null }, error: null });

    const { result } = renderHook(() => useWordPact());

    await waitFor(() => {
      expect(result.current.pact).not.toBeNull();
    });

    await act(async () => {
      await result.current.dissolvePact();
    });

    expect(result.current.pact).toBeNull();
  });
});
