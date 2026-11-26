import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

vi.mock('@/components/quick-play/QuickResultsFx', () => ({ QuickResultsRays: () => null, SparkleLoop: () => null }));
vi.mock('@/utils/growthTracking', () => ({ trackLandingCtaClick: vi.fn() }));
const grFlag = vi.hoisted(() => ({ value: null as string | null, calls: [] as { key: string; enabled: boolean }[] }));
vi.mock('@/hooks/useGrowthRadarFlag', () => ({
  useGrowthRadarFlag: (key: string, enabled = true) => {
    grFlag.calls.push({ key, enabled });
    return enabled ? grFlag.value : null;
  },
}));

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
  it('given any visitor, then the hero never asks the old hero-CTA experiment flag', () => {
    grFlag.calls = [];
    renderHero({ onPlay: vi.fn() });
    renderHero();
    expect(grFlag.calls).toHaveLength(0);
  });

  it('given the hero, then exactly one primary action exists and it is the big solo PLAY', () => {
    renderHero();
    const primaries = document.querySelectorAll('[data-hero-primary]');
    expect(primaries).toHaveLength(1);
    const play = screen.getByTestId('hp-play-now');
    expect(primaries[0]).toBe(play);
    expect(play.textContent).toContain(en.homePlay.playNow);
    expect(play.className).toContain('bg-neo-lime');
  });

  it('given a returning device, then PLAY deep-links a classic round', () => {
    window.localStorage.setItem('lexiclash_quick_guest_v1', JSON.stringify({ points: 20, history: [20], coinsPending: 0, xpPending: 0, bestByMode: {}, lastPlayedDay: null, dayStreak: 0 }));
    renderHero({ lang: 'he' });
    expect(screen.getByTestId('hp-play-now').getAttribute('href')).toBe('/he/quick-play?mode=classic');
  });

  it('given PLAY, when it is pressed, then it sinks onto its lip (chunky press) and still navigates', () => {
    const onPlay = vi.fn();
    renderHero({ onPlay });
    const play = screen.getByTestId('hp-play-now');
    fireEvent.pointerDown(play, { button: 0 });
    expect(play.getAttribute('data-pressed')).toBe('true');
    fireEvent.pointerUp(play);
    expect(play.getAttribute('data-pressed')).toBeNull();
    fireEvent.click(play);
    expect(onPlay).toHaveBeenCalledTimes(1);
  });

  it('given the hero, then friends and daily share one secondary row under PLAY, neither styled as primary', () => {
    renderHero({ lang: 'he' });
    const row = screen.getByTestId('hp-secondary');
    const friends = screen.getByTestId('hp-play-friends');
    const daily = screen.getByTestId('hp-chip-daily');
    expect(row.contains(friends) && row.contains(daily)).toBe(true);
    expect(friends.getAttribute('href')).toBe('/he/multiplayer?autoCreate=true');
    expect(friends.textContent).toContain(en.homePlay.friendsPlay);
    for (const el of [friends, daily]) expect(el.className).not.toContain('shadow-hard-lg');
    expect(screen.getByTestId('hp-play-now').compareDocumentPosition(row) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('given the hero, then the 60s badge is gone (the H1 already says 60 seconds)', () => {
    renderHero();
    expect(screen.queryByTestId('hp-timer-badge')).toBeNull();
  });

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

  // Phone report 2026-11-12: in a mobile browser (short viewport, avatar at
  // 0.7) the pencil sat end-7/bottom-8, right on the face. It now hugs the
  // avatar's lower-end rim at both scales.
  it('given a short phone, then the edit button sits at the avatar rim, not on the face', () => {
    renderHero();
    const pos = screen.getByTestId('hp-edit-avatar-slot').parentElement?.className.split(/\s+/) ?? [];
    expect(pos).toEqual(expect.arrayContaining(['-end-3', '-bottom-3', '[@media(max-height:700px)]:end-0', '[@media(max-height:700px)]:bottom-0']));
    expect(pos.some((c) => /end-7|bottom-8/.test(c))).toBe(false);
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

  it('given the hero, then there is no separate "Join with a code" button (the multiplayer page has the code entry)', () => {
    renderHero();
    expect(screen.queryByTestId('hp-join-code')).toBeNull();
  });

  it('given today\'s daily is not played, then the daily chip shows no Done and no countdown', () => {
    renderHero({ playedToday: false });
    const daily = screen.getByTestId('hp-chip-daily');
    expect(daily.getAttribute('href')).toBe('/en/daily');
    expect(daily.textContent).toContain(en.homePlay.chipDaily);
    expect(daily.textContent).not.toContain(en.homePlay.dailyDone);
    expect(screen.queryByTestId('hp-daily-next')).toBeNull();
  });

  it('given today\'s daily is done, then the chip says Done and shows the time to the next puzzle', () => {
    renderHero({ streak: 5, playedToday: true });
    const daily = screen.getByTestId('hp-chip-daily');
    expect(daily.textContent).toContain(en.homePlay.dailyDone);
    expect(screen.getByTestId('hp-daily-next').textContent).toMatch(/^\d{2}:\d{2}:\d{2}$/);
    expect(daily.textContent).toMatch(/Next puzzle in \d{2}:\d{2}:\d{2}/);
  });

  it('given the streak is still loading, then the daily card shows neither done nor a countdown', () => {
    renderHero({ streakLoading: true, playedToday: true });
    expect(screen.getByTestId('hp-chip-daily').textContent).not.toContain(en.homePlay.dailyDone);
    expect(screen.queryByTestId('hp-daily-next')).toBeNull();
  });

  it('given the hero, when "Play with friends" is tapped, then the click is tracked', () => {
    mockTrackCta.mockClear();
    renderHero();
    fireEvent.click(screen.getByTestId('hp-play-friends'));
    expect(mockTrackCta).toHaveBeenCalledWith('home_play_friends');
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
    expect(chip.getAttribute('aria-label')).toContain('Play today to keep your 4-day streak');
    expect(chip.textContent).toContain('4');
    expect(chip.querySelector('[data-testid="streak-flame"]')?.getAttribute('data-mood')).toBe('worried');
  });

  it('given the streak is loading, then the daily chip shows no streak number yet', () => {
    renderHero({ streak: 4, streakLoading: true });
    expect(screen.getByTestId('hp-chip-daily').textContent).not.toContain('streak');
  });

  it('given the mode row, then it is a calm row of the other four modes, each deep-linked, none counted as hero PLAY', () => {
    mockTrackCta.mockClear();
    renderHero({ lang: 'he', onPlay: vi.fn() });
    const row = screen.getByTestId('hp-keycaps');
    const links = Array.from(row.querySelectorAll('a'));
    expect(links.map((a) => a.getAttribute('href'))).toEqual([
      '/he/quick-play?mode=blast',
      '/he/quick-play?mode=word-hunt',
      '/he/quick-play?mode=wheel-rush',
      '/he/quick-play?mode=random',
    ]);
    for (const a of links) expect(a.className).not.toMatch(/shadow-hard|rotate-/);
    fireEvent.click(links[3]);
    expect(mockTrackCta).not.toHaveBeenCalled();
  });

  it('given a device that never played, then PLAY opens the coached first round', () => {
    window.localStorage.removeItem('lexiclash_quick_guest_v1');
    renderHero({ lang: 'he' });
    expect(screen.getByTestId('hp-play-now').getAttribute('href')).toBe('/he/quick-play?mode=classic&coach=1');
  });

  it('given a new user (onPlay set), when PLAY is tapped, then the funnel numerator fires with opens_ftue:true and the handler runs', () => {
    mockTrackCta.mockClear();
    const onPlay = vi.fn();
    renderHero({ onPlay });
    fireEvent.click(screen.getByTestId('hp-play-now'));
    expect(mockTrackCta).toHaveBeenCalledTimes(1);
    expect(mockTrackCta).toHaveBeenCalledWith('fresh_hero_play', { opens_ftue: true });
    expect(onPlay).toHaveBeenCalledTimes(1);
  });

  it('given a returning user (no onPlay), when PLAY is tapped, then the click still counts with opens_ftue:false and nothing is hijacked', () => {
    mockTrackCta.mockClear();
    renderHero();
    fireEvent.click(screen.getByTestId('hp-play-now'));
    expect(mockTrackCta).toHaveBeenCalledTimes(1);
    expect(mockTrackCta).toHaveBeenCalledWith('fresh_hero_play', { opens_ftue: false });
  });

  // Small bold sub-lines are normal text for WCAG, so they need 4.5:1. The text is
  // black faded by an opacity-NN class over the button's solid fill.
  it.each([
    ['hp-chip-daily', 'homePlay.chipStreak', '#ff6b35'],
  ])('given the %s button, then its sub-line reaches 4.5:1 contrast on the button fill', (testId, key, fill) => {
    renderHero({ streak: 3 });
    const sub = screen.getByTestId(testId).querySelector('[data-sub]') as HTMLElement;
    expect(sub.textContent).toBe(t(key, { n: 3 }));
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
