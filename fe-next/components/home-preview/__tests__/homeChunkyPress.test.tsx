import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null, loading: false }) }));
vi.mock('@/utils/onboardingStorage', () => ({ hasSupabaseSession: () => false }));

import { MoreGames } from '../MoreGames';
import { DailyBlock } from '../DailyBlock';
import { FriendsBlock } from '../FriendsBlock';

const t = (k: string) => k;
const OLD_PRESS = /active:shadow-hard-pressed|active:translate-x/;

function expectChunky(el: HTMLElement) {
  expect(el.className).not.toMatch(OLD_PRESS);
  fireEvent.pointerDown(el, { button: 0 });
  expect(el.getAttribute('data-pressed')).toBe('true');
  fireEvent.pointerUp(el);
}

describe('home below the fold', () => {
  it('given the more-games shelf, then every card presses with the chunky lip', () => {
    render(<MoreGames lang="en" t={t} />);
    const shelf = screen.getByTestId('hp-games').querySelector('ul')!;
    const cards = Array.from(shelf.querySelectorAll('a')) as HTMLElement[];
    expect(cards.length).toBeGreaterThan(0);
    cards.forEach(expectChunky);
    expectChunky(screen.getByTestId('hp-games-more-tower'));
  });

  it('given the daily card, then its play button presses with the chunky lip', () => {
    render(<DailyBlock lang="en" t={t} streak={2} streakLoading={false} />);
    expectChunky(screen.getByTestId('hp-daily-cta'));
  });

  it('given the guest friends card, then "start a room" is its one button and joining by code is a quieter link', () => {
    render(<FriendsBlock lang="en" t={t} showAvatars={false} />);
    const start = screen.getByTestId('hp-friends-start');
    expectChunky(start);
    const join = screen.getByTestId('hp-friends-join');
    expect(join.className).not.toMatch(/border-\[3px\]|shadow/);
  });
});
