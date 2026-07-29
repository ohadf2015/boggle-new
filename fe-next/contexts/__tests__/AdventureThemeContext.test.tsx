import { vi } from 'vitest';
/**
 * AdventureThemeContext Tests
 *
 * Tests for the adventure theme context provider and hooks.
 */

import React from 'react';
import { render, screen, act, renderHook } from '@testing-library/react';
import {
  AdventureThemeProvider,
  useAdventureTheme,
  useWorldTheme,
  useTileConfig,
  useCurrentChapter,
} from '../AdventureThemeContext';

// ==============================================
// TEST UTILITIES
// ==============================================

function TestConsumer() {
  const {
    theme,
    worldId,
    currentLevel,
    currentChapter,
    isTransitioning,
    isFullyImplemented,
  } = useAdventureTheme();

  return (
    <div>
      <span data-testid="world-id">{worldId}</span>
      <span data-testid="current-level">{currentLevel}</span>
      <span data-testid="current-chapter">{currentChapter}</span>
      <span data-testid="theme-id">{theme.themeId}</span>
      <span data-testid="is-transitioning">{isTransitioning.toString()}</span>
      <span data-testid="is-implemented">{isFullyImplemented.toString()}</span>
    </div>
  );
}

function WorldChanger() {
  const { setWorld, setLevel, worldId, currentLevel } = useAdventureTheme();

  return (
    <div>
      <span data-testid="world-id">{worldId}</span>
      <span data-testid="level">{currentLevel}</span>
      <button data-testid="set-world-2" onClick={() => setWorld(2)}>
        Set World 2
      </button>
      <button data-testid="set-level-5" onClick={() => setLevel(5)}>
        Set Level 5
      </button>
    </div>
  );
}

// ==============================================
// PROVIDER TESTS
// ==============================================

describe('AdventureThemeProvider', () => {
  it('should provide default world 1 theme', () => {
    // GIVEN
    render(
      <AdventureThemeProvider>
        <TestConsumer />
      </AdventureThemeProvider>
    );

    // THEN
    expect(screen.getByTestId('world-id')).toHaveTextContent('1');
    expect(screen.getByTestId('current-level')).toHaveTextContent('1');
    expect(screen.getByTestId('theme-id')).toHaveTextContent('sunny-pastoral');
    expect(screen.getByTestId('is-implemented')).toHaveTextContent('true');
  });

  it('should use initial props when provided', () => {
    // GIVEN
    render(
      <AdventureThemeProvider initialWorldId={2} initialLevel={3}>
        <TestConsumer />
      </AdventureThemeProvider>
    );

    // THEN
    expect(screen.getByTestId('world-id')).toHaveTextContent('2');
    expect(screen.getByTestId('current-level')).toHaveTextContent('3');
    expect(screen.getByTestId('theme-id')).toHaveTextContent('waterfalls');
  });

  it('should calculate current chapter from level', () => {
    // GIVEN - Level 1-2 = Chapter 1, Level 3-4 = Chapter 2, Level 5-7 = Chapter 3
    const { rerender } = render(
      <AdventureThemeProvider initialWorldId={1} initialLevel={1}>
        <TestConsumer />
      </AdventureThemeProvider>
    );

    // THEN - Level 1 = Chapter 1
    expect(screen.getByTestId('current-chapter')).toHaveTextContent('1');

    // WHEN - Level 3 = Chapter 2
    rerender(
      <AdventureThemeProvider initialWorldId={1} initialLevel={3}>
        <TestConsumer />
      </AdventureThemeProvider>
    );

    // THEN
    expect(screen.getByTestId('current-chapter')).toHaveTextContent('2');

    // WHEN - Level 5 = Chapter 3
    rerender(
      <AdventureThemeProvider initialWorldId={1} initialLevel={5}>
        <TestConsumer />
      </AdventureThemeProvider>
    );

    // THEN
    expect(screen.getByTestId('current-chapter')).toHaveTextContent('3');
  });

  it('should identify placeholder themes correctly', () => {
    // GIVEN - Worlds 1-3 are implemented, 4+ are placeholders
    const { rerender } = render(
      <AdventureThemeProvider initialWorldId={3}>
        <TestConsumer />
      </AdventureThemeProvider>
    );

    // THEN - World 3 is implemented
    expect(screen.getByTestId('is-implemented')).toHaveTextContent('true');

    // WHEN - World 6 is now fully implemented (all 10 worlds have themes)
    rerender(
      <AdventureThemeProvider initialWorldId={6}>
        <TestConsumer />
      </AdventureThemeProvider>
    );

    // THEN - World 6 is fully implemented
    expect(screen.getByTestId('is-implemented')).toHaveTextContent('true');
  });

  it('should handle world change immediately', () => {
    // GIVEN
    render(
      <AdventureThemeProvider initialWorldId={1}>
        <WorldChanger />
      </AdventureThemeProvider>
    );

    // WHEN
    act(() => {
      screen.getByTestId('set-world-2').click();
    });

    // THEN - State changes immediately
    expect(screen.getByTestId('world-id')).toHaveTextContent('2');
  });

  it('should reset level to 1 when changing worlds', () => {
    // GIVEN
    render(
      <AdventureThemeProvider initialWorldId={1} initialLevel={5}>
        <WorldChanger />
      </AdventureThemeProvider>
    );

    expect(screen.getByTestId('level')).toHaveTextContent('5');

    // WHEN
    act(() => {
      screen.getByTestId('set-world-2').click();
    });

    // THEN - Level resets to 1 immediately
    expect(screen.getByTestId('level')).toHaveTextContent('1');
  });

  it('should allow setting level within world', () => {
    // GIVEN
    render(
      <AdventureThemeProvider>
        <WorldChanger />
      </AdventureThemeProvider>
    );

    // WHEN
    act(() => {
      screen.getByTestId('set-level-5').click();
    });

    // THEN
    expect(screen.getByTestId('level')).toHaveTextContent('5');
  });

  it('should not change world when setting same world', () => {
    // GIVEN
    const onRender = vi.fn();
    function RenderTracker() {
      const { worldId } = useAdventureTheme();
      onRender(worldId);
      return <span data-testid="world">{worldId}</span>;
    }

    render(
      <AdventureThemeProvider initialWorldId={1}>
        <RenderTracker />
        <WorldChanger />
      </AdventureThemeProvider>
    );

    const initialCallCount = onRender.mock.calls.length;

    // WHEN - Try to set same world
    act(() => {
      // setWorld(1) should be no-op
      const button = screen.getByTestId('set-world-2');
      button.click();
    });

    // Click again for world 2 (should also be no-op now)
    act(() => {
      screen.getByTestId('set-world-2').click();
    });

    // THEN - World should still be 2 (second click was no-op)
    expect(screen.getByTestId('world')).toHaveTextContent('2');
  });
});

