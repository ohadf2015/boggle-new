/**
 * Daily Challenge Utilities
 *
 * Provides deterministic grid generation for daily challenges.
 * Same date + language = same puzzle for all users worldwide.
 */

import { hebrewLetters, swedishLetters, spanishLetters, japaneseLetters, kanjiCompounds, DIFFICULTIES, DEFAULT_DIFFICULTY } from './consts';
import type { Language, LetterGrid } from '@/types';

// ==========================================
// Constants
// ==========================================

// Epoch date for puzzle numbering (first daily challenge)
// Puzzle #1 = 2024-01-01
const DAILY_CHALLENGE_EPOCH = new Date('2024-01-01T00:00:00Z');

// Salt for seeding (prevents reverse-engineering grids)
const SEED_SALT = 'lexiclash-daily-v1';

// Default game duration for daily challenge (in seconds)
export const DAILY_CHALLENGE_DURATION = 120;

// ==========================================
// Seeded PRNG (Mulberry32)
// ==========================================

/**
 * Mulberry32 PRNG - simple, fast, and deterministic
 * Given the same seed, produces the same sequence of random numbers
 */
function mulberry32(seed: number): () => number {
  return function() {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

/**
 * Simple string hash function (djb2)
 */
function hashString(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i);
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

// ==========================================
// Date Utilities
// ==========================================

/**
 * Get today's date in UTC as YYYY-MM-DD string
 * Daily challenges reset at midnight UTC for all users globally
 */
export function getDailyChallengeDate(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Get a specific date's string representation
 */
export function formatDateForDaily(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Calculate the puzzle number for a given date
 * Returns days since epoch + 1 (so puzzle #1 is 2024-01-01)
 */
export function getPuzzleNumber(dateString?: string): number {
  const date = dateString ? new Date(dateString + 'T00:00:00Z') : new Date();
  const daysSinceEpoch = Math.floor((date.getTime() - DAILY_CHALLENGE_EPOCH.getTime()) / (24 * 60 * 60 * 1000));
  return daysSinceEpoch + 1;
}

/**
 * Get the date string for a given puzzle number
 */
export function getDateForPuzzleNumber(puzzleNumber: number): string {
  const date = new Date(DAILY_CHALLENGE_EPOCH.getTime() + (puzzleNumber - 1) * 24 * 60 * 60 * 1000);
  return date.toISOString().split('T')[0];
}

/**
 * Get seconds until the next daily challenge resets (midnight UTC)
 */
export function getSecondsUntilNextDaily(): number {
  const now = new Date();
  const tomorrow = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + 1,
    0, 0, 0, 0
  ));
  return Math.floor((tomorrow.getTime() - now.getTime()) / 1000);
}

/**
 * Format countdown as HH:MM:SS
 */
export function formatCountdown(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// ==========================================
// Seeded Grid Generation
// ==========================================

/**
 * Generate a deterministic grid for a daily challenge
 * Same date + language = same grid for everyone
 */
export function generateDailyGrid(
  dateString: string,
  language: Language,
  rows: number | null = null,
  cols: number | null = null
): LetterGrid {
  // Create seed from date + language + salt
  const seedString = `${SEED_SALT}-${dateString}-${language}`;
  const seed = hashString(seedString);
  const random = mulberry32(seed);

  // Use default difficulty if no rows/cols specified
  if (rows === null || cols === null) {
    rows = DIFFICULTIES[DEFAULT_DIFFICULTY].rows;
    cols = DIFFICULTIES[DEFAULT_DIFFICULTY].cols;
  }

  // Get letters for the language
  let letters: string[] | string;

  if (language === 'en') {
    letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  } else if (language === 'sv') {
    letters = swedishLetters;
  } else if (language === 'es') {
    letters = spanishLetters;
  } else if (language === 'ja') {
    return generateSeededJapaneseGrid(random, rows, cols);
  } else {
    letters = hebrewLetters;
  }

  // Generate grid with seeded random
  const lettersArray = typeof letters === 'string' ? letters.split('') : letters;
  const grid: string[][] = [];

  for (let i = 0; i < rows; i++) {
    const row: string[] = [];
    for (let j = 0; j < cols; j++) {
      const randomIndex = Math.floor(random() * lettersArray.length);
      row.push(lettersArray[randomIndex]);
    }
    grid.push(row);
  }

  return grid;
}

/**
 * Generate a seeded Japanese grid with embedded kanji compounds
 */
function generateSeededJapaneseGrid(
  random: () => number,
  rows: number,
  cols: number
): LetterGrid {
  const grid: (string | null)[][] = Array(rows).fill(null).map(() => Array(cols).fill(null));
  const usedCells = new Set<string>();

  const totalCells = rows * cols;
  const targetCompounds = Math.floor(totalCells / 5);

  // Shuffle compounds using seeded random
  const shuffledCompounds = [...kanjiCompounds].sort(() => random() - 0.5);
  const twoCharCompounds = shuffledCompounds.filter(w => w.length === 2);
  const threeCharCompounds = shuffledCompounds.filter(w => w.length === 3);

  let embeddedCount = 0;

  // Embed 3-character compounds first
  for (const compound of threeCharCompounds) {
    if (embeddedCount >= Math.floor(targetCompounds * 0.2)) break;
    if (tryEmbedCompoundSeeded(grid, compound, rows, cols, usedCells, random)) {
      embeddedCount++;
    }
  }

  // Then 2-character compounds
  for (const compound of twoCharCompounds) {
    if (embeddedCount >= targetCompounds) break;
    if (tryEmbedCompoundSeeded(grid, compound, rows, cols, usedCells, random)) {
      embeddedCount++;
    }
  }

  // Fill remaining with random kanji
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      if (grid[i][j] === null) {
        const randomIndex = Math.floor(random() * japaneseLetters.length);
        grid[i][j] = japaneseLetters[randomIndex];
      }
    }
  }

  return grid as LetterGrid;
}

/**
 * Try to embed a compound using seeded random
 */
function tryEmbedCompoundSeeded(
  grid: (string | null)[][],
  compound: string,
  rows: number,
  cols: number,
  usedCells: Set<string>,
  random: () => number
): boolean {
  const wordLen = compound.length;
  const directions = [
    { dr: 0, dc: 1 },
    { dr: 0, dc: -1 },
    { dr: 1, dc: 0 },
    { dr: -1, dc: 0 },
    { dr: 1, dc: 1 },
    { dr: 1, dc: -1 },
    { dr: -1, dc: -1 },
    { dr: -1, dc: 1 },
  ];

  const shuffledDirs = [...directions].sort(() => random() - 0.5);

  const attempts = 50;
  for (let attempt = 0; attempt < attempts; attempt++) {
    const startRow = Math.floor(random() * rows);
    const startCol = Math.floor(random() * cols);

    for (const dir of shuffledDirs) {
      const endRow = startRow + (wordLen - 1) * dir.dr;
      const endCol = startCol + (wordLen - 1) * dir.dc;

      if (endRow < 0 || endRow >= rows || endCol < 0 || endCol >= cols) {
        continue;
      }

      let canPlace = true;
      const cellsToUse: Array<{ r: number; c: number; char: string }> = [];

      for (let i = 0; i < wordLen; i++) {
        const r = startRow + i * dir.dr;
        const c = startCol + i * dir.dc;

        if (grid[r][c] !== null && grid[r][c] !== compound[i]) {
          canPlace = false;
          break;
        }

        cellsToUse.push({ r, c, char: compound[i] });
      }

      if (canPlace) {
        for (const cell of cellsToUse) {
          grid[cell.r][cell.c] = cell.char;
          usedCells.add(`${cell.r},${cell.c}`);
        }
        return true;
      }
    }
  }

  return false;
}

// ==========================================
// Shareable Results Generation
// ==========================================

export interface DailyChallengeResult {
  puzzleNumber: number;
  puzzleDate: string;
  score: number;
  wordCount: number;
  wordsByLength: Record<number, number>; // { 3: 2, 4: 5, ... }
  timeSeconds: number;
  streakDays: number;
  language: Language;
}

/**
 * Color emoji for each word length - representing word value/difficulty
 */
const LENGTH_EMOJI: Record<number, string> = {
  2: '⬜',  // 2-letter (rare/bonus)
  3: '🟨',  // Yellow - common
  4: '🟩',  // Green - good
  5: '🟦',  // Blue - great
  6: '🟪',  // Purple - excellent
  7: '🔶',  // Orange - amazing
  8: '🔶',  // Orange (same for 8+)
};

/**
 * Get emoji for a word length
 */
function getWordLengthEmoji(length: number): string {
  if (length >= 7) return LENGTH_EMOJI[7];
  return LENGTH_EMOJI[length] || LENGTH_EMOJI[3];
}

/**
 * Generate a shareable result string (Wordle-style)
 * Shows word length distribution as a visual bar chart
 */
export function generateShareableResult(result: DailyChallengeResult, siteUrl?: string): string {
  // Build word length distribution display
  // Group by length and show as horizontal bars
  const sortedLengths = Object.entries(result.wordsByLength)
    .sort(([a], [b]) => Number(a) - Number(b));

  // Create visual bar for each word length
  const wordBars = sortedLengths
    .map(([len, count]) => {
      const emoji = getWordLengthEmoji(Number(len));
      const bar = emoji.repeat(Math.min(count, 8)); // Cap at 8 for visual clarity
      const overflow = count > 8 ? `+${count - 8}` : '';
      return `${len}⃣ ${bar}${overflow}`;
    })
    .join('\n');

  // Format streak if > 1
  const streakText = result.streakDays > 1 ? `🔥 ${result.streakDays} day streak!\n` : '';

  // Build URL with current origin and language
  let dailyUrl = 'lexiclash.live/daily';
  if (typeof window !== 'undefined') {
    const origin = window.location.origin;
    const language = result.language;
    dailyUrl = `${origin}/${language}/daily`;
  } else if (siteUrl) {
    dailyUrl = `${siteUrl}/${result.language}/daily`;
  }

  // Build the shareable text
  return `🎯 LexiClash Daily #${result.puzzleNumber}

${wordBars}

📊 ${result.score} pts | ${result.wordCount} words
${streakText}
${dailyUrl}`;
}

/**
 * Generate share text for different platforms
 */
export function getShareTextForPlatform(
  result: DailyChallengeResult,
  platform: 'whatsapp' | 'twitter' | 'telegram' | 'copy',
  siteUrl = 'lexiclash.live'
): string {
  const baseText = generateShareableResult(result, siteUrl);

  // Platform-specific tweaks
  switch (platform) {
    case 'twitter':
      // Twitter has character limits, keep it concise
      return baseText;
    case 'whatsapp':
    case 'telegram':
      // Add a bit more context for messaging apps
      return `${baseText}\n\nCan you beat my score?`;
    case 'copy':
    default:
      return baseText;
  }
}

// ==========================================
// Local Storage Utilities
// ==========================================

const DAILY_STORAGE_KEY = 'lexiclash_daily';

export interface StoredDailyResult {
  date: string;
  puzzleNumber: number;
  result: DailyChallengeResult;
  completedAt: string;
}

/**
 * Check if user has already played today's daily challenge
 */
export function hasPlayedToday(language: Language): boolean {
  if (typeof window === 'undefined') return false;

  const today = getDailyChallengeDate();
  const key = `${DAILY_STORAGE_KEY}_${language}_${today}`;
  return localStorage.getItem(key) !== null;
}

/**
 * Get the stored result for today's daily (if exists)
 */
export function getTodaysResult(language: Language): StoredDailyResult | null {
  if (typeof window === 'undefined') return null;

  const today = getDailyChallengeDate();
  const key = `${DAILY_STORAGE_KEY}_${language}_${today}`;
  const stored = localStorage.getItem(key);

  if (!stored) return null;

  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

/**
 * Save the result of today's daily challenge
 */
export function saveDailyResult(result: DailyChallengeResult): void {
  if (typeof window === 'undefined') return;

  const today = getDailyChallengeDate();
  const key = `${DAILY_STORAGE_KEY}_${result.language}_${today}`;

  const storedResult: StoredDailyResult = {
    date: today,
    puzzleNumber: result.puzzleNumber,
    result,
    completedAt: new Date().toISOString(),
  };

  localStorage.setItem(key, JSON.stringify(storedResult));
}

/**
 * Get all stored daily results (for history)
 */
export function getAllDailyResults(language: Language): StoredDailyResult[] {
  if (typeof window === 'undefined') return [];

  const results: StoredDailyResult[] = [];
  const prefix = `${DAILY_STORAGE_KEY}_${language}_`;

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(prefix)) {
      const stored = localStorage.getItem(key);
      if (stored) {
        try {
          results.push(JSON.parse(stored));
        } catch {
          // Skip invalid entries
        }
      }
    }
  }

  // Sort by date descending
  return results.sort((a, b) => b.date.localeCompare(a.date));
}

// ==========================================
// Daily Streak Utilities
// ==========================================

const DAILY_STREAK_KEY = 'lexiclash_daily_streak';

export interface DailyStreak {
  currentStreak: number;
  longestStreak: number;
  lastPlayedDate: string | null;
  totalDailiesCompleted: number;
}

/**
 * Get the current daily streak
 */
export function getDailyStreak(): DailyStreak {
  if (typeof window === 'undefined') {
    return { currentStreak: 0, longestStreak: 0, lastPlayedDate: null, totalDailiesCompleted: 0 };
  }

  const stored = localStorage.getItem(DAILY_STREAK_KEY);
  if (!stored) {
    return { currentStreak: 0, longestStreak: 0, lastPlayedDate: null, totalDailiesCompleted: 0 };
  }

  try {
    return JSON.parse(stored);
  } catch {
    return { currentStreak: 0, longestStreak: 0, lastPlayedDate: null, totalDailiesCompleted: 0 };
  }
}

/**
 * Update the daily streak after completing a daily challenge
 */
export function updateDailyStreak(): DailyStreak {
  if (typeof window === 'undefined') {
    return { currentStreak: 0, longestStreak: 0, lastPlayedDate: null, totalDailiesCompleted: 0 };
  }

  const today = getDailyChallengeDate();
  const yesterday = getYesterdayDate();
  const current = getDailyStreak();

  // Already played today - no update needed
  if (current.lastPlayedDate === today) {
    return current;
  }

  let newStreak: number;

  if (current.lastPlayedDate === yesterday) {
    // Continue the streak
    newStreak = current.currentStreak + 1;
  } else {
    // Streak broken (or first time)
    newStreak = 1;
  }

  const updated: DailyStreak = {
    currentStreak: newStreak,
    longestStreak: Math.max(newStreak, current.longestStreak),
    lastPlayedDate: today,
    totalDailiesCompleted: current.totalDailiesCompleted + 1,
  };

  localStorage.setItem(DAILY_STREAK_KEY, JSON.stringify(updated));

  return updated;
}

/**
 * Get yesterday's date string
 */
function getYesterdayDate(): string {
  const yesterday = new Date();
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  return yesterday.toISOString().split('T')[0];
}

/**
 * Check if this streak update hits a milestone
 */
export function getStreakMilestone(streak: number): number | null {
  const milestones = [7, 14, 30, 50, 100, 365];
  return milestones.find(m => m === streak) || null;
}

// ==========================================
// Guest Player Info (for daily leaderboard display)
// ==========================================

const GUEST_DAILY_PLAYER_KEY = 'lexiclash_guest_daily_player';

export interface GuestDailyPlayer {
  displayName: string;
  avatarEmoji: string;
  avatarColor: string;
}

/**
 * Get or generate guest daily player info
 * This is stored in localStorage so the same guest always appears with the same name/avatar
 */
export async function getGuestDailyPlayer(): Promise<GuestDailyPlayer> {
  if (typeof window === 'undefined') {
    return { displayName: 'Guest', avatarEmoji: '🎯', avatarColor: '#6366f1' };
  }

  // Check if we already have stored guest player info
  const stored = localStorage.getItem(GUEST_DAILY_PLAYER_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      // Continue to generate new
    }
  }

  // Generate new guest player info
  try {
    const response = await fetch('/api/random-name?language=en', {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    if (response.ok) {
      const data = await response.json();
      const guestPlayer: GuestDailyPlayer = {
        displayName: data.name,
        avatarEmoji: data.avatar.emoji,
        avatarColor: data.avatar.color,
      };
      localStorage.setItem(GUEST_DAILY_PLAYER_KEY, JSON.stringify(guestPlayer));
      return guestPlayer;
    }
  } catch {
    // Fall through to default
  }

  // Fallback
  const fallback: GuestDailyPlayer = {
    displayName: 'Player ' + Math.floor(Math.random() * 1000),
    avatarEmoji: '🎯',
    avatarColor: '#6366f1',
  };
  localStorage.setItem(GUEST_DAILY_PLAYER_KEY, JSON.stringify(fallback));
  return fallback;
}

// ==========================================
// Browser Fingerprint (for guest tracking)
// ==========================================

/**
 * Generate a simple browser fingerprint for guest tracking
 * This is NOT for security - just to identify repeat guest plays
 */
export async function getGuestFingerprint(): Promise<string> {
  if (typeof window === 'undefined') return '';

  const components = [
    navigator.userAgent,
    navigator.language,
    screen.width.toString(),
    screen.height.toString(),
    screen.colorDepth.toString(),
    new Date().getTimezoneOffset().toString(),
    navigator.hardwareConcurrency?.toString() || '',
    // Canvas fingerprint (simple version)
    await getCanvasFingerprint(),
  ];

  const fingerprint = components.filter(Boolean).join('|');
  return hashString(fingerprint).toString(36);
}

/**
 * Simple canvas fingerprint
 */
async function getCanvasFingerprint(): Promise<string> {
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillText('LexiClash Daily', 2, 2);

    return canvas.toDataURL().slice(-50);
  } catch {
    return '';
  }
}
