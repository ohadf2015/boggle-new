import { fireEvent, render, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const reduced = vi.hoisted(() => ({ value: false }));
const gsapMock = vi.hoisted(() => ({
  from: vi.fn(),
  fromTo: vi.fn(),
  to: vi.fn(),
  set: vi.fn(),
  registerPlugin: vi.fn(),
  context: vi.fn((fn: () => void) => {
    fn();
    return { revert: vi.fn() };
  }),
  batch: vi.fn(),
}));

vi.mock('@/lib/education/motion/useEduReducedMotion', () => ({
  useEduReducedMotion: () => reduced.value,
}));
vi.mock('gsap', () => ({ gsap: gsapMock, default: gsapMock }));
vi.mock('gsap/ScrollTrigger', () => ({
  ScrollTrigger: { batch: gsapMock.batch, refresh: vi.fn() },
}));

import { useTeacherReveal } from '../useTeacherReveal';

function Probe() {
  const ref = useTeacherReveal<HTMLDivElement>();
  return (
    <div className="edu-shell-scroll">
      <div ref={ref}>
        <p data-tm>a</p>
        <p data-tm>b</p>
        <a data-magnet data-testid="mag">go</a>
        <h1 data-wipe>hi</h1>
        <article data-tilt data-testid="tilt">card</article>
      </div>
    </div>
  );
}

describe('useTeacherReveal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    reduced.value = false;
  });

  it('batches [data-tm] targets through ScrollTrigger on the shell scroller', async () => {
    render(<Probe />);
    await waitFor(() => expect(gsapMock.batch).toHaveBeenCalledTimes(1));
    const [targets, vars] = gsapMock.batch.mock.calls[0];
    expect(targets).toHaveLength(2);
    expect(vars.scroller).toBeInstanceOf(HTMLElement);
    expect(vars.once).toBe(true);
  });

  it('hides targets only with transform+opacity', async () => {
    render(<Probe />);
    await waitFor(() => expect(gsapMock.set).toHaveBeenCalled());
    const props = Object.keys(gsapMock.set.mock.calls[0][1]).sort();
    expect(props).toEqual(['opacity', 'y']);
  });

  it('leaves content alone under reduced motion', async () => {
    reduced.value = true;
    render(<Probe />);
    await new Promise((r) => setTimeout(r, 20));
    expect(gsapMock.set).not.toHaveBeenCalled();
    expect(gsapMock.batch).not.toHaveBeenCalled();
  });

  it('pulls [data-magnet] toward a fine pointer and springs back on leave', async () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: true }) as never;
    const { getByTestId } = render(<Probe />);
    await waitFor(() => expect(gsapMock.batch).toHaveBeenCalled());
    const el = getByTestId('mag');
    el.getBoundingClientRect = () => ({ left: 0, top: 0, width: 40, height: 40 }) as DOMRect;
    fireEvent.pointerMove(el, { clientX: 40, clientY: 20 });
    const pull = gsapMock.to.mock.calls.at(-1)![1];
    expect(pull.x).toBeGreaterThan(0);
    expect(Math.abs(pull.x)).toBeLessThanOrEqual(8);
    fireEvent.pointerLeave(el);
    expect(gsapMock.to.mock.calls.at(-1)![1]).toMatchObject({ x: 0, y: 0, ease: 'elastic.out(1, 0.45)' });
  });

  it('wipes [data-wipe] headings in with a clip-path mask', async () => {
    render(<Probe />);
    await waitFor(() => expect(gsapMock.fromTo).toHaveBeenCalled());
    const [, from, to] = gsapMock.fromTo.mock.calls[0];
    expect(from.clipPath).toBe('inset(0 0 100% 0)');
    expect(to.clipPath).toBe('inset(0 0 0% 0)');
  });

  it('tilts [data-tilt] cards in 3D toward a fine pointer and levels on leave', async () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: true }) as never;
    const { getByTestId } = render(<Probe />);
    await waitFor(() => expect(gsapMock.batch).toHaveBeenCalled());
    const el = getByTestId('tilt');
    el.getBoundingClientRect = () => ({ left: 0, top: 0, width: 100, height: 100 }) as DOMRect;
    fireEvent.pointerMove(el, { clientX: 100, clientY: 50 });
    const t = gsapMock.to.mock.calls.at(-1)![1];
    expect(t.rotateY).toBeGreaterThan(0);
    expect(Math.abs(t.rotateY)).toBeLessThanOrEqual(3);
    fireEvent.pointerLeave(el);
    expect(gsapMock.to.mock.calls.at(-1)![1]).toMatchObject({ rotateX: 0, rotateY: 0 });
  });
});
