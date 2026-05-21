/**
 * Shiritori (しりとり) Multiplayer Constants
 * Shared tuning knobs for the JA-native word-chain mode.
 * Spec: docs/2026-05-21-shiritori-mode-spec.md.
 */

/** Per-turn thinking time in ms. Running out eliminates the current player. */
export const SHIRITORI_TURN_MS = 15_000;

/** Minimum word length (kana). Shiritori words are short; 2 is the floor. */
export const SHIRITORI_MIN_WORD_LEN = 2;
