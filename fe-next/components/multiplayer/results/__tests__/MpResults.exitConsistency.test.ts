import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect } from 'vitest';

/**
 * MP results — exit-button placement contract (moved from
 * components/views/__tests__/ResultsPage.exitConsistency.test.ts).
 *
 * The invariant is unchanged: the exit sits on the START edge (left in LTR),
 * matching the in-game header, so it never jumps sides on the game→results
 * transition. What changed is the structure: ResultsPage had two headers
 * (desktop + mobile, "exactly 2 ExitRoomButtons in justify-start wrappers");
 * the rebuilt screen has ONE header for every viewport — `MpHudBar`, whose
 * `start` slot is `justify-self-start` on a direction-following grid. So the
 * contract is now: every results header puts the leave button in `start=`.
 */
const header = readFileSync(resolve(__dirname, '../MpResultsHeader.tsx'), 'utf8');
const screen = readFileSync(resolve(__dirname, '../MpResultsScreen.tsx'), 'utf8');
const hudBar = readFileSync(resolve(__dirname, '../../shell/MpHudBar.tsx'), 'utf8');

describe('MP results exit-button placement', () => {
  it('the results header puts the leave button in the MpHudBar start slot', () => {
    expect(header).toMatch(/start=\{<MpBackButton kind="leave"/);
    expect(header).not.toMatch(/end=\{<MpBackButton/);
  });

  it('the calculating (no scores yet) header does the same', () => {
    expect(screen).toMatch(/start=\{<MpBackButton kind="leave"/);
  });

  it('the start slot is start-aligned (justify-self-start), never end', () => {
    const startSlot = hudBar.slice(hudBar.indexOf('{start}') - 200, hudBar.indexOf('{start}'));
    expect(startSlot).toMatch(/justify-self-start/);
    expect(startSlot).not.toMatch(/justify-self-end/);
  });
});
