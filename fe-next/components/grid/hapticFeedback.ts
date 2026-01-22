/**
 * Haptic Feedback Utilities
 * Centralized haptic vibration patterns for grid interactions.
 * Extracted from useGridInteraction to eliminate duplication.
 */

/**
 * Vibration patterns for different game scenarios
 */
const PATTERNS: Record<string, number | number[]> = {
  // Fire round patterns (full intensity)
  fireCombo7Plus: [100, 50, 100, 50, 100, 50, 150],
  fireCombo5Plus: [80, 40, 80, 40, 120],
  fireCombo3Plus: [60, 40, 60, 40, 100],
  fireCombo1Plus: [50, 30, 50, 30, 80],
  fireLongWord: [40, 30, 60],
  fireShortWord: 50,

  // Normal patterns (reduced intensity)
  normalCombo7Plus: [30, 20, 30],
  normalCombo5Plus: [25, 15, 25],
  normalCombo3Plus: [20, 10, 20],
  normalCombo1Plus: [15, 10, 15],
  normalLongWord: 20,
  normalShortWord: 15,

  // Interaction feedback
  cellTapFire: 18,
  cellTapNormal: 12,
  cellDragFire: 12,
  cellDragNormal: 8,
  backtrackFire: 8,
  backtrackNormal: 3,
  undoFire: 15,
  undoNormal: 5,
  navigation: 10,
  clickSelect: 10,
};

/**
 * Safely trigger vibration if available
 */
function vibrate(pattern: number | number[]): void {
  if (window.navigator?.vibrate) {
    window.navigator.vibrate(pattern);
  }
}

/**
 * Haptic feedback for word submission based on combo level and fire round status
 */
export function vibrateWordSubmit(
  wordLength: number,
  comboLevel: number,
  fireRoundActive: boolean
): void {
  if (fireRoundActive) {
    if (comboLevel >= 7) {
      vibrate(PATTERNS.fireCombo7Plus);
    } else if (comboLevel >= 5) {
      vibrate(PATTERNS.fireCombo5Plus);
    } else if (comboLevel >= 3) {
      vibrate(PATTERNS.fireCombo3Plus);
    } else if (comboLevel >= 1) {
      vibrate(PATTERNS.fireCombo1Plus);
    } else if (wordLength >= 6) {
      vibrate(PATTERNS.fireLongWord);
    } else if (wordLength >= 3) {
      vibrate(PATTERNS.fireShortWord);
    }
  } else {
    if (comboLevel >= 7) {
      vibrate(PATTERNS.normalCombo7Plus);
    } else if (comboLevel >= 5) {
      vibrate(PATTERNS.normalCombo5Plus);
    } else if (comboLevel >= 3) {
      vibrate(PATTERNS.normalCombo3Plus);
    } else if (comboLevel >= 1) {
      vibrate(PATTERNS.normalCombo1Plus);
    } else if (wordLength >= 6) {
      vibrate(PATTERNS.normalLongWord);
    } else if (wordLength >= 3) {
      vibrate(PATTERNS.normalShortWord);
    }
  }
}

/**
 * Haptic feedback for initial cell selection (touch start)
 */
export function vibrateCellTap(fireRoundActive: boolean): void {
  vibrate(fireRoundActive ? PATTERNS.cellTapFire : PATTERNS.cellTapNormal);
}

/**
 * Haptic feedback during cell drag selection
 */
export function vibrateCellDrag(fireRoundActive: boolean): void {
  vibrate(fireRoundActive ? PATTERNS.cellDragFire : PATTERNS.cellDragNormal);
}

/**
 * Haptic feedback for backtracking (deselecting cells)
 */
export function vibrateBacktrack(fireRoundActive: boolean): void {
  vibrate(fireRoundActive ? PATTERNS.backtrackFire : PATTERNS.backtrackNormal);
}

/**
 * Haptic feedback for undo action
 */
export function vibrateUndo(fireRoundActive: boolean): void {
  vibrate(fireRoundActive ? PATTERNS.undoFire : PATTERNS.undoNormal);
}

/**
 * Haptic feedback for keyboard navigation
 */
export function vibrateNavigation(): void {
  vibrate(PATTERNS.navigation);
}

/**
 * Haptic feedback for click-to-select mode
 */
export function vibrateClickSelect(): void {
  vibrate(PATTERNS.clickSelect);
}

/**
 * Haptic feedback for keyboard word building
 */
export function vibrateKeyboardSelect(fireRoundActive: boolean): void {
  vibrate(fireRoundActive ? 20 : 8);
}
