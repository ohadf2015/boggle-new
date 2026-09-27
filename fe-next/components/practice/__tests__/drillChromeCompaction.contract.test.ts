/**
 * Drill chrome compaction contract (regression: tab bar mounted during an
 * active drill shrank the measured-square grid).
 *
 * On the student practice route the shell resolves a nav (sidebar + tab bar)
 * for the WHOLE visit. While a drill is active that chrome is not cosmetic:
 * SoloPracticeBoard and WarmupRound size their letter grid to the leftover
 * area (`useContainerDimensions`), so every pixel of tab bar is grid area
 * thrown away — measured during the 2026-09-12 grid pass, when a 6x6 board
 * rendered at ~45% of viewport width with the tab bar + tall mission card
 * mounted.
 *
 * The contract has two halves, both source patterns because jsdom cannot
 * measure flex layout:
 *
 *  1. The ACTIVE drill branch of PracticeContent mounts EducationShell with
 *     `chromeFree`, and the picker branch does NOT (a deep-linked picker with
 *     no nav is a dead end — no way home).
 *  2. EducationShell actually gates nav resolution on that prop.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = (rel: string) =>
  readFileSync(resolve(__dirname, '..', '..', '..', rel), 'utf8');

describe('drill chrome compaction — chromeFree gating', () => {
  it('PracticeContent sets chromeFree ONLY in the active-drill branch', () => {
    const source = read('app/[locale]/student/lessons/[id]/PracticeContent.tsx');

    // Exactly one chromeFree in the file, and it must sit inside the
    // `if (selectedMode)` (active drill) branch — before the picker's
    // PracticePicker render. The picker keeps its nav: a deep-linked picker
    // with no way home is a dead end.
    const occurrences = source.match(/chromeFree/g) ?? [];
    expect(occurrences.length).toBe(1);

    const chromeFreeIndex = source.indexOf('chromeFree');
    const selectedModeIndex = source.indexOf('if (selectedMode)');
    const pickerIndex = source.indexOf('<PracticePicker');
    expect(selectedModeIndex).toBeGreaterThan(-1);
    expect(pickerIndex).toBeGreaterThan(-1);
    expect(chromeFreeIndex).toBeGreaterThan(selectedModeIndex);
    expect(chromeFreeIndex).toBeLessThan(pickerIndex);
  });

  it('EducationShell gates nav resolution on the chromeFree prop', () => {
    const source = read('components/education/shell/EducationShell.tsx');
    expect(source).toMatch(/chromeFree\?: boolean/);
    expect(source).toMatch(/chromeFree\s*\?\s*null\s*:\s*resolveEducationNav/);
  });
});
