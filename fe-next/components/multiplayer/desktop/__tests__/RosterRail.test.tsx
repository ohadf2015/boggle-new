import { render, screen } from '@testing-library/react';
import { RosterRail } from '../RosterRail';

vi.mock('@/components/Avatar', () => ({
  __esModule: true,
  default: ({ userId, customAvatar, disableEffects }: { userId?: string; customAvatar?: unknown; disableEffects?: boolean }) => (
    <span
      data-testid="avatar"
      data-uid={userId}
      data-has-custom={customAvatar ? 'true' : 'false'}
      data-disable-effects={disableEffects ? 'true' : 'false'}
    />
  ),
}));

describe('RosterRail', () => {
  const players = [
    { userId: 'u1', username: 'Alpha', score: 250, status: 'connected' as const, isYou: true },
    { userId: 'u2', username: 'Beta', score: 100, status: 'disconnected' as const },
    { userId: 'u3', username: 'Gamma', score: 50, status: 'connected' as const },
  ];

  it('sorts by score descending', () => {
    const { container } = render(<RosterRail players={players} />);
    const rows = container.querySelectorAll('[data-row="true"]');
    expect(rows[0].textContent).toMatch(/Alpha/);
    expect(rows[1].textContent).toMatch(/Beta/);
    expect(rows[2].textContent).toMatch(/Gamma/);
  });

  it('marks "you" with an indicator', () => {
    render(<RosterRail players={players} />);
    expect(screen.getByTestId('roster-row-u1')).toHaveAttribute('data-you', 'true');
  });

  it('marks others with data-you="false"', () => {
    render(<RosterRail players={players} />);
    expect(screen.getByTestId('roster-row-u2')).toHaveAttribute('data-you', 'false');
  });

  it('renders disconnected status dot', () => {
    render(<RosterRail players={players} />);
    expect(screen.getByTestId('status-dot-u2')).toHaveAttribute('data-status', 'disconnected');
  });

  it('renders connected status dot', () => {
    render(<RosterRail players={players} />);
    expect(screen.getByTestId('status-dot-u1')).toHaveAttribute('data-status', 'connected');
  });

  it('uses logical-prop spacing classes for RTL safety', () => {
    const { container } = render(<RosterRail players={players} />);
    expect(container.innerHTML).not.toMatch(/\bml-|\bmr-|\bpl-|\bpr-/);
  });

  it('renders rank number', () => {
    render(<RosterRail players={players} />);
    expect(screen.getByTestId('roster-row-u1').textContent).toMatch(/^1/);
  });

  it('renders an avatar per player using userId as seed', () => {
    render(<RosterRail players={players} />);
    const avatars = screen.getAllByTestId('avatar');
    expect(avatars).toHaveLength(3);
    expect(avatars.some(a => a.getAttribute('data-uid') === 'u1')).toBe(true);
  });

  it('passes customAvatar to Avatar when provided', () => {
    const withAvatar = [
      { userId: 'u1', username: 'Alpha', score: 100, status: 'connected' as const, customAvatar: { parts: [] } as never },
    ];
    render(<RosterRail players={withAvatar} />);
    expect(screen.getByTestId('avatar').getAttribute('data-has-custom')).toBe('true');
  });

  it('renders avatars with effects disabled (no in-match tier animation churn)', () => {
    render(<RosterRail players={players} />);
    const avatars = screen.getAllByTestId('avatar');
    for (const a of avatars) {
      expect(a.getAttribute('data-disable-effects')).toBe('true');
    }
  });

  it('crowns the top scorer (data-leader + decorative crown icon)', () => {
    render(<RosterRail players={players} />);
    const leader = screen.getByTestId('roster-row-u1'); // Alpha, top score
    expect(leader).toHaveAttribute('data-leader', 'true');
    expect(leader.querySelector('svg')).toBeTruthy(); // lucide Crown
  });

  it('does not crown non-leaders', () => {
    render(<RosterRail players={players} />);
    expect(screen.getByTestId('roster-row-u2')).toHaveAttribute('data-leader', 'false');
    expect(screen.getByTestId('roster-row-u3')).toHaveAttribute('data-leader', 'false');
  });

  it('crowns nobody before the first point is scored', () => {
    const fresh = [
      { userId: 'u1', username: 'Alpha', score: 0, status: 'connected' as const, isYou: true },
      { userId: 'u2', username: 'Beta', score: 0, status: 'connected' as const },
    ];
    render(<RosterRail players={fresh} />);
    expect(screen.getByTestId('roster-row-u1')).toHaveAttribute('data-leader', 'false');
    expect(screen.getByTestId('roster-row-u2')).toHaveAttribute('data-leader', 'false');
  });

  it('exposes rank position as a data attribute for each row', () => {
    render(<RosterRail players={players} />);
    expect(screen.getByTestId('roster-row-u1')).toHaveAttribute('data-rank', '1');
    expect(screen.getByTestId('roster-row-u2')).toHaveAttribute('data-rank', '2');
    expect(screen.getByTestId('roster-row-u3')).toHaveAttribute('data-rank', '3');
  });

  it('keeps the leader rank readable to assistive tech despite the crown', () => {
    render(<RosterRail players={players} />);
    // crown is decorative; the rank number survives in textContent (sr-only)
    expect(screen.getByTestId('roster-row-u1').textContent).toMatch(/^1/);
  });
});
