import React from 'react';
import { render, screen } from '@testing-library/react';

// Mock LanguageContext
const mockT = (key: string) => {
  const translations: Record<string, string> = {
    'adventure.worldLabel': 'World',
    'adventure.worlds.meadows': 'Azure Meadows',
    'adventure.mastery': 'Mastery',
    'adventure.stars': 'Stars',
  };
  return translations[key] || key;
};

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: mockT, language: 'en' }),
}));

vi.mock('framer-motion', () => ({
  m: {
    div: React.forwardRef(function MockDiv({ children, ...props }: any, ref: any) {
      return <div ref={ref} {...props}>{children}</div>;
    }),
    svg: React.forwardRef(function MockSvg({ children, ...props }: any, ref: any) {
      return <svg ref={ref} {...props}>{children}</svg>;
    }),
  },
  m: {
    div: React.forwardRef(function MockMDiv({ children, ...props }: any, ref: any) {
      return <div ref={ref} {...props}>{children}</div>;
    }),
    svg: React.forwardRef(function MockMSvg({ children, ...props }: any, ref: any) {
      return <svg ref={ref} {...props}>{children}</svg>;
    }),
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

import LevelGridHeader from '../LevelGridHeader';

const defaultProps = {
  world: { id: 1, name: 'meadows', colorPrimary: 'green' as const, mechanic: null },
  worldStars: 12,
  maxWorldStars: 21,
  completedLevels: 5,
  totalLevels: 7,
  glowColor: '#22c55e',
  worldColors: { text: 'text-green-400', bg: 'bg-green-400' },
};

describe('LevelGridHeader', () => {
  it('renders shield emblem with world number', () => {
    render(<LevelGridHeader {...defaultProps} />);
    const shield = screen.getByTestId('shield-emblem');
    expect(shield).toBeInTheDocument();
    expect(shield).toHaveTextContent('1');
  });

  it('renders world name', () => {
    render(<LevelGridHeader {...defaultProps} />);
    expect(screen.getByText('Azure Meadows')).toBeInTheDocument();
  });

  it('renders mastery ring-3 with correct percentage', () => {
    render(<LevelGridHeader {...defaultProps} />);
    const ring = screen.getByTestId('mastery-ring');
    expect(ring).toBeInTheDocument();
    // 5/7 = ~71%
    expect(ring).toHaveTextContent('71%');
  });

  it('renders star progress bar', () => {
    render(<LevelGridHeader {...defaultProps} />);
    const bar = screen.getByTestId('star-progress-bar');
    expect(bar).toBeInTheDocument();
    expect(screen.getByText('12/21')).toBeInTheDocument();
  });

  it('renders star progress bar with correct fill width', () => {
    render(<LevelGridHeader {...defaultProps} />);
    const fill = screen.getByTestId('star-progress-fill');
    // 12/21 ≈ 57%
    expect(fill.style.width).toBe('57%');
  });

  it('renders ornamental divider', () => {
    render(<LevelGridHeader {...defaultProps} />);
    expect(screen.getByTestId('ornamental-divider')).toBeInTheDocument();
  });

  it('renders 0% mastery when no levels completed', () => {
    render(<LevelGridHeader {...defaultProps} completedLevels={0} worldStars={0} />);
    const ring = screen.getByTestId('mastery-ring');
    expect(ring).toHaveTextContent('0%');
  });

  it('renders 100% mastery when all levels completed', () => {
    render(<LevelGridHeader {...defaultProps} completedLevels={7} worldStars={21} />);
    const ring = screen.getByTestId('mastery-ring');
    expect(ring).toHaveTextContent('100%');
  });
});
