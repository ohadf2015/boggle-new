import React from 'react';
import { render, screen } from '@testing-library/react';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => {
      const { initial, animate, transition, ...rest } = props;
      return <div {...rest}>{children}</div>;
    },
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
  useReducedMotion: vi.fn(() => false),
}));

import { ResultsLayout } from '../ResultsLayout';

describe('ResultsLayout', () => {
  it('renders hero slot', () => {
    render(
      <ResultsLayout
        hero={<div data-testid="hero">Hero</div>}
        actions={<div>Actions</div>}
      />
    );
    expect(screen.getByTestId('hero')).toBeInTheDocument();
  });

  it('renders actions slot', () => {
    render(
      <ResultsLayout
        hero={<div>Hero</div>}
        actions={<div data-testid="actions">Actions</div>}
      />
    );
    expect(screen.getByTestId('actions')).toBeInTheDocument();
  });

  it('renders analysis sections', () => {
    render(
      <ResultsLayout
        hero={<div>Hero</div>}
        actions={<div>Actions</div>}
        analysis={<div data-testid="analysis">Analysis</div>}
      />
    );
    expect(screen.getByTestId('analysis')).toBeInTheDocument();
  });

  it('renders sidebar slot', () => {
    render(
      <ResultsLayout
        hero={<div>Hero</div>}
        actions={<div>Actions</div>}
        sidebar={<div data-testid="sidebar">Sidebar</div>}
      />
    );
    expect(screen.getByTestId('sidebar')).toBeInTheDocument();
  });

  it('renders without optional slots', () => {
    const { container } = render(
      <ResultsLayout
        hero={<div>Hero</div>}
        actions={<div>Actions</div>}
      />
    );
    expect(container.firstChild).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(
      <ResultsLayout
        hero={<div>Hero</div>}
        actions={<div>Actions</div>}
        className="custom-class"
      />
    );
    expect(container.firstChild).toHaveClass('custom-class');
  });
});
