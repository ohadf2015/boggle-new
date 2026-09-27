import { describe, it, expect, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en', setLanguage: vi.fn() }),
}));

import WordTowerCrane from '../WordTowerCrane';
import { craneBeamBricks, craneBeamTilePx } from '@/lib/wordTower/craneBeamDisplay';
import {
  CABLE_DRAPE_MAX_PX,
  CRANE_CHROME_H_PX,
  CRANE_SHADOW_Y_PX,
  MIN_FALL_PX,
  craneBeamBottomPx,
  craneCableLenPx,
  craneFallPx,
} from '@/lib/wordTower/craneGeometry';

const baseProps = {
  consecutiveSloppy: 0,
  onDrop: vi.fn(),
  t: (k: string) => k,
  reducedMotion: true,
};

const beamHFor = (word: string) => {
  const { chars } = craneBeamBricks(word);
  // One-row girder: height is a single brick, not a column of `chars.length`.
  return chars.length > 0 ? craneBeamTilePx(chars.length) : 0;
};

describe('WordTowerCrane adaptive hang geometry', () => {
  it('sizes the chrome to the shared geometry constant', () => {
    render(<WordTowerCrane {...baseProps} word="CAT" />);
    expect(screen.getByTestId('crane-chrome').style.height).toBe(`${CRANE_CHROME_H_PX}px`);
    cleanup();
  });

  it.each(['CAT', 'STACKING'])('cable adapts so the girder always hangs above its shadow (%s)', (word) => {
    render(<WordTowerCrane {...baseProps} word={word} />);
    const cable = screen.getByTestId('crane-cable');
    expect(cable.style.height).toBe(`${craneCableLenPx(beamHFor(word))}px`);
    cleanup();
  });

  // The old rule was "pay out as much cable as possible", so a long word had to
  // be given a SHORTER cable to keep its girder off the shadow — this test
  // pinned that. The crane now holds its load high on a short drape instead, so
  // the meaningful invariant is no longer relative cable length between words;
  // it is that a longer girder never steals the fall. (Drop distance per word
  // length is covered in lib/wordTower/__tests__/craneDropPhysics.test.ts.)
  it('never pays out more cable than the short jib drape, at any word length', () => {
    for (const word of ['CAT', 'TOWER', 'STACKING', 'EXTRAORDINARY']) {
      expect(craneCableLenPx(beamHFor(word))).toBeLessThanOrEqual(CABLE_DRAPE_MAX_PX);
    }
  });

  // The girder is ONE ROW now, so a longer word means SMALLER bricks — it hangs
  // marginally higher, not lower (the old vertical column grew downward). What
  // still has to hold at every length is that the load clears its landing mark
  // with a fall the player can actually follow.
  it('clears the landing mark with a readable fall at any word length', () => {
    for (const word of ['CAT', 'TOWER', 'STACKING', 'EXTRAORDINARY']) {
      const h = beamHFor(word);
      expect(craneBeamBottomPx(h)).toBeLessThan(CRANE_SHADOW_Y_PX);
      expect(craneFallPx(h)).toBeGreaterThanOrEqual(MIN_FALL_PX);
    }
  });
});
