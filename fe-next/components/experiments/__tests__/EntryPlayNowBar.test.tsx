import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

const state = vi.hoisted(() => ({ path: '/en/online-word-games-with-friends', returning: false, flag: null as string | null, calls: [] as boolean[] }));
vi.mock('next/navigation', () => ({ usePathname: () => state.path }));
vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ t: (k: string) => k, language: 'en' }) }));
vi.mock('@/utils/onboardingStorage', () => ({ isReturningVisitor: () => state.returning }));
vi.mock('@/lib/seo/isCrawler', () => ({ isCrawler: () => false }));
vi.mock('@/components/CrazyGamesSDK', () => ({ detectCrazyGamesSync: () => false }));
vi.mock('@/utils/growthTracking', () => ({ trackLandingCtaClick: vi.fn() }));
vi.mock('@/hooks/useGrowthRadarFlag', () => ({
  useGrowthRadarFlag: (_k: string, enabled = true) => {
    state.calls.push(enabled);
    return enabled ? state.flag : null;
  },
}));

import { EntryPlayNowBar } from '../EntryPlayNowBar';

describe('EntryPlayNowBar', () => {
  beforeEach(() => {
    state.path = '/en/online-word-games-with-friends';
    state.returning = false;
    state.flag = null;
    state.calls = [];
  });

  it('shows the play-now pill to a new visitor in treatment, linking to the coached first game, and can be dismissed', () => {
    state.flag = 'treatment';
    render(<EntryPlayNowBar />);
    const bar = screen.getByTestId('entry-play-now');
    expect(bar.querySelector('a')?.getAttribute('href')).toBe('/en/quick-play?mode=classic&coach=1');
    fireEvent.click(screen.getByRole('button'));
    expect(screen.queryByTestId('entry-play-now')).toBeNull();
  });

  it('renders nothing in control', () => {
    state.flag = 'control';
    render(<EntryPlayNowBar />);
    expect(screen.queryByTestId('entry-play-now')).toBeNull();
    expect(state.calls).toContain(true);
  });

  it('never asks for the flag for a returning visitor or on a page not under test', () => {
    state.flag = 'treatment';
    state.returning = true;
    render(<EntryPlayNowBar />);
    state.returning = false;
    state.path = '/en/education';
    render(<EntryPlayNowBar />);
    expect(state.calls.every((c) => c === false)).toBe(true);
    expect(screen.queryByTestId('entry-play-now')).toBeNull();
  });
});
