import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QuickPlayWheel } from '../QuickPlayWheel';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en' }),
}));

vi.mock('@/utils/haptics/HapticsManager', () => ({
  default: { selection: vi.fn(), tap: vi.fn(), success: vi.fn() },
  haptics: { selection: vi.fn(), tap: vi.fn(), success: vi.fn() },
}));

describe('QuickPlayWheel', () => {
  const onSelect = vi.fn();
  const onPlay = vi.fn();

  beforeEach(() => vi.clearAllMocks());

  function renderWheel(selection: Parameters<typeof QuickPlayWheel>[0]['selection'] = 'random') {
    return render(<QuickPlayWheel selection={selection} onSelect={onSelect} onPlay={onPlay} />);
  }

  it('renders 4 mode nodes + knob + play button', () => {
    renderWheel();
    expect(screen.getByTestId('quick-wheel-knob')).toBeTruthy();
    for (const mode of ['classic', 'blast', 'word-hunt', 'wheel-rush']) {
      expect(screen.getByTestId(`quick-wheel-node-${mode}`)).toBeTruthy();
    }
    expect(screen.getByTestId('quick-wheel-play')).toBeTruthy();
  });

  it('drag up selects wheel-rush with method drag', () => {
    renderWheel();
    const knob = screen.getByTestId('quick-wheel-knob');
    fireEvent.pointerDown(knob, { clientX: 100, clientY: 100, pointerId: 1 });
    fireEvent.pointerMove(knob, { clientX: 100, clientY: 10, pointerId: 1 });
    fireEvent.pointerUp(knob, { clientX: 100, clientY: 10, pointerId: 1 });
    expect(onSelect).toHaveBeenCalledWith('wheel-rush', 'drag');
  });

  it('release inside dead zone returns random', () => {
    renderWheel('blast');
    const knob = screen.getByTestId('quick-wheel-knob');
    fireEvent.pointerDown(knob, { clientX: 100, clientY: 100, pointerId: 1 });
    fireEvent.pointerMove(knob, { clientX: 104, clientY: 102, pointerId: 1 });
    fireEvent.pointerUp(knob, { clientX: 104, clientY: 102, pointerId: 1 });
    expect(onSelect).toHaveBeenCalledWith('random', 'drag');
  });

  it('tapping a node selects it with method tap', () => {
    renderWheel();
    fireEvent.click(screen.getByTestId('quick-wheel-node-classic'));
    expect(onSelect).toHaveBeenCalledWith('classic', 'tap');
  });

  it('play button fires onPlay', () => {
    renderWheel('word-hunt');
    fireEvent.click(screen.getByTestId('quick-wheel-play'));
    expect(onPlay).toHaveBeenCalledTimes(1);
  });

  it('nodes are buttons (a11y / keyboard reachable)', () => {
    renderWheel();
    expect(screen.getByTestId('quick-wheel-node-blast').tagName).toBe('BUTTON');
  });
});
