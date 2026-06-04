import React from 'react';
import { render, screen } from '@testing-library/react';
import MobileCompactLeaderboard from '../MobileCompactLeaderboard';

/**
 * The winner row's pulsing border glow is a perpetual (repeat:Infinity) loop.
 * It used to be gated only on the OS reduced-motion flag, so it looped under
 * Cozy Mode. Migrated to useCalmMotion → off under cozy too.
 */

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key, language: 'en', dir: 'ltr' }),
}));

let calm = false;
vi.mock('@/hooks/useCalmMotion', () => ({
  __esModule: true,
  useCalmMotion: () => calm,
  default: () => calm,
}));

const participants = [
  { name: 'Winner', score: 300, isCurrentPlayer: true },
  { name: 'Bot1', score: 198, isBot: true },
  { name: 'Bot2', score: 156, isBot: true },
];

describe('MobileCompactLeaderboard — cozy quiets the winner glow loop', () => {
  beforeEach(() => { calm = false; });

  it('loud mode: the winner row shows its perpetual glow', () => {
    calm = false;
    render(<MobileCompactLeaderboard participants={participants} />);
    expect(screen.getByTestId('winner-row-glow')).toBeInTheDocument();
  });

  it('cozy/calm mode: the perpetual winner glow is gone', () => {
    calm = true;
    render(<MobileCompactLeaderboard participants={participants} />);
    expect(screen.queryByTestId('winner-row-glow')).not.toBeInTheDocument();
    // The leaderboard still renders its rows.
    expect(screen.getByText('Winner')).toBeInTheDocument();
  });
});
