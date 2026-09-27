import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Tests for share-prompt auto-open idempotency.
 *
 * Game results can arrive twice in a single session:
 * 1. Empty fallback (placeholder "Calculating results...")
 * 2. Real validated scores that supersede the empty fallback
 *
 * The share-prompt auto-open MUST fire exactly ONCE across this sequence,
 * even if the results display is re-rendered multiple times.
 *
 * Guard mechanism: A session-keyed ref tracks whether a share-open has already
 * fired for this game session, preventing duplicate navigator.share() or modal opens.
 */

describe('Share prompt auto-open idempotency', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Simulate a results data structure with a unique game session ID.
   * This is what comes from the backend's ValidatedScoresPayload.
   */
  interface ResultsData {
    gameSessionId: string;
    scores: Array<{ username: string; score: number }>;
    isEmpty?: boolean; // Mark the empty fallback
  }

  /**
   * A mock guard that prevents duplicate share-opens for a session.
   * This is the pattern that should be used in ResultsPage / useResultsSocketEvents.
   */
  function createShareOpenGuard() {
    const sessionIdsThatFired = new Set<string>();

    return {
      shouldFireShareOpen(sessionId: string): boolean {
        if (sessionIdsThatFired.has(sessionId)) {
          return false; // Already fired for this session
        }
        sessionIdsThatFired.add(sessionId);
        return true; // First time — fire it
      },
    };
  }

  it('fires share-open only once when results arrive as empty→real sequence', () => {
    const guard = createShareOpenGuard();
    const sessionId = 'game-session-12345';
    const shareOpenSpy = vi.fn();

    // Scenario: empty fallback arrives first
    const emptyResults: ResultsData = {
      gameSessionId: sessionId,
      scores: [],
      isEmpty: true,
    };

    // First results render: empty fallback
    if (guard.shouldFireShareOpen(emptyResults.gameSessionId)) {
      shareOpenSpy();
    }

    // Later: real validated scores arrive for the same session
    const realResults: ResultsData = {
      gameSessionId: sessionId,
      scores: [
        { username: 'Alice', score: 150 },
        { username: 'Bob', score: 120 },
      ],
    };

    // Results component re-renders with real data
    if (guard.shouldFireShareOpen(realResults.gameSessionId)) {
      shareOpenSpy();
    }

    // ShareOpen should have fired exactly once
    expect(shareOpenSpy).toHaveBeenCalledTimes(1);
  });

  it('fires share-open once per unique game session', () => {
    const guard = createShareOpenGuard();
    const shareOpenSpy = vi.fn();

    // Game 1
    const game1Results: ResultsData = {
      gameSessionId: 'game-1',
      scores: [{ username: 'Alice', score: 150 }],
    };

    if (guard.shouldFireShareOpen(game1Results.gameSessionId)) {
      shareOpenSpy('game-1');
    }

    // Game 2 (new session)
    const game2Results: ResultsData = {
      gameSessionId: 'game-2',
      scores: [{ username: 'Bob', score: 140 }],
    };

    if (guard.shouldFireShareOpen(game2Results.gameSessionId)) {
      shareOpenSpy('game-2');
    }

    // Should fire for each unique session
    expect(shareOpenSpy).toHaveBeenCalledTimes(2);
    expect(shareOpenSpy).toHaveBeenCalledWith('game-1');
    expect(shareOpenSpy).toHaveBeenCalledWith('game-2');
  });

  it('does not re-fire on component re-render with the same session', () => {
    const guard = createShareOpenGuard();
    const shareOpenSpy = vi.fn();
    const sessionId = 'game-session-xyz';

    const results: ResultsData = {
      gameSessionId: sessionId,
      scores: [{ username: 'Alice', score: 150 }],
    };

    // Component renders multiple times with the same results
    // (e.g., parent re-renders, props change, etc.)
    for (let i = 0; i < 5; i++) {
      if (guard.shouldFireShareOpen(results.gameSessionId)) {
        shareOpenSpy();
      }
    }

    // Share-open fires only once, not 5 times
    expect(shareOpenSpy).toHaveBeenCalledTimes(1);
  });
});
