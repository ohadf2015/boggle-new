/**
 * WheelRushDomination Tests
 * Mirrors BlastBoardDomination — ranked bars + wheel-specific awards.
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import WheelRushDomination from '../WheelRushDomination';
import type { WheelRushPlayerStats } from '@/shared/types/game';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key }),
}));

vi.mock('framer-motion', () => {
  const React = require('react');
  // eslint-disable-next-line react/display-name
  const MotionDiv = React.forwardRef(
    ({ children, initial, animate, exit, variants, whileHover, whileTap, transition, custom, ...rest }: Record<string, unknown>, ref: React.Ref<HTMLDivElement>) =>
      React.createElement('div', { ...rest, ref }, children as React.ReactNode)
  );
  return {
    m: new Proxy({}, {
      get: (_t: Record<string, unknown>, prop: string) => {
        if (prop === 'div') return MotionDiv;
        // eslint-disable-next-line react/display-name
        return React.forwardRef((props: Record<string, unknown>, ref: React.Ref<HTMLElement>) => {
          const { initial, animate, exit, variants, whileHover, whileTap, transition, custom, ...rest } = props;
          return React.createElement(prop, { ...rest, ref });
        });
      },
    }),
    AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
    useReducedMotion: () => true,
  };
});

vi.mock('@/components/results/shared', () => ({
  ScoreCountUp: ({ to }: { to: number }) => React.createElement('span', null, String(to)),
}));

const stats: Record<string, WheelRushPlayerStats> = {
  alice: { wordsLocked: 5, wordsStolen: 1, wordsStolenFromMe: 0, bestWord: 'CRANES', totalScore: 42 },
  bob:   { wordsLocked: 2, wordsStolen: 4, wordsStolenFromMe: 3, bestWord: 'TRACE',  totalScore: 28 },
  carol: { wordsLocked: 3, wordsStolen: 0, wordsStolenFromMe: 2, bestWord: 'ANT',    totalScore: 15 },
};

describe('WheelRushDomination', () => {
  it('renders null when playerStats is empty', () => {
    const { container } = render(<WheelRushDomination playerStats={{}} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders all players ranked by totalScore', () => {
    render(<WheelRushDomination playerStats={stats} />);
    // Alice appears before Bob before Carol (alice top score 42)
    expect(screen.getAllByText(/alice/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/bob/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/carol/i).length).toBeGreaterThan(0);
  });

  it('renders Locksmith award for player with most wordsLocked', () => {
    const { container } = render(<WheelRushDomination playerStats={stats} />);
    const award = container.querySelector('[data-award="wheelRush.results.locksmith"]');
    expect(award).toBeTruthy();
    expect(award?.textContent).toContain('alice');
    expect(award?.textContent).toContain('5');
  });

  it('renders Bandit award for player with most wordsStolen', () => {
    const { container } = render(<WheelRushDomination playerStats={stats} />);
    const award = container.querySelector('[data-award="wheelRush.results.bandit"]');
    expect(award).toBeTruthy();
    expect(award?.textContent).toContain('bob');
    expect(award?.textContent).toContain('4');
  });

  it('renders Wordsmith award for player with longest bestWord', () => {
    const { container } = render(<WheelRushDomination playerStats={stats} />);
    const award = container.querySelector('[data-award="wheelRush.results.wordsmith"]');
    expect(award).toBeTruthy();
    expect(award?.textContent).toContain('alice');
    expect(award?.textContent).toContain('CRANES');
  });

  it('highlights current user in the ranked bars', () => {
    render(<WheelRushDomination playerStats={stats} currentUsername="bob" />);
    const bobLabel = screen.getAllByText(/bob/i).find(el => el.tagName === 'SPAN');
    expect(bobLabel).toBeTruthy();
  });

  it('skips Bandit award when no player has stolen any word', () => {
    const noSteals: Record<string, WheelRushPlayerStats> = {
      alice: { wordsLocked: 3, wordsStolen: 0, wordsStolenFromMe: 0, bestWord: 'CAT', totalScore: 10 },
      bob:   { wordsLocked: 2, wordsStolen: 0, wordsStolenFromMe: 0, bestWord: 'DOG', totalScore: 8 },
    };
    const { container } = render(<WheelRushDomination playerStats={noSteals} />);
    expect(container.querySelector('[data-award="wheelRush.results.bandit"]')).toBeNull();
  });
});
