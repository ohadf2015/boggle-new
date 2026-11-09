import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BlastGemHaul, bestGemOf } from '../BlastGemHaul';

vi.mock('@/hooks/useReducedMotion', () => ({ useReducedMotion: () => true, default: () => true }));

const t = (key: string, fallbackOrVars?: string | Record<string, string | number>) =>
  typeof fallbackOrVars === 'object' ? `${key}:${JSON.stringify(fallbackOrVars)}` : key;

describe('BlastGemHaul', () => {
  it('shows a slot per gem color, counts for found ones and marks the rarest as best find', () => {
    render(<BlastGemHaul gems={{ emerald: 3, amethyst: 1 }} total={4} t={t} />);
    expect(screen.getByTestId('blast-gem-slot-emerald').textContent).toContain('×3');
    expect(screen.getByTestId('blast-gem-slot-amethyst').textContent).toContain('×1');
    expect(screen.getByTestId('blast-gem-slot-ruby').getAttribute('data-gem-found')).toBe('false');
    expect(screen.getByTestId('blast-gem-slot-amethyst').textContent).toContain('blast.results.bestFind');
    expect(screen.getByTestId('blast-gem-slot-emerald').textContent).not.toContain('blast.results.bestFind');
  });

  it('says how to earn gems when the run found none', () => {
    render(<BlastGemHaul gems={{}} total={0} t={t} />);
    expect(screen.getByTestId('blast-gem-haul').getAttribute('data-empty')).toBe('true');
    expect(screen.getByText('blast.results.gemHaulEmpty')).toBeTruthy();
  });

  it('falls back to one stack when only the total is known', () => {
    render(<BlastGemHaul total={5} t={t} />);
    expect(screen.getByTestId('blast-gem-slot-sapphire').textContent).toContain('×5');
    expect(screen.queryByTestId('blast-gem-slot-ruby')).toBeNull();
  });

  it('picks the rarest gem found', () => {
    expect(bestGemOf({ emerald: 4, sapphire: 1 })).toBe('sapphire');
    expect(bestGemOf({})).toBeNull();
  });
});
