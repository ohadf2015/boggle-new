import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// ─── Mocks for non-trivial collaborators ────────────────────────────────
vi.mock('../../utils/blastCombos', () => ({
  detectSpecialCombos: vi.fn(() => []),
}));
vi.mock('../../utils/blastNearMiss', () => ({
  detectNearMiss: vi.fn(() => null),
}));
vi.mock('@/components/grid/hapticFeedback', () => ({
  vibrateBlastBomb: vi.fn(),
  vibrateBlastLightning: vi.fn(),
  vibrateBlastPrism: vi.fn(),
}));

import { useBlastWordHandler } from '../useBlastWordHandler';
import { detectSpecialCombos } from '../../utils/blastCombos';

// ─── Test factories ─────────────────────────────────────────────────────
function makeEngine() {
  return {
    tileStates: [
      [{ type: 'standard' }, { type: 'standard' }, { type: 'standard' }],
      [{ type: 'standard' }, { type: 'standard' }, { type: 'standard' }],
      [{ type: 'standard' }, { type: 'standard' }, { type: 'standard' }],
    ],
    grid: [['c','a','t'],['d','o','g'],['e','f','h']],
    submitWord: vi.fn(() => ({ score: 5, countdownExplosions: [] })),
  };
}

function makeSounds() {
  return {
    playComboActivation: vi.fn(),
    playSpecialTileSound: vi.fn(),
    playTileClear: vi.fn(),
    playLongWordBonus: vi.fn(),
  };
}

function makeSequencer() {
  return { animateWordClear: vi.fn(() => Promise.resolve()) };
}

function setup(overrides: Partial<Parameters<typeof useBlastWordHandler>[0]> = {}) {
  const engine = makeEngine();
  const sounds = makeSounds();
  const sequencer = makeSequencer();
  const runCascade = vi.fn(() => Promise.resolve());
  const lastPathRef = { current: [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 }] };
  const flyIdRef = { current: 0 };
  const explosionShakeTimerRef = { current: null as ReturnType<typeof setTimeout> | null };
  const nearMissTimerRef = { current: null as ReturnType<typeof setTimeout> | null };
  const onWordWithComboTypeRef = { current: vi.fn() };

  const effects = {
    setLastWordLength: vi.fn(),
    setWordSubmitCount: vi.fn(),
    setWordFoundParticle: vi.fn(),
    setClearedTilesForEffects: vi.fn(),
    setScoreFlyEvents: vi.fn(),
    setComboFlash: vi.fn(),
    setComboTypeName: vi.fn(),
    setComboParticle: vi.fn(),
    setExplosionShake: vi.fn(),
    setNearMissCells: vi.fn(),
  };

  const params = {
    engine: engine as never,
    sequencer: sequencer as never,
    sounds: sounds as never,
    runCascade,
    lastPathRef,
    flyIdRef,
    explosionShakeTimerRef,
    nearMissTimerRef,
    onWordWithComboTypeRef,
    onComboDetected: vi.fn(),
    config: { gridSize: 3 } as never,
    t: (k: string) => k,
    effects,
    ...overrides,
  };
  return { params, engine, sounds, sequencer, runCascade, effects, lastPathRef };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useBlastWordHandler', () => {
  it('returns a handleWordAccepted callback', () => {
    const { params } = setup();
    const { result } = renderHook(() => useBlastWordHandler(params));
    expect(result.current.handleWordAccepted).toBeTypeOf('function');
  });

  it('no-ops when lastPathRef is empty', async () => {
    const { params, engine, lastPathRef } = setup();
    lastPathRef.current = [];
    const { result } = renderHook(() => useBlastWordHandler(params));
    await act(async () => {
      await result.current.handleWordAccepted({ word: 'cat', score: 5 });
    });
    expect(engine.submitWord).not.toHaveBeenCalled();
  });

  it('clears path, animates, submits to engine, and runs cascade', async () => {
    const { params, engine, sequencer, runCascade, lastPathRef } = setup();
    const { result } = renderHook(() => useBlastWordHandler(params));
    await act(async () => {
      await result.current.handleWordAccepted({ word: 'cat', score: 5 });
    });
    expect(sequencer.animateWordClear).toHaveBeenCalled();
    // Score passed to the engine folds in the deterministic letter-value bonus:
    // 5 (incoming) + getBasePoints('cat') (C3+A1+T1 = 5) = 10. Keeps SP + MP totals
    // organic/non-round and identical to the server's computation.
    expect(engine.submitWord).toHaveBeenCalledWith(
      expect.any(Array),
      'cat',
      10,
    );
    expect(runCascade).toHaveBeenCalledWith(3);
    expect(lastPathRef.current).toEqual([]);
  });

  it('plays tile clear and long-word bonus sounds at the end', async () => {
    const { params, sounds } = setup();
    const { result } = renderHook(() => useBlastWordHandler(params));
    await act(async () => {
      await result.current.handleWordAccepted({ word: 'cat', score: 5 });
    });
    expect(sounds.playTileClear).toHaveBeenCalledWith(3);
    expect(sounds.playLongWordBonus).toHaveBeenCalledWith(3);
  });

  it('reports detected combos to parent and triggers combo flash', async () => {
    (detectSpecialCombos as ReturnType<typeof vi.fn>).mockReturnValueOnce([
      { type: 'doubleBomb', scoreMultiplier: 4 },
    ]);
    const { params, effects, sounds } = setup();
    const { result } = renderHook(() => useBlastWordHandler(params));
    await act(async () => {
      await result.current.handleWordAccepted({ word: 'cat', score: 5 });
    });
    expect(params.onComboDetected).toHaveBeenCalledWith([
      { type: 'doubleBomb', scoreMultiplier: 4 },
    ]);
    expect(effects.setComboFlash).toHaveBeenCalled();
    expect(sounds.playComboActivation).toHaveBeenCalledWith(2);
  });

  it('forwards combo type to parent via onWordWithComboTypeRef', async () => {
    (detectSpecialCombos as ReturnType<typeof vi.fn>).mockReturnValueOnce([
      { type: 'tripleGem', scoreMultiplier: 3 },
    ]);
    const { params } = setup();
    const { result } = renderHook(() => useBlastWordHandler(params));
    await act(async () => {
      await result.current.handleWordAccepted({ word: 'cat', score: 5 });
    });
    expect(params.onWordWithComboTypeRef.current).toHaveBeenCalledWith('cat', 'tripleGem');
  });
});
