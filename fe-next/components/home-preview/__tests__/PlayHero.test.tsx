import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

vi.mock('@/components/quick-play/QuickResultsFx', () => ({ QuickResultsRays: () => null, SparkleLoop: () => null }));
vi.mock('@/utils/growthTracking', () => ({ trackLandingCtaClick: vi.fn(), trackOnboardingOpenRequested: vi.fn() }));

import { PlayHero } from '../PlayHero';
import { trackLandingCtaClick, trackOnboardingOpenRequested } from '@/utils/growthTracking';

const mockTrackCta = vi.mocked(trackLandingCtaClick);
const mockTrackOpenRequested = vi.mocked(trackOnboardingOpenRequested);

import { en } from '@/translations/en';

const t = (key: string, params: Record<string, string | number> = {}) => {
  const v = key.split('.').reduce<unknown>((o, k) => (o as Record<string, unknown> | undefined)?.[k], en);
  return typeof v === 'string' ? v.replace(/\{(\w+)\}/g, (_, k) => String(params[k] ?? '')) : key;
};

function renderHero(overrides: Partial<React.ComponentProps<typeof PlayHero>> = {}) {
  return render(
    <PlayHero
      lang="en"
      t={t}
      animate={false}
      avatar={{ userId: 'guest', customAvatar: null }}
      greeting="Hey there"
      streak={0}
      streakLoading={false}
      onAvatarSaved={vi.fn()}
      {...overrides}
    />,
  );
}

describe('PlayHero', () => {
  it('given the hero, then the first paragraph after the title says what LexiClash is', () => {
    renderHero();
    const title = screen.getByRole('heading', { level: 1 });
    const intro = title.parentElement?.querySelector('h1 + p');
    expect(intro?.textContent).toBe(en.homePlay.intro);
    const words = (intro?.textContent ?? '').split(/\s+/).filter(Boolean).length;
    expect(words).toBeGreaterThanOrEqual(10);
    expect(words).toBeLessThanOrEqual(60);
  });

  it('given the hero, then the avatar and edit button arrive through bridge slots, not the landing bundle', () => {
    renderHero();
    // Bare slots only — the avatar UI itself is portaled in by HeroAvatarIsland
    // (HeroAvatarIsland.test.tsx), keeping chunk 65990 out of the landing graph.
    expect(screen.getByTestId('hp-avatar-slot')).toBeTruthy();
    expect(screen.getByTestId('hp-edit-avatar-slot')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Edit avatar' })).toBeNull();
  });

  it('given the hero, then the mascot is decorative and hidden from assistive tech', () => {
    renderHero();
    const mascot = screen.getByTestId('hp-mascot');
    expect(mascot.closest('[aria-hidden="true"]')).not.toBeNull();
  });

  it('given the hero, then Daily and Multiplayer entry points link to their routes', () => {
    renderHero({ lang: 'he' });
    const row = screen.getByTestId('hp-quick-links');
    const hrefs = Array.from(row.querySelectorAll('a')).map((a) => a.getAttribute('href'));
    expect(hrefs).toEqual(['/he/daily', '/he/multiplayer']);
  });

  it('given a running streak, then the daily chip shows it', () => {
    renderHero({ streak: 4 });
    expect(screen.getByTestId('hp-chip-daily').textContent).toContain('4-day streak');
  });

  it('given the streak is loading, then the daily chip shows no streak number yet', () => {
    renderHero({ streak: 4, streakLoading: true });
    expect(screen.getByTestId('hp-chip-daily').textContent).not.toContain('streak');
  });

  it('given the hero, then PLAY deep-links a random round and each mode key deep-links its mode', () => {
    renderHero({ lang: 'he' });
    expect(screen.getByTestId('hp-play').getAttribute('href')).toBe('/he/quick-play?mode=random');
    const keys = Array.from(screen.getByTestId('hp-keycaps').querySelectorAll('a')).map((a) => a.getAttribute('href'));
    expect(keys).toEqual([
      '/he/quick-play?mode=classic',
      '/he/quick-play?mode=blast',
      '/he/quick-play?mode=word-hunt',
      '/he/quick-play?mode=wheel-rush',
    ]);
  });

  it('given the hero, then the 60-second badge is a one-line pill so the label never wraps or clips', () => {
    renderHero();
    const badge = screen.getByTestId('hp-timer-badge');
    expect(badge.textContent).toBe(en.homePlay.timerBadge);
    expect(badge.className).toContain('whitespace-nowrap');
    expect(badge.className).not.toMatch(/\bw-14\b|\bh-14\b/);
    expect(badge.getAttribute('aria-hidden')).toBe('true');
  });

  it('given a new user (onPlay set), when PLAY is tapped, then the funnel numerator fires with opens_ftue:true and the handler runs', () => {
    mockTrackCta.mockClear();
    mockTrackOpenRequested.mockClear();
    const onPlay = vi.fn();
    renderHero({ onPlay });
    fireEvent.click(screen.getByTestId('hp-play'));
    expect(mockTrackCta).toHaveBeenCalledTimes(1);
    expect(mockTrackCta).toHaveBeenCalledWith('fresh_hero_play', { opens_ftue: true });
    expect(onPlay).toHaveBeenCalledTimes(1);
    // The allowed:true twin fires from PageClient.handleStartOnboarding (the
    // upgraded onPlay), BEFORE OnboardingFlow mounts — not from the hero.
    expect(mockTrackOpenRequested).not.toHaveBeenCalled();
  });

  it('given a returning user (no onPlay), when PLAY is tapped, then the click still counts with opens_ftue:false, resolves to native nav, and is accounted as allowed:false fallthrough:native_nav', () => {
    mockTrackCta.mockClear();
    mockTrackOpenRequested.mockClear();
    renderHero();
    fireEvent.click(screen.getByTestId('hp-play'));
    expect(mockTrackCta).toHaveBeenCalledTimes(1);
    expect(mockTrackCta).toHaveBeenCalledWith('fresh_hero_play', { opens_ftue: false });
    expect(mockTrackOpenRequested).toHaveBeenCalledTimes(1);
    expect(mockTrackOpenRequested).toHaveBeenCalledWith({ allowed: false, fallthrough: 'native_nav' });
  });

  it('given a modified click (new tab) with onPlay set, when PLAY is clicked, then native behaviour is kept and accounted as allowed:false fallthrough:modified_click', () => {
    mockTrackCta.mockClear();
    mockTrackOpenRequested.mockClear();
    const onPlay = vi.fn();
    renderHero({ onPlay });
    fireEvent.click(screen.getByTestId('hp-play'), { metaKey: true });
    expect(onPlay).not.toHaveBeenCalled();
    expect(mockTrackOpenRequested).toHaveBeenCalledTimes(1);
    expect(mockTrackOpenRequested).toHaveBeenCalledWith({ allowed: false, fallthrough: 'modified_click' });
  });
});
