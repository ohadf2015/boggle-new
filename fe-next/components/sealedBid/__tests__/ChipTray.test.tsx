import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ChipTray from '../ChipTray';

describe('ChipTray', () => {
  it('chip buttons add to stake, clamped to balance', () => {
    const onStakeChange = vi.fn();
    render(<ChipTray balance={30} stake={5} onStakeChange={onStakeChange} reducedMotion />);
    fireEvent.click(screen.getByRole('button', { name: /\+10/i }));
    expect(onStakeChange).toHaveBeenCalledWith(15);
  });

  it('all-in sets stake to balance', () => {
    const onStakeChange = vi.fn();
    render(<ChipTray balance={42} stake={5} onStakeChange={onStakeChange} reducedMotion />);
    fireEvent.click(screen.getByRole('button', { name: /all.?in/i }));
    expect(onStakeChange).toHaveBeenCalledWith(42);
  });

  it('has no stake-clear button — it collided with the wheel\'s letter-clear button', () => {
    render(<ChipTray balance={42} stake={5} onStakeChange={() => {}} reducedMotion />);
    expect(screen.queryByRole('button', { name: /^clear$/i })).not.toBeInTheDocument();
  });
});
