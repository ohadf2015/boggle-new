import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/utils/confettiUtils', () => ({ fireVictoryConfetti: vi.fn(), fireFireworks: vi.fn() }));
vi.mock('@/utils/growthTracking', () => ({ trackGrowthEvent: vi.fn() }));
vi.mock('react-hot-toast', () => ({ default: { custom: vi.fn(), dismiss: vi.fn() } }));

import toast from 'react-hot-toast';
import { trackGrowthEvent } from '@/utils/growthTracking';
import { showQuestCompletionToast } from '../QuestCompletionToast';

const t = (k: string, p?: Record<string, string | number>) =>
  p ? `${k}:${Object.entries(p).map(([a, b]) => `${a}=${b}`).join(',')}` : k;

function renderedToast() {
  const calls = (toast.custom as unknown as ReturnType<typeof vi.fn>).mock.calls;
  const render_ = calls[calls.length - 1][0] as (i: { id: string; visible: boolean }) => React.ReactElement;
  return render_({ id: 'x', visible: true });
}

describe('QuestCompletionToast feel', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows "done of total" progress and the next-reward nudge while quests remain', () => {
    showQuestCompletionToast({ questName: 'q', xpReward: 100, progress: { done: 2, total: 3 }, dedupKey: 'a', t });
    render(renderedToast());
    expect(screen.getByTestId('quest-toast-progress').textContent).toContain('done=2,total=3');
  });

  it('omits progress line when no progress is given', () => {
    showQuestCompletionToast({ questName: 'q', xpReward: 100, dedupKey: 'b', t });
    render(renderedToast());
    expect(screen.queryByTestId('quest-toast-progress')).toBeNull();
  });

  it.each([
    [{}, 'quest'],
    [{ isPvpWin: true }, 'pvp'],
    [{ isGrandSlam: true }, 'grand_slam'],
    [{ isAllComplete: true }, 'all_complete'],
  ])('tracks quest_completed with tier (%j -> %s)', (flags, tier) => {
    showQuestCompletionToast({ questName: 'q', xpReward: 100, goldReward: 5, dedupKey: `k-${tier}`, t, ...flags });
    expect(trackGrowthEvent).toHaveBeenCalledWith(
      'quest_completed',
      expect.objectContaining({ tier, xp: 100, gold: 5 }),
    );
  });

  it('does not track a deduped repeat', () => {
    showQuestCompletionToast({ questName: 'q', xpReward: 1, dedupKey: 'dup', t });
    showQuestCompletionToast({ questName: 'q', xpReward: 1, dedupKey: 'dup', t });
    expect(trackGrowthEvent).toHaveBeenCalledTimes(1);
  });
});
