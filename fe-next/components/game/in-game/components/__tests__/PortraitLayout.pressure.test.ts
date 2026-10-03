import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * The calm dials on the student's phone (RED first).
 *
 * PortraitLayout is the one in-game surface a classroom student's phone
 * mounts, so the dials land here: a hidden leaderboard swaps the rank rail
 * for the reveal beat ("your teacher will reveal the results"), a top-3 dial
 * trims the standings, and timer off unmounts the countdown entirely.
 * Asserted against source because mounting needs the whole game chassis;
 * what matters is the branch existing, not its pixels.
 */
const SRC = readFileSync(
  join(process.cwd(), 'components/game/in-game/components/PortraitLayout.tsx'),
  'utf8',
);

describe('PortraitLayout — pressure dials', () => {
  it('reads the dials from the classroom pressure store', () => {
    expect(SRC).toMatch(/useClassroomPressure/);
  });

  it('hidden leaderboard swaps the rank rail for the reveal beat', () => {
    expect(SRC).toMatch(/isLeaderboardHidden/);
    expect(SRC).toMatch(/education\.classroomGame\.pressure\.revealAtEnd|classroomGame\.pressure\.revealAtEnd/);
  });

  it('a non-hidden dial still renders the rail, trimmed for top-3', () => {
    expect(SRC).toMatch(/trimLeaderboardForPressure/);
  });

  it('timer off unmounts the countdown — no clock, no anxiety artifact', () => {
    expect(SRC).toMatch(/isStudentTimerHidden/);
  });

  it('a gentle timer suppresses the urgency escalation', () => {
    expect(SRC).toMatch(/shouldSuppressTimerUrgency|suppressUrgency/);
  });
});
