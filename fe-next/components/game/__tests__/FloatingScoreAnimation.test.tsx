import React from 'react';
import { render, screen, act } from '@testing-library/react';
import FloatingScoreAnimation from '../FloatingScoreAnimation';

vi.mock('@/components/motion/AdaptiveMotion', () => {
  const make = (Tag: string) => {
    const Comp = ({ children, className }: { children?: React.ReactNode; className?: string }) =>
      React.createElement(Tag, { className }, children);
    Comp.displayName = `mock.${Tag}`;
    return Comp;
  };
  return { AdaptiveMotion: { div: make('div'), span: make('span') } };
});
vi.mock('@/utils/accessibility', () => ({ useReducedMotion: () => false }));
vi.mock('@/hooks/useDevicePerformance', () => ({
  useDevicePerformance: () => ({ isLowEnd: false, enableComplexAnimations: true }),
}));

describe('FloatingScoreAnimation', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

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
