import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

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
      bubble={null}
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

  it('given the hero, then it is four tiers in order: avatar island, PLAY, friends+daily cards, mode tiles', () => {
    renderHero();
    const hero = screen.getByTestId('hp-hero');
    const order = ['hp-avatar-slot', 'hp-play-now', 'hp-secondary', 'hp-keycaps'].map((id) => screen.getByTestId(id));
    for (let i = 1; i < order.length; i++) expect(order[i - 1].compareDocumentPosition(order[i]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    for (const el of order) expect(hero.contains(el)).toBe(true);
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

  it('given the hero, when the friends card is tapped, then the click is tracked', () => {
    mockTrackCta.mockClear();
    renderHero();
    fireEvent.click(screen.getByTestId('hp-play-friends'));
    expect(mockTrackCta).toHaveBeenCalledWith('home_play_friends');
  });

  it('given the hero, then the 60s badge is gone (the H1 already says 60 seconds)', () => {
    renderHero();
    expect(screen.queryByTestId('hp-timer-badge')).toBeNull();
  });

  it('given the hero, then the H1 is unchanged and the first paragraph after it says what LexiClash is', () => {
    renderHero();
    const title = screen.getByRole('heading', { level: 1 });
    expect(title.textContent).toBe(en.homePlay.heroLine);
    const intro = title.parentElement?.querySelector('h1 + p');
    expect(intro?.textContent).toBe(en.homePlay.intro);
  });

  it('given a bubble line, then the mascot says it; given none yet, then the bubble keeps its box but says nothing', () => {
    const { unmount } = renderHero({ bubble: 'Ready for a word battle?' });
    expect(screen.getByTestId('hp-bubble').textContent).toBe('Ready for a word battle?');
    unmount();
    renderHero({ bubble: null });
    expect(screen.getByTestId('hp-bubble').textContent).toBe('');
  });

  it('given the hero, then the avatar and its edit pencil arrive through bridge slots, not the landing bundle', () => {
    renderHero();
    expect(screen.getByTestId('hp-avatar-slot').className).toMatch(/(^|\s)h-\[104px\](\s|$)/);
    expect(screen.getByTestId('hp-edit-avatar-slot')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Edit avatar' })).toBeNull();
  });

  it('given no avatar yet (signed-in profile loading), then a neutral placeholder shows instead of a face', () => {
    renderHero({ avatar: null });
    expect(screen.getByTestId('hp-avatar-skeleton')).toBeInTheDocument();
    expect(screen.queryByTestId('hp-edit-avatar-slot')).toBeNull();
  });

  it('given the hero, then the mascot is decorative, hidden from assistive tech, and rigged to move', () => {
    renderHero();
    const mascot = screen.getByTestId('hp-mascot');
    expect(mascot.closest('[aria-hidden="true"]')).not.toBeNull();
    expect(mascot.closest('[data-testid="mascot-rig"]')).not.toBeNull();
  });

  it('given the hero, then the mascot ships both holiday outfits for the html holiday class to reveal', () => {
    renderHero();
    const srcs = Array.from(screen.getByTestId('hp-mascot').querySelectorAll('img')).map((i) => i.getAttribute('src') ?? '');
    expect(srcs.some((s) => s.includes('m-hanukkah'))).toBe(true);
    expect(srcs.some((s) => s.includes('m-christmas'))).toBe(true);
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
});