// ==============================================
// HOOK TESTS
// ==============================================

describe('useAdventureTheme', () => {
  it('should return fallback context when used outside provider', () => {
    // GIVEN/WHEN - outside provider (e.g. AnimatePresence exit animations)
    const { result } = renderHook(() => useAdventureTheme());
    // THEN - returns safe fallback instead of throwing
    expect(result.current).toBeDefined();
    expect(result.current.worldId).toBe(1);
    expect(result.current.currentLevel).toBe(1);
    expect(result.current.isTransitioning).toBe(false);
  });
});

describe('useWorldTheme', () => {
  it('should return current world theme', () => {
    // GIVEN
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AdventureThemeProvider initialWorldId={2}>{children}</AdventureThemeProvider>
    );

    // WHEN
    const { result } = renderHook(() => useWorldTheme(), { wrapper });

    // THEN
    expect(result.current.id).toBe(2);
    expect(result.current.themeId).toBe('waterfalls');
    expect(result.current.mechanic).toBe('synonymPairs');
  });
});

describe('useTileConfig', () => {
  it('should return tile visual config for specified type', () => {
    // GIVEN
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AdventureThemeProvider initialWorldId={1}>{children}</AdventureThemeProvider>
    );

    // WHEN
    const { result } = renderHook(() => useTileConfig('gold'), { wrapper });

    // THEN
    expect(result.current.shadowStyle).toBe('glow');
    expect(result.current.badgeText).toBe('3x');
  });
});

describe('useCurrentChapter', () => {
  it('should return chapter config for current level', () => {
    // GIVEN - Level 5 is in chapter 3 (boss zone)
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AdventureThemeProvider initialWorldId={1} initialLevel={5}>
        {children}
      </AdventureThemeProvider>
    );

    // WHEN
    const { result } = renderHook(() => useCurrentChapter(), { wrapper });

    // THEN
    expect(result.current.number).toBe(3);
    expect(result.current.isBossChapter).toBe(true);
  });
});

