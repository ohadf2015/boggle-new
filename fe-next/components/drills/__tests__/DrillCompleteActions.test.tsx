/**
 * DrillCompleteActions — the shared post-round footer for every brain drill.
 *
 * Founder report (2026-05-23): after finishing a drill the only options were
 * Play Again (same drill) and Exit — nothing prompted the player toward another
 * game. This footer adds a "Next: <drill>" suggestion (next unlocked drill) and
 * a Daily Challenge link, so there's always somewhere to keep going.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const push = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}));

vi.mock('framer-motion', () => ({
  m: {
    button: ({ children, className, onClick, ...props }: React.HTMLAttributes<HTMLButtonElement> & { onClick?: () => void }) => (
      <button className={className} onClick={onClick} {...props}>{children}</button>
    ),
    div: ({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
      <div className={className} {...props}>{children}</div>
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const langValue = {
  t: (key: string, vars?: Record<string, unknown>) =>
    vars ? `${key}:${Object.values(vars).join(',')}` : key,
  language: 'en',
  dir: 'ltr',
};
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => langValue,
}));

let totalGames = 100;
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ profile: { total_games: totalGames } }),
}));

import DrillCompleteActions from '../DrillCompleteActions';

describe('DrillCompleteActions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    totalGames = 100;
  });

  it('renders Play Again and calls the callback', () => {
    const onPlayAgain = vi.fn();
    render(<DrillCompleteActions currentDrillId="lightning-round" onPlayAgain={onPlayAgain} onExit={vi.fn()} />);
    fireEvent.click(screen.getByTestId('drill-play-again'));
    expect(onPlayAgain).toHaveBeenCalledTimes(1);
  });

  it('renders Exit and calls the callback when provided', () => {
    const onExit = vi.fn();
    render(<DrillCompleteActions currentDrillId="lightning-round" onPlayAgain={vi.fn()} onExit={onExit} />);
    fireEvent.click(screen.getByTestId('drill-exit'));
    expect(onExit).toHaveBeenCalledTimes(1);
  });

  it('suggests the next unlocked drill and routes to it', () => {
    render(<DrillCompleteActions currentDrillId="lightning-round" onPlayAgain={vi.fn()} onExit={vi.fn()} />);
    const next = screen.getByTestId('drill-next');
    expect(next).toBeInTheDocument();
    fireEvent.click(next);
    expect(push).toHaveBeenCalledWith('/en/brain/drills/memory-hunt');
  });

  it('routes to the daily challenge', () => {
    render(<DrillCompleteActions currentDrillId="lightning-round" onPlayAgain={vi.fn()} onExit={vi.fn()} />);
    fireEvent.click(screen.getByTestId('drill-daily'));
    expect(push).toHaveBeenCalledWith('/en/daily');
  });

  it('skips locked drills when picking the next suggestion', () => {
    totalGames = 0; // pattern-switcher (5) and rare-gems (10) locked
    render(<DrillCompleteActions currentDrillId="combo-master" onPlayAgain={vi.fn()} onExit={vi.fn()} />);
    fireEvent.click(screen.getByTestId('drill-next'));
    expect(push).toHaveBeenCalledWith('/en/brain/drills/lightning-round');
  });
});
