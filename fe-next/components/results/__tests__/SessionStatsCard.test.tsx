import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import SessionStatsCard from '../SessionStatsCard';

// Echo-key translator so we can assert on which key rendered.
// Real strings only interpolate metric placeholders ({percent}/{positions}/…),
// never {player} — so the username must NOT leak into descriptions. Echo the
// key (ignoring params) to mirror that, except the identity tokens.
const t = (key: string) => {
  if (key === 'results.sessionStats.you') return 'You';
  if (key === 'results.sessionStats.versus') return 'vs';
  return key;
};

const standings = [
  { username: 'Khai', totalScore: 300, roundScores: [120, 90, 90] },
  { username: 'Kelly', totalScore: 280, roundScores: [40, 100, 140] },
  { username: 'KCK', totalScore: 120, roundScores: [60, 30, 30] },
];

describe('SessionStatsCard', () => {
  it('caps at 2 rows', () => {
    const { container } = render(
      <SessionStatsCard standings={standings} currentRound={3} currentUsername="Kelly" t={t} />
    );
    const rows = container.querySelectorAll('.grid > div');
    expect(rows.length).toBeLessThanOrEqual(2);
  });

  it('renders "You" for the viewer, never their username', () => {
    render(
      <SessionStatsCard standings={standings} currentRound={3} currentUsername="Kelly" t={t} />
    );
    expect(screen.getAllByText(/You/).length).toBeGreaterThan(0);
    expect(screen.queryByText(/Kelly/)).toBeNull();
  });

  it('shows "You vs <rival>" for the rivalry row', () => {
    render(
      <SessionStatsCard standings={standings} currentRound={3} currentUsername="Kelly" t={t} />
    );
    // nearest neighbour to Kelly(280) is Khai(300)
    expect(screen.getAllByText(/Khai/).length).toBeGreaterThan(0);
  });

  it('hides before round 2', () => {
    const { container } = render(
      <SessionStatsCard standings={standings} currentRound={1} currentUsername="Kelly" t={t} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('host mode (no currentUsername) names real players', () => {
    render(<SessionStatsCard standings={standings} currentRound={3} t={t} />);
    // MVP framing uses real names, no "You"
    expect(screen.queryByText(/^You$/)).toBeNull();
  });
});
