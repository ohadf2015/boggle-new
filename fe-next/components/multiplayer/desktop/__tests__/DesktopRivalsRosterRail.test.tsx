import { render, screen } from '@testing-library/react';
import { DesktopRivalsRosterRail } from '../DesktopRivalsRosterRail';

/**
 * Shared desktop left-rail: the "Close Race" rivals panel + live roster, used
 * IDENTICALLY across all 4 reachable MP modes (classic/blast/wheel-rush/word-hunt).
 * Before unification only classic showed the rivals panel; this guarantees parity.
 */
const lb = [
  { userId: 'u1', username: 'Alpha', score: 100, status: 'connected' as const },
  { userId: 'u2', username: 'Beta', score: 50, status: 'connected' as const, isYou: true },
];

const MODES = ['classic', 'blast', 'wheel-rush', 'word-hunt'] as const;

describe('DesktopRivalsRosterRail', () => {
  it.each(MODES)('shows the Close Race rivals panel for %s (me + rivals present)', (mode) => {
    render(
      <DesktopRivalsRosterRail mode={mode} leaderboard={lb} meId="u2" rosterTestId={`${mode}-roster`} />,
    );
    expect(screen.getByTestId('closest-rivals-panel')).toBeInTheDocument();
  });

  it('renders the roster rail with the given testId and player names', () => {
    render(
      <DesktopRivalsRosterRail mode="blast" leaderboard={lb} meId="u2" rosterTestId="blast-roster" />,
    );
    expect(screen.getByTestId('blast-roster')).toBeInTheDocument();
    // names appear in both the rivals panel and the roster, so allow multiples
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
