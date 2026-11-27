import { afterEach, describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

vi.mock('@/utils/growthTracking', () => ({ trackLandingCtaClick: vi.fn() }));

import { HeroQuickLinks } from '../HeroQuickLinks';
import { trackLandingCtaClick } from '@/utils/growthTracking';
import { en } from '@/translations/en';

const mockTrackCta = vi.mocked(trackLandingCtaClick);

const t = (key: string, params: Record<string, string | number> = {}) => {
  const v = key.split('.').reduce<unknown>((o, k) => (o as Record<string, unknown> | undefined)?.[k], en);
  return typeof v === 'string' ? v.replace(/\{(\w+)\}/g, (_, k) => String(params[k] ?? '')) : key;
};

function renderRail(overrides: Partial<React.ComponentProps<typeof HeroQuickLinks>> = {}) {
  return render(<HeroQuickLinks lang="en" t={t} animate={false} streak={0} streakLoading={false} {...overrides} />);
}

afterEach(() => {
  delete (Element.prototype as Partial<Element>).animate;
});

describe('HeroQuickLinks', () => {
  it('given the hero row, then friends (pink) and daily (orange) sit side by side as equal half-width cards', () => {
    renderRail({ lang: 'he' });
    const row = screen.getByTestId('hp-secondary');
    const friends = screen.getByTestId('hp-play-friends');
    const daily = screen.getByTestId('hp-chip-daily');
    expect(row.className).toMatch(/grid-cols-2/);
    expect(friends.getAttribute('href')).toBe('/he/multiplayer?autoCreate=true');
    expect(daily.getAttribute('href')).toBe('/he/daily');
    expect(friends.className).toContain('bg-neo-pink');
    expect(daily.className).toContain('bg-neo-orange');
    expect(friends.textContent).toBe(en.homePlay.chipFriends);
  });

  it('given a card tap, then each fires its own event', () => {
    mockTrackCta.mockClear();
    renderRail();
    fireEvent.click(screen.getByTestId('hp-play-friends'));
    expect(mockTrackCta).toHaveBeenCalledWith('home_play_friends');
    fireEvent.click(screen.getByTestId('hp-chip-daily'));
    expect(mockTrackCta).toHaveBeenCalledWith('home_daily_chip');
  });

  it('given today\'s daily is not played, then the daily card is just its label: no Done, no countdown, no sub-line', () => {
    renderRail({ playedToday: false, streak: 4 });
    const daily = screen.getByTestId('hp-chip-daily');
    expect(daily.textContent).toBe(en.homePlay.chipDaily);
    expect(daily.textContent).not.toContain(en.homePlay.dailyDone);
    expect(screen.queryByTestId('hp-daily-next')).toBeNull();
  });

  it('given today\'s daily is done, then the card says Done and shows the time to the next puzzle', () => {
    renderRail({ streak: 5, playedToday: true });
    const daily = screen.getByTestId('hp-chip-daily');
    expect(daily.textContent).toContain(en.homePlay.dailyDone);
    expect(screen.getByTestId('hp-daily-next').textContent).toMatch(/^\d{2}:\d{2}:\d{2}$/);
    expect(daily.textContent).toMatch(/Next puzzle in \d{2}:\d{2}:\d{2}/);
  });

  it('given the streak is loading, then the daily card shows no Done yet', () => {
    renderRail({ streak: 4, streakLoading: true, playedToday: true });
    expect(screen.getByTestId('hp-chip-daily').textContent).not.toContain(en.homePlay.dailyDone);
  });

  it('given the streak is at risk, then the daily card says to play today to keep it, with a worried flame', () => {
    renderRail({ streak: 4, atRisk: true });
    const chip = screen.getByTestId('hp-chip-daily');
    expect(chip.getAttribute('aria-label')).toContain('Play today to keep your 4-day streak');
    expect(chip.querySelector('[data-testid="streak-flame"]')?.getAttribute('data-mood')).toBe('worried');
  });

  it('given motion on and the daily known unplayed, then the daily card pulses exactly once, transform only', () => {
    const calls: { el: Element; frames: Keyframe[]; opts: KeyframeAnimationOptions }[] = [];
    Element.prototype.animate = vi.fn(function (this: Element, frames: Keyframe[], opts: KeyframeAnimationOptions) {
      calls.push({ el: this, frames, opts });
      return {} as Animation;
    }) as unknown as Element['animate'];
    const { rerender } = renderRail({ animate: true, streakLoading: true });
    const pulses = () => calls.filter((c) => c.el.getAttribute('data-testid') === 'hp-chip-daily');
    expect(pulses()).toHaveLength(0);
    rerender(<HeroQuickLinks lang="en" t={t} animate streak={0} streakLoading={false} />);
    rerender(<HeroQuickLinks lang="en" t={t} animate streak={1} streakLoading={false} />);
    expect(pulses()).toHaveLength(1);
    expect(pulses()[0].frames.every((f) => Object.keys(f).join() === 'transform')).toBe(true);
  });

  it('given today\'s daily is done, then the daily card does not pulse', () => {
    const calls: Element[] = [];
    Element.prototype.animate = vi.fn(function (this: Element) {
      calls.push(this);
      return {} as Animation;
    }) as unknown as Element['animate'];
    renderRail({ animate: true, playedToday: true });
    expect(calls.filter((el) => el.getAttribute('data-testid') === 'hp-chip-daily')).toHaveLength(0);
  });
});
