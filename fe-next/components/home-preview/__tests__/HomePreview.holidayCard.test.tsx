import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { HomePreview } from '../HomePreview';

const moreGamesProps = vi.fn();
vi.mock('@/components/holidays/HolidayEventCard', () => ({ default: () => <div data-testid="slot-holiday" /> }));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en', dir: 'ltr' }),
}));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: null, profile: null, loading: false }),
}));
vi.mock('@/hooks/useReducedMotion', () => ({ default: () => true }));
vi.mock('@/hooks/useAccountStreak', () => ({ useAccountStreak: () => ({ streak: 0, loading: false, freezes: 0 }) }));
vi.mock('@/utils/profileStorage', () => ({ getOrCreateStoredCustomAvatar: () => null }));
vi.mock('@/utils/onboardingStorage', () => ({ hasSupabaseSession: () => false }));
vi.mock('@/utils/accountAvatarCache', () => ({ readLastAccountAvatar: () => null }));
vi.mock('../PlayHero', () => ({ PlayHero: () => <div data-testid="slot-hero" /> }));
vi.mock('../DailyBlock', () => ({ DailyBlock: () => <div data-testid="slot-daily" /> }));
vi.mock('../FriendsBlock', () => ({ FriendsBlock: () => <div data-testid="slot-friends" /> }));
vi.mock('../ClassroomStrip', () => ({ ClassroomStrip: () => <div data-testid="slot-classroom" /> }));
vi.mock('@/components/daily/WeeklyThemeCard', () => ({ WeeklyThemeCard: () => <div data-testid="slot-weekly" /> }));
vi.mock('@/components/landing/fresh/FreshAdSlot', () => ({ FreshAdSlot: () => <div data-testid="slot-ad" /> }));
vi.mock('@/components/landing/home/HomeAdventureCard', () => ({ HomeAdventureCard: () => <div data-testid="slot-adventure" /> }));
vi.mock('../MoreGames', () => ({
  MoreGames: (props: Record<string, unknown>) => {
    moreGamesProps(props);
    return <div data-testid="slot-games" />;
  },
}));

describe('HomePreview — holiday event card', () => {
  it('Given the home for any visitor, then the holiday track is the first full-width card above the daily block', () => {
    render(<HomePreview />);
    const order = Array.from(document.querySelectorAll('[data-testid^="slot-"]')).map((el) => el.getAttribute('data-testid'));
    expect(order.indexOf('slot-holiday')).toBe(order.indexOf('slot-daily') - 1);
    const cell = document.querySelector('[data-testid="slot-holiday"]')!.parentElement!;
    expect(cell.className).toContain('lg:col-span-2');
    expect(cell.closest('[data-testid="hp-cards"]')).not.toBeNull();
  });
});
