import { vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useUrgencyData } from '../useUrgencyData';

// Mock dependencies
let mockEngagement = {
  streak: 0,
  streakAtRisk: false,
  loading: false,
  longestStreak: 0,
  freezesAvailable: 0,
  level: 1,
  xp: 0,
  xpProgress: 0,
  xpToNextLevel: 100,
  gold: 0,
  gamesToday: 0,
};

let mockDaily = {
  hasPlayed: false,
  hasSolved: null as boolean | null,
  currentStreak: 0,
  longestStreak: 0,
  puzzleNumber: 0,
  puzzleDate: '',
  loading: false,
  fromServer: false,
  refresh: vi.fn(),
};

let mockSolveRate = { solveRate: null as number | null, loading: false };
let mockIsAuthenticated = false;

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ isAuthenticated: mockIsAuthenticated }),
}));

vi.mock('@/hooks/useEngagementStatus', () => ({
  useEngagementStatus: () => mockEngagement,
}));

vi.mock('@/hooks/useDailyChallengeStatus', () => ({
  useDailyChallengeStatus: () => mockDaily,
}));

vi.mock('@/hooks/useDailySolveRate', () => ({
  useDailySolveRate: () => mockSolveRate,
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ language: 'en' }),
}));

vi.mock('@/hooks/useFriendsActivity', () => ({
  useFriendsActivity: () => ({ events: [], loading: false }),
}));

describe('useUrgencyData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEngagement = {
      streak: 0,
      streakAtRisk: false,
      loading: false,
      longestStreak: 0,
      freezesAvailable: 0,
      level: 1,
      xp: 0,
      xpProgress: 0,
      xpToNextLevel: 100,
      gold: 0,
      gamesToday: 0,
    };
    mockDaily = {
      hasPlayed: false,
      hasSolved: null,
      currentStreak: 0,
      longestStreak: 0,
      puzzleNumber: 0,
      puzzleDate: '',
      loading: false,
      fromServer: false,
      refresh: vi.fn(),
    };
    mockSolveRate = { solveRate: null, loading: false };
    mockIsAuthenticated = false;
  });

  it('should return null for unauthenticated users', () => {
    mockIsAuthenticated = false;
    const { result } = renderHook(() => useUrgencyData());
    expect(result.current).toBeNull();
  });

  it('should return null when no urgency conditions are met', () => {
    mockIsAuthenticated = true;
    mockEngagement.streak = 0;
    mockEngagement.streakAtRisk = false;
    mockDaily.hasPlayed = true;
    const { result } = renderHook(() => useUrgencyData());
    expect(result.current).toBeNull();
  });

  it('should return streak-risk as highest priority', () => {
    mockIsAuthenticated = true;
    mockEngagement.streak = 5;
    mockEngagement.streakAtRisk = true;
    mockDaily.hasPlayed = false; // also active, but lower priority
    mockDaily.puzzleNumber = 42;

    const { result } = renderHook(() => useUrgencyData());
    expect(result.current).not.toBeNull();
    expect(result.current!.type).toBe('streak-risk');
    expect(result.current!.data.count).toBe(5);
  });

  it('should return daily-unsolved when streak is not at risk', () => {
    mockIsAuthenticated = true;
    mockEngagement.streak = 3;
    mockEngagement.streakAtRisk = false;
    mockDaily.hasPlayed = false;
    mockDaily.puzzleNumber = 42;
    mockSolveRate.solveRate = 65;

    const { result } = renderHook(() => useUrgencyData());
    expect(result.current).not.toBeNull();
    expect(result.current!.type).toBe('daily-unsolved');
    expect(result.current!.data.puzzleNumber).toBe(42);
    expect(result.current!.data.solveRate).toBe(65);
  });

  it('should not return streak-risk when streak is 0', () => {
    mockIsAuthenticated = true;
    mockEngagement.streak = 0;
    mockEngagement.streakAtRisk = true; // edge case: at risk but no streak
    mockDaily.hasPlayed = true;

    const { result } = renderHook(() => useUrgencyData());
    expect(result.current).toBeNull();
  });

  it('should return null when data is still loading', () => {
    mockIsAuthenticated = true;
    mockEngagement.loading = true;
    mockEngagement.streak = 5;
    mockEngagement.streakAtRisk = true;

    const { result } = renderHook(() => useUrgencyData());
    expect(result.current).toBeNull();
  });

  it('should include hoursLeft in streak-risk data', () => {
    mockIsAuthenticated = true;
    mockEngagement.streak = 10;
    mockEngagement.streakAtRisk = true;

    const { result } = renderHook(() => useUrgencyData());
    expect(result.current!.type).toBe('streak-risk');
    expect(typeof result.current!.data.hoursLeft).toBe('number');
    expect(result.current!.data.hoursLeft).toBeGreaterThanOrEqual(0);
    expect(result.current!.data.hoursLeft).toBeLessThanOrEqual(24);
  });

  it('should return daily-unsolved with 0 solveRate when solveRate is null', () => {
    mockIsAuthenticated = true;
    mockDaily.hasPlayed = false;
    mockDaily.puzzleNumber = 10;
    mockSolveRate.solveRate = null;

    const { result } = renderHook(() => useUrgencyData());
    expect(result.current!.type).toBe('daily-unsolved');
    expect(result.current!.data.solveRate).toBe(0);
  });
});
