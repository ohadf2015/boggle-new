// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createGameStore, type WordVaultStore } from '../state/gameStore';
import type { ClueFragment } from '../beats/types';

const STORAGE_KEY = 'word-vault:progress:v1';

beforeEach(() => {
  if (typeof localStorage !== 'undefined') localStorage.clear();
  vi.restoreAllMocks();
});

const make = (): WordVaultStore => createGameStore();

describe('gameStore — initial state', () => {
  it('starts with no rooms solved and zero coins', () => {
    const s = make().getState();
    expect(s.solvedRooms).toEqual([]);
    expect(s.memoryCoins).toBe(0);
    expect(s.hintTokens).toBe(3);
    expect(s.permanentItems).toEqual([]);
    expect(s.redeemedCousins).toEqual([]);
    expect(s.locale).toBe('he');
  });

  it('exposes default settings', () => {
    const s = make().getState();
    expect(s.reduceMotion).toBe(false);
    expect(s.largeText).toBe(false);
    expect(s.audioVolume.music).toBeGreaterThan(0);
  });
});

describe('gameStore — actions', () => {
  it('solveRoom records the room and grants coins from rewards', () => {
    const store = make();
    store.getState().solveRoom('room-1-1', { coins: 10 });
    expect(store.getState().solvedRooms).toEqual(['room-1-1']);
    expect(store.getState().memoryCoins).toBe(10);
  });

  it('solveRoom is idempotent — solving the same room twice does not double-credit', () => {
    const store = make();
    store.getState().solveRoom('room-1-1', { coins: 10 });
    store.getState().solveRoom('room-1-1', { coins: 10 });
    expect(store.getState().solvedRooms).toEqual(['room-1-1']);
    expect(store.getState().memoryCoins).toBe(10);
  });

  it('solveRoom adds permanent items without duplicates', () => {
    const store = make();
    store.getState().solveRoom('room-1-4', { coins: 30, items: ['cael-recipe-book'] });
    store.getState().solveRoom('room-1-6', { coins: 50, items: ['cinder-charm', 'cael-recipe-book'] });
    expect(store.getState().permanentItems.sort()).toEqual(['cael-recipe-book', 'cinder-charm']);
  });

  it('grantItem appends a hotspot-found item to permanentItems', () => {
    const store = make();
    expect(store.getState().permanentItems).toEqual([]);
    const granted = store.getState().grantItem('broom');
    expect(granted).toBe(true);
    expect(store.getState().permanentItems).toEqual(['broom']);
  });

  it('grantItem returns false and does not duplicate when item already owned', () => {
    const store = make();
    store.getState().grantItem('broom');
    const second = store.getState().grantItem('broom');
    expect(second).toBe(false);
    expect(store.getState().permanentItems).toEqual(['broom']);
  });

  it('grantItem persists through reload (cross-room item flow)', () => {
    const seed = make();
    seed.getState().grantItem('broom');
    const restored = make();
    expect(restored.getState().permanentItems).toContain('broom');
  });

  it('earnCoins increments the balance', () => {
    const store = make();
    store.getState().earnCoins(15);
    store.getState().earnCoins(5);
    expect(store.getState().memoryCoins).toBe(20);
  });

  it('spendHintToken returns true when tokens available, false when empty', () => {
    const store = make();
    expect(store.getState().hintTokens).toBe(3);
    expect(store.getState().spendHintToken()).toBe(true);
    expect(store.getState().spendHintToken()).toBe(true);
    expect(store.getState().spendHintToken()).toBe(true);
    expect(store.getState().spendHintToken()).toBe(false);
    expect(store.getState().hintTokens).toBe(0);
  });

  it('recordWordSpelled adds unique words only', () => {
    const store = make();
    store.getState().recordWordSpelled('אש');
    store.getState().recordWordSpelled('אש');
    store.getState().recordWordSpelled('מים');
    expect(store.getState().uniqueWordsSpelled.sort()).toEqual(['אש', 'מים']);
  });

  it('redeemCousin marks a cousin redeemed once', () => {
    const store = make();
    store.getState().redeemCousin('cinder');
    store.getState().redeemCousin('cinder');
    expect(store.getState().redeemedCousins).toEqual(['cinder']);
  });

  it('setChoice persists story-flavor choices', () => {
    const store = make();
    store.getState().setChoice('room4_burnRecipe', true);
    store.getState().setChoice('room6_finalLine', 'forgive');
    expect(store.getState().choices.room4_burnRecipe).toBe(true);
    expect(store.getState().choices.room6_finalLine).toBe('forgive');
  });
});

describe('gameStore — persistence', () => {
  it('writes through to localStorage on solveRoom', () => {
    const store = make();
    store.getState().solveRoom('room-1-1', { coins: 10 });
    const raw = localStorage.getItem(STORAGE_KEY);
    expect(raw).toBeTruthy();
    const data = JSON.parse(raw as string);
    expect(data.solvedRooms).toContain('room-1-1');
    expect(data.memoryCoins).toBe(10);
  });

  it('rehydrates from localStorage on a fresh store instance', () => {
    const seed = make();
    seed.getState().solveRoom('room-1-1', { coins: 10 });
    seed.getState().earnCoins(5);
    const restored = make();
    expect(restored.getState().memoryCoins).toBe(15);
    expect(restored.getState().solvedRooms).toContain('room-1-1');
  });

  it('startNewSession clears progress', () => {
    const store = make();
    store.getState().solveRoom('room-1-1', { coins: 10 });
    store.getState().startNewSession();
    expect(store.getState().memoryCoins).toBe(0);
    expect(store.getState().solvedRooms).toEqual([]);
  });
});

describe('gameStore notebook + beat progress', () => {
  it('addClue persists into state.notebook', () => {
    const store = createGameStore();
    const fragment: ClueFragment = { id: 'door', roomId: 'r1.1', kind: 'whisper', text: 'x' };
    store.getState().addClue('r1.1', fragment);
    expect(store.getState().notebook.byRoom['r1.1']).toHaveLength(1);
  });

  it('markBeatSolved + isBeatSolved roundtrip', () => {
    const store = createGameStore();
    expect(store.getState().isBeatSolved('r1.1', 'open-door')).toBe(false);
    store.getState().markBeatSolved('r1.1', 'open-door');
    expect(store.getState().isBeatSolved('r1.1', 'open-door')).toBe(true);
  });
});
