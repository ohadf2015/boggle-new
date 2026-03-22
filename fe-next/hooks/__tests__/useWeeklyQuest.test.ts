/**
 * Tests for useWeeklyQuest hook
 *
 * Covers: loading state, fetching active quest, selecting quest, progress
 */

import { renderHook, act, waitFor } from '@testing-library/react';

// Mock supabase
const mockFrom = jest.fn();
const mockSelect = jest.fn();
const mockEq = jest.fn();
const mockSingle = jest.fn();
const mockInsert = jest.fn();

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

// Mock AuthContext
const mockUser = { id: 'user-123' };
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: mockUser }),
}));

// Mock LanguageContext
jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    language: 'en',
  }),
}));

import { useWeeklyQuest } from '../useWeeklyQuest';

function setupChain(data: unknown, error: unknown = null) {
  mockSingle.mockResolvedValue({ data, error });
  mockEq.mockReturnValue({ eq: jest.fn().mockReturnValue({ single: mockSingle }) });
  mockSelect.mockReturnValue({ eq: mockEq });
  mockFrom.mockReturnValue({ select: mockSelect, insert: mockInsert });
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('useWeeklyQuest', () => {
  it('starts in loading state', () => {
    setupChain(null);
    const { result } = renderHook(() => useWeeklyQuest());
    expect(result.current.loading).toBe(true);
  });

  it('returns null activeQuest when none selected', async () => {
    setupChain(null);
    const { result } = renderHook(() => useWeeklyQuest());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.activeQuest).toBeNull();
  });

  it('returns active quest when one exists', async () => {
    setupChain({
      id: 'quest-uuid',
      quest_type: 'play_games',
      title: 'Play 3 games',
      description: 'Play 3 games this week',
      requirements: JSON.stringify({ target: 3, type: 'play_games' }),
      current_progress: JSON.stringify({ current: 1 }),
      xp_reward: 200,
      completed: false,
      week_start: '2026-03-16',
    });

    const { result } = renderHook(() => useWeeklyQuest());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.activeQuest).not.toBeNull();
    expect(result.current.activeQuest?.questType).toBe('play_games');
    expect(result.current.progress).toBe(1);
    expect(result.current.isComplete).toBe(false);
  });

  it('marks isComplete when quest is completed', async () => {
    setupChain({
      id: 'quest-uuid',
      quest_type: 'play_games',
      title: 'Play 3 games',
      description: 'Play 3 games this week',
      requirements: JSON.stringify({ target: 3, type: 'play_games' }),
      current_progress: JSON.stringify({ current: 3 }),
      xp_reward: 200,
      completed: true,
      week_start: '2026-03-16',
    });

    const { result } = renderHook(() => useWeeklyQuest());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.isComplete).toBe(true);
  });

  it('provides availableQuests with 3 options', async () => {
    setupChain(null);
    const { result } = renderHook(() => useWeeklyQuest());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.availableQuests).toHaveLength(3);
  });

  it('provides selectQuest function', async () => {
    setupChain(null);
    const { result } = renderHook(() => useWeeklyQuest());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(typeof result.current.selectQuest).toBe('function');
  });

  it('does not fetch when user is null', async () => {
    jest.spyOn(require('@/contexts/AuthContext'), 'useAuth').mockReturnValue({ user: null });
    setupChain(null);

    const { result } = renderHook(() => useWeeklyQuest());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.activeQuest).toBeNull();
    expect(mockFrom).not.toHaveBeenCalled();
  });
});
