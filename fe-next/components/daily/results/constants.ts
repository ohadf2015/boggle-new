/**
 * Daily Word Hunt Results Constants
 */

import type { Language } from '@/types';
import type { LanguageOption } from './types';

/**
 * Confetti colors for each rank (matching Top3Leaderboard)
 */
export const RANK_CONFETTI_COLORS: Record<number, string[]> = {
  1: ['#ffd700', '#ffed4a', '#f59e0b', '#fbbf24'], // Gold
  2: ['#c0c0c0', '#94a3b8', '#e2e8f0', '#cbd5e1'], // Silver
  3: ['#cd7f32', '#ea580c', '#f97316', '#fb923c'], // Bronze/Orange
};

/**
 * Language options for the "Try Another Language" section
 */
export const LANGUAGE_OPTIONS: LanguageOption[] = [
  { code: 'en', flag: '🇺🇸', name: 'English' },
  { code: 'he', flag: '🇮🇱', name: 'עברית' },
  { code: 'sv', flag: '🇸🇪', name: 'Svenska' },
  { code: 'ja', flag: '🇯🇵', name: '日本語' },
  { code: 'es', flag: '🇪🇸', name: 'Español' },
  // ru intentionally omitted: no Russian daily-word content (see LanguageDropdown).
];

/**
 * Get encouraging message based on survival bonus performance
 */
export function getSurvivalBonusMessage(bonusSeconds: number): { emoji: string; tier: string } {
  if (bonusSeconds >= 120) return { emoji: '🏆', tier: 'legendary' };
  if (bonusSeconds >= 60) return { emoji: '⭐', tier: 'excellent' };
  if (bonusSeconds >= 30) return { emoji: '💪', tier: 'good' };
  if (bonusSeconds >= 10) return { emoji: '👍', tier: 'nice' };
  return { emoji: '🌱', tier: 'start' };
}
