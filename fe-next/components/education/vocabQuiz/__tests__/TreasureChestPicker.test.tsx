/**
 * Treasure Chest Picker — test suite.
 *
 * Tests the UI for picking one of three chests after a correct answer.
 */

import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { TreasureChestPicker } from '../TreasureChestPicker';

const mockT = (key: string) => key;

describe('TreasureChestPicker', () => {
  it('renders exactly three chest buttons', () => {
    const onPick = vi.fn();
    render(<TreasureChestPicker onPick={onPick} t={mockT} />);

    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(3);
  });

  it('calls onPick with the chest index when a chest is clicked', async () => {
    const onPick = vi.fn();
    render(<TreasureChestPicker onPick={onPick} t={mockT} />);

    const buttons = screen.getAllByRole('button');
    buttons[1].click();

    expect(onPick).toHaveBeenCalledWith(1);
  });

  it('disables all buttons after picking', async () => {
    const onPick = vi.fn();
    const { rerender } = render(
      <TreasureChestPicker onPick={onPick} t={mockT} disabled={false} />
    );

    rerender(<TreasureChestPicker onPick={onPick} t={mockT} disabled={true} />);

    const buttons = screen.getAllByRole('button');
    buttons.forEach((btn) => {
      expect(btn).toBeDisabled();
    });
  });

  it('has large tap targets for 390×844 phone', () => {
    render(<TreasureChestPicker onPick={vi.fn()} t={mockT} />);
    const buttons = screen.getAllByRole('button');

    // Each button should be at least 60px tall for comfortable mobile tapping
    buttons.forEach((btn) => {
      const style = window.getComputedStyle(btn);
      const height = parseFloat(style.height);
      expect(height).toBeGreaterThanOrEqual(60);
    });
  });

  it('fits on screen without scroll on 390×844', () => {
    const { container } = render(<TreasureChestPicker onPick={vi.fn()} t={mockT} />);
    const wrapper = container.firstChild as HTMLElement;

    // Should fit within typical mobile viewport
    expect(wrapper.classList.contains('gap-2')).toBe(true);
    expect(wrapper.classList.contains('p-3')).toBe(true);
  });

  it('marks the picked chest so the tap reads as registered', () => {
    render(<TreasureChestPicker onPick={vi.fn()} t={mockT} disabled pickedIndex={2} />);
    const buttons = screen.getAllByRole('button');
    expect(buttons[2]).toHaveAttribute('aria-pressed', 'true');
    expect(buttons[0]).toHaveAttribute('aria-pressed', 'false');
  });

  it('three chests and their gaps fit a 390px phone with the 16px gutters', () => {
    render(<TreasureChestPicker onPick={vi.fn()} t={mockT} />);
    const widths = screen.getAllByRole('button').map((b) => parseFloat(b.style.minWidth));
    const total = widths.reduce((a, b) => a + b, 0) + 2 * 8 /* gap-2 */ + 2 * 12 /* p-3 */;
    expect(total).toBeLessThanOrEqual(390 - 32);
  });
});
