import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';

const FILES = [
  'TvActivityPanel.tsx',
  'TvGameHeader.tsx',
  'TvGapIndicator.tsx',
  'TvLeaderboard.tsx',
  'TvLobbyView.tsx',
  'TvPlayerCard.tsx',
  'TvWordDropFeed.tsx',
];

const HARDCODED = /#[0-9a-fA-F]{3,8}\b|rgba?\((?!var\()|\b(?:bg|text|border|ring|from|via|to|shadow|fill)-(?:gray|slate|zinc|amber|yellow|green|red|orange|blue|white|black)-\d{2,3}\b|\b(?:bg|text)-white\b/;
// A QR code must be true black on white for scanners; SVG presentation attributes cannot read a CSS var.
const ALLOWED = /^\s*(?:bgColor|fgColor)=/;

describe('TV broadcast colours come from neo tokens', () => {
  for (const file of FILES) {
    it(`${file} has no hardcoded colour`, () => {
      const offenders = readFileSync(join(__dirname, '..', file), 'utf8')
        .split('\n')
        .map((line, i) => ({ line, n: i + 1 }))
        .filter(({ line }) => !line.trim().startsWith('//') && !line.trim().startsWith('*'))
        .filter(({ line }) => HARDCODED.test(line) && !ALLOWED.test(line))
        .map(({ line, n }) => `${n}: ${line.trim()}`);
      expect(offenders).toEqual([]);
    });
  }
});
