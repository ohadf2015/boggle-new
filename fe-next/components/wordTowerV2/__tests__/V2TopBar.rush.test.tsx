import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { createRun } from '@/lib/wordTowerV2/run';
import { V2TopBar } from '../V2TopBar';

vi.mock('@/components/ui/AnimatedCounter', () => ({
  default: ({ value, formatValue }: { value: number; formatValue?: (v: number) => string }) => (
    <span>{formatValue ? formatValue(value) : value}</span>
  ),
}));

afterEach(cleanup);

const t = (key: string, params?: Record<string, string | number>) =>
  params ? `${key}:${Object.values(params).join(',')}` : key;

const bar = (over: Partial<Parameters<typeof V2TopBar>[0]> = {}) => (
  <V2TopBar t={t} heightM={9} score={520} bestM={0} run={createRun(1)} coins={1200} coinsRef={{ current: null }} {...over} />
);

describe('V2TopBar rush slot', () => {
  it('given no rushSlot prop, then no row is reserved (existing layouts keep their height)', () => {
    const { container } = render(bar());
    expect(container.querySelector('[data-wt2-rush-slot]')).toBeNull();
  });

  it('given rushSlot={null}, then the row is still reserved so the widget arriving later does not move the canvas', () => {
    const { container } = render(bar({ rushSlot: null }));
    const slot = container.querySelector('[data-wt2-rush-slot]');
    expect(slot).toBeTruthy();
    expect(slot?.className).toMatch(/\bh-\d|\bh-\[/);
  });

  it('given a rush widget, then it renders in its own row under the chip row', () => {
    const { container } = render(bar({ rushSlot: <span>RANK</span> }));
    const slot = container.querySelector('[data-wt2-rush-slot]');
    expect(slot?.textContent).toBe('RANK');
    expect(container.querySelector('[data-wt2-topbar-row]')?.contains(slot)).toBe(false);
  });
});

describe('V2TopBar floor delta', () => {
  it('given a floor is built, then the +Nm pop lives inside the height chip, never above it', () => {
    const { container, rerender } = render(bar({ heightM: 9 }));
    rerender(bar({ heightM: 9.8 }));
    const delta = container.querySelector('[data-wt2-height-delta]');
    const chip = container.querySelector('[data-wt2-height-pop]');
    expect(delta).toBeTruthy();
    expect(chip?.contains(delta)).toBe(true);
    expect(delta?.className ?? '').not.toMatch(/-top-/);
  });
});

describe('V2TopBar combo meter', () => {
  it('given no streak, then no combo meter', () => {
    const { container } = render(bar({ run: { ...createRun(1), combo: 1 } }));
    expect(container.querySelector('[data-wt2-combo]')).toBeNull();
  });

  it('given a hot streak, then the meter shows the multiplier at its tier', () => {
    const { container } = render(bar({ run: { ...createRun(1), combo: 5 } }));
    const meter = container.querySelector('[data-wt2-combo]');
    expect(meter?.getAttribute('data-tier')).toBe('2');
    expect(meter?.textContent).toContain('×5');
  });

  it('given a combo meter, then the row keeps exactly its four items', () => {
    const { container } = render(bar({ run: { ...createRun(1), combo: 8 }, onExit: vi.fn(), onMenuOpen: vi.fn() }));
    expect(container.querySelector('[data-wt2-topbar-row]')?.children.length).toBe(4);
  });
});

describe('V2TopBar widths', () => {
  it('given a five-digit coin bank, then the chip shows a compact number', () => {
    render(bar({ coins: 88888 }));
    expect(screen.getByText('88.9K')).toBeTruthy();
    expect(screen.getByLabelText('wordTowerV2.coins.run:88888')).toBeTruthy();
  });

  it('given a tight row, then the exit word can collapse to icon-only (its a11y label stays)', () => {
    const { container } = render(bar({ onExit: vi.fn() }));
    const word = container.querySelector('[data-wt2-exit] span');
    expect(word?.className).toMatch(/@max-/);
    expect(container.querySelector('[data-wt2-topbar-row]')?.className).toMatch(/@container/);
  });
});