// ==============================================
// HELPER FUNCTION TESTS
// ==============================================

describe('getTileConfig', () => {
  it('should return correct tile config for each type', () => {
    // GIVEN
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AdventureThemeProvider initialWorldId={1}>{children}</AdventureThemeProvider>
    );

    const { result } = renderHook(() => useAdventureTheme(), { wrapper });

    // WHEN/THEN - Test each tile type
    const standardConfig = result.current.getTileConfig('standard');
    expect(standardConfig.shadowStyle).toBe('hard');

    const goldConfig = result.current.getTileConfig('gold');
    expect(goldConfig.badgeText).toBe('3x');

    const iceConfig = result.current.getTileConfig('ice');
    expect(iceConfig.overlayType).toBe('frost');

    const bombConfig = result.current.getTileConfig('bomb');
    expect(bombConfig.gradientFrom).toContain('red');

    const rainbowConfig = result.current.getTileConfig('rainbow');
    expect(rainbowConfig.badgeText).toBe('*');

    const chainConfig = result.current.getTileConfig('chain');
    expect(chainConfig.overlayType).toBe('chain-link');

    const timeConfig = result.current.getTileConfig('time');
    expect(timeConfig.badgeText).toBe('+5s');
  });
});

describe('getChapter', () => {
  it('should return correct chapter for each level range', () => {
    // GIVEN
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AdventureThemeProvider initialWorldId={1} initialLevel={1}>
        {children}
      </AdventureThemeProvider>
    );

    const { result, rerender } = renderHook(() => useAdventureTheme(), { wrapper });

    // WHEN/THEN - Level 1 = Chapter 1
    expect(result.current.getChapter().number).toBe(1);

    // Level 3 = Chapter 2
    const wrapper2 = ({ children }: { children: React.ReactNode }) => (
      <AdventureThemeProvider initialWorldId={1} initialLevel={3}>
        {children}
      </AdventureThemeProvider>
    );
    const { result: result2 } = renderHook(() => useAdventureTheme(), { wrapper: wrapper2 });
    expect(result2.current.getChapter().number).toBe(2);

    // Level 7 = Chapter 3 (boss)
    const wrapper3 = ({ children }: { children: React.ReactNode }) => (
      <AdventureThemeProvider initialWorldId={1} initialLevel={7}>
        {children}
      </AdventureThemeProvider>
    );
    const { result: result3 } = renderHook(() => useAdventureTheme(), { wrapper: wrapper3 });
    expect(result3.current.getChapter().number).toBe(3);
    expect(result3.current.getChapter().isBossChapter).toBe(true);
  });
});

describe('isBoss', () => {
  it('should return true only for level 7', () => {
    // GIVEN
    const levels = [1, 2, 3, 4, 5, 6, 7];
    const expectedBoss = [false, false, false, false, false, false, true];

    // WHEN/THEN
    levels.forEach((level, index) => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <AdventureThemeProvider initialWorldId={1} initialLevel={level}>
          {children}
        </AdventureThemeProvider>
      );

      const { result } = renderHook(() => useAdventureTheme(), { wrapper });
      expect(result.current.isBoss()).toBe(expectedBoss[index]);
    });
  });
});

describe('getLevelPosition', () => {
  it('should return correct position within chapter', () => {
    // GIVEN - 2-2-3 structure
    // Levels 1-2 → positions 1-2 in chapter 1
    // Levels 3-4 → positions 1-2 in chapter 2
    // Levels 5-7 → positions 1-3 in chapter 3
    const testCases = [
      { level: 1, expected: 1 },
      { level: 2, expected: 2 },
      { level: 3, expected: 1 },
      { level: 4, expected: 2 },
      { level: 5, expected: 1 },
      { level: 6, expected: 2 },
      { level: 7, expected: 3 },
    ];

    // WHEN/THEN
    testCases.forEach(({ level, expected }) => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <AdventureThemeProvider initialWorldId={1} initialLevel={level}>
          {children}
        </AdventureThemeProvider>
      );

      const { result } = renderHook(() => useAdventureTheme(), { wrapper });
      expect(result.current.getLevelPosition()).toBe(expected);
    });
  });
});
