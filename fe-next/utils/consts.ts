/**
 * Frontend Constants
 *
 * Re-exports from shared/constants/gameConstants.ts + frontend-specific constants.
 * This file maintains backward compatibility for imports but now references
 * the single source of truth in shared/constants.
 */

import type { DifficultySettings, MinWordLengthOption } from '@/types';
import { japaneseHiragana } from '@/shared/constants/japaneseLetters';

// ==================== Re-exports from Shared Constants ====================
// Single source of truth: shared/constants/gameConstants.ts

export {
  // Difficulty settings
  DIFFICULTIES,
  DEFAULT_DIFFICULTY,
  DIFFICULTY_TIMERS,
  DEFAULT_TIMER,
  getRecommendedTimer,
  // Word length settings
  MIN_WORD_LENGTH_OPTIONS,
  DEFAULT_MIN_WORD_LENGTH,
  // Avatar constants
  AVATAR_COLORS,
  AVATAR_EMOJIS,
  AVATAR_IMAGE_IDS,
  // Color mapping
  POINT_COLORS,
} from '@/shared/constants/gameConstants';

// Type re-exports for convenience
export type {
  DifficultyConfig,
  DifficultyLevel,
  DifficultySettings as DifficultySettingsType,
} from '@/shared/constants/gameConstants';

// ==================== Frontend-Specific Constants ====================

export const hebrewLetters: string[] = [
    "א",
    "ב",
    "ג",
    "ד",
    "ה",
    "ו",
    "ז",
    "ח",
    "ט",
    "י",
    "כ",
    "ל",
    "מ",
    "נ",
    "ס",
    "ע",
    "פ",
    "צ",
    "ק",
    "ר",
    "ש",
    "ת",
  ];

export const englishLetters: string[] = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

export const swedishLetters: string[] = 'ABCDEFGHIJKLMNOPQRSTUVWXYZÅÄÖ'.split('');

// Spanish letters - standard Latin alphabet plus Ñ and accented vowels
export const spanishBaseLetters: string[] = 'ABCDEFGHIJKLMNÑOPQRSTUVWXYZ'.split('');
export const spanishAccentedLetters: string[] = ['Á', 'É', 'Í', 'Ó', 'Ú', 'Ü'];
export const spanishLetters: string[] = [...spanishBaseLetters, ...spanishAccentedLetters];

// HIRAGANA board tiles — single source of truth in shared/constants/japaneseLetters.
// Japanese gameplay is phonetic-kana, not kanji (logographs can't be a Boggle grid).
// Consumed by every frontend JA board generator (single-player, custom challenge,
// daily challenge, brain drills, adventure) so they all stay on-script with the
// hiragana validation dictionary. See docs/2026-05-21-japanese-multiplayer-gameplay-audit.md.
export const japaneseLetters: string[] = [...japaneseHiragana];

// Embeddable HIRAGANA words (export name kept for backward compatibility with the
// 5 board generators that import it). Previously kanji compounds — replaced with
// common hiragana words so embedding stays on-script with the hiragana grid +
// validation dictionary. Short, common words likely present in japanese_words.txt
// so they are findable when planted. See docs/2026-05-21-japanese-multiplayer-gameplay-audit.md.
export const kanjiCompounds: string[] = [
  // 2-kana
  "ねこ", "いぬ", "はな", "そら", "うみ", "やま", "かわ", "つき", "ほし", "みず",
  "ひと", "とり", "あさ", "よる", "ひる", "あめ", "ゆき", "かぜ", "いし", "こえ",
  "くち", "あし", "みみ", "ほん", "みち", "ゆめ", "なつ", "ふゆ", "はる", "あき",
  // 3-kana
  "ことば", "さかな", "くるま", "さくら", "あかり", "こども", "おかね", "でんわ",
  "てがみ", "たまご", "やさい", "くだもの", "ひかり", "こころ", "ちから",
  // 4-kana
  "がっこう", "でんしゃ", "ともだち", "せんせい", "たべもの", "こうえん", "きょうしつ",
];

// Adaptive deadzone threshold for directional locking
// IMPROVED: Smaller thresholds for more responsive swipe detection
// Deadzones prevent accidental selections but should be small enough
// to not delay intentional swipes during onboarding/gameplay
export const getDeadzoneThreshold = (): number => {
  if (typeof window === 'undefined') return 8;
  const screenWidth = window.innerWidth;
  if (screenWidth < 375) return 10;  // Small phones (iPhone SE) - was 14
  if (screenWidth < 414) return 8;   // Regular phones - was 12
  if (screenWidth < 768) return 6;   // Large phones - was 10
  return 5;                          // Tablets and desktop - was 8
};

// ==================== Combo System ====================

// Time in ms to maintain combo between words (8 seconds)
export const COMBO_TIMEOUT_MS = 8000;

// Number of valid words needed to earn a combo shield
export const COMBO_SHIELD_INTERVAL = 10;

// ==================== Validation Limits ====================

// Username constraints
export const USERNAME_MIN_LENGTH = 2;
export const USERNAME_MAX_LENGTH = 20;

// Room name constraints
export const ROOM_NAME_MIN_LENGTH = 2;
export const ROOM_NAME_MAX_LENGTH = 30;

// Game code constraints
export const GAME_CODE_MIN_LENGTH = 6;
export const GAME_CODE_MAX_LENGTH = 10;

// Word constraints
export const WORD_MIN_LENGTH = 2;
export const WORD_MAX_LENGTH = 20;

// Password constraints
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;

// Email validation pattern
// Matches standard email format: local@domain.tld (TLD must be 2+ chars per ICANN rules)
export const EMAIL_VALID_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const EMAIL_MAX_LENGTH = 254; // RFC 5321
export const EMAIL_LOCAL_MAX_LENGTH = 64; // RFC 5321

// Password must contain at least one uppercase, one lowercase, one number
export const PASSWORD_STRENGTH_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/;

// Pattern for valid username/room name characters
// Uses Unicode property escapes to allow any letter or number from any language, plus spaces and ._-
export const NAME_VALID_PATTERN = /^[\p{L}\p{N}\s._-]+$/u;

/**
 * Sanitize a string to only contain valid room name characters
 * Removes any characters that don't match the backend validation pattern
 * Backend allows: a-zA-Z0-9, spaces, dots, underscores, hyphens, and specific Unicode ranges
 * (Hebrew: \u0590-\u05FF, Hiragana: \u3040-\u309F, Katakana: \u30A0-\u30FF, CJK: \u4E00-\u9FFF)
 * This ensures room names are compatible with backend validation
 */
export function sanitizeRoomName(name: string): string {
  if (!name) return '';
  // Remove any characters not in the backend-allowed set
  // Keep: a-zA-Z0-9, spaces, dots, underscores, hyphens, and specific Unicode ranges
  return name.replace(/[^a-zA-Z0-9\s._\-\u0590-\u05FF\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]/g, '').trim();
}
