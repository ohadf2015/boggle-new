/**
 * BlastResultsSummary Tests
 * Tests the blast mode results summary component
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import BlastResultsSummary from '../BlastResultsSummary';

// Mock translations
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key }),
}));

vi.mock('framer-motion', () => {
  const React = require('react');
  // eslint-disable-next-line react/display-name
  const MotionDiv = React.forwardRef(
    ({ children, initial, animate, exit, variants, whileHover, whileTap, transition, ...rest }: Record<string, unknown>, ref: React.Ref<HTMLDivElement>) =>
      React.createElement('div', { ...rest, ref }, children)
  );
  return {
    m: new Proxy({}, {
      get: (_target: Record<string, unknown>, prop: string) => {
        if (prop === 'div') return MotionDiv;
        // eslint-disable-next-line react/display-name
        return React.forwardRef((props: Record<string, unknown>, ref: React.Ref<HTMLElement>) => {
          const { initial, animate, exit, variants, whileHover, whileTap, transition, ...rest } = props;
          return React.createElement(prop, { ...rest, ref });
        });
      },
    }),
    AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
    useReducedMotion: () => true,
  };
});

// Mock ScoreCountUp to render the number directly
vi.mock('@/components/results/shared', () => ({
  ScoreCountUp: ({ to }: { to: number }) => React.createElement('span', null, String(to)),
}));

describe('BlastResultsSummary', () => {
  it('should render moves used', () => {
    render(<BlastResultsSummary movesUsed={15} tilesCleared={8} tileBonus={25} />);
    expect(screen.getByText('15')).toBeInTheDocument();
    expect(screen.getByText('blast.multiplayer.moves')).toBeInTheDocument();
  });

  it('should render tiles cleared count', () => {
    render(<BlastResultsSummary movesUsed={10} tilesCleared={12} tileBonus={30} />);
    expect(screen.getByText('12')).toBeInTheDocument();
  });

  it('should render tile bonus total', () => {
    render(<BlastResultsSummary movesUsed={10} tilesCleared={8} tileBonus={45} />);
    // '+' prefix and '45' may be in separate elements due to ScoreCountUp
    expect(screen.getByText((_content, element) =>
      element?.textContent === '+45'
    )).toBeInTheDocument();
  });

  it('should render with zero values', () => {
    render(<BlastResultsSummary movesUsed={0} tilesCleared={0} tileBonus={0} />);
    expect(screen.getAllByText('0').length).toBeGreaterThanOrEqual(2);
  });
});
