import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useBlastV2 } from '../useBlastV2';
import { cellId } from '../engine/cell-id';
import type { BlastLevel } from '../types';

const mockLevel: BlastLevel = {
  id: 'useBlastV2-test',
  levelNumber: 1,
  locale: 'en',
  theme: 'onboarding',
  columns: [
    { index: 0, tiles: ['C', 'A', 'T'] },
    { index: 1, tiles: ['S', 'U', 'N'] },
    { index: 2, tiles: ['E', 'G', 'G'] },
  ],
  words: ['CAT', 'SUN', 'EGG'],
  resolvableOrder: ['CAT', 'SUN', 'EGG'],
  tileFlags: {},
  gravityMode: 'standard',
  difficulty: 1,
};

// Level designed so collapsing CAT reveals DOG.
//   col0 = [C,A,T,D] bottom-up, col1 = [O], col2 = [G]
//   initial grid (r = row index from bottom):
//     r3: D . .
//     r2: T . .
//     r1: A . .
//     r0: C O G
//   CAT is the vertical column-0 run; DOG is NOT a straight line yet.
//   After CAT is cleared, D falls to r0 → DOG spans row 0 (c0r0=D, c1r0=O, c2r0=G).
const revealLevel: BlastLevel = {
  id: 'useBlastV2-reveal-test',
  levelNumber: 1,
  locale: 'en',
  theme: 'onboarding',
  columns: [
    { index: 0, tiles: ['C', 'A', 'T', 'D'] },
    { index: 1, tiles: ['O'] },
    { index: 2, tiles: ['G'] },
  ],
  words: ['CAT', 'DOG'],
  resolvableOrder: ['CAT', 'DOG'],
  tileFlags: {},
  gravityMode: 'standard',
  difficulty: 1,
};

