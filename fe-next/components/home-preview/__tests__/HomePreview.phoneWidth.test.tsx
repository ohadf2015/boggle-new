import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { HomePreview } from '../HomePreview';
import { DailyBlock } from '../DailyBlock';
import { StreakWeekStrip } from '@/components/streak/StreakWeekStrip';
import { weekStrip } from '@/lib/daily/streakRewards';

/**
 * "Homepage not responsive enough" (phone, Nov 16): the home's card column was
 * an implicit `auto` grid track, which sizes itself to its widest unbreakable
 * content (a truncated crew line, the week strip, a nowrap button). It grew
 * past the phone and the wrapper's overflow-x-clip cut every card on the
 * start-opposite edge (the left in Hebrew). jsdom has no layout, so these
 * guard the classes that keep a phone-width track and the content inside it.
 */

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'he', dir: 'rtl' }),
}));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: null, profile: null, loading: false }),
}));
vi.mock('@/hooks/useReducedMotion', () => ({ default: () => true }));
vi.mock('@/utils/profileStorage', () => ({ getOrCreateStoredCustomAvatar: () => null }));
vi.mock('@/utils/onboardingStorage', () => ({ hasSupabaseSession: () => false }));
vi.mock('@/utils/accountAvatarCache', () => ({ readLastAccountAvatar: () => null }));
vi.mock('@/utils/growthTracking', () => ({ trackGrowthEvent: vi.fn(), trackLandingCtaClick: vi.fn() }));
vi.mock('../PlayHero', () => ({ PlayHero: () => <div data-testid="slot-hero" /> }));
vi.mock('../FriendsBlock', () => ({ FriendsBlock: () => <div data-testid="slot-friends" /> }));
vi.mock('../ClassroomStrip', () => ({ ClassroomStrip: () => <div data-testid="slot-classroom" /> }));
vi.mock('../MoreGames', () => ({ MoreGames: () => <div data-testid="slot-games" /> }));
vi.mock('@/components/daily/WeeklyThemeCard', () => ({ WeeklyThemeCard: () => <div data-testid="slot-weekly" /> }));
vi.mock('@/components/landing/fresh/FreshAdSlot', () => ({ FreshAdSlot: () => <div data-testid="slot-ad" /> }));
vi.mock('@/components/landing/home/HomeAdventureCard', () => ({ HomeAdventureCard: () => <div data-testid="slot-adventure" /> }));
vi.mock('@/components/education/HomeEducationCardConnected', () => ({ HomeEducationCardConnected: () => null }));
vi.mock('next/dynamic', () => ({ default: () => () => null }));

const t = (k: string) => k;
const classes = (el: Element | null) => (el?.getAttribute('class') ?? '').split(/\s+/);

describe('Home at phone width', () => {
  it('Given a phone, then the card column is one shrinkable track, not one sized by its widest content', () => {
    render(<HomePreview />);
    const grid = screen.getByTestId('hp-cards');
    // grid-cols-1 = repeat(1, minmax(0, 1fr)): the track takes the phone width.
    expect(classes(grid)).toContain('grid-cols-1');
    for (const cell of Array.from(grid.children)) expect(classes(cell)).toContain('min-w-0');
  });

  it('Given a narrow ticket, then the week strip shrinks to fit instead of a fixed 192px row', () => {
    const week = weekStrip(['2026-11-10'], [], '2026-11-12');
    render(<StreakWeekStrip week={week} size="sm" tone="light" />);
    const strip = screen.getByTestId('streak-week');
    expect(classes(strip)).toContain('w-full');
    for (const day of within(strip).getAllByTestId('streak-week-day')) {
      expect(classes(day)).toEqual(expect.arrayContaining(['min-w-0', 'flex-1']));
    }
  });

  it('Given a long translation, then the daily button wraps on a phone instead of pushing the card wider', () => {
    render(<DailyBlock lang="en" t={t} streak={3} streakLoading={false} />);
    const cta = screen.getByRole('link', { name: /homeFresh\.sections\.daily\.cta/ });
    expect(classes(cta)).not.toContain('whitespace-nowrap');
    expect(classes(cta)).toContain('max-w-full');
  });
});
