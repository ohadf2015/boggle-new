import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QuickPlayWheel } from '../QuickPlayWheel';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en' }),
}));

vi.mock('@/utils/haptics/HapticsManager', () => ({
  default: {
    selection: vi.fn(() => Promise.resolve()),
    tap: vi.fn(() => Promise.resolve()),
    success: vi.fn(() => Promise.resolve()),
  },
  haptics: {
    selection: vi.fn(() => Promise.resolve()),
    tap: vi.fn(() => Promise.resolve()),
    success: vi.fn(() => Promise.resolve()),
  },
}));

describe('QuickPlayWheel', () => {
  const onSelect = vi.fn();

  beforeEach(() => vi.clearAllMocks());

  function renderWheel(selection: Parameters<typeof QuickPlayWheel>[0]['selection'] = 'random') {
    return render(<QuickPlayWheel selection={selection} onSelect={onSelect} />);
  }

  it('renders 4 mode nodes + knob, no separate play button', () => {
    renderWheel();
    expect(screen.getByTestId('quick-wheel-knob')).toBeTruthy();
    for (const mode of ['classic', 'blast', 'word-hunt', 'wheel-rush']) {
      expect(screen.getByTestId(`quick-wheel-node-${mode}`)).toBeTruthy();
    }
    expect(screen.queryByTestId('quick-wheel-play')).toBeNull();
  });

  it('drag up plays wheel-rush immediately with method drag', () => {
    renderWheel();
    const knob = screen.getByTestId('quick-wheel-knob');
    fireEvent.pointerDown(knob, { clientX: 100, clientY: 100, pointerId: 1 });
    fireEvent.pointerMove(knob, { clientX: 100, clientY: 10, pointerId: 1 });
    fireEvent.pointerUp(knob, { clientX: 100, clientY: 10, pointerId: 1 });
    expect(onSelect).toHaveBeenCalledWith('wheel-rush', 'drag');
  });

  it('release inside dead zone plays random immediately', () => {
    renderWheel('blast');
    const knob = screen.getByTestId('quick-wheel-knob');
    fireEvent.pointerDown(knob, { clientX: 100, clientY: 100, pointerId: 1 });
    fireEvent.pointerMove(knob, { clientX: 104, clientY: 102, pointerId: 1 });
    fireEvent.pointerUp(knob, { clientX: 104, clientY: 102, pointerId: 1 });
    expect(onSelect).toHaveBeenCalledWith('random', 'drag');
  });

  it('tapping any node plays it immediately, on the first tap', () => {
    renderWheel();
    fireEvent.click(screen.getByTestId('quick-wheel-node-classic'));
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith('classic', 'tap');
  });

  it('tapping an already-selected node still plays it again (no toggle-off)', () => {
    renderWheel('classic');
    fireEvent.click(screen.getByTestId('quick-wheel-node-classic'));
    expect(onSelect).toHaveBeenCalledWith('classic', 'tap');
  });

  it('nodes are buttons (a11y / keyboard reachable)', () => {
    renderWheel();
    expect(screen.getByTestId('quick-wheel-node-blast').tagName).toBe('BUTTON');
  });

  it('knob is keyboard-focusable and Enter plays random (only keyboard path to Random since PLAY is gone)', () => {
    renderWheel();
    const knob = screen.getByTestId('quick-wheel-knob');
    expect(knob.getAttribute('aria-hidden')).not.toBe('true');
    fireEvent.keyDown(knob, { key: 'Enter' });
    expect(onSelect).toHaveBeenCalledWith('random', 'tap');
  });

  it('exposes elevated visual layers (ambient + orbit) and richer mode imagery', () => {
    renderWheel();
    expect(screen.getByTestId('quick-wheel-ambient')).toBeTruthy();
    expect(screen.getByTestId('quick-wheel-orbit')).toBeTruthy();
    expect(screen.getByTestId('quick-wheel-stage')).toBeTruthy();
    // Illustrated sticker faces (not bare lucide-only nodes)
    for (const mode of ['classic', 'blast', 'word-hunt', 'wheel-rush']) {
      expect(screen.getByTestId(`quick-wheel-node-face-${mode}`)).toBeTruthy();
    }
  });

  it('stage size stays within a narrow-phone budget (no fixed 376 overflow)', () => {
    // jsdom default innerWidth is often 1024; force a phone width if possible
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 360 });
    renderWheel();
    const stage = screen.getByTestId('quick-wheel-stage');
    const w = parseFloat(stage.style.width || '0');
    // Design max is 376; on 360 viewport (minus padding) must be ≤ 360
    expect(w).toBeGreaterThan(0);
    expect(w).toBeLessThanOrEqual(376);
  });

  it('renders electric lightning strike + shockwave toward strikeMode', () => {
    render(
      <QuickPlayWheel selection="blast" strikeMode="blast" isLoading onSelect={onSelect} />
    );
    expect(screen.getByTestId('quick-wheel-lightning')).toBeTruthy();
    expect(screen.getByTestId('quick-wheel-shockwave')).toBeTruthy();
    expect(screen.getByTestId('quick-play-loading')).toBeTruthy();
  });

  it('blocks further selects while loading (strike hold)', () => {
    render(
      <QuickPlayWheel selection="classic" strikeMode="classic" isLoading onSelect={onSelect} />
    );
    fireEvent.click(screen.getByTestId('quick-wheel-node-blast'));
    expect(onSelect).not.toHaveBeenCalled();
  });
});
