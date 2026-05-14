import React from 'react';
import { render, screen } from '@testing-library/react';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  m: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  useReducedMotion: vi.fn(() => false),
}));

import { StatsCardGrid, type StatCardItem } from '../StatsCardGrid';

const sampleCards: StatCardItem[] = [
  { label: 'Words', value: 23, icon: '📝' },
  { label: 'Streak', value: 7, icon: '🔥', accent: 'orange' },
  { label: 'Time', value: '2:34', icon: '⏱️' },
];

describe('StatsCardGrid', () => {
  it('renders all stat cards', () => {
    render(<StatsCardGrid cards={sampleCards} />);
    expect(screen.getByText('23')).toBeInTheDocument();
    expect(screen.getByText('7')).toBeInTheDocument();
    expect(screen.getByText('2:34')).toBeInTheDocument();
  });

  it('renders labels for each card', () => {
    render(<StatsCardGrid cards={sampleCards} />);
    expect(screen.getByText('Words')).toBeInTheDocument();
    expect(screen.getByText('Streak')).toBeInTheDocument();
    expect(screen.getByText('Time')).toBeInTheDocument();
  });

  it('renders icons when provided', () => {
    render(<StatsCardGrid cards={sampleCards} />);
    expect(screen.getByText('📝')).toBeInTheDocument();
    expect(screen.getByText('🔥')).toBeInTheDocument();
  });

  it('renders with dividers between stats in inline variant', () => {
    const { container } = render(<StatsCardGrid cards={sampleCards} variant="inline" />);
    // Inline variant uses divider elements
    const dividers = container.querySelectorAll('[data-testid="stat-divider"]');
    expect(dividers.length).toBe(2); // n-1 dividers
  });

  it('renders grid variant by default', () => {
    const { container } = render(<StatsCardGrid cards={sampleCards} />);
    const grid = container.querySelector('[data-testid="stats-grid"]');
    expect(grid).toBeInTheDocument();
  });

  it('handles empty cards array gracefully', () => {
    const { container } = render(<StatsCardGrid cards={[]} />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(<StatsCardGrid cards={sampleCards} className="mt-4" />);
    expect(container.firstChild).toHaveClass('mt-4');
  });

  it('renders Lucide icon elements when icon is a ReactNode', () => {
    const cardsWithNode: StatCardItem[] = [
      { label: 'Test', value: 5, icon: <span data-testid="custom-icon">★</span> },
    ];
    render(<StatsCardGrid cards={cardsWithNode} />);
    expect(screen.getByTestId('custom-icon')).toBeInTheDocument();
  });
});
