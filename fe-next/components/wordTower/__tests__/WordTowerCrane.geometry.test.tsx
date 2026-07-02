import { describe, it, expect, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en', setLanguage: vi.fn() }),
}));

import WordTowerCrane from '../WordTowerCrane';
import { craneBeamBricks, craneBeamTilePx } from '@/lib/wordTower/craneBeamDisplay';
import { CRANE_CHROME_H_PX, craneCableLenPx } from '@/lib/wordTower/craneGeometry';

const baseProps = {
  consecutiveSloppy: 0,
  onDrop: vi.fn(),
  t: (k: string) => k,
  reducedMotion: true,
};

const beamHFor = (word: string) => {
  const { chars } = craneBeamBricks(word);
  return chars.length * craneBeamTilePx(chars.length);
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

  it('a long word gets a shorter cable than a short word', () => {
    expect(craneCableLenPx(beamHFor('STACKING'))).toBeLessThan(craneCableLenPx(beamHFor('CAT')));
  });
});