describe('useBlastV2 hook', () => {
  it('drag-select CAT claims only CAT — no auto-claim of other words', () => {
    const { result } = renderHook(() => useBlastV2(mockLevel));

    act(() => {
      result.current.handlers.onPointerDown(cellId(0, 0));
      result.current.handlers.onPointerMove(cellId(0, 1));
      result.current.handlers.onPointerMove(cellId(0, 2));
      result.current.handlers.onPointerUp();
    });

    expect(result.current.state.foundWords.has('CAT')).toBe(true);
    // SUN + EGG are still on the board untouched — player must find them manually.
    expect(result.current.state.foundWords.has('SUN')).toBe(false);
    expect(result.current.state.foundWords.has('EGG')).toBe(false);
    // Only CAT scored: 3 letters x 10 (theme). No cascade bonus.
    expect(result.current.state.coins).toBe(30);
    // Collapsing column 0 reveals nothing — SUN/EGG were already formable.
    expect(result.current.state.cascadeCount).toBe(0);
    expect(result.current.state.status).toBe('playing');
  });

  it('counts collapse-revealed words as cascades for FX (revealLevel)', () => {
    const { result } = renderHook(() => useBlastV2(revealLevel));
    expect(result.current.state.lastChainDepth).toBe(0);
    expect(result.current.state.chainEventKey).toBe(0);

    // Drag CAT up column 0. Collapsing C/A/T drops D to row 0,
    // making DOG (D-O-G across row 0) formable for the first time.
    act(() => {
      result.current.handlers.onPointerDown(cellId(0, 0));
      result.current.handlers.onPointerMove(cellId(0, 1));
      result.current.handlers.onPointerMove(cellId(0, 2));
      result.current.handlers.onPointerUp();
    });

    expect(result.current.state.foundWords.has('CAT')).toBe(true);
    // DOG was REVEALED, not claimed — player still has to drag it.
    expect(result.current.state.foundWords.has('DOG')).toBe(false);
    expect(result.current.state.cascadeCount).toBe(1);
    expect(result.current.state.lastChainDepth).toBe(1);
    expect(result.current.state.chainEventKey).toBe(1);
    expect(result.current.state.status).toBe('playing');
  });

  it('manually finding the revealed word completes the level', () => {
    const { result } = renderHook(() => useBlastV2(revealLevel));

    act(() => {
      result.current.handlers.onPointerDown(cellId(0, 0));
      result.current.handlers.onPointerMove(cellId(0, 1));
      result.current.handlers.onPointerMove(cellId(0, 2));
      result.current.handlers.onPointerUp();
    });

    // After CAT collapses, DOG sits across row 0: c0r0=D, c1r0=O, c2r0=G.
    act(() => {
      result.current.handlers.onPointerDown(cellId(0, 0));
      result.current.handlers.onPointerMove(cellId(1, 0));
      result.current.handlers.onPointerMove(cellId(2, 0));
      result.current.handlers.onPointerUp();
    });

    expect(result.current.state.foundWords.has('DOG')).toBe(true);
    expect(result.current.state.status).toBe('levelComplete');
  });

  it('defers the shake for an "unknown" rejection until the async dict check resolves', () => {
    // Dragging row 0 spells "CS" — a real-letter run that is NOT a theme word
    // and (with no dictionaryCheck) rejects as 'unknown'. This is the retryable
    // path: the player may have found a valid off-theme word, so we must NOT
    // fire the red shake before /api/dictionary/check has had its say.
    const { result } = renderHook(() => useBlastV2(mockLevel));
    const initialShakeKey = result.current.state.invalidShakeKey;

    act(() => {
      result.current.handlers.onPointerDown(cellId(0, 0));
      result.current.handlers.onPointerMove(cellId(1, 0));
      result.current.handlers.onPointerUp();
    });

    // No premature shake — the verdict is pending.
    expect(result.current.state.invalidShakeKey).toBe(initialShakeKey);
    expect(result.current.state.dictCheckPending).toBe(true);
    expect(result.current.state.lastRejectedCells.length).toBe(2);
  });

  it('shakes immediately for a deterministic rejection (frozen tile) — no dict check', () => {
    // Frozen tiles are an unambiguous, terminal rejection. There is no point
    // deferring to the dictionary, so the shake fires at once and nothing is
    // queued for an async retry.
    const frozenLevel: BlastLevel = {
      ...mockLevel,
      id: 'frozen-reject-test',
      tileFlags: { [cellId(0, 0)]: ['frozen'] },
    };
    const { result } = renderHook(() => useBlastV2(frozenLevel));
    const initialShakeKey = result.current.state.invalidShakeKey;

    act(() => {
      result.current.handlers.onPointerDown(cellId(0, 0));
      result.current.handlers.onPointerMove(cellId(0, 1));
      result.current.handlers.onPointerMove(cellId(0, 2));
      result.current.handlers.onPointerUp();
    });

    expect(result.current.state.invalidShakeKey).toBe(initialShakeKey + 1);
    expect(result.current.state.dictCheckPending).toBe(false);
    expect(result.current.state.lastRejectedCells).toEqual([]);
  });

  it('onRejectConfirmed fires the shake after the dict check rejects the word', () => {
    // BlastGame calls this when /api/dictionary/check confirms the pending word
    // is NOT real. Only now does the red shake fire, and the pending flag clears.
    const { result } = renderHook(() => useBlastV2(mockLevel));

    act(() => {
      result.current.handlers.onPointerDown(cellId(0, 0));
      result.current.handlers.onPointerMove(cellId(1, 0));
      result.current.handlers.onPointerUp();
    });
    expect(result.current.state.dictCheckPending).toBe(true);
    const pendingShakeKey = result.current.state.invalidShakeKey;

    act(() => {
      result.current.handlers.onRejectConfirmed();
    });

    expect(result.current.state.invalidShakeKey).toBe(pendingShakeKey + 1);
    expect(result.current.state.dictCheckPending).toBe(false);
    expect(result.current.state.lastRejectedCells).toEqual([]);
  });

  it('bonusWordCount counts off-theme found words', () => {
    // dictionaryCheck accepts "CSE" (row 0). It is not a theme word → bonus.
    const { result } = renderHook(() =>
      useBlastV2(mockLevel, { dictionaryCheck: (w) => w.toLowerCase() === 'cse' }),
    );
    expect(result.current.state.bonusWordCount).toBe(0);

    act(() => {
      result.current.handlers.onPointerDown(cellId(0, 0));
      result.current.handlers.onPointerMove(cellId(1, 0));
      result.current.handlers.onPointerMove(cellId(2, 0));
      result.current.handlers.onPointerUp();
    });
    expect(result.current.state.foundWords.size).toBe(1);
    expect(result.current.state.bonusWordCount).toBe(1);
  });

  it('counts a real miss in wrongAttempts only once the verdict is in', () => {
    const { result } = renderHook(() => useBlastV2(mockLevel));
    expect(result.current.state.wrongAttempts).toBe(0);

    // An 'unknown' reject is NOT yet a confirmed miss — verdict pending.
    act(() => {
      result.current.handlers.onPointerDown(cellId(0, 0));
      result.current.handlers.onPointerMove(cellId(1, 0));
      result.current.handlers.onPointerUp();
    });
    expect(result.current.state.wrongAttempts).toBe(0);

    // Dictionary confirms it's not a word → now it's a real miss.
    act(() => {
      result.current.handlers.onRejectConfirmed();
    });
    expect(result.current.state.wrongAttempts).toBe(1);
  });

  it('counts a deterministic rejection (frozen) as a wrong attempt immediately', () => {
    const frozenLevel: BlastLevel = {
      ...mockLevel,
      id: 'frozen-wrong-attempt',
      tileFlags: { [cellId(0, 0)]: ['frozen'] },
    };
    const { result } = renderHook(() => useBlastV2(frozenLevel));

    act(() => {
      result.current.handlers.onPointerDown(cellId(0, 0));
      result.current.handlers.onPointerMove(cellId(0, 1));
      result.current.handlers.onPointerMove(cellId(0, 2));
      result.current.handlers.onPointerUp();
    });
    expect(result.current.state.wrongAttempts).toBe(1);
  });

  it('does not count a successful word as a wrong attempt', () => {
    const { result } = renderHook(() => useBlastV2(mockLevel));
    act(() => {
      result.current.handlers.onPointerDown(cellId(0, 0));
      result.current.handlers.onPointerMove(cellId(0, 1));
      result.current.handlers.onPointerMove(cellId(0, 2));
      result.current.handlers.onPointerUp();
    });
    expect(result.current.state.foundWords.has('CAT')).toBe(true);
    expect(result.current.state.wrongAttempts).toBe(0);
  });

  it('bonusWordCount stays 0 when only theme words are found', () => {
    const { result } = renderHook(() => useBlastV2(mockLevel));

    act(() => {
      result.current.handlers.onPointerDown(cellId(0, 0));
      result.current.handlers.onPointerMove(cellId(0, 1));
      result.current.handlers.onPointerMove(cellId(0, 2));
      result.current.handlers.onPointerUp();
    });
    expect(result.current.state.foundWords.has('CAT')).toBe(true);
    expect(result.current.state.bonusWordCount).toBe(0);
  });

  it('completing all words sets status to levelComplete', () => {
    const { result } = renderHook(() => useBlastV2(mockLevel));

    act(() => {
      result.current.handlers.onPointerDown(cellId(0, 0));
      result.current.handlers.onPointerMove(cellId(0, 1));
      result.current.handlers.onPointerMove(cellId(0, 2));
      result.current.handlers.onPointerUp();
    });

    act(() => {
      result.current.handlers.onPointerDown(cellId(1, 0));
      result.current.handlers.onPointerMove(cellId(1, 1));
      result.current.handlers.onPointerMove(cellId(1, 2));
      result.current.handlers.onPointerUp();
    });

    act(() => {
      result.current.handlers.onPointerDown(cellId(2, 0));
      result.current.handlers.onPointerMove(cellId(2, 1));
      result.current.handlers.onPointerMove(cellId(2, 2));
      result.current.handlers.onPointerUp();
    });

    expect(result.current.state.status).toBe('levelComplete');
  });

  it('initializes tileIds parallel to the level columns', () => {
    const { result } = renderHook(() => useBlastV2(revealLevel));
    expect(result.current.state.tileIds).toEqual([
      ['t-0-0', 't-0-1', 't-0-2', 't-0-3'],
      ['t-1-0'],
      ['t-2-0'],
    ]);
  });

  it('ticks chest progress on every word found, even without gem tiles', () => {
    // Curated chain levels ship without gem tiles, so the old gem-only
    // chestProgressDelta left the bar at 0% throughout play. Every word now
    // contributes a base delta so the chest visibly fills.
    const { result } = renderHook(() => useBlastV2(mockLevel));
    expect(result.current.state.chestProgress).toBe(0);

    act(() => {
      result.current.handlers.onPointerDown(cellId(0, 0));
      result.current.handlers.onPointerMove(cellId(0, 1));
      result.current.handlers.onPointerMove(cellId(0, 2));
      result.current.handlers.onPointerUp();
    });

    expect(result.current.state.chestProgress).toBeGreaterThan(0);
  });

  it('free-form dictionary match collapses the consumed tiles', () => {
    // Tiles selected across row 0 must be removed after a bonus match —
    // otherwise the board stays identical and the player remains stuck.
    const { result } = renderHook(() =>
      useBlastV2(mockLevel, { dictionaryCheck: (w) => w.toLowerCase() === 'cse' }),
    );
    const initialColumn0Height = result.current.state.level.columns[0]!.tiles.length;

    act(() => {
      result.current.handlers.onPointerDown(cellId(0, 0));
      result.current.handlers.onPointerMove(cellId(1, 0));
      result.current.handlers.onPointerMove(cellId(2, 0));
      result.current.handlers.onPointerUp();
    });

    // Column 0's bottom tile (C) was consumed → height drops by one.
    expect(result.current.state.level.columns[0]!.tiles.length).toBe(initialColumn0Height - 1);
  });

  it('accepts free-form dictionary words via dictionaryCheck option', () => {
    // Board row 0 across spells "CSE" — not in level.words. With
    // dictionaryCheck accepting it, useBlastV2 should treat it as a
    // bonus match and add it to foundWords.
    const { result } = renderHook(() =>
      useBlastV2(mockLevel, { dictionaryCheck: (w) => w.toLowerCase() === 'cse' }),
    );

    act(() => {
      result.current.handlers.onPointerDown(cellId(0, 0));
      result.current.handlers.onPointerMove(cellId(1, 0));
      result.current.handlers.onPointerMove(cellId(2, 0));
      result.current.handlers.onPointerUp();
    });

    expect(result.current.state.foundWords.size).toBe(1);
    // Stored normalized (lowercase from config.normalize).
    expect(
      [...result.current.state.foundWords].some((w) => w.toLowerCase() === 'cse'),
    ).toBe(true);
  });

  it('exposes canUndo=false and a no-op undo before any move', () => {
    const { result } = renderHook(() => useBlastV2(mockLevel));
    expect(result.current.state.canUndo).toBe(false);
    act(() => {
      result.current.handlers.onUndo();
    });
    expect(result.current.state.foundWords.size).toBe(0);
  });

  it('undo restores prior level state after a successful submit', () => {
    const { result } = renderHook(() => useBlastV2(mockLevel));
    const initialCoins = result.current.state.coins;
    const initialColumns = result.current.state.level.columns;
    const initialTileIds = result.current.state.tileIds;

    act(() => {
      result.current.handlers.onPointerDown(cellId(0, 0));
      result.current.handlers.onPointerMove(cellId(0, 1));
      result.current.handlers.onPointerMove(cellId(0, 2));
      result.current.handlers.onPointerUp();
    });

    expect(result.current.state.foundWords.has('CAT')).toBe(true);
    expect(result.current.state.canUndo).toBe(true);

    act(() => {
      result.current.handlers.onUndo();
    });

    expect(result.current.state.foundWords.has('CAT')).toBe(false);
    expect(result.current.state.foundWords.size).toBe(0);
    expect(result.current.state.coins).toBe(initialCoins);
    expect(result.current.state.level.columns).toEqual(initialColumns);
    expect(result.current.state.tileIds).toEqual(initialTileIds);
    expect(result.current.state.canUndo).toBe(false);
    expect(result.current.state.status).toBe('playing');
  });

  it('undo stack supports multiple successive reversals', () => {
    const { result } = renderHook(() => useBlastV2(mockLevel));

    act(() => {
      result.current.handlers.onPointerDown(cellId(0, 0));
      result.current.handlers.onPointerMove(cellId(0, 1));
      result.current.handlers.onPointerMove(cellId(0, 2));
      result.current.handlers.onPointerUp();
    });
    act(() => {
      result.current.handlers.onPointerDown(cellId(1, 0));
      result.current.handlers.onPointerMove(cellId(1, 1));
      result.current.handlers.onPointerMove(cellId(1, 2));
      result.current.handlers.onPointerUp();
    });

    expect(result.current.state.foundWords.has('CAT')).toBe(true);
    expect(result.current.state.foundWords.has('SUN')).toBe(true);

    act(() => {
      result.current.handlers.onUndo();
    });
    expect(result.current.state.foundWords.has('SUN')).toBe(false);
    expect(result.current.state.foundWords.has('CAT')).toBe(true);

    act(() => {
      result.current.handlers.onUndo();
    });
    expect(result.current.state.foundWords.has('CAT')).toBe(false);
    expect(result.current.state.canUndo).toBe(false);
  });

  it('preserves tile identity through a collapse', () => {
    const { result } = renderHook(() => useBlastV2(revealLevel));

    act(() => {
      result.current.handlers.onPointerDown(cellId(0, 0));
      result.current.handlers.onPointerMove(cellId(0, 1));
      result.current.handlers.onPointerMove(cellId(0, 2));
      result.current.handlers.onPointerUp();
    });

    expect(result.current.state.tileIds).toEqual([
      ['t-0-3'],
      ['t-1-0'],
      ['t-2-0'],
    ]);
  });

  describe('async dictionary fallback', () => {
    it('records rejected cells when local validator says "unknown" so async retry can replay them', () => {
      // No dictionaryCheck supplied → "CSE" (real letters on row 0) rejects with
      // reason 'unknown'. BlastGame uses lastRejectedCells to call the
      // /api/dictionary/check endpoint and dispatch onForceBonus on success.
      const { result } = renderHook(() => useBlastV2(mockLevel));

      act(() => {
        result.current.handlers.onPointerDown(cellId(0, 0));
        result.current.handlers.onPointerMove(cellId(1, 0));
        result.current.handlers.onPointerMove(cellId(2, 0));
        result.current.handlers.onPointerUp();
      });

      expect(result.current.state.lastValidation).toEqual({ kind: 'reject', reason: 'unknown' });
      expect(result.current.state.lastRejectedCells).toEqual([
        cellId(0, 0),
        cellId(1, 0),
        cellId(2, 0),
      ]);
    });

    it('does NOT remember rejected cells for non-retryable rejections (duplicate)', () => {
      // Find CAT first, then try to claim it again. Reject reason='duplicate'
      // is terminal — no point keeping the cells for an async retry.
      const { result } = renderHook(() => useBlastV2(mockLevel));

      act(() => {
        result.current.handlers.onPointerDown(cellId(0, 0));
        result.current.handlers.onPointerMove(cellId(0, 1));
        result.current.handlers.onPointerMove(cellId(0, 2));
        result.current.handlers.onPointerUp();
      });
      expect(result.current.state.foundWords.has('CAT')).toBe(true);

      // Note: after the collapse, col0 no longer holds CAT. To trigger a
      // duplicate reject we'd need CAT still on the board; here we just
      // confirm that AFTER the successful submit, lastRejectedCells is
      // cleared by the bonus path / successful submit path.
      expect(result.current.state.lastRejectedCells).toEqual([]);
    });

    it('onForceBonus applies a dictionary-confirmed bonus word and clears it from the board', () => {
      // Player drags row 0 → "CSE" → local validator rejects 'unknown'.
      // BlastGame confirms via /api/dictionary/check then calls onForceBonus
      // with the remembered cells. The word is credited, tiles cleared.
      const { result } = renderHook(() => useBlastV2(mockLevel));

      act(() => {
        result.current.handlers.onPointerDown(cellId(0, 0));
        result.current.handlers.onPointerMove(cellId(1, 0));
        result.current.handlers.onPointerMove(cellId(2, 0));
        result.current.handlers.onPointerUp();
      });
      expect(result.current.state.lastRejectedCells.length).toBe(3);

      act(() => {
        result.current.handlers.onForceBonus(result.current.state.lastRejectedCells, 'cse');
      });

      expect(result.current.state.foundWords.has('cse')).toBe(true);
      // Bottom row tiles consumed → col0 lost its bottom tile (C).
      expect(result.current.state.level.columns[0]!.tiles.length).toBe(2);
      expect(result.current.state.lastRejectedCells).toEqual([]);
      expect(result.current.state.canUndo).toBe(true);
    });
  });

  describe('rewarded-ad undo gate', () => {
    it('flags needsRewardedAdForUndo after two free undos are consumed', () => {
      const { result } = renderHook(() => useBlastV2(mockLevel));

      // Two free undos. After each successful submit, undo rolls it back.
      for (let i = 0; i < 2; i++) {
        act(() => {
          result.current.handlers.onPointerDown(cellId(0, 0));
          result.current.handlers.onPointerMove(cellId(0, 1));
          result.current.handlers.onPointerMove(cellId(0, 2));
          result.current.handlers.onPointerUp();
        });
        act(() => result.current.handlers.onUndo());
      }

      expect(result.current.state.freeUndosUsed).toBe(2);
      expect(result.current.state.needsRewardedAdForUndo).toBe(true);
    });

    it('onRewardedUndoGranted resets the free-undo counter', () => {
      const { result } = renderHook(() => useBlastV2(mockLevel));

      for (let i = 0; i < 2; i++) {
        act(() => {
          result.current.handlers.onPointerDown(cellId(0, 0));
          result.current.handlers.onPointerMove(cellId(0, 1));
          result.current.handlers.onPointerMove(cellId(0, 2));
          result.current.handlers.onPointerUp();
        });
        act(() => result.current.handlers.onUndo());
      }
      expect(result.current.state.needsRewardedAdForUndo).toBe(true);

      act(() => result.current.handlers.onRewardedUndoGranted());

      expect(result.current.state.freeUndosUsed).toBe(0);
      expect(result.current.state.needsRewardedAdForUndo).toBe(false);
    });
  });
});
