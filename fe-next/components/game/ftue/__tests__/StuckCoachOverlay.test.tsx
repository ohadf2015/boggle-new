import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (_k: string, fallback?: string) => fallback ?? _k, dir: 'ltr', language: 'en' }),
}));

import { StuckCoachOverlay } from '../StuckCoachOverlay';
import type { StuckCoach } from '@/hooks/useStuckCoach';

function coach(over: Partial<StuckCoach> = {}): StuckCoach {
  const noop = () => {};
  return {
    mode: 'blast', stage: 'idle-nudge', visible: true, exampleWord: null,
    markActivity: noop, markTap: noop, markDragStart: noop, markSubmit: noop, dismiss: noop,
    ...over,
  };
}

function anchorAt(rect: Partial<DOMRect>, attr = 'data-coach-anchor') {
  const el = document.createElement('div');
  el.setAttribute(attr, '');
  el.getBoundingClientRect = () => ({ top: 0, bottom: 0, left: 0, right: 360, width: 360, height: 0, x: 0, y: 0, toJSON: () => ({}), ...rect }) as DOMRect;
  document.body.appendChild(el);
  return el;
}

describe('StuckCoachOverlay', () => {
  afterEach(() => {
    document.querySelectorAll('[data-coach-anchor], [data-coach-panel]').forEach((n) => n.remove());
  });

  it('renders nothing while the coach is hidden', () => {
    const { container } = render(<StuckCoachOverlay coach={coach({ visible: false, stage: 'none' })} />);
    expect(container.firstChild).toBeNull();
  });

  it('given an anchor, sits right under it so the board and controls stay uncovered', () => {
    anchorAt({ top: 200, bottom: 520 });
    render(<StuckCoachOverlay coach={coach()} anchor={{ selector: '[data-coach-anchor]', edge: 'below' }} />);
    const wrap = screen.getByTestId('stuck-coach-overlay');
    expect(wrap.style.top).toBe('528px');
    expect(wrap.className).toContain('pointer-events-none');
    // The full width under a board is free, so the card gets it (fewer lines, less height).
    expect(wrap.className).toContain('inset-x-0');
    expect(wrap.style.width).toBe('');
  });

  it('given an "over" anchor, covers that band from its top (an empty words list)', () => {
    anchorAt({ top: 130, bottom: 176, left: 1000, width: 260 });
    render(<StuckCoachOverlay coach={coach({ mode: 'dailyWheel' })} anchor={{ selector: '[data-coach-anchor]', edge: 'over' }} />);
    const wrap = screen.getByTestId('stuck-coach-overlay');
    expect(wrap.style.top).toBe('130px');
    // Stays inside the band's own width (a desktop side panel), never spilling over the play area.
    expect(wrap.style.left).toBe('1000px');
    expect(wrap.style.width).toBe('260px');
    expect(screen.getByRole('status').textContent).toMatch(/center letter/i);
  });

  it('follows the board when the page scrolls (boards embedded in long pages)', () => {
    const el = anchorAt({ top: 200, bottom: 520 });
    render(<StuckCoachOverlay coach={coach()} anchor={{ selector: '[data-coach-anchor]', edge: 'below' }} />);
    el.getBoundingClientRect = () => ({ top: 100, bottom: 420, left: 0, right: 360, width: 360, height: 320, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect;
    act(() => { window.dispatchEvent(new Event('scroll')); });
    expect(screen.getByTestId('stuck-coach-overlay').style.top).toBe('428px');
  });

  it('given a board that fills the screen, moves to the next free band instead of covering letters', () => {
    anchorAt({ top: 160, bottom: window.innerHeight - 4 });
    anchorAt({ top: 300, bottom: 500, left: 1000, width: 260 }, 'data-coach-panel');
    render(
      <StuckCoachOverlay
        coach={coach()}
        anchor={[
          { selector: '[data-coach-anchor]', edge: 'below' },
          { selector: '[data-coach-panel]', edge: 'over' },
        ]}
      />,
    );
    const wrap = screen.getByTestId('stuck-coach-overlay');
    expect(wrap.style.top).toBe('300px');
    expect(wrap.style.left).toBe('1000px');
  });

  it('falls back to the screen foot when the anchor is missing', () => {
    render(<StuckCoachOverlay coach={coach()} anchor={{ selector: '[data-coach-anchor]', edge: 'below' }} />);
    expect(screen.getByTestId('stuck-coach-overlay').className).toContain('bottom-4');
  });

  it('dismisses through the coach', () => {
    const dismiss = vi.fn();
    render(<StuckCoachOverlay coach={coach({ dismiss })} />);
    fireEvent.click(screen.getByRole('button'));
    expect(dismiss).toHaveBeenCalledTimes(1);
  });
});
