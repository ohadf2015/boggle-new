/**
 * WheelLetter — mobile tap feedback regression
 *
 * PostHog 2026-04-27 sweep flagged 4 rage-clicks on individual Hebrew letters
 * (ה, ר, ש) on /he/daily/word-wheel, all Mobile users. Root suspicion: the
 * `whileTap={{ scaleX: 1.12, scaleY: 0.82 }}` non-uniform stretch reads as
 * "danced but didn't commit" on slow Android frames, prompting re-taps.
 *
 * This test pins the contract:
 *  1. Tap fires `onPress` immediately (no double-handling).
 *  2. Letter button exposes `data-wheel-letter` + `data-wheel-index` for the
 *     drag-hit detection in WordWheelGame.tryDragHit.
 *  3. Hit-area expander class is present (CSS pseudo `before:-inset-2`).
 */

import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ language: 'he', t: (k: string) => k }),
}));

vi.mock('framer-motion', () => ({
  m: {
    button: ({ children, onClick, ...rest }: React.ComponentProps<'button'>) => (
      <button onClick={onClick} {...rest}>{children}</button>
    ),
  },
}));

import { WheelLetter } from '../WordWheelParts';

describe('WheelLetter mobile tap feedback', () => {
  it('calls onPress with letter, index, element on tap', () => {
    const onPress = vi.fn();
    render(
      <WheelLetter
        letter="ה"
        isCenter={false}
        angle={0}
        radius={100}
        onPress={onPress}
        isUsed={false}
        index={0}
      />
    );
    const btn = screen.getByRole('button', { name: 'ה' });
    fireEvent.click(btn);
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(onPress).toHaveBeenCalledWith('ה', 0, btn);
  });

  it('exposes data-wheel-letter + data-wheel-index for drag-hit detection', () => {
    render(
      <WheelLetter
        letter="ר"
        isCenter={false}
        angle={60}
        radius={100}
        onPress={vi.fn()}
        isUsed={false}
        index={2}
      />
    );
    const btn = screen.getByRole('button', { name: 'ר' });
    expect(btn.dataset.wheelLetter).toBe('ר');
    expect(btn.dataset.wheelIndex).toBe('2');
  });

  it('renders hit-area expander class (before:-inset-2) for ≥48px tap target', () => {
    render(
      <WheelLetter
        letter="ש"
        isCenter={false}
        angle={120}
        radius={100}
        onPress={vi.fn()}
        isUsed={false}
        index={3}
      />
    );
    const btn = screen.getByRole('button', { name: 'ש' });
    expect(btn.className).toMatch(/before:-inset-2/);
  });

  it('guards each letter from browser auto-translation (e.g. "I" must not become "saya")', () => {
    render(
      <WheelLetter
        letter="I"
        isCenter={false}
        angle={0}
        radius={100}
        onPress={vi.fn()}
        isUsed={false}
        index={1}
      />
    );
    const btn = screen.getByRole('button', { name: 'I' });
    expect(btn.getAttribute('translate')).toBe('no');
    expect(btn.className).toContain('notranslate');
  });

  it('used letters expose aria-pressed=true + tapToRemove label', () => {
    render(
      <WheelLetter
        letter="ה"
        isCenter={false}
        angle={0}
        radius={100}
        onPress={vi.fn()}
        isUsed={true}
        index={0}
      />
    );
    const btn = screen.getByRole('button');
    expect(btn.getAttribute('aria-pressed')).toBe('true');
    expect(btn.getAttribute('aria-label')).toContain('wordWheel.tapToRemove');
  });
});
