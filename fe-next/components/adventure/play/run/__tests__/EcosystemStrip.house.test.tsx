/**
 * House style for the "beyond this run" chips.
 *
 * The bar is the app's OWN reward badges — `components/results/BonusBadgesRow`
 * paints xp / level-up / bonus as a SOLID accent fill with black ink, a black
 * border and a hard pixel shadow. The adventure result screens sit on
 * `bg-neo-navy`, where a black border over a translucent black plate measures
 * ~1.2:1 and simply disappears (see `.claude/rules/60-recurring-pitfalls.md`
 * and the neo contrast arithmetic memo). So these chips must be filled, not
 * tinted — otherwise the meta-game reward reads as quieter than the run score
 * right below it, which is exactly backwards.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguageSafe: () => ({ t: (k: string) => k, language: 'en' }),
  useLanguage: () => ({ t: (k: string) => k, language: 'en', dir: 'ltr' }),
}));

import EcosystemStrip from '../EcosystemStrip';
import type { RunResult } from '../../runTypes';

const result = (over: Partial<RunResult> = {}): RunResult => ({
  score: 200, stars: 2, bestStars: 2, won: true, rewards: [], validWords: [], totalStars: 4,
  xpGained: 40, coinsGained: 12, leaderboardPoints: 200, streak: { current: 6, best: 9 },
  achievementsUnlocked: [],
  ...over,
});

const chips = () => Array.from(screen.getByTestId('eco-strip').querySelectorAll('li'));

describe('EcosystemStrip — house style', () => {
  it('Given every gain, then there is one chip per gain', () => {
    render(<EcosystemStrip result={result()} />);
    expect(chips()).toHaveLength(4);
  });

  it('Given a chip, then it is a SOLID accent fill — never a translucent black plate', () => {
    render(<EcosystemStrip result={result()} />);
    for (const li of chips()) {
      const cls = li.className;
      expect(cls).toMatch(/bg-neo-(lime|yellow|cyan|pink)\b/);
      expect(cls).not.toMatch(/bg-black\//);
    }
  });

  it('Given an accent fill, then the ink on it is black — the memo forbids a light label on lime', () => {
    render(<EcosystemStrip result={result()} />);
    for (const li of chips()) expect(li.className).toMatch(/\btext-black\b/);
  });

  it('Given a chip, then it carries the neo edge: black border + hard pixel shadow', () => {
    render(<EcosystemStrip result={result()} />);
    for (const li of chips()) {
      expect(li.className).toMatch(/border-\[3px\]|border-3/);
      expect(li.className).toMatch(/border-black/);
      expect(li.className).toMatch(/shadow-\[/);
    }
  });

  it('Given Hebrew, then the number still reads as a gain — "+40", never "40+"', () => {
    render(<EcosystemStrip result={result({ coinsGained: 0, leaderboardPoints: 0, streak: undefined })} />);
    const value = screen.getByTestId('eco-value-xp');
    expect(value.getAttribute('dir')).toBe('ltr');
  });

  it('Given the coins chip, then its icon is a glyph — the gold coin ART would be yellow on yellow', () => {
    render(<EcosystemStrip result={result()} />);
    // `COIN_ART` is a gold coin; it reads on the dark HUD and ledger, and
    // disappears into `bg-neo-yellow`. Every chip uses a black-ink glyph here.
    expect(screen.getByTestId('eco-strip').querySelector('img')).toBeNull();
  });

  it('Given a streak, then it is stated as a DAY COUNT, not a delta', () => {
    render(<EcosystemStrip result={result({ xpGained: 0, coinsGained: 0, leaderboardPoints: 0 })} />);
    expect(screen.getByTestId('eco-value-streak').textContent).not.toContain('+');
  });
});
