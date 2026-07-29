/**
 * Haptic Feedback Utilities
 * Centralized haptic patterns for grid interactions.
 *
 * Dual-dispatch:
 * - Native (iOS/Android via Capacitor): routes through HapticsManager →
 *   Taptic Engine (iOS) / VibrationEffect (Android). The Web Vibration API
 *   is ignored by WKWebView, so without this path iOS feels nothing.
 * - Web: keeps original navigator.vibrate(arrayPattern) for full pattern
 *   fidelity on Android Chrome and other browsers that honor the API.
 */

import { isNative } from '@/utils/platform';
import { haptics } from '@/utils/haptics/HapticsManager';
import { HapticPattern, HapticIntensity } from '@/utils/haptics/types';

const PATTERNS: Record<string, number | number[]> = {
  fireCombo7Plus: [100, 50, 100, 50, 100, 50, 150],
  fireCombo5Plus: [80, 40, 80, 40, 120],
  fireCombo3Plus: [60, 40, 60, 40, 100],
  fireCombo1Plus: [50, 30, 50, 30, 80],
  fireLongWord: [40, 30, 60],
  fireShortWord: 50,

  normalCombo7Plus: [30, 20, 30],
  normalCombo5Plus: [25, 15, 25],
  normalCombo3Plus: [20, 10, 20],
  normalCombo1Plus: [15, 10, 15],
  normalLongWord: 20,
  normalShortWord: 15,

  blastBomb: [80, 30, 80, 30, 120],
  blastLightning: [40, 20, 60, 20, 40],
  blastPrism: [100, 40, 100, 40, 150],
  blastCascade: [30, 20, 30, 20, 50],

  cellTapFire: 30,
  cellTapNormal: 22,
  cellDragFire: 18,
  cellDragNormal: 14,
  backtrackFire: 8,
  backtrackNormal: 3,
  undoFire: 15,
  undoNormal: 5,
  navigation: 10,
  clickSelect: 12,

  wordAccepted: [20, 10, 30],
  wordRejected: [40, 20, 40],
};

type NativeFeel =
  | { kind: 'impact'; intensity: HapticIntensity }
  | { kind: 'notify'; pattern: HapticPattern }
  | { kind: 'selection' };

const I_LIGHT: NativeFeel = { kind: 'impact', intensity: HapticIntensity.LIGHT };
const I_MEDIUM: NativeFeel = { kind: 'impact', intensity: HapticIntensity.MEDIUM };
const I_HEAVY: NativeFeel = { kind: 'impact', intensity: HapticIntensity.HEAVY };
const N_SUCCESS: NativeFeel = { kind: 'notify', pattern: HapticPattern.SUCCESS };
const N_ERROR: NativeFeel = { kind: 'notify', pattern: HapticPattern.ERROR };
const SEL: NativeFeel = { kind: 'selection' };

function dispatchNative(feel: NativeFeel): void {
  switch (feel.kind) {
    case 'impact':
      void haptics.triggerCustom({ duration: 0, intensity: feel.intensity });
      return;
    case 'notify':
      void haptics.trigger(feel.pattern);
      return;
    case 'selection':
      void haptics.trigger(HapticPattern.SELECTION);
      return;
  }
}

function vibrate(webPattern: number | number[], native: NativeFeel): void {
  if (!haptics.isEnabled()) return;
  if (isNative()) {
    dispatchNative(native);
    return;
  }
  if (typeof window !== 'undefined' && window.navigator?.vibrate) {
    window.navigator.vibrate(webPattern);
  }
}

