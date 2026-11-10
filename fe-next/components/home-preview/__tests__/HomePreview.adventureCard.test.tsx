import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { HomePreview } from '../HomePreview';

const moreGamesProps = vi.fn();

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

describe('HomePreview — Adventure card', () => {
  it('Given the live home, then the Adventure card sits right before the games shelf, and the shelf drops its own Adventure door', () => {
    render(<HomePreview />);
    const order = Array.from(document.querySelectorAll('[data-testid^="slot-"]')).map((el) => el.getAttribute('data-testid'));
    expect(order.indexOf('slot-adventure')).toBe(order.indexOf('slot-games') - 1);
    expect(order.indexOf('slot-adventure')).toBeGreaterThan(order.indexOf('slot-daily'));
    expect(moreGamesProps).toHaveBeenCalledWith(expect.objectContaining({ hideAdventure: true }));
  });
});
