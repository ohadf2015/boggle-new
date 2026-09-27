import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SWING } from '@/lib/wordTowerV2/crane';
import { snapshotWorld } from '@/lib/wordTowerV2/engine';
import { NEUTRAL_PERKS, type Perks, emptyEstate, perksFromEstate } from '@/lib/wordTowerV2/estate';
import { PLOT_SLOTS } from '@/lib/wordTowerV2/estateCatalog';
import { blockWidthForWord } from '@/lib/wordTowerV2/scoring';
import { useTowerRun } from '../../useTowerRun';

vi.mock('@/contexts/SoundEffectsContext', () => ({
  useSoundEffects: () => ({
    playSound: vi.fn(),
    playComboSound: vi.fn(),
    playWordLengthSound: vi.fn(),
    setGameActive: vi.fn(),
  }),
}));

const maxedPerks = (): Perks =>
  perksFromEstate({ ...emptyEstate(), district: 3, plots: PLOT_SLOTS.map((slot) => ({ slot, level: 5, damaged: false })) });

function hoistWith(perks: Perks, words: string[]) {
  const { result } = renderHook(() => useTowerRun());
  act(() => result.current.setPerks(perks));
  for (const word of words) {
    act(() => result.current.hoist(word));
    if (word !== words[words.length - 1]) act(() => result.current.drop());
  }
  return result;
}

/**
 * At NEUTRAL_PERKS every multiplication must be the identity — feel.test's
 * timings are measured against the untouched SWING — and a built district has
 * to actually change the run, or the empire's whole promise is cosmetic.
 */
describe('empire perks reach the run', () => {
  it('given a fresh estate, when a floor is hoisted, then the swing and the width are untouched', () => {
    const result = hoistWith(NEUTRAL_PERKS, ['tower']);
    expect(result.current.hangingRef.current?.swing.periodMs).toBe(SWING.periodMs);
    expect(result.current.previewWidth('slab')).toBe(blockWidthForWord('slab'));
    const block = snapshotWorld(result.current.worldRef.current).blocks[0];
    expect(block.widthPx).toBe(blockWidthForWord('tower'));
  });

  it('given a built Crane Yard, when a floor is hoisted, then the crane swings slower', () => {
    const perks = maxedPerks();
    expect(perks.swingPeriodMult).toBeGreaterThan(1);
    const result = hoistWith(perks, ['tower']);
    expect(result.current.hangingRef.current?.swing.periodMs).toBeCloseTo(SWING.periodMs * perks.swingPeriodMult, 5);
  });

  it('given a built Foundation, when the GROUND floor is hoisted, then it is wider — and the ghost agreed', () => {
    const perks = maxedPerks();
    expect(perks.baseWidthMult).toBeGreaterThan(1);
    const { result } = renderHook(() => useTowerRun());
    act(() => result.current.setPerks(perks));
    const want = Math.round(blockWidthForWord('tower') * perks.baseWidthMult);
    // The ghost the player aims with, then the body physics actually gets.
    expect(result.current.previewWidth('tower')).toBe(want);
    act(() => result.current.hoist('tower'));
    expect(snapshotWorld(result.current.worldRef.current).blocks[0].widthPx).toBe(want);
  });

  it('given the ground floor is placed, when the next floor is hoisted, then only the base kept the bonus', () => {
    const perks = maxedPerks();
    const result = hoistWith(perks, ['tower', 'slab']);
    // The ghost for floor 2 must quote the SAME width the floor was spawned at.
    expect(result.current.previewWidth('slab')).toBe(blockWidthForWord('slab'));
    const second = snapshotWorld(result.current.worldRef.current).blocks.find((b) => b.id.endsWith('-b1'));
    expect(second?.widthPx).toBe(blockWidthForWord('slab'));
  });
});
