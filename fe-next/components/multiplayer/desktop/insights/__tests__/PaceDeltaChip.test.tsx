import { render, screen } from '@testing-library/react';
import { PaceDeltaChip, computePaceDelta } from '../PaceDeltaChip';

const p = (userId: string, score: number, isYou = false) => ({
  userId,
  username: userId,
  score,
  status: 'connected' as const,
  isYou,
});

describe('computePaceDelta', () => {
  it('returns solo when no leaderboard', () => {
    const r = computePaceDelta([], 'u1');
    expect(r.status).toBe('solo');
  });

  it('returns leading positive delta', () => {
    const r = computePaceDelta([p('u1', 100, true), p('u2', 60)], 'u1');
    expect(r.status).toBe('leading');
    expect(r.delta).toBe(40);
  });

  it('returns trailing negative delta', () => {
    const r = computePaceDelta([p('u1', 30, true), p('u2', 90)], 'u1');
    expect(r.status).toBe('trailing');
    expect(r.delta).toBe(-60);
  });

  it('returns tied at zero', () => {
    const r = computePaceDelta([p('u1', 50, true), p('u2', 50)], 'u1');
    expect(r.status).toBe('tied');
    expect(r.delta).toBe(0);
  });

  it('uses isYou flag when meId not in userId field', () => {
    const r = computePaceDelta([
      { userId: 'a', username: 'A', score: 70, status: 'connected', isYou: true },
      { userId: 'b', username: 'B', score: 30, status: 'connected' },
    ], 'mismatched');
    expect(r.status).toBe('leading');
    expect(r.delta).toBe(40);
  });
});

describe('PaceDeltaChip', () => {
  it('renders nothing in solo mode', () => {
    const { container } = render(<PaceDeltaChip mode="classic" leaderboard={[]} meId="u1" />);
    expect(container.firstChild).toBeNull();
  });

  it('renders status data-attribute', () => {
    render(
      <PaceDeltaChip
        mode="classic"
        meId="u1"
        leaderboard={[p('u1', 100, true), p('u2', 50)]}
      />
    );
    expect(screen.getByTestId('pace-delta-chip').getAttribute('data-status')).toBe('leading');
    expect(screen.getByTestId('pace-delta-value').textContent).toContain('+50');
  });
});
