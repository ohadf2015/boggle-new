import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { render, screen } from '@testing-library/react';
import { WordTowerRivalRail } from './WordTowerRivalRail';
import type { RivalMarker } from '@/lib/wordTower/rivals';

const t = (key: string, params?: Record<string, string | number>) =>
  key + (params ? ` ${JSON.stringify(params)}` : '');

/** The rail lays out from its own measured height; jsdom reports 0 for every
 *  element, which would render an empty rail and make every assertion vacuous. */
let restore: PropertyDescriptor | undefined;
beforeAll(() => {
  restore = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientHeight');
  Object.defineProperty(HTMLElement.prototype, 'clientHeight', { configurable: true, value: 800 });
});
afterAll(() => {
  if (restore) Object.defineProperty(HTMLElement.prototype, 'clientHeight', restore);
});

const rival = (over: Partial<RivalMarker> = {}): RivalMarker => ({
  id: 'r1',
  name: 'Ann',
  heightM: 80,
  playerId: 'u1',
  highestBiome: 'city',
  ...over,
});

/** Every positioned rail child carries an inline `top` — that's the altitude layout. */
const positioned = (c: HTMLElement) =>
  Array.from(c.querySelectorAll<HTMLElement>('div[style*="top"]'));

describe('WordTowerRivalRail — scroll behaviour', () => {
  it('eases altitude while the camera is idle', () => {
    const { container } = render(
      <WordTowerRivalRail rivals={[rival()]} viewerHeightM={40} t={t} />,
    );
    const eased = positioned(container).filter((el) => el.style.transition.includes('900ms'));
    expect(eased.length).toBeGreaterThan(0);
  });

  it('drops EVERY altitude ease while the camera is being panned', () => {
    // A 900ms ease restarts on each re-quantised pan step, so the marker chases a
    // target it never reaches and tears away from the tower. Under `panning` the
    // pan itself is the animation.
    const { container } = render(
      <WordTowerRivalRail rivals={[rival()]} viewerHeightM={40} panning t={t} />,
    );
    const els = positioned(container);
    expect(els.length).toBeGreaterThan(0);
    expect(els.every((el) => el.style.transition === 'none')).toBe(true);
  });

  it('drops the eases under reduced motion too', () => {
    const { container } = render(
      <WordTowerRivalRail rivals={[rival()]} viewerHeightM={40} reducedMotion t={t} />,
    );
    expect(positioned(container).every((el) => el.style.transition === 'none')).toBe(true);
  });
});

describe('WordTowerRivalRail — celebrates climbing, not scrolling', () => {
  it('does NOT claim a pass when the camera merely scrolls back up past a rival', () => {
    // `viewerHeightM` is the CAMERA altitude: panning down lowers it and panning
    // back up re-crosses every rival in between. Only the tower actually growing
    // is a pass.
    const rivals = [rival({ heightM: 50 })];
    const { rerender } = render(
      <WordTowerRivalRail rivals={rivals} viewerHeightM={70} climbedHeightM={70} t={t} />,
    );
    rerender(<WordTowerRivalRail rivals={rivals} viewerHeightM={20} climbedHeightM={70} t={t} />); // panned down
    rerender(<WordTowerRivalRail rivals={rivals} viewerHeightM={70} climbedHeightM={70} t={t} />); // panned back up
    expect(screen.queryByText(/rivalPassed/)).toBeNull();
  });

  it('does claim a pass when the tower actually grows past a rival', () => {
    const rivals = [rival({ heightM: 50 })];
    const { rerender } = render(
      <WordTowerRivalRail rivals={rivals} viewerHeightM={40} climbedHeightM={40} t={t} />,
    );
    rerender(<WordTowerRivalRail rivals={rivals} viewerHeightM={60} climbedHeightM={60} t={t} />);
    expect(screen.getByText(/rivalPassed/)).toBeTruthy();
  });
});

describe('WordTowerRivalRail — live presence', () => {
  it('draws a moving marker for a rival who is mid-climb', () => {
    render(
      <WordTowerRivalRail
        rivals={[rival({ live: true, currentHeightM: 37 })]}
        viewerHeightM={40}
        t={t}
      />,
    );
    // Their record (80m) and their live altitude (37m) are separate marks.
    expect(screen.getByText(/Ann · 37m/)).toBeTruthy();
    expect(screen.getByText(/Ann · 80m/)).toBeTruthy();
  });

  it('draws no live marker for an idle rival — presence is never invented', () => {
    render(<WordTowerRivalRail rivals={[rival({ live: false, currentHeightM: 37 })]} viewerHeightM={40} t={t} />);
    expect(screen.queryByText(/Ann · 37m/)).toBeNull();
  });

  it('renders nothing at all for an empty board', () => {
    const { container } = render(<WordTowerRivalRail rivals={[]} viewerHeightM={40} t={t} />);
    expect(positioned(container)).toHaveLength(0);
  });
});
