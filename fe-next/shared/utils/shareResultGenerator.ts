/**
 * Universal share text generator for all game modes.
 *
 * `ShareGameMode` is the surface identifier for the share card (maps to
 * `shareResult.<mode>` translation keys). It is NOT the same as the core
 * multiplayer `GameMode` in `shared/types/game.ts`, which only covers live
 * MP rules (`classic | blast | word-hunt | wheel-rush`). Standalone modes
 * like daily/adventure/singleplayer have no meaning in core game state but
 * need their own share variants.
 */

export type ShareGameMode = 'singleplayer' | 'multiplayer' | 'blast' | 'daily' | 'adventure' | 'wordHunt';

export interface ShareParams {
  gameMode: ShareGameMode;
  score: number;
  wordsFound: number;
  longestWord?: string;
  maxCombo?: number;
  won?: boolean;
  opponentScore?: number;
  level?: number;
  puzzleNumber?: number;
  words?: Array<{ word: string; found: boolean }>;
}

type TFunction = (key: string) => string;

export function generateShareText(params: ShareParams, t: TFunction): string {
  const { gameMode, score, wordsFound, longestWord, maxCombo, won, opponentScore, level, puzzleNumber } = params;

  const lines: string[] = [];

  // Header line with mode name
  const modeKey = `shareResult.${gameMode}`;
  let header = t(modeKey);

  if (puzzleNumber != null) {
    header += ` #${puzzleNumber}`;
  }

  if (won != null) {
    header += ` ${won ? t('shareResult.won') : t('shareResult.lost')}`;
  }

  lines.push(header);

  // Emoji grid if words provided
  if (params.words && params.words.length > 0) {
    lines.push(generateEmojiGrid(params.words));
  }

  // Stats line
  const stats: string[] = [];
  stats.push(`${t('shareResult.score')}: ${score}`);
  stats.push(`${t('shareResult.words')}: ${wordsFound}`);

  if (opponentScore != null) {
    stats.push(`${t('shareResult.vs')} ${opponentScore}`);
  }
  if (level != null) {
    stats.push(`${t('shareResult.level')} ${level}`);
  }

  lines.push(stats.join(' | '));

  // Optional details
  const details: string[] = [];
  if (longestWord) {
    details.push(`${t('shareResult.longest')}: ${longestWord}`);
  }
  if (maxCombo != null && maxCombo > 0) {
    details.push(`${t('shareResult.combo')}: ${maxCombo}x`);
  }

  if (details.length > 0) {
    lines.push(details.join(' | '));
  }

  // Footer
  lines.push('lexiclash.live');

  return lines.join('\n');
}

export function generateEmojiGrid(words: Array<{ word: string; found: boolean }>): string {
  return words
    .map((entry) => {
      const square = entry.found ? '🟩' : '⬛';
      return square.repeat(entry.word.length);
    })
    .join('\n');
}
