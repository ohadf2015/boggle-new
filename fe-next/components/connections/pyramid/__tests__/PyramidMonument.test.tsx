import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import PyramidProgress from '../PyramidProgress';
import { carvedWordSize } from '../pyramidFit';

let reducedMotion = false;
vi.mock('@/hooks/useReducedMotion', () => ({ useReducedMotion: () => reducedMotion }));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ language: 'en', t: (k: string, p?: Record<string, unknown>) => (p ? `${k}:${JSON.stringify(p)}` : k) }),
}));

type Props = Parameters<typeof PyramidProgress>[0];
const base: Props = { stage: 0, solvedBridges: [], gaveUpBase: [false, false, false], metaAnswer: 'BREAK', won: false };
const tierStates = () => [0, 1, 2].map((i) => screen.getByTestId(`pyramid-tier-${i}`).getAttribute('data-state'));

beforeEach(() => {
  reducedMotion = false;
});

describe('PyramidProgress builds a real pyramid', () => {
  it('sets the capstone over one base row of three bricks, laid in stage order', () => {
    render(<PyramidProgress {...base} />);
    const order = Array.from(document.querySelectorAll('[data-testid^="pyramid-tier-"], [data-testid="pyramid-apex"]')).map((el) =>
      el.getAttribute('data-testid'),
    );
    expect(order).toEqual(['pyramid-apex', 'pyramid-tier-0', 'pyramid-tier-1', 'pyramid-tier-2']);
    const row = screen.getByTestId('pyramid-tier-0').parentElement!;
    expect(row).toBe(screen.getByTestId('pyramid-tier-2').parentElement);
    expect(row.className).toContain('flex-row');
    // The row follows the page direction, so Hebrew lays the first brick on the right.
    expect(row.closest('[dir="ltr"]')).toBeNull();
  });

  it('draws exactly one brick per riddle and no filler bricks, in every state', () => {
    for (const props of [
      base,
      { ...base, stage: 1, solvedBridges: ['OUT'] },
      { ...base, stage: 3, solvedBridges: ['OUT', 'HEART', 'DAY'], won: true },
    ]) {
      const { unmount } = render(<PyramidProgress {...props} />);
      expect(document.querySelectorAll('[data-brick]')).toHaveLength(3);
      unmount();
    }
  });

  it('carves every laid brick with its own bridge word', () => {
    render(<PyramidProgress {...base} stage={3} solvedBridges={['OUT', 'HEART', 'DAY']} />);
    expect([0, 1, 2].map((i) => screen.getByTestId(`pyramid-tier-${i}`).textContent)).toEqual(['OUT', 'HEART', 'DAY']);
  });

  it('shows unsolved stages as empty sockets, the current one marked with a "?"', () => {
    render(<PyramidProgress {...base} stage={1} solvedBridges={['OUT']} />);
    expect(tierStates()).toEqual(['solved', 'current', 'locked']);
    expect(screen.getByTestId('pyramid-tier-1').textContent).toBe('?');
    expect(screen.getByTestId('pyramid-tier-1').className).toContain('border-dashed');
    expect(screen.getByTestId('pyramid-tier-2').textContent).toBe('');
  });

  it('keeps a given-up brick grey, with its word in red', () => {
    render(<PyramidProgress {...base} stage={1} solvedBridges={['OUT']} gaveUpBase={[true, false, false]} />);
    const brick = screen.getByTestId('pyramid-tier-0');
    expect(tierStates()[0]).toBe('gaveUp');
    expect(brick.textContent).toBe('OUT');
    expect(brick.querySelector('img')?.className).toContain('grayscale');
    expect(brick.querySelector('[data-word]')?.className).toContain('text-neo-red');
  });

  it('fits a 10-letter word inside its brick instead of overflowing', () => {
    render(<PyramidProgress {...base} stage={1} solvedBridges={['WATERMELON']} />);
    const brick = screen.getByTestId('pyramid-tier-0');
    const word = brick.querySelector<HTMLElement>('[data-word]')!;
    expect(brick.className).toContain('[container-type:size]');
    expect(word.className).toContain('whitespace-nowrap');
    expect(word.style.getPropertyValue('--carve')).toBe(carvedWordSize('WATERMELON'));
    expect(word.className).toContain('[font-size:var(--carve)]');
  });

  it('carves the word in the display font, engraved into the stone', () => {
    render(<PyramidProgress {...base} stage={1} solvedBridges={['OUT']} />);
    const word = screen.getByTestId('pyramid-tier-0').querySelector('[data-word]')!;
    expect(word.className).toContain('font-neo-display');
    expect(word.className).toContain('uppercase');
    expect(word.className).toContain('[text-shadow:');
  });

  it('leaves the capstone spot empty until the pyramid is won', () => {
    render(<PyramidProgress {...base} stage={3} solvedBridges={['OUT', 'HEART', 'DAY']} />);
    const apex = screen.getByTestId('pyramid-apex');
    expect(apex.getAttribute('data-state')).toBe('finale');
    expect(apex.textContent).toContain('?');
    expect(apex.querySelector('img[src="/daily/pyramid/capstone.webp"]')).toBeNull();
  });

  it('leaves a lost pyramid with a dull, empty capstone spot rather than the live finale outline', () => {
    render(<PyramidProgress {...base} stage={3} solvedBridges={['OUT', 'HEART', 'DAY']} gaveUpBase={[true, false, false]} size="trophy" />);
    expect(screen.getByTestId('pyramid-apex').getAttribute('data-state')).toBe('locked');
  });

  it('sets the golden capstone, carved with the top word, on a win', () => {
    render(<PyramidProgress {...base} stage={3} solvedBridges={['OUT', 'HEART', 'DAY']} won />);
    const apex = screen.getByTestId('pyramid-apex');
    expect(apex.getAttribute('data-state')).toBe('won');
    expect(apex.querySelector('img[src="/daily/pyramid/capstone.webp"]')).not.toBeNull();
    expect(apex.textContent).toContain('BREAK');
  });

  it('fits a 10-letter top word on the capstone', () => {
    render(<PyramidProgress {...base} stage={3} solvedBridges={['OUT', 'HEART', 'DAY']} metaAnswer="FIREWORKS!" won />);
    const word = screen.getByTestId('pyramid-apex').querySelector<HTMLElement>('[data-word]')!;
    expect(word.className).toContain('whitespace-nowrap');
    expect(word.style.getPropertyValue('--carve')).toBe(carvedWordSize('FIREWORKS!', 'capstone'));
    expect(word.className).toContain('[font-size:var(--carve)]');
  });

  it('stands the pyramid in a desert scene, on a sand ground line', () => {
    render(<PyramidProgress {...base} />);
    const backdrop = screen.getByTestId('pyramid-scene').querySelector('img[src="/daily/pyramid/desert-dusk.webp"]');
    expect(backdrop?.getAttribute('alt')).toBe('');
    expect(screen.getByTestId('pyramid-ground')).toBeTruthy();
  });

  it('keeps the explorer on the ground beside the pyramid, never on a word', () => {
    render(<PyramidProgress {...base} stage={2} solvedBridges={['OUT', 'HEART']} />);
    const explorer = screen.getByTestId('pyramid-explorer');
    expect(explorer.closest('[data-brick]')).toBeNull();
    expect(explorer.closest('[data-testid="pyramid-apex"]')).toBeNull();
  });

  it('keeps the cheering explorer off a lost pyramid on the end screen', () => {
    const lost = { ...base, stage: 3, solvedBridges: ['OUT', 'HEART', 'DAY'], size: 'trophy' as const };
    const { unmount } = render(<PyramidProgress {...lost} />);
    expect(screen.queryByTestId('pyramid-explorer')).toBeNull();
    unmount();
    render(<PyramidProgress {...lost} won />);
    expect(screen.getByTestId('pyramid-explorer')).toBeTruthy();
  });

  it('names the progress for screen readers', () => {
    render(<PyramidProgress {...base} stage={1} solvedBridges={['OUT']} />);
    expect(screen.getByTestId('pyramid-scene').getAttribute('aria-label')).toBe('connections.pyramid.sceneLabel:{"count":1}');
  });
});

