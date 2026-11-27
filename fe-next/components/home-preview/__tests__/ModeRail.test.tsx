import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

vi.mock('@/utils/growthTracking', () => ({ trackLandingCtaClick: vi.fn() }));

import { ModeRail } from '../ModeRail';
import { trackLandingCtaClick } from '@/utils/growthTracking';
import { en } from '@/translations/en';

const t = (key: string) => key.split('.').reduce<unknown>((o, k) => (o as Record<string, unknown> | undefined)?.[k], en) as string;

describe('ModeRail (pick a mode tiles)', () => {
  it('given the row, then it is four filled colour-coded square tiles, each deep-linked, in one row', () => {
    render(<ModeRail lang="he" t={t} />);
    const row = screen.getByTestId('hp-keycaps');
    expect(row.className).toMatch(/grid-cols-4/);
    const links = Array.from(row.querySelectorAll('a'));
    expect(links.map((a) => a.getAttribute('href'))).toEqual([
      '/he/quick-play?mode=classic',
      '/he/quick-play?mode=blast',
      '/he/quick-play?mode=word-hunt',
      '/he/quick-play?mode=wheel-rush',
    ]);
    expect(links.map((a) => a.className.match(/bg-neo-(lime|pink|cyan|purple)/)?.[1])).toEqual(['lime', 'pink', 'cyan', 'purple']);
    for (const a of links) expect(a.className).toMatch(/aspect-square/);
    expect(links[0].textContent).toBe(en.quickPlay.solo.mode.classic);
  });

  it('given a tile, then it presses with the chunky lip and fires no hero PLAY event', () => {
    vi.mocked(trackLandingCtaClick).mockClear();
    render(<ModeRail lang="en" t={t} />);
    const tile = screen.getByTestId('hp-keycaps').querySelector('a')!;
    fireEvent.pointerDown(tile, { button: 0 });
    expect(tile.getAttribute('data-pressed')).toBe('true');
    fireEvent.click(tile);
    expect(trackLandingCtaClick).not.toHaveBeenCalled();
  });
});
