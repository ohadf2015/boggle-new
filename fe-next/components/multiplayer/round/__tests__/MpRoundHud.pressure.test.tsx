/**
 * The desktop MP shell honours the teacher's pressure dials (RED first).
 *
 * This HUD is what every ≥1024px school laptop mounts, and it ignored all
 * three dials: timer always rendered with its own pink urgency, live rank
 * always showed. Hidden leaderboard swaps the rank chip for the reveal beat;
 * timer off drops the clock; gentle keeps it calm.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MpRoundHud } from '../MpRoundHud';
import { useClassroomPressureStore } from '@/hooks/gameState/classroomPressureStore';
import { DEFAULT_CLASSROOM_PRESSURE } from '@/shared/utils/classroomPressure';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key }),
}));

const PROPS = {
  remainingTime: 90,
  totalTime: 180,
  score: 120,
  gain: null,
  rank: 2,
  total: 5,
  comboLevel: 0,
  timerColor: 'cyan' as const,
  onExit: () => {},
};

function setPressure(pressure: typeof DEFAULT_CLASSROOM_PRESSURE | null) {
  useClassroomPressureStore.getState().setClassroomPressure(pressure);
}

describe('MpRoundHud — pressure dials', () => {
  beforeEach(() => setPressure(null));

  it('a casual room (null pressure) shows clock and rank as before', () => {
    render(<MpRoundHud {...PROPS} />);
    expect(screen.getByTestId('mp-timer')).toBeInTheDocument();
    expect(screen.getByTestId('mp-rank-chip')).toBeInTheDocument();
  });

  it('timer=off unmounts the clock — no countdown on a calm round', () => {
    setPressure({ ...DEFAULT_CLASSROOM_PRESSURE, timer: 'off' });
    render(<MpRoundHud {...PROPS} />);
    expect(screen.queryByTestId('mp-timer')).toBeNull();
  });

  it('timer=gentle keeps the clock but suppresses the urgency punch', () => {
    setPressure({ ...DEFAULT_CLASSROOM_PRESSURE, timer: 'gentle' });
    render(<MpRoundHud {...PROPS} remainingTime={5} />);
    expect(screen.getByTestId('mp-timer')).toHaveAttribute('data-urgent', 'false');
  });

  it('leaderboard=hidden swaps the rank chip for the reveal-at-end beat', () => {
    setPressure({ ...DEFAULT_CLASSROOM_PRESSURE, leaderboard: 'hidden' });
    render(<MpRoundHud {...PROPS} />);
    expect(screen.queryByTestId('mp-rank-chip')).toBeNull();
    expect(screen.getByTestId('mp-rank-reveal-note')).toBeInTheDocument();
  });

  it('leaderboard=top3 hides a rank below the podium', () => {
    setPressure({ ...DEFAULT_CLASSROOM_PRESSURE, leaderboard: 'top3' });
    render(<MpRoundHud {...PROPS} rank={4} />);
    expect(screen.queryByTestId('mp-rank-chip')).toBeNull();
  });

  it('leaderboard=top3 keeps a podium rank visible', () => {
    setPressure({ ...DEFAULT_CLASSROOM_PRESSURE, leaderboard: 'top3' });
    render(<MpRoundHud {...PROPS} rank={3} />);
    expect(screen.getByTestId('mp-rank-chip')).toBeInTheDocument();
  });
});
