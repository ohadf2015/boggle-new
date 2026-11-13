import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@/utils/confettiUtils', () => ({
  fireVictoryConfetti: vi.fn(),
  fireFireworks: vi.fn(),
  fireStreakConfetti: vi.fn(),
  fireLevelUpConfetti: vi.fn(),
}));
vi.mock('@/utils/growthTracking', () => ({ trackGrowthEvent: vi.fn() }));
vi.mock('react-hot-toast', () => ({
  default: { custom: vi.fn((_r, o) => o?.id), dismiss: vi.fn() },
}));

import toast from 'react-hot-toast';
import { showQuestCompletionToast, resetQuestToastQueue } from '../QuestCompletionToast';

const custom = toast.custom as unknown as ReturnType<typeof vi.fn>;
const tierOfCall = (i: number) => {
  const el = (custom.mock.calls[i][0] as (x: { id: string; visible: boolean }) => React.ReactElement)({ id: 'x', visible: true });
  return (el.props as Record<string, unknown>)['data-tier'];
};

describe('QuestCompletionToast queue', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    resetQuestToastQueue();
  });
  afterEach(() => vi.useRealTimers());

  it('given two quests finish together, when shown, then both play one after the other and none is dropped', () => {
    showQuestCompletionToast({ questName: 'A', xpReward: 100, dedupKey: 'a' });
    showQuestCompletionToast({ questName: 'B', xpReward: 100, dedupKey: 'b' });
    expect(custom).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(3000);
    expect(custom).toHaveBeenCalledTimes(2);
    expect(toast.dismiss).toHaveBeenCalledTimes(1);
  });

  it('given a Grand Slam queued before another quest, when played, then the Grand Slam lands last', () => {
    showQuestCompletionToast({ questName: 'A', xpReward: 100, dedupKey: 'a' });
    showQuestCompletionToast({ questName: '', xpReward: 500, isGrandSlam: true, dedupKey: 'gs' });
    showQuestCompletionToast({ questName: 'B', xpReward: 100, dedupKey: 'b' });

    vi.advanceTimersByTime(20000);
    expect(custom).toHaveBeenCalledTimes(3);
    expect([0, 1, 2].map(tierOfCall)).toEqual(['quest', 'quest', 'grandSlam']);
  });

  it('plays the reaction sound for each celebration', () => {
    const onComplete = vi.fn();
    showQuestCompletionToast({ questName: 'A', xpReward: 100, dedupKey: 'a', onComplete });
    showQuestCompletionToast({ questName: 'B', xpReward: 100, dedupKey: 'b', onComplete });
    vi.advanceTimersByTime(10000);
    expect(onComplete).toHaveBeenCalledTimes(2);
    expect(typeof onComplete.mock.calls[0][0]).toBe('string');
  });

  it('ignores a repeat of the same key within the dedup window', () => {
    showQuestCompletionToast({ questName: 'A', xpReward: 100, dedupKey: 'a' });
    showQuestCompletionToast({ questName: 'A', xpReward: 100, dedupKey: 'a' });
    vi.advanceTimersByTime(10000);
    expect(custom).toHaveBeenCalledTimes(1);
  });
});
