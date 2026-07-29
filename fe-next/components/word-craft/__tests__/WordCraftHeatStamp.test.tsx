import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { WordCraftHeatStamp } from '../WordCraftHeatStamp';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        'wordcraft.overdrive': 'OVERDRIVE!',
        'wordcraft.heatStamp.exitOverdrive': 'CASHED!',
        'wordcraft.burnout': 'BURNOUT!',
        'wordcraft.heatStamp.recover': 'REVIVED',
      };
      return map[key] ?? key;
    },
  }),
}));

describe('WordCraftHeatStamp', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('renders nothing when beat is null', () => {
    const { container } = render(<WordCraftHeatStamp beat={null} onDone={() => {}} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders the OVERDRIVE label on enter-overdrive', () => {
    render(<WordCraftHeatStamp beat="enter-overdrive" onDone={() => {}} />);
    expect(screen.getByText('OVERDRIVE!')).toBeInTheDocument();
  });

  it('renders BURNOUT on enter-burnout', () => {
    render(<WordCraftHeatStamp beat="enter-burnout" onDone={() => {}} />);
    expect(screen.getByText('BURNOUT!')).toBeInTheDocument();
  });

  it('calls onDone after the auto-dismiss timeout', () => {
    const onDone = vi.fn();
    render(<WordCraftHeatStamp beat="enter-overdrive" onDone={onDone} />);
    expect(onDone).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(1300);
    });
    expect(onDone).toHaveBeenCalledTimes(1);
  });
});
