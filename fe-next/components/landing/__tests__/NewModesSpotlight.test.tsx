/**
 * The new-modes spotlight: Adventure + Word Tower as a featured pair with key
 * art, shared by the fresh "Pick your game" section and the returning-home
 * announcement. Clicks keep the same mode_selected + landing CTA events as the
 * mode cards, tagged with the surface, so funnels can compare placements.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/react';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en', dir: 'ltr' }),
}));
const trackLandingCtaClick = vi.fn();
const trackModeSelected = vi.fn();
const trackGrowthEvent = vi.fn();
vi.mock('@/utils/growthTracking', () => ({
  trackGrowthEvent: (...a: unknown[]) => trackGrowthEvent(...a),
  trackLandingCtaClick: (...a: unknown[]) => trackLandingCtaClick(...a),
  trackModeSelected: (...a: unknown[]) => trackModeSelected(...a),
}));

import { NewModesSpotlight } from '../NewModesSpotlight';

function spot(container: HTMLElement, mode: string) {
  const a = container.querySelector<HTMLAnchorElement>(`a[data-spotlight-mode="${mode}"]`);
  if (!a) throw new Error(`no spotlight link for ${mode}`);
  return a;
}

describe('NewModesSpotlight', () => {
  beforeEach(() => {
    trackLandingCtaClick.mockClear();
    trackModeSelected.mockClear();
  });

  it('Given the spotlight, then Adventure and Word Tower link to their localized routes', () => {
    const { container } = render(<NewModesSpotlight surface="fresh" />);
    expect(spot(container, 'adventure').getAttribute('href')).toBe('/en/adventure');
    expect(spot(container, 'wordTowerV2').getAttribute('href')).toBe('/en/word-tower');
  });

  it('Given each card, then it carries key art, a NEW sticker, a title, a line and a CTA', () => {
    const { container } = render(<NewModesSpotlight surface="fresh" />);
    const adv = spot(container, 'adventure');
    expect(adv.querySelector('img')?.getAttribute('src')).toContain('new-adventure');
    expect(adv.textContent).toContain('landing.badge.new');
    expect(adv.textContent).toContain('newModes.adventureTitle');
    expect(adv.textContent).toContain('newModes.adventureLine');
    expect(adv.textContent).toContain('newModes.playAdventure');
    const wt = spot(container, 'wordTowerV2');
    expect(wt.querySelector('img')?.getAttribute('src')).toContain('new-wordtower');
    expect(wt.textContent).toContain('newModes.wordTowerTitle');
    expect(wt.textContent).toContain('newModes.playWordTower');
  });

  it('When a card is clicked, then mode_selected + the spotlight CTA fire with the surface, and onModeClick gets the mode', () => {
    const onModeClick = vi.fn();
    const { container } = render(<NewModesSpotlight surface="returning" onModeClick={onModeClick} />);
    fireEvent.click(spot(container, 'wordTowerV2'));
    expect(trackModeSelected).toHaveBeenCalledWith('wordTowerV2', 'home');
    expect(trackLandingCtaClick).toHaveBeenCalledWith('new_modes_spotlight', { mode: 'wordTowerV2', surface: 'returning' });
    expect(onModeClick).toHaveBeenCalledWith('wordTowerV2');
    // GA engagement metric stays continuous with the old featured cube/card.
    expect(trackGrowthEvent).toHaveBeenCalledWith('featured_mode_card_clicked', { mode: 'wordTowerV2', surface: 'returning' });
  });

  it('Given the spotlight, then it includes the loot peek (the variable-reward hook)', () => {
    const { container } = render(<NewModesSpotlight surface="fresh" />);
    expect(container.querySelector('[data-loot-peek]')).not.toBeNull();
  });

  it('Given the art, then it is decorative (alt="") so the headline carries meaning', () => {
    const { container } = render(<NewModesSpotlight surface="fresh" />);
    for (const img of container.querySelectorAll('a[data-spotlight-mode] img')) {
      expect(img.getAttribute('alt')).toBe('');
    }
  });

  it('Given the returning home (above the fold), then art loads eagerly; below the fold on fresh it stays lazy', () => {
    const ret = render(<NewModesSpotlight surface="returning" />);
    expect(ret.container.querySelector('a[data-spotlight-mode] img')?.getAttribute('loading')).toBe('eager');
    ret.unmount();
    const fresh = render(<NewModesSpotlight surface="fresh" />);
    expect(fresh.container.querySelector('a[data-spotlight-mode] img')?.getAttribute('loading')).toBe('lazy');
  });
});
