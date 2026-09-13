/**
 * Drill chrome compaction contract (dogfood 2026-09-12).
 *
 * Production dogfood on a phone showed the Solo Board drill with the letter
 * grid shrunk to ~45% of screen width: the XP strip, the tall bordered stats
 * card, the word-forming pill, the found-words card, the finish button AND
 * the student tab bar all stacked above/below the one element that is the
 * game. The grid is sized to the square that fits the measured LEFTOVER
 * area, so every pixel of chrome directly steals board size.
 *
 * Three structural rules keep the game the biggest thing on screen:
 *   1. While a drill is active the education tab bar is hidden
 *      (`chromeFree`) — the drill owns its own back affordance and a tab bar
 *      under a timed game is an accidental-exit trap. Restores when the
 *      round ends and the picker comes back.
 *   2. The score/word-count/vocab stats render as ONE slim strip
 *      (`data-testid="drill-stats-strip"`), not the old 3px-bordered Card
 *      that carried a second row for the clock.
 *   3. The compact-clock variant stays in that same strip rather than
 *      growing its own card row.
 *
 * jsdom cannot compute flex layout, so these are source contracts in the
 * style of boardGridFit.contract.test.ts; the visual proof is the
 * real-browser dogfood screenshot.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = (rel: string) =>
  readFileSync(resolve(__dirname, rel), 'utf8');

describe('drill chrome compaction — the grid is the biggest thing on screen', () => {
  it('EducationShell supports chromeFree (no sidebar, no tab bar)', () => {
    const source = read('../../education/shell/EducationShell.tsx');
    expect(source).toMatch(/chromeFree\??:\s*boolean/);
    // The nav must be gated on chromeFree, not just resolved from the path.
    expect(source).toMatch(/chromeFree\s*\?\s*null\s*:\s*resolveEducationNav/);
  });

  it('PracticeContent goes chromeFree only while a drill is active', () => {
    const source = read('../../../app/[locale]/student/lessons/[id]/PracticeContent.tsx');
    // The drill branch (selectedMode) renders the shell chrome-free…
    expect(source).toMatch(/<EducationShell[\s\S]{0,200}?chromeFree/);
    // …and the picker branch keeps its tab bar: the EducationShell that
    // carries the EducationHeader must not be the chromeFree one.
    const pickerIdx = source.indexOf('header={<EducationHeader');
    expect(pickerIdx).toBeGreaterThan(-1);
    expect(source.slice(Math.max(0, pickerIdx - 120), pickerIdx)).not.toContain('chromeFree');
  });

  it.each([
    ['SoloPracticeBoard.tsx', 'SoloPracticeBoard'],
    ['WarmupRound.tsx', 'WarmupRound'],
  ])('%s renders stats as one compact strip, not a tall Card', (file, name) => {
    const source = read(`../${file}`);
    expect(source).toContain('data-testid="drill-stats-strip"');
    // The old stats Card (3px border + hard shadow + its own clock row) is
    // retired — the card chrome around a single row of numbers is what
    // starved the grid.
    expect(source).not.toContain(
      '<Card className="h-auto border-[3px] border-neo-black shadow-hard bg-neo-navy/80 mb-4',
    );
  });

  it('SoloPracticeBoard keeps the clock inside the same compact strip', () => {
    const source = read('../SoloPracticeBoard.tsx');
    const strip = source.split('drill-stats-strip')[1] ?? '';
    expect(strip).toContain('<BeatTheClock');
    // No second card row for the clock below the stats.
    expect(source).not.toContain('mt-3 border-t-[2px] border-black/30 pt-3');
  });
});
