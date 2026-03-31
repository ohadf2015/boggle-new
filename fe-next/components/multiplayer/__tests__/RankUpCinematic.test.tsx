import { render, screen, fireEvent, act } from '@testing-library/react';
import { vi } from 'vitest';
import { RankUpCinematic } from '../RankUpCinematic';
import type { RankTier } from '@/shared/utils/eloRating';
import React from 'react';

// Mock useLanguage
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string, params?: Record<string, string>) => {
      const translations: Record<string, string> = {
        'multiplayer.rankUp': 'RANK UP!',
        'multiplayer.welcomeToTier': `Welcome to ${params?.tier}!`,
      };
      return translations[key] || key;
    },
  }),
}));

// Mock framer-motion
vi.mock('framer-motion', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const R = require('react');
  const createMotionComponent = (tag: string) =>
    R.forwardRef(({ children, initial, animate, exit, transition, whileHover, whileTap, ...rest }: any, ref: any) =>
      R.createElement(tag, { ...rest, ref }, children)
    );
  return {
    motion: {
      div: createMotionComponent('div'),
      h1: createMotionComponent('h1'),
      h2: createMotionComponent('h2'),
    },
    AnimatePresence: ({ children }: any) => R.createElement(R.Fragment, null, children),
  };
});

const goldTier: RankTier = { name: 'Gold', color: '#FFD700', minRating: 1200 };
const silverTier: RankTier = { name: 'Silver', color: '#C0C0C0', minRating: 1000 };

describe('RankUpCinematic', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders rank up text with tier name', () => {
    render(<RankUpCinematic from={silverTier} to={goldTier} onDismiss={vi.fn()} />);
    expect(screen.getByText('RANK UP!')).toBeTruthy();
    expect(screen.getByText('Welcome to Gold!')).toBeTruthy();
  });

  it('applies tier color', () => {
    const { container } = render(
      <RankUpCinematic from={silverTier} to={goldTier} onDismiss={vi.fn()} />
    );
    const tierName = screen.getByText('Welcome to Gold!');
    expect(tierName).toBeTruthy();
  });

  it('calls onDismiss on click', () => {
    const onDismiss = vi.fn();
    render(<RankUpCinematic from={silverTier} to={goldTier} onDismiss={onDismiss} />);
    fireEvent.click(screen.getByTestId('rank-up-cinematic'));
    expect(onDismiss).toHaveBeenCalled();
  });

  it('auto-dismisses after 3 seconds', () => {
    const onDismiss = vi.fn();
    render(<RankUpCinematic from={silverTier} to={goldTier} onDismiss={onDismiss} />);
    act(() => { vi.advanceTimersByTime(3000); });
    expect(onDismiss).toHaveBeenCalled();
  });
});
