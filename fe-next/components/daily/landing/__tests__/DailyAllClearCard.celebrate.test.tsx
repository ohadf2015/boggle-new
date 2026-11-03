import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';

vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ t: (k: string) => k }) }));
vi.mock('@/utils/confettiUtils', () => ({ fireVictoryConfetti: vi.fn() }));
vi.mock('@/utils/hapticFeedback', () => ({ triggerHaptic: vi.fn() }));

import { fireVictoryConfetti } from '@/utils/confettiUtils';
import { triggerHaptic } from '@/utils/hapticFeedback';
import { DailyAllClearCard } from '../DailyAllClearCard';

describe('DailyAllClearCard celebration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('celebrates the first time the card shows today', () => {
    render(<DailyAllClearCard streak={3} />);
    expect(fireVictoryConfetti).toHaveBeenCalledTimes(1);
    expect(triggerHaptic).toHaveBeenCalledWith('success');
  });

  it('stays quiet on a revisit the same day', () => {
    const first = render(<DailyAllClearCard streak={3} />);
    first.unmount();
    vi.clearAllMocks();
    render(<DailyAllClearCard streak={3} />);
    expect(fireVictoryConfetti).not.toHaveBeenCalled();
    expect(triggerHaptic).not.toHaveBeenCalled();
  });

  it('celebrates again on a new day', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-03T10:00:00Z'));
    render(<DailyAllClearCard streak={1} />).unmount();
    vi.setSystemTime(new Date('2026-11-04T10:00:00Z'));
    vi.clearAllMocks();
    render(<DailyAllClearCard streak={2} />);
    expect(fireVictoryConfetti).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });

  it('still renders and celebrates when storage throws', () => {
    const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    const { getByTestId } = render(<DailyAllClearCard streak={0} />);
    expect(getByTestId('daily-all-clear')).toBeTruthy();
    spy.mockRestore();
  });
});
