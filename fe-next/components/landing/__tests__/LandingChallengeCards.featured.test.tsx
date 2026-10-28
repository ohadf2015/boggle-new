import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LandingChallengeCards } from '../LandingChallengeCards';

const trackModeSelected = vi.fn();
const trackLandingCtaClick = vi.fn();
vi.mock('@/utils/growthTracking', () => ({
  trackModeSelected: (...args: unknown[]) => trackModeSelected(...args),
  trackLandingCtaClick: (...args: unknown[]) => trackLandingCtaClick(...args),
  trackGrowthEvent: vi.fn(),
}));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en', dir: 'ltr' }),
}));
vi.mock('@/components/CrazyGamesSDK', () => ({ useCrazyGames: () => ({ isOnCrazyGamesPlatform: false }) }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null, canSeeInWorkModes: false }) }));

const cohort = { newcomer: false };
vi.mock('@/utils/contextualGuidanceStorage', () => ({ shouldShowGuidance: () => cohort.newcomer }));
vi.mock('@/utils/onboardingStorage', () => ({ hasCompletedOnboarding: () => !cohort.newcomer }));
vi.mock('@/utils/multiplayerProgressStorage', () => ({ isNewPlayer: () => cohort.newcomer, getGamesCompleted: () => 0 }));
vi.mock('@/hooks/useIsPracticeVeteran', () => ({ useIsPracticeVeteran: () => !cohort.newcomer }));

const props = {
  language: 'en',
  activePlayers: 10,
  playerAllTimeBest: null,
  t: (key: string) => key,
};

const anchorKey = (c: HTMLElement) => c.querySelector('[data-testid="mode-cube-anchor"]')?.getAttribute('data-cube-key');

describe('LandingChallengeCards — Blast is the featured hero', () => {
  beforeEach(() => {
    cohort.newcomer = false;
    trackLandingCtaClick.mockClear();
  });

  it('heroes blast for a returning player, with the Recommended badge', () => {
    const { container } = render(<LandingChallengeCards {...props} />);
    expect(anchorKey(container)).toBe('blast');
    const anchor = container.querySelector('[data-testid="mode-cube-anchor"]')!;
    expect(anchor).toHaveTextContent('landing.badge.recommended');
    expect(anchor).toHaveAttribute('data-featured', 'true');
  });

  it('heroes blast for a brand-new player too', () => {
    cohort.newcomer = true;
    const { container } = render(<LandingChallengeCards {...props} />);
    expect(anchorKey(container)).toBe('blast');
  });

  it('heroes blast even when the popularity order leaves it out', () => {
    const { container } = render(<LandingChallengeCards {...props} cardOrder={['daily', 'arena', 'adventure']} />);
    expect(anchorKey(container)).toBe('blast');
  });

  it('sits above the groups, keeps the live arena next, and shows blast only once', () => {
    const { container } = render(<LandingChallengeCards {...props} />);
    const keys = [...container.querySelectorAll('[data-cube-key]')].map((el) => el.getAttribute('data-cube-key'));
    expect(keys.slice(0, 2)).toEqual(['blast', 'arena']);
    expect(container.querySelector('[data-testid="home-featured"] [data-cube-key="blast"]')).toBeTruthy();
    expect(container.querySelectorAll('[data-cube-key="blast"]')).toHaveLength(1);
  });

  it('falls back to the arena hero and drops Blast entirely where Blast has no letters (ru)', () => {
    const { container } = render(<LandingChallengeCards {...props} language="ru" />);
    expect(anchorKey(container)).toBe('arena');
    expect(container.querySelector('[data-cube-key="blast"]')).toBeNull();
  });

  it('flags the featured card on the existing mode_card click event', () => {
    const { container } = render(<LandingChallengeCards {...props} />);
    fireEvent.click(container.querySelector('[data-cube-key="blast"]')!);
    expect(trackLandingCtaClick).toHaveBeenCalledWith('mode_card', expect.objectContaining({ mode: 'blast', featured: true }));
    fireEvent.click(container.querySelector('[data-cube-key="arena"]')!);
    expect(trackLandingCtaClick).toHaveBeenLastCalledWith('mode_card', expect.not.objectContaining({ featured: true }));
  });
});
