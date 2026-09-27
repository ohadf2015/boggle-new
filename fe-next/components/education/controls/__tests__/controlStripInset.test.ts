import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { TEACHER_BAR_HEIGHT_VAR, TEACHER_CONTROLS_INSET } from '../teacherBarInset';

/**
 * The docked strip must never sit on top of the board or the leaderboard.
 *
 * It is `position: fixed` (so it survives the projector's fullscreen, which
 * targets `document.documentElement`) and reserves its own space by publishing
 * its height on <html>. TvBroadcastView has TWO return branches — the board
 * modes and the early Vocab Quiz return — and classroom controls mount for
 * both, so both have to read the variable (recurring-pitfall Class 3:
 * asymmetric paths that should behave identically but don't).
 *
 * Both branches now share one frozen object, so the value itself is checked
 * here once and the source scan is left with the one thing a type checker
 * cannot catch: a future third branch that forgets the inset entirely.
 */
describe('teacher control strip inset', () => {
  const source = readFileSync(
    resolve(__dirname, '../../../../host/components/TvBroadcastView.tsx'),
    'utf-8',
  );

  it('reserves the published strip height', () => {
    expect(TEACHER_CONTROLS_INSET.paddingBottom).toBe(`var(${TEACHER_BAR_HEIGHT_VAR}, 0px)`);
  });

  it('applies it on every TvBroadcastView return branch', () => {
    // Only the two JSX returns; `return () => ...` cleanups are not branches.
    const branches = source.split(/\breturn \(\n/).slice(1);
    expect(branches).toHaveLength(2);
    for (const branch of branches) {
      expect(branch.slice(0, 400)).toContain('TEACHER_CONTROLS_INSET');
    }
  });

  it('spells the variable in exactly one place', () => {
    // A hand-written `var(--lc-teacher-bar-h, ...)` in a consumer is the drift
    // this module exists to prevent.
    expect(source).not.toContain(TEACHER_BAR_HEIGHT_VAR);
  });
});
