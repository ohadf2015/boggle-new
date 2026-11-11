import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

vi.mock('@/components/quick-play/QuickResultsFx', () => ({ QuickResultsRays: () => null, SparkleLoop: () => null }));
vi.mock('@/utils/growthTracking', () => ({ trackLandingCtaClick: vi.fn() }));

import { PlayHero } from '../PlayHero';
import { trackLandingCtaClick } from '@/utils/growthTracking';

const mockTrackCta = vi.mocked(trackLandingCtaClick);

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

  it('given no avatar yet (signed-in profile loading), then a neutral placeholder shows instead of a face', () => {
    renderHero({ avatar: null });
    expect(screen.getByTestId('hp-avatar-skeleton')).toBeInTheDocument();
    expect(screen.queryByTestId('avatar')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Edit avatar' })).toBeNull();
  });

  it('given the hero, then the mascot is decorative and hidden from assistive tech', () => {
    renderHero();
    const mascot = screen.getByTestId('hp-mascot');
    expect(mascot.closest('[aria-hidden="true"]')).not.toBeNull();
  });

  it('given the hero, then the quick-links row holds the daily puzzle only (multiplayer has its own big button)', () => {
    renderHero({ lang: 'he' });
    const row = screen.getByTestId('hp-quick-links');
    const hrefs = Array.from(row.querySelectorAll('a')).map((a) => a.getAttribute('href'));
    expect(hrefs).toEqual(['/he/daily']);
    expect(screen.queryByTestId('hp-chip-mp')).toBeNull();
  });

  it('given the hero, then "Play with friends" is a big button right after PLAY, before the solo modes', () => {
    renderHero({ lang: 'he' });
    const friends = screen.getByTestId('hp-play-friends');
    expect(friends.getAttribute('href')).toBe('/he/multiplayer');
    expect(friends.textContent).toContain(en.homePlay.friendsPlay);
    expect(friends.textContent).toContain(en.homePlay.friendsPlaySub);
    const play = screen.getByTestId('hp-play');
    const keycaps = screen.getByTestId('hp-keycaps');
    // Document order: PLAY, then friends, then the solo mode keys.
    expect(play.compareDocumentPosition(friends) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(friends.compareDocumentPosition(keycaps) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    // Same hard-shadow button family as PLAY, in the multiplayer pink.
    expect(friends.className).toContain('bg-neo-pink');
    expect(friends.className).toContain('shadow-hard');
  });

  it('given the hero, when "Play with friends" is tapped, then the click is tracked', () => {
    mockTrackCta.mockClear();
    renderHero();
    fireEvent.click(screen.getByTestId('hp-play-friends'));
    expect(mockTrackCta).toHaveBeenCalledWith('home_play_friends', { opens_ftue: false });
  });

  it('given the hero, then the kicker no longer labels the whole hero as solo', () => {
    renderHero();
    const kicker = screen.getByRole('heading', { level: 1 }).previousElementSibling;
    expect(kicker?.textContent).toBe('Hey there');
  });

  it('given a running streak, then the daily chip shows it', () => {
    renderHero({ streak: 4 });
    expect(screen.getByTestId('hp-chip-daily').textContent).toContain('4-day streak');
  });

  it('given the streak is at risk, then the daily chip says to play today to keep it, with a worried flame', () => {
    renderHero({ streak: 4, atRisk: true });
    const chip = screen.getByTestId('hp-chip-daily');
    expect(chip.textContent).toContain('Play today to keep your 4-day streak');
    expect(chip.querySelector('[data-testid="streak-flame"]')?.getAttribute('data-mood')).toBe('worried');
  });

  it('given the streak is loading, then the daily chip shows no streak number yet', () => {
    renderHero({ streak: 4, streakLoading: true });
    expect(screen.getByTestId('hp-chip-daily').textContent).not.toContain('streak');
  });

  it('given a device that never played, then PLAY opens the coached first round', () => {
    window.localStorage.removeItem('lexiclash_quick_guest_v1');
    renderHero({ lang: 'he' });
    expect(screen.getByTestId('hp-play').getAttribute('href')).toBe('/he/quick-play?mode=classic&coach=1');
  });

  it('given the hero, then PLAY deep-links a random round and each mode key deep-links its mode', () => {
    window.localStorage.setItem('lexiclash_quick_guest_v1', JSON.stringify({ points: 20, history: [20], coinsPending: 0, xpPending: 0, bestByMode: {}, lastPlayedDay: null, dayStreak: 0 }));
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
    const onPlay = vi.fn();
    renderHero({ onPlay });
    fireEvent.click(screen.getByTestId('hp-play'));
    expect(mockTrackCta).toHaveBeenCalledTimes(1);
    expect(mockTrackCta).toHaveBeenCalledWith('fresh_hero_play', { opens_ftue: true });
    expect(onPlay).toHaveBeenCalledTimes(1);
  });

  it('given a returning user (no onPlay), when PLAY is tapped, then the click still counts with opens_ftue:false and nothing is hijacked', () => {
    mockTrackCta.mockClear();
    renderHero();
    fireEvent.click(screen.getByTestId('hp-play'));
    expect(mockTrackCta).toHaveBeenCalledTimes(1);
    expect(mockTrackCta).toHaveBeenCalledWith('fresh_hero_play', { opens_ftue: false });
  });

  // Small bold sub-lines are normal text for WCAG, so they need 4.5:1. The text is
  // black faded by an opacity-NN class over the button's solid fill.
  it.each([
    ['hp-play', 'homePlay.playSub', '#bfff00'],
    ['hp-play-friends', 'homePlay.friendsPlaySub', '#ff1493'],
  ])('given the %s button, then its sub-line reaches 4.5:1 contrast on the button fill', (testId, key, fill) => {
    renderHero();
    const sub = screen.getByTestId(testId).querySelector('span span:last-child') as HTMLElement;
    expect(sub.textContent).toBe(t(key));
    const match = sub.className.match(/(?:^|\s)opacity-(\d+)(?:\s|$)/);
    const alpha = match ? Number(match[1]) / 100 : 1;
    expect(contrastOfFadedBlack(alpha, fill)).toBeGreaterThanOrEqual(4.5);
  });
});

function contrastOfFadedBlack(alpha: number, hex: string): number {
  const bg = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const fg = bg.map((c) => c * (1 - alpha));
  const lum = (rgb: number[]) => {
    const [r, g, b] = rgb.map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  return (lum(bg) + 0.05) / (lum(fg) + 0.05);
}
