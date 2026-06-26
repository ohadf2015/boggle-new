import { render, screen } from '@testing-library/react';
import { DesktopRivalsRosterRail } from '../DesktopRivalsRosterRail';

/**
 * Shared desktop left-rail: the "Close Race" rivals panel + live roster, used
 * IDENTICALLY across all 4 reachable MP modes (classic/blast/wheel-rush/word-hunt).
 * Before unification only classic showed the rivals panel; this guarantees parity.
 */
// Small lobby (me + 1): the "closest rivals" slice IS the whole roster, so the
// rivals panel would just repeat it below — the reported "Close Race + Players
// show the same names" duplication. It self-omits at this size.
const smallLb = [
  { userId: 'u1', username: 'Alpha', score: 100, status: 'connected' as const },
  { userId: 'u2', username: 'Beta', score: 50, status: 'connected' as const, isYou: true },
];

// Large lobby (me + 5 others): rivals is now a genuine subset around "me" that
// adds neighbour/catch-up context the full roster doesn't — so it renders.
const bigLb = [
  { userId: 'u1', username: 'Alpha', score: 100, status: 'connected' as const },
  { userId: 'u2', username: 'Beta', score: 90, status: 'connected' as const },
  { userId: 'u3', username: 'Gamma', score: 80, status: 'connected' as const, isYou: true },
  { userId: 'u4', username: 'Delta', score: 70, status: 'connected' as const },
  { userId: 'u5', username: 'Epsilon', score: 60, status: 'connected' as const },
  { userId: 'u6', username: 'Zeta', score: 50, status: 'connected' as const },
];

const MODES = ['classic', 'blast', 'wheel-rush', 'word-hunt'] as const;

describe('DesktopRivalsRosterRail', () => {
  it.each(MODES)('shows the Close Race rivals panel for %s in a large lobby', (mode) => {
    render(
      <DesktopRivalsRosterRail mode={mode} leaderboard={bigLb} meId="u3" rosterTestId={`${mode}-roster`} />,
    );
    expect(screen.getByTestId('closest-rivals-panel')).toBeInTheDocument();
  });

  it.each(MODES)('omits the rivals panel in a small lobby for %s (it would just dupe the roster)', (mode) => {
    render(
      <DesktopRivalsRosterRail mode={mode} leaderboard={smallLb} meId="u2" rosterTestId={`${mode}-roster`} />,
    );
    expect(screen.queryByTestId('closest-rivals-panel')).not.toBeInTheDocument();
    // the roster still renders — no data is lost, just the duplicate panel
    expect(screen.getByTestId(`${mode}-roster`)).toBeInTheDocument();
  });

  it('renders the roster rail with the given testId and player names', () => {
    render(
      <DesktopRivalsRosterRail mode="blast" leaderboard={smallLb} meId="u2" rosterTestId="blast-roster" />,
    );
    expect(screen.getByTestId('blast-roster')).toBeInTheDocument();
    expect(screen.getAllByText('Alpha').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Beta').length).toBeGreaterThanOrEqual(1);
  });

  it('omits the rivals panel when there is no "me" (solo / spectator)', () => {
    render(
      <DesktopRivalsRosterRail
        mode="classic"
        leaderboard={[{ userId: 'u1', username: 'Alpha', score: 100, status: 'connected' as const }]}
        rosterTestId="standard-roster"
      />,
    );
    expect(screen.queryByTestId('closest-rivals-panel')).not.toBeInTheDocument();
    // roster still renders
    expect(screen.getByTestId('standard-roster')).toBeInTheDocument();
  });
});
