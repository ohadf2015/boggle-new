import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguageSafe: () => ({ t: (k: string, p?: Record<string, unknown>) => (p ? `${k} ${Object.values(p).join(' ')}` : k), language: 'en' }),
}));

import RelicBar from '../run/RelicBar';
import { fitVisible } from '../run/relicSlot';

const five = ['sharp-quill', 'long-bow', 'short-sword', 'storm-rune', 'twin-ink'] as const;

describe('fitVisible: chips + the +N tile never exceed the slots the rail can hold', () => {
  it('keeps the cap when it fits, steps down when it does not', () => {
    expect(fitVisible(5, 4, 9)).toBe(4);
    expect(fitVisible(3, 4, 9)).toBe(3);
    expect(fitVisible(5, 4, 4)).toBe(3);
    expect(fitVisible(8, 4, 2)).toBe(1);
  });
});

describe('RelicBar maxVisible on a narrow rail', () => {
  const orig = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientWidth');
  afterEach(() => { if (orig) Object.defineProperty(HTMLElement.prototype, 'clientWidth', orig); });

  it('Given room for 4 slots and 5 relics, then 3 chips + the +2 tile are shown', () => {
    Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, get: () => 150 });
    const { container } = render(<RelicBar relics={[...five]} size="xs" maxVisible={4} />);
    expect(container.querySelectorAll('[data-adv-overflow="true"]').length).toBe(2);
    expect(screen.getByTestId('run-hud-more-relics').textContent).toBe('+2');
  });

  it('Given an unmeasured rail (width 0), then the static cap applies', () => {
    const { container } = render(<RelicBar relics={[...five]} size="xs" maxVisible={4} />);
    expect(container.querySelectorAll('[data-adv-overflow="true"]').length).toBe(1);
  });
});
