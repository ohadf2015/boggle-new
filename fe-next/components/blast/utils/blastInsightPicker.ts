/**
 * blastInsightPicker — pure picker for the "single hero insight" headline on
 * the after-wave results screen. Picks ONE winning template based on results
 * data; consumer renders it as a tabloid-style ribbon.
 *
 * Design philosophy: stat-driven dilution kills delight. Pick ONE winner per
 * play that captures what the player actually did best, render it BIG. The
 * scattered 4-stat grid still exists as a secondary backup.
 *
 * Pure function — no React, no t() inside, returns translation KEY so the
 * UI layer composes the localized string.
 */

import type { BlastResultsData } from '../types';

export type BlastInsightTone = 'lime' | 'pink' | 'cyan';

export interface BlastInsight {
  /** Translation key for the headline */
  key: string;
  /** Optional fill-ins for {var} substitution in the localized template */
  vars: Record<string, string | number>;
  /** Tone used to color the ribbon */
  tone: BlastInsightTone;
  /** Stable id for analytics + dedup */
  id: BlastInsightId;
}

export type BlastInsightId =
  | 'masterstroke'      // long word ≥ 8
  | 'longWordHunter'    // ≥3 words of 6+ letters
  | 'cascadeKing'       // combo ≥ 4
  | 'bullseye'          // target_word found
  | 'newRecord'         // PB delta positive
  | 'wordsmith'         // ≥12 words
  | 'flawless'          // 3 stars + cleared 100%
  | 'comebackKid'       // cleared exactly 90-92% (squeaked through)
  | 'survivor';         // fallback positive (any clear ≥90%)

/**
 * Pick the single winning insight for a result.
 * Order matters: rules higher up trump those below. Stop at first match.
 */
export function pickBlastInsight(results: BlastResultsData): BlastInsight {
  const longestWord = results.wordsFound.reduce((a, w) => Math.max(a, w.length), 0);
  const longWordCount = results.wordsFound.filter(w => w.length >= 6).length;
  const wordCount = results.wordsFound.length;
  const pbDelta = (results.previousBest != null && results.finalScore > results.previousBest)
    ? results.finalScore - results.previousBest : 0;
  const cleared = results.clearPercentage;
  const isClear = cleared >= 90;
  const isFullClear = cleared >= 100;
  const isThreeStars = results.stars === 3;

  // Top tier — singular masterstroke moments
  if (longestWord >= 8) {
    return {
      id: 'masterstroke',
      key: 'blast.insight.masterstroke',
      vars: { word: results.bestWord || results.wordsFound[0] || '', length: longestWord },
      tone: 'lime',
    };
  }

  if (results.targetWord && results.targetWordFound) {
    return {
      id: 'bullseye',
      key: 'blast.insight.bullseye',
      vars: { word: results.targetWord },
      tone: 'pink',
    };
  }

  if (pbDelta > 0) {
    return {
      id: 'newRecord',
      key: 'blast.insight.newRecord',
      vars: { delta: pbDelta },
      tone: 'lime',
    };
  }

  if (isThreeStars && isFullClear) {
    return {
      id: 'flawless',
      key: 'blast.insight.flawless',
      vars: {},
      tone: 'lime',
    };
  }

  if (results.maxCombo >= 4) {
    return {
      id: 'cascadeKing',
      key: 'blast.insight.cascadeKing',
      vars: { combo: results.maxCombo },
      tone: 'cyan',
    };
  }

  if (longWordCount >= 3) {
    return {
      id: 'longWordHunter',
      key: 'blast.insight.longWordHunter',
      vars: { count: longWordCount },
      tone: 'pink',
    };
  }

  if (wordCount >= 12) {
    return {
      id: 'wordsmith',
      key: 'blast.insight.wordsmith',
      vars: { count: wordCount },
      tone: 'cyan',
    };
  }

  if (isClear && cleared <= 92) {
    return {
      id: 'comebackKid',
      key: 'blast.insight.comebackKid',
      vars: { pct: cleared },
      tone: 'pink',
    };
  }

  // Fallback positive insight — every player gets a win-story
  return {
    id: 'survivor',
    key: 'blast.insight.survivor',
    vars: { pct: cleared },
    tone: 'cyan',
  };
}
