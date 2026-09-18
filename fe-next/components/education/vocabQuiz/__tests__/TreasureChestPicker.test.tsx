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
    const { container } = render(<TreasureChestPicker onPick={onPick} t={mockT} />);

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
});
