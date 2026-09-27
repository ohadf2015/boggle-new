/**
 * Quick Play's word-hunt round is the only quick mode with no rival surface:
 * classic and blast race on the MP leaderboard, the wheel has its own pill.
 * Survival's practice header leaves the score slot EMPTY (the daily tier badge
 * is suppressed), which is exactly where the standing belongs — rendered with
 * the same MobileRankIndicator the MP boards use, not a new pill.
 *
 * The daily challenge passes no rivals and must be untouched.
 */
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { SurvivalHeader } from '../SurvivalHeader';

const t = (k: string) => k;

const rivals = [
  { username: 'Ada', score: 140 },
  { username: 'Bo', score: 260 },
];

function renderHeader(props: Partial<React.ComponentProps<typeof SurvivalHeader>> = {}) {
  return render(
    <SurvivalHeader
      liveScore={120}
      lastScoreIncrement={null}
      isScoreAnimating={false}
      onQuitClick={() => {}}
      t={t}
      {...props}
    />
  );
}

describe('SurvivalHeader — quick-play rivals', () => {
  it('shows the standing in the practice header when rivals are supplied', () => {
    renderHeader({ practice: true, rivals });
    expect(screen.getByTestId('survival-rank-indicator')).toBeInTheDocument();
  });

  it('ranks me against the rivals by my live score', () => {
    renderHeader({ practice: true, rivals });
    // 120 vs 140 and 260 → I am 3rd of 3, chasing Ada.
    expect(screen.getByTestId('survival-rank-indicator').textContent).toContain('Ada');
  });

  it('renders nothing extra for the daily challenge (no rivals passed)', () => {
    renderHeader({ practice: true });
    expect(screen.queryByTestId('survival-rank-indicator')).toBeNull();
  });

  it('keeps the daily score badge when not in practice mode', () => {
    renderHeader({ rivals });
    expect(screen.queryByTestId('survival-rank-indicator')).toBeNull();
  });
});
