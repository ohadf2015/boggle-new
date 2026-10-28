import { describe, expect, it } from 'vitest';
import {
  FIRST_GAME_BRIDGE_KEY,
  FIRST_GAME_BRIDGE_TREATMENT,
  bridgeDestination,
  isFirstSessionCompleter,
  nextGamePickedPayload,
  quickMatchHref,
  shouldShowFirstGameBridge,
  wordWheelBridgeHref,
  wordWheelBridgeSkipsReady,
} from '../firstGameBridge';

describe('first-game bridge', () => {
  it('treats 0 or 1 completed games as the first session, and nothing after', () => {
    expect(isFirstSessionCompleter(0)).toBe(true);
    expect(isFirstSessionCompleter(1)).toBe(true);
    expect(isFirstSessionCompleter(2)).toBe(false);
  });

  it('sends a solo finisher to quick play with no setup dialog', () => {
    expect(quickMatchHref('he')).toBe('/he/multiplayer?quickPlay=true');
    expect(bridgeDestination('singleplayer', 'he')).toEqual({
      href: '/he/multiplayer?quickPlay=true',
      fromMode: 'singleplayer',
      toMode: 'classic-mp',
      labelKey: 'results.firstGameBridge.quickMatch',
    });
  });

  it('sends a classic MP finisher to today\'s Word Wheel, skipping the ready card', () => {
    expect(wordWheelBridgeHref('es')).toBe('/es/daily/word-wheel?start=1');
    expect(bridgeDestination('classic-mp', 'es').toMode).toBe('word-wheel');
    expect(bridgeDestination('classic-mp', '') .href).toBe('/en/daily/word-wheel?start=1');
  });

  it('shows the CTA only for a first-session treatment, never classroom or a non-classic mode', () => {
    const base = { gamesCompleted: 1, variant: FIRST_GAME_BRIDGE_TREATMENT };
    expect(shouldShowFirstGameBridge(base)).toBe(true);
    expect(shouldShowFirstGameBridge({ ...base, variant: 'control' })).toBe(false);
    expect(shouldShowFirstGameBridge({ ...base, variant: null })).toBe(false);
    expect(shouldShowFirstGameBridge({ ...base, gamesCompleted: 4 })).toBe(false);
    expect(shouldShowFirstGameBridge({ ...base, classroom: true })).toBe(false);
    expect(shouldShowFirstGameBridge({ ...base, classicMp: false })).toBe(false);
  });

  it('emits a join-free payload: from_mode, to_mode, first_session', () => {
    expect(nextGamePickedPayload('singleplayer')).toEqual({
      from_mode: 'singleplayer',
      to_mode: 'classic-mp',
      first_session: true,
      experiment: FIRST_GAME_BRIDGE_KEY,
      variant: FIRST_GAME_BRIDGE_TREATMENT,
    });
    expect(nextGamePickedPayload('classic-mp')).toMatchObject({
      from_mode: 'classic-mp',
      to_mode: 'word-wheel',
      first_session: true,
    });
  });

  it('skips the Word Wheel ready card for the bridge and for returning players, not for practice or catch-up', () => {
    expect(wordWheelBridgeSkipsReady({ startParam: true, hasEverPlayed: false, isCatchup: false, isPractice: false })).toBe(true);
    expect(wordWheelBridgeSkipsReady({ startParam: false, hasEverPlayed: true, isCatchup: false, isPractice: false })).toBe(true);
    expect(wordWheelBridgeSkipsReady({ startParam: false, hasEverPlayed: false, isCatchup: false, isPractice: false })).toBe(false);
    expect(wordWheelBridgeSkipsReady({ startParam: true, hasEverPlayed: false, isCatchup: true, isPractice: false })).toBe(false);
    expect(wordWheelBridgeSkipsReady({ startParam: true, hasEverPlayed: false, isCatchup: false, isPractice: true })).toBe(false);
  });
});
