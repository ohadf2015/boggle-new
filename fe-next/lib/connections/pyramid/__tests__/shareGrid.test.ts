import { describe, it, expect } from 'vitest';
import { buildPyramidShareGrid } from '../shareGrid';

const clean = { reached: true, solved: true, wrongAttempts: 0, hintUsed: false };
const messy = { reached: true, solved: true, wrongAttempts: 2, hintUsed: false };
const failed = { reached: true, solved: false, wrongAttempts: 3, hintUsed: false };
const unreached = { reached: false, solved: false, wrongAttempts: 0, hintUsed: false };

describe('buildPyramidShareGrid', () => {
  it('renders apex above the 3-base row, with LexiClash header/date/score', () => {
    const out = buildPyramidShareGrid({
      title: 'Word Bridge',
      dateISO: '2026-07-03',
      base: [clean, messy, clean],
      finale: clean,
      score: 900,
      callout: 'Perfect!',
      url: 'https://lexiclash.live/connections/pyramid',
    });
    const lines = out.split('\n');
    expect(lines[0]).toBe('⚡ LEXICLASH · 🔺 Word Bridge 2026-07-03');
    expect(lines[1]).toBe('　⚡'); // apex row (finale), indented to sit over the middle
    expect(lines[2]).toBe('⚡💫⚡'); // base row
    expect(lines[3]).toBe('Perfect!');
    expect(lines[4]).toContain('900');
    expect(lines[5]).toBe('https://lexiclash.live/connections/pyramid');
    expect(out).not.toContain('🟩');
    expect(out).not.toContain('🟨');
    expect(out).not.toContain('⬛');
    expect(out).not.toContain('⬜');
  });

  it('marks a lost run: failed finale miss, unreached empty', () => {
    const out = buildPyramidShareGrid({
      title: 'T',
      dateISO: '2026-07-03',
      base: [failed, unreached, unreached],
      finale: unreached,
      score: 0,
    });
    const lines = out.split('\n');
    expect(lines[1]).toBe('　○');
    expect(lines[2]).toBe('✕○○');
  });
});
