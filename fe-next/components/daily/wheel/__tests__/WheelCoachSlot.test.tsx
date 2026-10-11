import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ language: 'en', t: (k: string) => k }),
}));

import WheelCoachSlot from '../WheelCoachSlot';

const slotHeight = (el: HTMLElement) => el.className.split(/\s+/).filter((c) => /^(short:)?h-\[\d+px\]$/.test(c));

describe('WheelCoachSlot', () => {
  it('given a practice run, then the tip sits in a fixed-height slot so the wheel below never resizes', () => {
    render(<WheelCoachSlot wordsFound={0} />);
    const slot = screen.getByTestId('wheel-coach-slot');
    expect(slotHeight(slot).length).toBeGreaterThan(0);
    expect(slot.className).toMatch(/\bshrink-0\b/);
    expect(slot.className).toMatch(/\boverflow-hidden\b/);
    expect(screen.getByTestId('practice-coach-tip').className).toMatch(/line-clamp|truncate|overflow-hidden/);
  });

  it('given the first word is found, then the tip goes but its slot keeps the same height', () => {
    const { rerender } = render(<WheelCoachSlot wordsFound={0} />);
    const before = slotHeight(screen.getByTestId('wheel-coach-slot'));
    rerender(<WheelCoachSlot wordsFound={1} />);
    expect(screen.queryByTestId('practice-coach-tip')).toBeNull();
    expect(slotHeight(screen.getByTestId('wheel-coach-slot'))).toEqual(before);
  });

  it('given the player dismisses the tip, then the slot stays put', () => {
    render(<WheelCoachSlot wordsFound={0} />);
    fireEvent.click(screen.getByRole('button', { name: 'practice.coach.dismiss' }));
    expect(screen.queryByTestId('practice-coach-tip')).toBeNull();
    expect(screen.getByTestId('wheel-coach-slot')).toBeTruthy();
  });
});
