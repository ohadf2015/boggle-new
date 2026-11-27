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
vi.mock('@/components/education/HomeEducationCardConnected', () => ({
  HomeEducationCardConnected: ({ slot }: { slot?: string }) => <div data-testid={`slot-edu-${slot}`} />,
}));
vi.mock('../MoreGames', () => ({
  MoreGames: (props: Record<string, unknown>) => {
    moreGamesProps(props);
    return <div data-testid="slot-games" />;
  },
}));

describe('HomePreview — teacher class entry', () => {
  it('Given the live home, then the teacher class slot comes first, above the play hero', () => {
    render(<HomePreview />);
    const order = Array.from(document.querySelectorAll('[data-testid^="slot-"]')).map((el) => el.getAttribute('data-testid'));
    expect(order[0]).toBe('slot-edu-top');
    expect(order[1]).toBe('slot-hero');
  });
});
