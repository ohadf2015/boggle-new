import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Hanukkiah from '../Hanukkiah';

const slots = () => [...document.querySelectorAll<HTMLElement>('[data-slot]')];
const litSlots = () => slots().filter((el) => el.dataset.lit === 'true').map((el) => el.dataset.slot);

describe('Hanukkiah', () => {
  it('Given any night, then it has 8 candles in a row plus one shamash', () => {
    render(<Hanukkiah lit={0} label="menorah" />);
    expect(slots()).toHaveLength(9);
    expect(slots().filter((el) => el.dataset.slot === 'shamash')).toHaveLength(1);
  });

  it('Given the shamash, then its cup sits higher than the row of candles', () => {
    render(<Hanukkiah lit={0} label="menorah" />);
    const shamash = document.querySelector<HTMLElement>('[data-slot="shamash"]')!;
    const first = document.querySelector<HTMLElement>('[data-slot="0"]')!;
    expect(parseFloat(shamash.style.bottom)).toBeGreaterThan(parseFloat(first.style.bottom));
  });

  it('Given 3 nights reached, then the shamash plus candles 1-3 burn and the rest are dark', () => {
    render(<Hanukkiah lit={3} label="menorah" />);
    expect(litSlots().sort()).toEqual(['0', '1', '2', 'shamash']);
    expect(document.querySelectorAll('[data-flame]')).toHaveLength(4);
  });

  it('Given all 8 nights, then every candle burns', () => {
    render(<Hanukkiah lit={8} label="menorah" />);
    expect(litSlots()).toHaveLength(9);
  });

  it('Given a Hebrew page, then the menorah keeps its own left-to-right geometry and an accessible label', () => {
    render(<Hanukkiah lit={1} label="1 candles lit" />);
    const img = screen.getByRole('img', { name: '1 candles lit' });
    expect(img.getAttribute('dir')).toBe('ltr');
  });

  it('Given night 1, then the first candle stands on the far right, as it is placed on a real hanukkiah', () => {
    render(<Hanukkiah lit={1} label="menorah" />);
    const left = (slot: string) => parseFloat(document.querySelector<HTMLElement>(`[data-slot="${slot}"]`)!.style.left);
    expect(left('0')).toBeGreaterThan(left('7'));
    expect(left('shamash')).toBeCloseTo(50, 0);
  });
});
