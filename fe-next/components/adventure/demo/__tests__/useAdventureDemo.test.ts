/**
 * Tests for useAdventureDemo hook
 * Verifies demo runs only call /api/adventure/demo, never /api/adventure/start or write routes.
 * Verifies event tracking (adventure_demo_started and adventure_demo_finished).
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

const mockTrackGrowthEvent = vi.fn();

vi.mock('@/utils/growthTracking', () => ({
  trackGrowthEvent: (event: string, data?: any) => mockTrackGrowthEvent(event, data),
}));

import { useAdventureDemo } from '../useAdventureDemo';

describe('useAdventureDemo', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;
  const mockIsWord = vi.fn(async (word: string) => word === 'abc');

  beforeEach(() => {
    mockTrackGrowthEvent.mockClear();
    fetchSpy = vi.spyOn(global, 'fetch');
    fetchSpy.mockImplementation(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            grid: [
              ['a', 'b', 'c', 'd'],
              ['e', 'f', 'g', 'h'],
              ['i', 'j', 'k', 'l'],
              ['m', 'n', 'o', 'p'],
            ],
            level: {
              world: 1,
              level: 1,
              kind: 'fight',
              size: 4,
              minLength: 3,
              seconds: 0.5,
              stars: [10, 25, 40],
              enemyId: 'foe-w1',
              isBoss: false,
              bossHp: 50,
            },
            language: 'en',
            seconds: 0.5,
            hints: ['test', 'word'],
            targets: undefined,
          }),
          { status: 200 }
        )
      )
    );
    mockIsWord.mockClear();
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it('loads demo board on mount', async () => {
    const { result } = renderHook(() => useAdventureDemo({ language: 'en', isWord: mockIsWord }));

    await waitFor(() => {
      expect(result.current.phase).toBe('ready');
    });

    expect(fetchSpy).toHaveBeenCalledWith('/api/adventure/demo?language=en');
    expect(fetchSpy).not.toHaveBeenCalledWith(expect.stringMatching(/\/api\/adventure\/(start|complete|node)/));
  });

  it('fires adventure_demo_started when start() is called', async () => {
    const { result } = renderHook(() => useAdventureDemo({ language: 'en', isWord: mockIsWord }));

    await waitFor(() => {
      expect(result.current.phase).toBe('ready');
    });

    result.current.start();

    expect(mockTrackGrowthEvent).toHaveBeenCalledWith('adventure_demo_started', {});
  });

  it('fires adventure_demo_finished exactly once when fight ends', async () => {
    const { result } = renderHook(() => useAdventureDemo({ language: 'en', isWord: mockIsWord }));

    await waitFor(() => {
      expect(result.current.phase).toBe('ready');
    });

    result.current.start();

    await waitFor(() => {
      expect(result.current.phase).toBe('playing');
    });

    // Submit a word
    await result.current.submit('abc');

    // Wait for demo to finish (time runs out or enemy defeated)
    await waitFor(
      () => {
        expect(result.current.phase).toBe('done');
      },
      { timeout: 3000 }
    );

    // Verify adventure_demo_finished was fired exactly once with correct payload
    const finishCalls = mockTrackGrowthEvent.mock.calls.filter(
      (call) => call[0] === 'adventure_demo_finished'
    );
    expect(finishCalls).toHaveLength(1);

    // Verify the payload
    const [, payload] = finishCalls[0];
    expect(payload).toHaveProperty('won');
    expect(payload).toHaveProperty('score');
    expect(payload.score).toBeGreaterThan(0);
  });

  it('never calls /api/adventure/start or write routes', async () => {
    const { result } = renderHook(() => useAdventureDemo({ language: 'en', isWord: mockIsWord }));

    await waitFor(() => {
      expect(result.current.phase).toBe('ready');
    });

    result.current.start();

    await waitFor(() => {
      expect(result.current.phase).toBe('playing');
    });

    // Submit a word
    await result.current.submit('abc');

    // Verify no write endpoints were called
    const allCalls = fetchSpy.mock.calls.map((c) => String(c[0]));
    expect(allCalls).not.toContainEqual(expect.stringMatching(/\/api\/adventure\/(start|complete|node)$/));
  });

  it('verifies fetch calls do not include auth endpoints', async () => {
    const { result } = renderHook(() => useAdventureDemo({ language: 'en', isWord: mockIsWord }));

    await waitFor(() => {
      expect(result.current.phase).toBe('ready');
    });

    // Verify demo endpoint was called
    expect(fetchSpy).toHaveBeenCalledWith('/api/adventure/demo?language=en');

    // Start demo
    result.current.start();

    await waitFor(() => {
      expect(result.current.phase).toBe('playing');
    });

    // Verify no write endpoints are called during the run
    const allCalls = fetchSpy.mock.calls.map((c) => String(c[0]));
    expect(allCalls).not.toContainEqual(expect.stringMatching(/\/api\/adventure\/(start|complete|node)$/));
  });

  it('given a live demo fight, when words are submitted, then it follows the real run rules and the foe takes damage', async () => {
    fetchSpy.mockImplementation(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            grid: [
              ['a', 'b', 'c', 'd'],
              ['e', 'f', 'g', 'h'],
              ['i', 'j', 'k', 'l'],
              ['m', 'n', 'o', 'p'],
            ],
            level: { world: 1, level: 1, kind: 'fight', size: 4, minLength: 3, seconds: 60, stars: [10, 25, 40], isBoss: false },
            language: 'en',
            seconds: 60,
            hints: [],
          }),
          { status: 200 },
        ),
      ),
    );
    const { result } = renderHook(() => useAdventureDemo({ language: 'en', isWord: mockIsWord }));
    await waitFor(() => expect(result.current.phase).toBe('ready'));

    const { act } = await import('@testing-library/react');
    act(() => result.current.start());
    await waitFor(() => expect(result.current.phase).toBe('playing'));
    const hpBefore = result.current.combat!.enemyHp;

    // Same SubmitResult contract as useAdventureRun.submitWord.
    await act(async () => expect(await result.current.submit('ab')).toBe('short'));
    await act(async () => expect(await result.current.submit('xyz')).toBe('invalid'));
    await act(async () => expect(await result.current.submit('abc')).toBe('ok'));
    await act(async () => expect(await result.current.submit('abc')).toBe('dup'));

    expect(result.current.words).toEqual(['abc']);
    expect(result.current.combat!.enemyHp).toBeLessThan(hpBefore);
  });
});
