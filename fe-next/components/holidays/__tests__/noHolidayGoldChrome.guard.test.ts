import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const APP = join(__dirname, '../../..');
const ROOTS = ['components', 'app'].map((d) => join(APP, d));

const REAL_GOLD: Record<string, string> = {
  'components/holidays/arcade/ArcadeResults.tsx': 'the coin icon next to coins earned',
  'components/holidays/arcade/party/PartyPodium.tsx': 'the #1 gold medal on the podium',
  'components/daily/holiday/HolidayCandles.tsx': 'the flame glow on lit candles',
};

const GOLD_CLASS = /\b(?:bg|text|border|ring|outline|from|via|to|fill|stroke|decoration|shadow|divide)-neo-holiday-gold\b|\[[^\]\s]*var\(--neo-holiday-gold\)/;

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (name === '__tests__' || name === 'node_modules') return [];
    if (statSync(full).isDirectory()) return sourceFiles(full);
    return /\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name) ? [full] : [];
  });
}

describe('holiday gold is for gold things only', () => {
  it('Given every component and page, Then holiday gold colours only coins, medals and flames', () => {
    const offenders = ROOTS.flatMap(sourceFiles)
      .map((f) => relative(APP, f))
      .filter((f) => !(f in REAL_GOLD))
      .flatMap((f) =>
        readFileSync(join(APP, f), 'utf8')
          .split('\n')
          .map((line, i) => (GOLD_CLASS.test(line) ? `${f}:${i + 1}` : null))
          .filter((x): x is string => x !== null),
      );
    expect(offenders).toEqual([]);
  });

  it('Given the allowlist, Then each listed file still uses gold, so stale entries get removed', () => {
    const stale = Object.keys(REAL_GOLD).filter((f) => !GOLD_CLASS.test(readFileSync(join(APP, f), 'utf8')));
    expect(stale).toEqual([]);
  });
});
