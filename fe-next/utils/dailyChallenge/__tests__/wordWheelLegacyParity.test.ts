import { describe, it, expect } from 'vitest';
import { generateWordWheelPuzzle } from '../wordWheelGeneration';
import legacy from './fixtures/wordWheelLegacy.json';
import type { Language } from '@/types';

describe('word wheel puzzles already played stay byte-identical', () => {
  for (const [key, expected] of Object.entries(legacy)) {
    const [date, lang] = key.split('|');
    it(`${date} ${lang}`, () => {
      expect(JSON.stringify(generateWordWheelPuzzle(date, lang as Language))).toBe(JSON.stringify(expected));
    });
  }
});
