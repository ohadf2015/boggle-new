// @vitest-environment node
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { generateWordWheelPuzzle, isValidWordWheelWord } from '@/utils/dailyChallenge/wordWheelGeneration';
import { WHEEL_EXAMPLE } from '../wheelExample';

describe('slovo-dnya worked example', () => {
  const words = new Set(
    readFileSync(join(process.cwd(), 'backend/russian_words.txt'), 'utf-8')
      .split('\n')
      .map((w) => w.trim().toLowerCase())
      .filter(Boolean),
  );
  const letters = [WHEEL_EXAMPLE.center, ...WHEEL_EXAMPLE.outer];

  it('is the wheel that really ran on that date', () => {
    const puzzle = generateWordWheelPuzzle(WHEEL_EXAMPLE.date, 'ru');
    expect(puzzle.centerLetter).toBe(WHEEL_EXAMPLE.center);
    expect(puzzle.outerLetters).toEqual(WHEEL_EXAMPLE.outer);
  });

  it('quotes the real word count and only valid dictionary words', () => {
    const valid = [...words].filter(
      (w) => w.length >= 3 && isValidWordWheelWord(w, WHEEL_EXAMPLE.center, letters),
    );
    expect(valid.length).toBe(WHEEL_EXAMPLE.total);
    expect(valid).toEqual(expect.arrayContaining(WHEEL_EXAMPLE.picks));
    expect(WHEEL_EXAMPLE.longest).toHaveLength(letters.length);
  });
});
