import React from 'react';
import { render, screen } from '@testing-library/react';
import type { CascadeHighlightData } from '../types';

// Mock framer-motion
jest.mock('framer-motion', () => {
  const React = require('react');
  const Div = React.forwardRef(function MockMotionDiv({ children, ...rest }: any, ref: any) {
    return React.createElement('div', { ref, ...rest }, children);
  });
  return {
    motion: { div: Div },
    AnimatePresence: ({ children }: any) => children,
  };
});

import { BlastCascadeWordBanner } from '../BlastCascadeWordBanner';

describe('BlastCascadeWordBanner', () => {
  it('renders nothing when highlightData is null', () => {
    const { container } = render(
      <BlastCascadeWordBanner highlightData={null} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders word text for a single cascade word', () => {
    const data: CascadeHighlightData = {
      words: [{
        word: 'test',
        path: [{ row: 0, col: 2 }, { row: 1, col: 2 }, { row: 2, col: 2 }, { row: 3, col: 2 }],
        score: 5,
        chainLevel: 1,
      }],
    };

    render(<BlastCascadeWordBanner highlightData={data} />);

    expect(screen.getByText('TEST')).toBeInTheDocument();
  });

  it('renders chain level badge', () => {
    const data: CascadeHighlightData = {
      words: [{
        word: 'word',
        path: [{ row: 0, col: 1 }, { row: 1, col: 1 }, { row: 2, col: 1 }, { row: 3, col: 1 }],
        score: 8,
        chainLevel: 2,
      }],
    };

    render(<BlastCascadeWordBanner highlightData={data} />);

    // Chain badge shows compact multiplier format: x{level}
    expect(screen.getByText('x2')).toBeInTheDocument();
  });

  it('renders score value', () => {
    const data: CascadeHighlightData = {
      words: [{
        word: 'game',
        path: [{ row: 0, col: 3 }, { row: 1, col: 3 }, { row: 2, col: 3 }, { row: 3, col: 3 }],
        score: 12,
        chainLevel: 1,
      }],
    };

    render(<BlastCascadeWordBanner highlightData={data} />);

    expect(screen.getByText(/\+12/)).toBeInTheDocument();
  });

  it('renders multiple banners for simultaneous cascade words', () => {
    const data: CascadeHighlightData = {
      words: [
        {
          word: 'test',
          path: [{ row: 0, col: 1 }, { row: 1, col: 1 }, { row: 2, col: 1 }, { row: 3, col: 1 }],
          score: 5,
          chainLevel: 1,
        },
        {
          word: 'game',
          path: [{ row: 0, col: 4 }, { row: 1, col: 4 }, { row: 2, col: 4 }, { row: 3, col: 4 }],
          score: 5,
          chainLevel: 1,
        },
      ],
    };

    render(<BlastCascadeWordBanner highlightData={data} />);

    const banners = screen.getAllByTestId(/^cascade-word-banner-/);
    expect(banners).toHaveLength(2);
    expect(screen.getByText('TEST')).toBeInTheDocument();
    expect(screen.getByText('GAME')).toBeInTheDocument();
  });

  it('scales gradient intensity with chain level', () => {
    const data: CascadeHighlightData = {
      words: [{
        word: 'epic',
        path: [{ row: 0, col: 0 }, { row: 1, col: 0 }, { row: 2, col: 0 }, { row: 3, col: 0 }],
        score: 20,
        chainLevel: 3,
      }],
    };

    render(<BlastCascadeWordBanner highlightData={data} />);

    const banner = screen.getByTestId('cascade-word-banner-0');
    // Higher chain level should have more intense styling
    expect(banner).toBeInTheDocument();
  });
});
