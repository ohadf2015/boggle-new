import React, { createRef } from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import BoardFx from '../BoardFx';
import HintButton from '../HintButton';
import type { HitEvent } from '../../events';

const sfx = { playBossHitSound: vi.fn(), playLongWordBonusSound: vi.fn(), playLegendaryWordSound: vi.fn() };
vi.mock('@/contexts/SoundEffectsContext', () => ({ useSoundEffects: () => sfx }));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguageSafe: () => ({ t: (k: string, p?: Record<string, unknown>) => (p ? `${k}:${JSON.stringify(p)}` : k) }),
}));

function Board() {
  return (
    <div>
      {[0, 1].map((r) => [0, 1].map((c) => <div key={`${r}${c}`} data-row={r} data-col={c}>x</div>))}
    </div>
  );
}

const hit = (over: Partial<HitEvent>): HitEvent => ({ id: 1, word: 'cat', pts: 3, result: 'ok', ...over });

describe('BoardFx', () => {
  beforeEach(() => { vi.useFakeTimers(); Object.values(sfx).forEach((f) => f.mockClear()); });
  afterEach(() => vi.useRealTimers());

  it('given hint cells, when rendered, then one glowing tile per hinted cell', () => {
    render(<BoardFx lastHit={null} shaking={false} hintCells={[{ row: 0, col: 0 }, { row: 0, col: 1 }]}><Board /></BoardFx>);
    expect(screen.getAllByTestId('adv-hint-tile')).toHaveLength(2);
  });

  it('given hint cells, when rendered, then the hint does NOT look like a player selection (no numbered order badges) and marks its start with a bulb + direction arrow', () => {
    render(<BoardFx lastHit={null} shaking={false} hintCells={[{ row: 0, col: 0 }, { row: 0, col: 1 }]}><Board /></BoardFx>);
    expect(document.querySelector('.adv-hint-num')).toBeNull();
    expect(screen.getAllByTestId('adv-hint-bulb')).toHaveLength(1);
    expect(screen.getByTestId('adv-hint-arrow')).toBeTruthy();
  });

  it('given a rejected word, when it lands, then the reason is shown and then cleared', () => {
    render(<BoardFx lastHit={hit({ result: 'short', pts: 0 })} hitPath={[{ row: 0, col: 0 }]} shaking={false}><Board /></BoardFx>);
    expect(screen.getByRole('status').textContent).toBe('adventurePlay.juice.tooShort');
    act(() => { vi.advanceTimersByTime(1000); });
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('given a landed word on a combat level, when impact hits, then a damage number + banner show and the cast clears within 1.2s', () => {
    const stage = createRef<HTMLDivElement>();
    render(
      <>
        <div ref={stage} />
        <BoardFx lastHit={hit({ word: 'reading', pts: 30 })} hitPath={[{ row: 0, col: 0 }, { row: 0, col: 1 }]} shaking={false} targetRef={stage} targetHp={10}><Board /></BoardFx>
      </>,
    );
    expect(document.querySelectorAll('.adv-cast-letter')).toHaveLength(2);
    act(() => { vi.advanceTimersByTime(450); });
    // The number counts UP as it slams in, so it reads differently frame to frame.
    const early = Number(document.querySelector('.adv-dmg')?.textContent);
    expect(early).toBeGreaterThan(-30);
    act(() => { vi.advanceTimersByTime(350); });
    expect(document.querySelector('.adv-dmg')?.textContent).toBe('-30');
    expect(document.querySelector('.adv-banner')?.textContent).toMatch(/adventurePlay\.juice\.(critical|astonishing|whomped)/);
    expect(sfx.playBossHitSound).toHaveBeenCalled();
    expect(sfx.playLegendaryWordSound).toHaveBeenCalled();
    act(() => { vi.advanceTimersByTime(400); });
    expect(screen.queryByTestId('adv-word-cast')).toBeNull();
  });

  it('given a routine 3-letter word, when it lands, then it gets the full cast: praise bubble before impact, then number while the word still hangs in the air', () => {
    render(<BoardFx lastHit={hit({ word: 'cat', pts: 3 })} hitPath={[{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 1, col: 1 }]} shaking={false}><Board /></BoardFx>);
    act(() => { vi.advanceTimersByTime(200); });
    expect(document.querySelector('.adv-banner')?.textContent).toMatch(/adventurePlay\.juice\.(nice|good)/);
    expect(screen.getByTestId('adv-cast-burst')).toBeTruthy();
    act(() => { vi.advanceTimersByTime(300); });
    expect(document.querySelector('.adv-dmg')).not.toBeNull();
    expect(document.querySelectorAll('.adv-cast-letter')).toHaveLength(3);
    expect(document.querySelectorAll('.adv-cast-bolt')).toHaveLength(3);
    // Every letter its own gem glow, not one tier hue.
    const glows = Array.from(document.querySelectorAll<HTMLElement>('.adv-cast-letter')).map((el) => el.style.getPropertyValue('--adv-glow'));
    expect(new Set(glows).size).toBe(3);
    act(() => { vi.advanceTimersByTime(450); });
    expect(document.querySelectorAll('.adv-cast-letter')).toHaveLength(3);
    act(() => { vi.advanceTimersByTime(300); });
    expect(screen.queryByTestId('adv-word-cast')).toBeNull();
  });

  it('given a 6+ letter word longer than any before it, when it lands, then a longest-word ribbon shows; a shorter one after it does not', () => {
    const { rerender } = render(<BoardFx lastHit={hit({ id: 1, word: 'stones', pts: 8 })} hitPath={[{ row: 0, col: 0 }]} shaking={false}><Board /></BoardFx>);
    act(() => { vi.advanceTimersByTime(500); });
    expect(document.querySelector('[data-testid="adv-best-ribbon"]')?.textContent).toBe('adventurePlay.juice.newBest');
    act(() => { vi.advanceTimersByTime(800); });
    rerender(<BoardFx lastHit={hit({ id: 2, word: 'tones', pts: 6 })} hitPath={[{ row: 0, col: 0 }]} shaking={false}><Board /></BoardFx>);
    act(() => { vi.advanceTimersByTime(500); });
    expect(document.querySelector('[data-testid="adv-best-ribbon"]')).toBeNull();
  });

  it('given a 7-letter word vs a 3-letter word, when each lands, then the 7-letter number is far bigger and brings a screen flash', () => {
    const size = (word: string, pts: number) => {
      const { unmount } = render(<BoardFx lastHit={hit({ id: pts, word, pts })} hitPath={[{ row: 0, col: 0 }]} shaking={false}><Board /></BoardFx>);
      act(() => { vi.advanceTimersByTime(450); });
      const px = parseFloat((document.querySelector('.adv-dmg') as HTMLElement).style.fontSize);
      const flash = !!document.querySelector('.adv-crit-flash');
      unmount();
      return { px, flash };
    };
    const small = size('cat', 1);
    const big = size('reading', 11);
    expect(big.px).toBeGreaterThanOrEqual(small.px * 1.8);
    expect(big.flash).toBe(true);
    expect(small.flash).toBe(false);
  });

  it('given the blow empties enemy HP, then the banner reads K.O.', () => {
    render(<BoardFx lastHit={hit({})} hitPath={[{ row: 0, col: 0 }]} shaking={false} targetHp={0}><Board /></BoardFx>);
    act(() => { vi.advanceTimersByTime(700); });
    expect(document.querySelector('.adv-banner')?.textContent).toBe('adventurePlay.juice.ko');
  });

  it('given a landed word, when the cast is long gone, then a last-hit sticker still reads the damage + praise at the target until the next hit replaces it', () => {
    const stage = createRef<HTMLDivElement>();
    const ui = (h: HitEvent) => (
      <>
        <div ref={stage} />
        <BoardFx lastHit={h} hitPath={[{ row: 0, col: 0 }, { row: 0, col: 1 }]} shaking={false} targetRef={stage} targetHp={50}><Board /></BoardFx>
      </>
    );
    const { rerender } = render(ui(hit({ id: 1, word: 'reading', pts: 30 })));
    expect(screen.queryByTestId('adv-hit-mark')).toBeNull();
    act(() => { vi.advanceTimersByTime(4000); });
    expect(screen.queryByTestId('adv-word-cast')).toBeNull();
    const mark = screen.getByTestId('adv-hit-mark');
    expect(mark.textContent).toContain('-30');
    expect(mark.textContent).toMatch(/adventurePlay\.juice\.(critical|astonishing|whomped)/);
    expect(mark.dataset.tier).toBe('crit');
    rerender(ui(hit({ id: 2, word: 'cat', pts: 3 })));
    act(() => { vi.advanceTimersByTime(4000); });
    expect(screen.getAllByTestId('adv-hit-mark')).toHaveLength(1);
    expect(screen.getByTestId('adv-hit-mark').textContent).toContain('-3');
  });

  it('given the level stops (result / draft screen), then the last-hit sticker is removed', () => {
    const { rerender } = render(<BoardFx lastHit={hit({ id: 1, pts: 4 })} hitPath={[{ row: 0, col: 0 }]} shaking={false}><Board /></BoardFx>);
    act(() => { vi.advanceTimersByTime(2000); });
    expect(screen.getByTestId('adv-hit-mark')).toBeTruthy();
    rerender(<BoardFx lastHit={hit({ id: 1, pts: 4 })} hitPath={[{ row: 0, col: 0 }]} shaking={false} active={false}><Board /></BoardFx>);
    expect(screen.queryByTestId('adv-hit-mark')).toBeNull();
  });

  it('given a rejected word, then the last-hit sticker is left as it was', () => {
    const { rerender } = render(<BoardFx lastHit={hit({ id: 1, pts: 4 })} hitPath={[{ row: 0, col: 0 }]} shaking={false}><Board /></BoardFx>);
    act(() => { vi.advanceTimersByTime(2000); });
    rerender(<BoardFx lastHit={hit({ id: 2, result: 'invalid', pts: 0 })} hitPath={[{ row: 0, col: 0 }]} shaking={false}><Board /></BoardFx>);
    act(() => { vi.advanceTimersByTime(2000); });
    expect(screen.getByTestId('adv-hit-mark').textContent).toContain('+4');
  });

  it('given a CRIT word, then its praise is a screen-wide slab; given the same word as a deed (DeedStamp owns the slab), then it stays a bubble', () => {
    const { unmount } = render(<BoardFx lastHit={hit({ word: 'reading', pts: 30 })} hitPath={[{ row: 0, col: 0 }]} shaking={false}><Board /></BoardFx>);
    expect(screen.getByTestId('adv-praise').dataset.slab).toBe('1');
    unmount();
    render(<BoardFx lastHit={hit({ id: 2, word: 'reading', pts: 30, praiseKey: 'adventurePlay.deed.crushed' })} hitPath={[{ row: 0, col: 0 }]} shaking={false}><Board /></BoardFx>);
    expect(screen.getByTestId('adv-praise').dataset.slab).toBeUndefined();
    expect(screen.getByTestId('adv-praise').textContent).toBe('adventurePlay.deed.crushed');
  });

  it('given a non-combat level, then the number reads as points (+N)', () => {
    render(<BoardFx lastHit={hit({ pts: 4 })} hitPath={[{ row: 0, col: 0 }]} shaking={false}><Board /></BoardFx>);
    act(() => { vi.advanceTimersByTime(300); });
    act(() => { vi.advanceTimersByTime(500); });
    expect(document.querySelector('.adv-dmg')?.textContent).toBe('+4');
  });
});

describe('HintButton', () => {
  it('shows the charge count and fires onHint', () => {
    const onHint = vi.fn();
    render(<HintButton hintsLeft={2} onHint={onHint} />);
    fireEvent.click(screen.getByTestId('adv-hint-button'));
    expect(onHint).toHaveBeenCalledOnce();
    expect(screen.getByTestId('adv-hint-button').textContent).toContain('2');
  });
  it('is disabled with no charges left', () => {
    render(<HintButton hintsLeft={0} onHint={vi.fn()} />);
    expect(screen.getByTestId('adv-hint-button')).toBeDisabled();
  });
});
