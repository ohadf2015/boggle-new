import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTowerSkin, TOWER_SKIN_STORAGE_KEY } from '../useTowerSkin';

describe('useTowerSkin', () => {
  beforeEach(() => { localStorage.clear(); });

  it('defaults to the classic skin with the classic palette', () => {
    const { result } = renderHook(() => useTowerSkin(0));
    expect(result.current.skinId).toBe('classic');
    expect(result.current.palette.city).toBe(result.current.palette.city); // defined
    expect(typeof result.current.palette.city).toBe('number');
  });

  it('equips a skin the player has unlocked and persists it', () => {
    const { result } = renderHook(() => useTowerSkin(99999)); // everything unlocked
    act(() => result.current.setSkinId('gold'));
    expect(result.current.skinId).toBe('gold');
    expect(localStorage.getItem(TOWER_SKIN_STORAGE_KEY)).toBe('gold');
  });

  it('refuses to equip a still-locked skin (stays put)', () => {
    const { result } = renderHook(() => useTowerSkin(0)); // only classic unlocked
    act(() => result.current.setSkinId('gold'));
    expect(result.current.skinId).toBe('classic');
  });

  it('restores a persisted skin on mount when it is unlocked', () => {
    localStorage.setItem(TOWER_SKIN_STORAGE_KEY, 'copper');
    const { result } = renderHook(() => useTowerSkin(99999));
    expect(result.current.skinId).toBe('copper');
    expect(result.current.palette.city).not.toBe(undefined);
  });

  it('ignores a persisted skin that is not yet unlocked (anti-tamper) → classic', () => {
    localStorage.setItem(TOWER_SKIN_STORAGE_KEY, 'aurora');
    const { result } = renderHook(() => useTowerSkin(0));
    expect(result.current.skinId).toBe('classic');
  });

  it('exposes unlock state for the picker', () => {
    const { result } = renderHook(() => useTowerSkin(150));
    expect(result.current.isUnlocked('classic')).toBe(true);
    expect(result.current.isUnlocked('copper')).toBe(true); // 120m
    expect(result.current.isUnlocked('gold')).toBe(false); // 650m
  });
});
