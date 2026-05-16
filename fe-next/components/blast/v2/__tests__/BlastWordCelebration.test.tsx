import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BlastWordCelebration } from '../BlastWordCelebration';

beforeEach(() => {
  // jsdom doesn't honor matchMedia by default; force "no reduced motion"
  // so the FX paths run during the test.
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
});

describe('BlastWordCelebration', () => {
  it('renders a visible FX container at z-index 60 so it sits above the board', () => {
    render(
      <BlastWordCelebration eventKey={0} centers={[]} modeColor="#BFFF00" />,
    );
    const root = screen.getByTestId('blast-word-celebration');
    expect(root).toBeInTheDocument();
    expect(root.style.zIndex).toBe('60');
  });

  it('spawns FX children when eventKey transitions with cleared centers', () => {
    const { rerender } = render(
      <BlastWordCelebration eventKey={0} centers={[]} modeColor="#BFFF00" />,
    );
    const root = screen.getByTestId('blast-word-celebration');
    expect(root.children.length).toBe(0);
    rerender(
      <BlastWordCelebration
        eventKey={1}
        centers={[{ x: 100, y: 100 }]}
        modeColor="#BFFF00"
      />,
    );
    // After event fires, the layer holds rings + pixels + sparkles + core =
    // at least the 3 ring layers + 1 core flash.
    expect(root.children.length).toBeGreaterThan(3);
  });

  it('does not spawn anything when there are no cleared centers', () => {
    const { rerender } = render(
      <BlastWordCelebration eventKey={0} centers={[]} modeColor="#BFFF00" />,
    );
    rerender(
      <BlastWordCelebration eventKey={1} centers={[]} modeColor="#BFFF00" />,
    );
    expect(screen.getByTestId('blast-word-celebration').children.length).toBe(0);
  });
});
