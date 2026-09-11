import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { TEACHER_BAR_HEIGHT_VAR } from '../../TeacherLiveControls';

/**
 * The docked strip must never sit on top of the board or the leaderboard.
 *
 * It is `position: fixed` (so it survives the projector's fullscreen, which
 * targets `document.documentElement`) and reserves its own space by publishing
 * its height on <html>. TvBroadcastView has TWO return branches — the board
 * modes and the early Vocab Quiz return — and classroom controls mount for
 * both, so both have to read the variable (recurring-pitfall Class 3:
 * asymmetric paths that should behave identically but don't).
 */
describe('teacher control strip inset', () => {
  const source = readFileSync(
    resolve(__dirname, '../../../../host/components/TvBroadcastView.tsx'),
    'utf-8',
  );

  it('reserves the strip height on every TvBroadcastView return branch', () => {
    const inset = `var(${TEACHER_BAR_HEIGHT_VAR}, 0px)`;
    expect(source).toContain(inset);

    // Only the two JSX returns; `return () => ...` cleanups are not branches.
    const branches = source.split(/\breturn \(\n/).slice(1);
    expect(branches).toHaveLength(2);
    for (const branch of branches) {
      expect(branch.slice(0, 400)).toContain('teacherControlsInset');
    }
  });
});
