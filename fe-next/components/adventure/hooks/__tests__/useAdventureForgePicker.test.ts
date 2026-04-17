/**
 * useAdventureForgePicker Tests
 *
 * Owns pre-level Forge-mode rune picker: open state, offering of 3 runes,
 * pick/replace/skip handlers, computed effect bundle.
 */

import { vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { RuneCardDef } from '@/types/wordForge';

vi.mock('@/lib/adventure/runeCatalog', () => ({
  pickRuneOffering: vi.fn(() => [{ id: 'R1' }, { id: 'R2' }, { id: 'R3' }]),
  computeForgePickEffects: vi.fn((defs: unknown[]) => ({ count: defs.length })),
  MAX_EQUIPPED_RUNES: 3,
}));

import { useAdventureForgePicker } from '../useAdventureForgePicker';

describe('useAdventureForgePicker', () => {
  it('picker starts open when hasRunePick=true', () => {
    const { result } = renderHook(() => useAdventureForgePicker({ hasRunePick: true }));
    expect(result.current.forgePickerOpen).toBe(true);
    expect(result.current.forgeOffering).toHaveLength(3);
  });

  it('picker starts closed and offering empty when hasRunePick=false', () => {
    const { result } = renderHook(() => useAdventureForgePicker({ hasRunePick: false }));
    expect(result.current.forgePickerOpen).toBe(false);
    expect(result.current.forgeOffering).toEqual([]);
  });

  it('pick appends rune and closes picker', () => {
    const { result } = renderHook(() => useAdventureForgePicker({ hasRunePick: true }));
    act(() => result.current.handleForgePick({ id: 'rune-a' } as RuneCardDef));
    expect(result.current.forgePickerOpen).toBe(false);
    expect(result.current.forgeEquippedRunes).toHaveLength(1);
    expect(result.current.forgeEquippedRunes[0].def.id).toBe('rune-a');
  });

  it('pick with replaceIndex replaces at that slot', () => {
    const { result } = renderHook(() => useAdventureForgePicker({ hasRunePick: true }));
    act(() => result.current.handleForgePick({ id: 'first' } as RuneCardDef));
    act(() => result.current.handleForgePick({ id: 'second' } as RuneCardDef, 0));
    expect(result.current.forgeEquippedRunes).toHaveLength(1);
    expect(result.current.forgeEquippedRunes[0].def.id).toBe('second');
  });

  it('skip closes picker without equipping', () => {
    const { result } = renderHook(() => useAdventureForgePicker({ hasRunePick: true }));
    act(() => result.current.handleForgeSkip());
    expect(result.current.forgePickerOpen).toBe(false);
    expect(result.current.forgeEquippedRunes).toHaveLength(0);
  });

  it('forgeEffects reflects equipped runes', () => {
    const { result } = renderHook(() => useAdventureForgePicker({ hasRunePick: true }));
    act(() => result.current.handleForgePick({ id: 'a' } as RuneCardDef));
    expect(result.current.forgeEffects).toEqual({ count: 1 });
  });
});
