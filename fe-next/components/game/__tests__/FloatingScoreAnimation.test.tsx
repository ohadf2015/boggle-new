import React from 'react';
import { render, screen, act } from '@testing-library/react';
import FloatingScoreAnimation from '../FloatingScoreAnimation';

vi.mock('@/components/motion/AdaptiveMotion', () => {
  const make = (Tag: string) => {
    const Comp = ({ children, className, animate }: { children?: React.ReactNode; className?: string; animate?: unknown }) =>
      React.createElement(Tag, { className, 'data-animate': JSON.stringify(animate ?? null) }, children);
    Comp.displayName = `mock.${Tag}`;
    return Comp;
  };
  return { AdaptiveMotion: { div: make('div'), span: make('span') } };
});
const motionPref = vi.hoisted(() => ({ reduced: false }));
vi.mock('@/utils/accessibility', () => ({ useReducedMotion: () => motionPref.reduced }));
vi.mock('@/hooks/useDevicePerformance', () => ({
  useDevicePerformance: () => ({ isLowEnd: false, enableComplexAnimations: true }),
}));

describe('FloatingScoreAnimation', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    motionPref.reduced = false;
  });

  const motionOf = (container: HTMLElement) =>
    [...container.querySelectorAll<HTMLElement>('[data-animate]')].map((el) => JSON.parse(el.dataset.animate!)).filter(Boolean);

  it('given two words with different rolls, then each pop tilts and drifts differently within ±6°', () => {
    const random = vi.spyOn(Math, 'random').mockReturnValue(0.1);
    const { container, rerender } = render(<FloatingScoreAnimation score={3} popKey={1} />);
    random.mockReturnValue(0.9);
    rerender(<FloatingScoreAnimation score={3} popKey={2} />);
    const [a, b] = motionOf(container);
    expect(a.rotate).not.toEqual(b.rotate);
    expect(a.x).not.toEqual(b.x);
    expect(a.scale[1]).not.toBe(b.scale[1]);
    for (const m of [a, b]) m.rotate.forEach((r: number) => expect(Math.abs(r)).toBeLessThanOrEqual(6));
  });

  it('given bigger scores, then the pop colour climbs the neo tiers and fire rounds stay orange', () => {
    const pill = (score: number, fire = false) => {
      const { container, unmount } = render(<FloatingScoreAnimation score={score} popKey={1} isFireRound={fire} />);
      const cls = container.querySelector('[data-tier]')!.className;
      unmount();
      return cls;
    };
    expect(pill(2)).toContain('bg-neo-lime');
    expect(pill(8)).toContain('bg-neo-cyan');
    expect(pill(14)).toContain('bg-neo-pink');
    expect(pill(30)).toContain('bg-neo-yellow');
    expect(pill(30, true)).toContain('bg-neo-orange');
  });

  it('given reduced motion, then the pop still shows its score and colour but only fades', () => {
    motionPref.reduced = true;
    const { container } = render(<FloatingScoreAnimation score={14} popKey={1} />);
    expect(screen.getByText('+14')).toBeInTheDocument();
    expect(container.querySelector('[data-tier]')!.className).toContain('bg-neo-pink');
    expect(motionOf(container)).toEqual([{ opacity: 1 }]);
  });

  it('shows one pop per word even when two words score the same', () => {
    const { rerender } = render(<FloatingScoreAnimation score={12} popKey={1} />);
    rerender(<FloatingScoreAnimation score={12} popKey={2} />);
    expect(screen.getAllByText('+12')).toHaveLength(2);
  });

  it('removes each pop after 600ms and calls onAnimationComplete', () => {
    const done = vi.fn();
    render(<FloatingScoreAnimation score={5} popKey={1} onAnimationComplete={done} />);
    expect(screen.getByText('+5')).toBeInTheDocument();
    act(() => { vi.advanceTimersByTime(600); });
    expect(screen.queryByText('+5')).not.toBeInTheDocument();
    expect(done).toHaveBeenCalledTimes(1);
  });

  it('uses neo tokens, no gradients', () => {
    const { container } = render(<FloatingScoreAnimation score={5} popKey={1} />);
    expect(container.innerHTML).not.toContain('gradient');
    expect(container.innerHTML).toContain('bg-neo-lime');
  });
});
