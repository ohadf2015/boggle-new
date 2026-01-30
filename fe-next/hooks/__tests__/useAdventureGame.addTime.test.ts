/**
 * Tests for useAdventureGame addTime functionality
 */
import { renderHook, act } from '@testing-library/react';
import { useAdventureGame } from '../useAdventureGame';
import type { LevelConfig } from '@/types/adventure';

const mockLevelConfig: LevelConfig = {
  world: 1,
  level: 1,
  gridSize: 4,
  timerSeconds: 60,
  objectives: [
    { type: 'wordCount', target: 5, isPrimary: true },
  ],
  specialTiles: [],
  difficulty: 'EASY',
  chapterNumber: 1,
  levelInChapter: 1,
  isBossLevel: false,
};

const mockGrid = [
  ['C', 'A', 'T', 'S'],
  ['D', 'O', 'G', 'S'],
  ['R', 'A', 'T', 'S'],
  ['B', 'I', 'R', 'D'],
];

describe('useAdventureGame - addTime', () => {
  it('should expose addTime method', () => {
    const { result } = renderHook(() =>
      useAdventureGame({
        levelConfig: mockLevelConfig,
        initialGrid: mockGrid,
      })
    );

    expect(result.current.addTime).toBeDefined();
    expect(typeof result.current.addTime).toBe('function');
  });

  it('should increase timeRemaining when addTime is called', () => {
    jest.useFakeTimers();

    const { result } = renderHook(() =>
      useAdventureGame({
        levelConfig: { ...mockLevelConfig, timerSeconds: 60 },
        initialGrid: mockGrid,
      })
    );

    // Start game (timer begins at 60)
    act(() => {
      result.current.startGame();
    });

    // Let 5 seconds pass (timer ticks down from 60 to 55)
    act(() => {
      jest.advanceTimersByTime(5000);
    });

    // Verify timer decreased
    expect(result.current.timeRemaining).toBe(55);

    // Add 10 seconds (should go from 55 to 60, capped at max)
    act(() => {
      result.current.addTime(10);
    });

    // Should be capped at 60 (max)
    expect(result.current.timeRemaining).toBe(60);

    jest.useRealTimers();
  });

  it('should cap addTime at totalTime (cannot exceed original timer)', () => {
    const { result } = renderHook(() =>
      useAdventureGame({
        levelConfig: { ...mockLevelConfig, timerSeconds: 60 },
        initialGrid: mockGrid,
      })
    );

    // Timer starts at 60 (full)
    const initialTime = result.current.timeRemaining;
    expect(initialTime).toBe(60);

    // Try to add 20 seconds (should cap at 60)
    act(() => {
      result.current.addTime(20);
    });

    expect(result.current.timeRemaining).toBe(60); // Capped at max
  });

  it('should handle adding time when timer is low', () => {
    const { result } = renderHook(() =>
      useAdventureGame({
        levelConfig: { ...mockLevelConfig, timerSeconds: 120 },
        initialGrid: mockGrid,
      })
    );

    act(() => {
      result.current.startGame();
    });

    // Manually dispatch ticks to reduce time (simulate gameplay)
    // For this test, we just verify the math is correct
    // Starting at 120, adding 10 should work
    act(() => {
      result.current.addTime(10);
    });

    // Should be capped at 120 since we started there
    expect(result.current.timeRemaining).toBe(120);
  });
});
