import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';

// Per-test controllable locale so we can exercise the Hebrew RTL/sofit path.
const langHolder = vi.hoisted(() => ({ lang: 'en' as string }));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    language: langHolder.lang,
    t: (k: string) => k,
    dir: langHolder.lang === 'he' ? 'rtl' : 'ltr',
    setLanguage: vi.fn(),
  }),
}));

import WordTowerCrane from '../WordTowerCrane';

const t = (k: string) => k;

describe('WordTowerCrane — tap-to-drop placement overlay', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.useRealTimers();
    langHolder.lang = 'en';
  });

  it('renders the held word as ONE BRICK PER LETTER, capped at CRANE_BEAM_MAX_BRICKS (not a single word-block)', () => {
    render(
      <WordTowerCrane word="TREE" consecutiveSloppy={0} onDrop={() => {}} t={t} getOffset={() => 0} />,
    );
    const tiles = screen.getAllByTestId('crane-letter');
    // TREE has 4 letters but CRANE_BEAM_MAX_BRICKS=3 caps the display
    expect(tiles).toHaveLength(3);
    expect(tiles.map((el) => el.textContent)).toEqual(['T', 'R', 'E']);
  });

  it('lays the held word as a VERTICAL column so it matches how it settles into the tower', () => {
    render(
      <WordTowerCrane word="TREE" consecutiveSloppy={0} onDrop={() => {}} t={t} getOffset={() => 0} />,
    );
    const container = screen.getByTestId('crane-block');
    // Vertical stack, base-first: flex-col-reverse renders word[0] at the BOTTOM,
    // mirroring the tower (pos 0 = base). A horizontal row would have neither.
    expect(container.className).toContain('flex-col-reverse');
    const tiles = screen.getAllByTestId('crane-letter');
    // CRANE_BEAM_MAX_BRICKS=3 caps the display; last letter hidden behind "+1" badge
    expect(tiles.map((el) => el.textContent)).toEqual(['T', 'R', 'E']);
  });

  it('Hebrew: per-letter tiles keep RTL + final-letter sofit form', () => {
    langHolder.lang = 'he';
    // שלום → 4 tiles; the trailing מ must become its sofit ם, laid out RTL.
    render(
      <WordTowerCrane word="שלום" consecutiveSloppy={0} onDrop={() => {}} t={t} getOffset={() => 0} />,
    );
    const container = screen.getByTestId('crane-block');
    expect(container).toHaveAttribute('dir', 'rtl');
    const tiles = screen.getAllByTestId('crane-letter');
    expect(tiles).toHaveLength(4);
    // applyHebrewFinalLetters runs on the whole word, so the last glyph is sofit.
    expect(tiles[tiles.length - 1].textContent).toBe('ם');
    expect(tiles.map((el) => el.textContent).join('')).toBe('שלום');
  });

  it('a dead-centre drop reports a PERFECT outcome', () => {
    const onDrop = vi.fn();
    render(
      <WordTowerCrane word="TREE" consecutiveSloppy={0} onDrop={onDrop} t={t} getOffset={() => 0} />,
    );
    fireEvent.click(screen.getByTestId('crane-drop'));
    act(() => { vi.advanceTimersByTime(300); });
    expect(onDrop).toHaveBeenCalledTimes(1);
    expect(onDrop.mock.calls[0][0].quality).toBe('perfect');
    expect(onDrop.mock.calls[0][0].heightMultiplier).toBeGreaterThan(1);
  });

  it('a far-off drop reports a MISS', () => {
    const onDrop = vi.fn();
    render(
      <WordTowerCrane word="TREE" consecutiveSloppy={0} onDrop={onDrop} t={t} getOffset={() => 0.9} />,
    );
    fireEvent.click(screen.getByTestId('crane-drop'));
    act(() => { vi.advanceTimersByTime(300); });
    expect(onDrop.mock.calls[0][0].quality).toBe('miss');
  });

  it('only drops once per render (ignores a second tap)', () => {
    const onDrop = vi.fn();
    render(
      <WordTowerCrane word="TREE" consecutiveSloppy={0} onDrop={onDrop} t={t} getOffset={() => 0} />,
    );
    const btn = screen.getByTestId('crane-drop');
    fireEvent.click(btn);
    fireEvent.click(btn); // ignored — already falling
    act(() => { vi.advanceTimersByTime(300); });
    expect(onDrop).toHaveBeenCalledTimes(1);
  });

  it('reports the signed drop offset via onSignedDrop (feeds tower-lean)', () => {
    const onSigned = vi.fn();
    render(
      <WordTowerCrane
        word="TREE"
        consecutiveSloppy={0}
        onDrop={() => {}}
        onSignedDrop={onSigned}
        t={t}
        getOffset={() => -0.4}
      />,
    );
    fireEvent.click(screen.getByTestId('crane-drop'));
    expect(onSigned).toHaveBeenCalledWith(-0.4);
  });
});
