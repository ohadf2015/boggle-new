import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { WordCraftComboBadge } from '../WordCraftComboBadge';

const t = (k: string) => (k === 'wordcraft.combo' ? 'Combo' : `[${k}]`);

afterEach(() => {
  vi.useRealTimers();
});

describe('WordCraftComboBadge', () => {
  it('shows nothing for a streak below 2 (a single word is not a combo)', () => {
    const { container } = render(<WordCraftComboBadge streak={1} t={t} />);
    expect(container.firstChild).toBeNull();
  });

  it('pops a badge with the streak multiplier once 2+ words land back-to-back', () => {
    render(<WordCraftComboBadge streak={3} t={t} />);
    const badge = screen.getByRole('status');
    expect(badge.textContent).toContain('3');
    expect(badge.textContent?.toLowerCase()).toContain('combo');
  });

  it('auto-dismisses after its display window (transient, never clutters the board)', () => {
    vi.useFakeTimers();
    render(<WordCraftComboBadge streak={2} t={t} />);
    expect(screen.queryByRole('status')).not.toBeNull();
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(screen.queryByRole('status')).toBeNull();
  });
});
