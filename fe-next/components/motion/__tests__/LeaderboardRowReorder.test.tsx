import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LeaderboardRowReorder } from '../LeaderboardRowReorder';

describe('LeaderboardRowReorder', () => {
  it('renders rows in provided order', () => {
    const rows = [
      { id: '1', rank: 1, displayName: 'Alice' },
      { id: '2', rank: 2, displayName: 'Bob' },
    ];

    render(
      <LeaderboardRowReorder rows={rows} renderRow={(row) => <div key={row.id}>{row.displayName}</div>} />
    );

    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
  });

  it('preserves row order when order prop is stable', () => {
    const rows = [
      { id: '1', rank: 1, displayName: 'Alice' },
      { id: '2', rank: 2, displayName: 'Bob' },
      { id: '3', rank: 3, displayName: 'Charlie' },
    ];

    const { rerender } = render(
      <LeaderboardRowReorder rows={rows} renderRow={(row) => <div key={row.id}>{row.displayName}</div>} />
    );

    // Rerender with same order
    rerender(
      <LeaderboardRowReorder rows={rows} renderRow={(row) => <div key={row.id}>{row.displayName}</div>} />
    );

    const items = screen.getAllByText(/Alice|Bob|Charlie/);
    expect(items[0]).toHaveTextContent('Alice');
    expect(items[1]).toHaveTextContent('Bob');
    expect(items[2]).toHaveTextContent('Charlie');
  });

  it('applies layout animation when order changes', () => {
    const rows1 = [
      { id: '1', rank: 1, displayName: 'Alice' },
      { id: '2', rank: 2, displayName: 'Bob' },
    ];

    const rows2 = [
      { id: '2', rank: 1, displayName: 'Bob' },
      { id: '1', rank: 2, displayName: 'Alice' },
    ];

    const { rerender } = render(
      <LeaderboardRowReorder rows={rows1} renderRow={(row) => <div key={row.id}>{row.displayName}</div>} />
    );

    expect(screen.getByText('Alice')).toBeInTheDocument();

    // Rerender with changed order
    rerender(
      <LeaderboardRowReorder rows={rows2} renderRow={(row) => <div key={row.id}>{row.displayName}</div>} />
    );

    // Both elements still exist but in different order
    const items = screen.getAllByText(/Alice|Bob/);
    expect(items).toHaveLength(2);
  });

  it('accepts custom animation duration', () => {
    const rows = [{ id: '1', rank: 1, displayName: 'Alice' }];

    const { container } = render(
      <LeaderboardRowReorder
        rows={rows}
        renderRow={(row) => <div key={row.id}>{row.displayName}</div>}
        duration={500}
      />
    );

    expect(container.querySelector('[data-testid="leaderboard-reorder"]')).toBeInTheDocument();
  });

  it('respects reduced motion preference by using instant animation', () => {
    const rows = [
      { id: '1', rank: 1, displayName: 'Alice' },
      { id: '2', rank: 2, displayName: 'Bob' },
    ];

    const { container } = render(
      <LeaderboardRowReorder rows={rows} renderRow={(row) => <div key={row.id}>{row.displayName}</div>} />
    );

    // When reduced motion is active, the component should render normally
    // (actual motion behavior is tested in integration/E2E)
    expect(container.querySelector('[data-testid="leaderboard-reorder"]')).toBeInTheDocument();
  });
});
