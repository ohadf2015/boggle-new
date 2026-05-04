import { render, screen } from '@testing-library/react';
import { RosterRail } from '../RosterRail';

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
});
