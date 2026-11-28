import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';

vi.mock('@/utils/growthTracking', () => ({ trackLandingCtaClick: vi.fn(), trackGrowthEvent: vi.fn() }));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'he', dir: 'rtl' }),
}));
vi.mock('next/dynamic', () => ({ default: () => () => null }));

import { PlayHero } from '../PlayHero';
import { HeroQuickLinks } from '../HeroQuickLinks';
import { DailyBlock } from '../DailyBlock';
import { ModeRail } from '../ModeRail';
import { weekStrip } from '@/lib/daily/streakRewards';

const t = (key: string) => key;

function stubTouchPhone() {
  window.matchMedia = ((query: string) => ({
    matches: query.includes('pointer: coarse') || query.includes('hover: none'),
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}

beforeEach(() => {
  stubTouchPhone();
  Element.prototype.animate = vi.fn(() => ({ cancel: vi.fn() }) as unknown as Animation) as unknown as Element['animate'];
});
afterEach(() => {
  delete (Element.prototype as Partial<Element>).animate;
});

function renderHero(props: Partial<React.ComponentProps<typeof PlayHero>> = {}) {
  return render(
    <PlayHero lang="he" t={t} animate avatar={null} bubble="hi" streak={0} streakLoading={false} onAvatarSaved={vi.fn()} {...props} />,
  );
}

describe('Home live motion on a touch phone', () => {
  it('Given a touch phone, When the home is open, Then the hero rays keep spinning (not frozen for phones)', () => {
    renderHero();
    expect(screen.getByTestId('quick-results-rays')).toHaveAttribute('data-spinning', 'true');
  });

  it('Given motion on, Then PLAY carries a shine sweep layer; with motion off it does not', () => {
    const { unmount } = renderHero();
    expect(within(screen.getByTestId('hp-play-now')).getByTestId('hp-play-shine')).toBeInTheDocument();
    unmount();
    renderHero({ animate: false });
    expect(screen.queryByTestId('hp-play-shine')).toBeNull();
  });

  it('Given a streak line, Then the speech bubble floats and wears a dancing flame badge', () => {
    renderHero({ bubbleFlame: 25 });
    expect(screen.getByTestId('hp-bubble-box')).toHaveAttribute('data-motion', 'float');
    expect(within(screen.getByTestId('hp-bubble-flame')).getByTestId('streak-flame')).toHaveAttribute('data-tier');
  });

  it('Given motion off, Then the bubble is still and has no motion marker', () => {
    renderHero({ animate: false, bubbleFlame: 25 });
    expect(screen.getByTestId('hp-bubble-box')).not.toHaveAttribute('data-motion');
  });

  it('Given motion on, Then the Multiplayer card is live: moving stripes and a ping around its icon', () => {
    render(<HeroQuickLinks lang="he" t={t} animate streak={0} streakLoading={false} />);
    const mp = screen.getByTestId('hp-play-friends');
    expect(mp).toHaveAttribute('data-motion', 'live');
    expect(within(mp).getByTestId('hp-mp-stripes')).toBeInTheDocument();
    expect(within(mp).getByTestId('hp-mp-ping')).toBeInTheDocument();
  });

  it('Given motion off, Then the Multiplayer card is still', () => {
    render(<HeroQuickLinks lang="he" t={t} animate={false} streak={0} streakLoading={false} />);
    expect(screen.getByTestId('hp-play-friends')).not.toHaveAttribute('data-motion');
    expect(screen.queryByTestId('hp-mp-ping')).toBeNull();
  });

  it('Given motion on and a streak, Then the streak card glows behind the flame and today pulses', () => {
    const week = weekStrip(['2026-11-26', '2026-11-27'], [], '2026-11-28');
    render(<DailyBlock lang="he" t={t} animate streak={25} streakLoading={false} atRisk week={week} />);
    const card = screen.getByTestId('hp-daily');
    expect(card).toHaveAttribute('data-motion', 'live');
    expect(within(card).getByTestId('hp-daily-glow')).toBeInTheDocument();
  });

  it('Given motion off, Then the streak card is still', () => {
    render(<DailyBlock lang="he" t={t} animate={false} streak={25} streakLoading={false} />);
    expect(screen.getByTestId('hp-daily')).not.toHaveAttribute('data-motion');
    expect(screen.queryByTestId('hp-daily-glow')).toBeNull();
  });

  it('Given motion on, Then each mode tile floats on its own beat', () => {
    render(<ModeRail lang="he" t={t} animate />);
    const tiles = within(screen.getByTestId('hp-keycaps')).getAllByRole('listitem');
    expect(tiles.every((li) => li.getAttribute('data-motion') === 'float')).toBe(true);
    const delays = new Set(tiles.map((li) => (li.firstElementChild as HTMLElement | null)?.style.animationDelay));
    expect(delays.size).toBe(tiles.length);
  });
});
