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

  it('renders the held word as ONE BRICK PER LETTER (not a single word-block)', () => {
    render(
      <WordTowerCrane word="TREE" consecutiveSloppy={0} onDrop={() => {}} t={t} getOffset={() => 0} />,
    );
    const tiles = screen.getAllByTestId('crane-letter');
    expect(tiles).toHaveLength(4);
    expect(tiles.map((el) => el.textContent)).toEqual(['T', 'R', 'E', 'E']);
  });

  it('lays the held word as a HORIZONTAL girder — the floor it is about to become', () => {
    render(
      <WordTowerCrane word="TREE" consecutiveSloppy={0} onDrop={() => {}} t={t} getOffset={() => 0} />,
    );
    const container = screen.getByTestId('crane-block');
    // One row, reading order: the girder on the hook IS the floor that lands, so
    // it must match `towerFloor`'s horizontal course, not hang as a spire.
    expect(container.className).toContain('flex-row');
    expect(container.className).not.toContain('flex-col');
    const tiles = screen.getAllByTestId('crane-letter');
    expect(tiles.map((el) => el.textContent)).toEqual(['T', 'R', 'E', 'E']);
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
    // Fall window is depth-scaled (fallDurationMs) — advance past FALL_MAX.
    act(() => { vi.advanceTimersByTime(600); });
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
    act(() => { vi.advanceTimersByTime(600); });
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
    act(() => { vi.advanceTimersByTime(600); });
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
