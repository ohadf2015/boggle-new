import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { WordCraftDifficultySelect } from '../WordCraftDifficultySelect';

const t = (k: string) => `[${k}]`;

describe('WordCraftDifficultySelect', () => {
  it('renders a segment per difficulty and marks the active one pressed', () => {
    render(<WordCraftDifficultySelect value="easy" onChange={() => {}} t={t} />);
    const easy = screen.getByRole('button', { name: /difficulty.easy/i });
    const hard = screen.getByRole('button', { name: /difficulty.hard/i });
    expect(easy.getAttribute('aria-pressed')).toBe('true');
    expect(hard.getAttribute('aria-pressed')).toBe('false');
  });

  it('calls onChange with the chosen difficulty', () => {
    const onChange = vi.fn();
    render(<WordCraftDifficultySelect value="easy" onChange={onChange} t={t} />);
    fireEvent.click(screen.getByRole('button', { name: /difficulty.hard/i }));
    expect(onChange).toHaveBeenCalledWith('hard');
  });

  it('does not re-fire onChange when clicking the already-active segment', () => {
    const onChange = vi.fn();
    render(<WordCraftDifficultySelect value="medium" onChange={onChange} t={t} />);
    fireEvent.click(screen.getByRole('button', { name: /difficulty.medium/i }));
    expect(onChange).not.toHaveBeenCalled();
  });
});