export function vibrateWordSubmit(
  wordLength: number,
  comboLevel: number,
  fireRoundActive: boolean
): void {
  if (fireRoundActive) {
    if (comboLevel >= 7) {
      vibrate(PATTERNS.fireCombo7Plus, N_SUCCESS);
    } else if (comboLevel >= 5) {
      vibrate(PATTERNS.fireCombo5Plus, N_SUCCESS);
    } else if (comboLevel >= 3) {
      vibrate(PATTERNS.fireCombo3Plus, I_HEAVY);
    } else if (comboLevel >= 1) {
      vibrate(PATTERNS.fireCombo1Plus, I_MEDIUM);
    } else if (wordLength >= 6) {
      vibrate(PATTERNS.fireLongWord, I_HEAVY);
    } else {
      vibrate(PATTERNS.fireShortWord, I_MEDIUM);
    }
  } else {
    if (comboLevel >= 7) {
      vibrate(PATTERNS.normalCombo7Plus, I_HEAVY);
    } else if (comboLevel >= 5) {
      vibrate(PATTERNS.normalCombo5Plus, I_MEDIUM);
    } else if (comboLevel >= 3) {
      vibrate(PATTERNS.normalCombo3Plus, I_MEDIUM);
    } else if (comboLevel >= 1) {
      vibrate(PATTERNS.normalCombo1Plus, I_LIGHT);
    } else if (wordLength >= 6) {
      vibrate(PATTERNS.normalLongWord, I_MEDIUM);
    } else {
      vibrate(PATTERNS.normalShortWord, I_LIGHT);
    }
  }
}

export function vibrateCellTap(fireRoundActive: boolean): void {
  vibrate(
    fireRoundActive ? PATTERNS.cellTapFire : PATTERNS.cellTapNormal,
    fireRoundActive ? I_MEDIUM : I_LIGHT
  );
}

export function vibrateCellDrag(fireRoundActive: boolean, tier = 0): void {
  if (tier >= 3) {
    vibrate(fireRoundActive ? [25, 10, 30] : [18, 10, 22], fireRoundActive ? I_HEAVY : I_MEDIUM);
  } else if (tier >= 2) {
    vibrate(fireRoundActive ? [18, 10, 18] : [14, 8, 14], fireRoundActive ? I_MEDIUM : I_LIGHT);
  } else if (tier >= 1) {
    vibrate(fireRoundActive ? PATTERNS.cellDragFire : 12, fireRoundActive ? I_LIGHT : SEL);
  } else {
    vibrate(
      fireRoundActive ? PATTERNS.cellDragFire : PATTERNS.cellDragNormal,
      fireRoundActive ? I_LIGHT : SEL
    );
  }
}

export function vibrateTierTransition(newTier: number): void {
  if (newTier >= 3) {
    vibrate([40, 15, 35, 15, 50], N_SUCCESS);
  } else if (newTier >= 2) {
    vibrate([30, 15, 35], I_HEAVY);
  } else if (newTier >= 1) {
    vibrate(22, I_MEDIUM);
  }
  // tier 0 — no feedback (avoids double-firing on initial selection)
}

export function vibrateBacktrack(fireRoundActive: boolean): void {
  vibrate(
    fireRoundActive ? PATTERNS.backtrackFire : PATTERNS.backtrackNormal,
    fireRoundActive ? I_LIGHT : SEL
  );
}

export function vibrateUndo(fireRoundActive: boolean): void {
  vibrate(
    fireRoundActive ? PATTERNS.undoFire : PATTERNS.undoNormal,
    fireRoundActive ? I_MEDIUM : I_LIGHT
  );
}

export function vibrateNavigation(): void {
  vibrate(PATTERNS.navigation, SEL);
}

export function vibrateClickSelect(): void {
  vibrate(PATTERNS.clickSelect, I_LIGHT);
}

export function vibrateKeyboardSelect(fireRoundActive: boolean): void {
  vibrate(fireRoundActive ? 20 : 8, fireRoundActive ? I_MEDIUM : I_LIGHT);
}

export function vibrateBlastBomb(): void {
  vibrate(PATTERNS.blastBomb, I_HEAVY);
}

export function vibrateBlastLightning(): void {
  vibrate(PATTERNS.blastLightning, I_MEDIUM);
}

export function vibrateBlastPrism(): void {
  vibrate(PATTERNS.blastPrism, N_SUCCESS);
}

export function vibrateBlastCascade(): void {
  vibrate(PATTERNS.blastCascade, SEL);
}

export function vibrateWordAccepted(): void {
  vibrate(PATTERNS.wordAccepted, N_SUCCESS);
}

export function vibrateWordRejected(): void {
  vibrate(PATTERNS.wordRejected, N_ERROR);
}