describe('carvedWordSize', () => {
  it('shrinks with length so a 10-letter word fits the brick width', () => {
    // Fredoka black caps run about 0.72em wide; the word may use 88% of the brick.
    const cqi = (word: string) => Number(/([\d.]+)cqi/.exec(carvedWordSize(word))![1]);
    expect(cqi('WATERMELON') * 10 * 0.72).toBeLessThanOrEqual(88);
    expect(cqi('OUT')).toBeGreaterThan(cqi('WATERMELON'));
  });
});

describe('PyramidProgress landing beats', () => {
  it('drops a tier with a dust puff when it is laid during play', () => {
    const { rerender } = render(<PyramidProgress {...base} />);
    expect(screen.queryByTestId('pyramid-dust')).toBeNull();
    rerender(<PyramidProgress {...base} stage={1} solvedBridges={['OUT']} />);
    expect(screen.getByTestId('pyramid-tier-0').getAttribute('data-landing')).toBe('true');
    expect(screen.getByTestId('pyramid-dust')).toBeTruthy();
  });

  it('does not replay landings for tiers that were already laid when it mounted', () => {
    render(<PyramidProgress {...base} stage={2} solvedBridges={['OUT', 'HEART']} />);
    expect(screen.queryByTestId('pyramid-dust')).toBeNull();
    expect(screen.getByTestId('pyramid-tier-1').getAttribute('data-landing')).toBe('false');
  });

  it('lays tiers without dust under reduced motion', () => {
    reducedMotion = true;
    const { rerender } = render(<PyramidProgress {...base} />);
    rerender(<PyramidProgress {...base} stage={1} solvedBridges={['OUT']} />);
    expect(screen.queryByTestId('pyramid-dust')).toBeNull();
  });

  it('drops the capstone only on a celebrated win', () => {
    const won = { ...base, stage: 3, solvedBridges: ['OUT', 'HEART', 'DAY'], won: true };
    const { unmount } = render(<PyramidProgress {...won} celebrate />);
    expect(screen.getByTestId('pyramid-apex').getAttribute('data-drop')).toBe('true');
    unmount();
    render(<PyramidProgress {...won} />);
    expect(screen.getByTestId('pyramid-apex').getAttribute('data-drop')).toBe('false');
  });

  it('sets the capstone in place under reduced motion', () => {
    reducedMotion = true;
    render(<PyramidProgress {...base} stage={3} solvedBridges={['OUT', 'HEART', 'DAY']} won celebrate />);
    expect(screen.getByTestId('pyramid-apex').getAttribute('data-drop')).toBe('false');
  });
});
