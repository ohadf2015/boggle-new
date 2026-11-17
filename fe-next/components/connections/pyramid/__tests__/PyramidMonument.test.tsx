import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import PyramidProgress from '../PyramidProgress';

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
  it('stacks the capstone over three tiers, with stage 1 as the bottom tier', () => {
    render(<PyramidProgress {...base} />);
    const order = Array.from(document.querySelectorAll('[data-testid^="pyramid-tier-"], [data-testid="pyramid-apex"]')).map((el) =>
      el.getAttribute('data-testid'),
    );
    expect(order).toEqual(['pyramid-apex', 'pyramid-tier-2', 'pyramid-tier-1', 'pyramid-tier-0']);
  });

  it('narrows each tier toward the top, brick by brick', () => {
    render(<PyramidProgress {...base} solvedBridges={['OUT', 'HEART', 'DAY']} stage={3} />);
    const bricks = [0, 1, 2].map((i) => screen.getByTestId(`pyramid-tier-${i}`).querySelectorAll('[data-brick]').length);
    expect(bricks[0]).toBeGreaterThan(bricks[1]);
    expect(bricks[1]).toBeGreaterThan(bricks[2]);
  });

  it('carves each laid tier with its bridge word and leaves unbuilt tiers blank', () => {
    render(<PyramidProgress {...base} stage={1} solvedBridges={['OUT']} />);
    expect(screen.getByTestId('pyramid-tier-0').textContent).toContain('OUT');
    expect(tierStates()).toEqual(['solved', 'current', 'locked']);
    expect(screen.getByTestId('pyramid-tier-2').textContent).not.toMatch(/[A-Z]/);
  });

  it('keeps a given-up tier in the pyramid, marked as cracked', () => {
    render(<PyramidProgress {...base} stage={1} solvedBridges={['OUT']} gaveUpBase={[true, false, false]} />);
    expect(tierStates()[0]).toBe('gaveUp');
    expect(screen.getByTestId('pyramid-tier-0').textContent).toContain('OUT');
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

  it('stands the pyramid in a desert scene', () => {
    render(<PyramidProgress {...base} />);
    const backdrop = screen.getByTestId('pyramid-scene').querySelector('img[src="/daily/pyramid/desert-dusk.webp"]');
    expect(backdrop?.getAttribute('alt')).toBe('');
  });

  it('puts the explorer on the highest laid tier', () => {
    const { rerender } = render(<PyramidProgress {...base} />);
    expect(screen.getByTestId('pyramid-explorer').getAttribute('data-on-tier')).toBe('ground');
    rerender(<PyramidProgress {...base} stage={2} solvedBridges={['OUT', 'HEART']} />);
    expect(screen.getByTestId('pyramid-explorer').getAttribute('data-on-tier')).toBe('1');
  });

  it('keeps the cheering explorer off a lost pyramid on the end screen', () => {
    const lost = { ...base, stage: 3, solvedBridges: ['OUT', 'HEART', 'DAY'], size: 'trophy' as const };
    const { unmount } = render(<PyramidProgress {...lost} />);
    expect(screen.queryByTestId('pyramid-explorer')).toBeNull();
    unmount();
    render(<PyramidProgress {...lost} won />);
    expect(screen.getByTestId('pyramid-explorer').getAttribute('data-on-tier')).toBe('2');
  });

  it('names the progress for screen readers', () => {
    render(<PyramidProgress {...base} stage={1} solvedBridges={['OUT']} />);
    expect(screen.getByTestId('pyramid-scene').getAttribute('aria-label')).toBe('connections.pyramid.sceneLabel:{"count":1}');
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
