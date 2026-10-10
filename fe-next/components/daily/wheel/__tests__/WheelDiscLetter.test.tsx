import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ language: 'he', t: (k: string) => k }),
}));

import WheelDiscLetter from '../WheelDiscLetter';

describe('WheelDiscLetter', () => {
  it('given a tap, then onPress gets the letter, its index and the button once', () => {
    const onPress = vi.fn();
    render(<WheelDiscLetter letter="ה" index={0} isUsed={false} onPress={onPress} />);
    const btn = screen.getByRole('button', { name: 'ה' });
    fireEvent.click(btn);
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(onPress).toHaveBeenCalledWith('ה', 0, btn);
  });

  it('exposes the letter and index the drag hit-test reads', () => {
    render(<WheelDiscLetter letter="ר" index={2} isUsed={false} onPress={vi.fn()} />);
    const btn = screen.getByRole('button', { name: 'ר' });
    expect(btn.dataset.wheelLetter).toBe('ר');
    expect(btn.dataset.wheelIndex).toBe('2');
    expect(btn.dataset.wheelUsed).toBe('false');
  });

  it('guards the glyph from browser auto-translation', () => {
    render(<WheelDiscLetter letter="I" index={1} isUsed={false} onPress={vi.fn()} />);
    const btn = screen.getByRole('button', { name: 'I' });
    expect(btn.getAttribute('translate')).toBe('no');
    expect(btn.className).toMatch(/notranslate/);
  });

  it('given a used letter, then it reads as pressed and offers removal', () => {
    render(<WheelDiscLetter letter="ש" index={3} isUsed onPress={vi.fn()} />);
    const btn = screen.getByRole('button', { name: 'ש. wordWheel.tapToRemove' });
    expect(btn.getAttribute('aria-pressed')).toBe('true');
  });
});
