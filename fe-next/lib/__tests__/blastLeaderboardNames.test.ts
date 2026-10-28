import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/blastLeaderboard', async (orig) => ({
  ...(await orig<typeof import('@/lib/blastLeaderboard')>()),
  getWeeklyStanding: vi.fn(),
  getWeeklyScoresAbove: vi.fn(),
}));

import { getWeeklyStanding, getWeeklyScoresAbove } from '@/lib/blastLeaderboard';
import { loadBlastLadder, nameBoardEntries } from '../blastLeaderboardNames';

function supabaseWith(rows: Array<{ id: string; username?: string | null; display_name?: string | null; is_test_account?: boolean }>) {
  return { from: () => ({ select: () => ({ in: () => Promise.resolve({ data: rows, error: null }) }) }) };
}

describe('nameBoardEntries', () => {
  it('prefers display_name, falls back to username, drops unknown ids, keeps order', async () => {
    const rows = await nameBoardEntries(
      supabaseWith([{ id: 'b', username: 'bob' }, { id: 'a', username: 'al', display_name: 'Al' }]),
      [{ userId: 'a', score: 10 }, { userId: 'ghost', score: 20 }, { userId: 'b', score: 30 }],
    );
    expect(rows).toEqual([{ name: 'Al', score: 10 }, { name: 'bob', score: 30 }]);
  });

  it('never names a QA test account as a rival', async () => {
    const rows = await nameBoardEntries(
      supabaseWith([{ id: 'qa', username: 'qa-bot', is_test_account: true }, { id: 'a', username: 'al' }]),
      [{ userId: 'qa', score: 10 }, { userId: 'a', score: 20 }],
    );
    expect(rows).toEqual([{ name: 'al', score: 20 }]);
  });

  it('fails open to [] when the profile lookup hangs', async () => {
    vi.useFakeTimers();
    const hung = { from: () => ({ select: () => ({ in: () => new Promise(() => {}) }) }) };
    const pending = nameBoardEntries(hung, [{ userId: 'a', score: 1 }]);
    await vi.advanceTimersByTimeAsync(1000);
    await expect(pending).resolves.toEqual([]);
    vi.useRealTimers();
  });

  it('returns [] when the profile lookup throws', async () => {
    const broken = { from: () => { throw new Error('down'); } };
    await expect(nameBoardEntries(broken, [{ userId: 'a', score: 1 }])).resolves.toEqual([]);
  });
});

describe('loadBlastLadder', () => {
  beforeEach(() => vi.clearAllMocks());

  it('climbs from the player\'s weekly best when ranked', async () => {
    vi.mocked(getWeeklyStanding).mockResolvedValue({ rank: 6, total: 20, score: 400 });
    vi.mocked(getWeeklyScoresAbove).mockResolvedValue([{ userId: 'a', score: 450 }]);

    const ladder = await loadBlastLadder(supabaseWith([{ id: 'a', username: 'al' }]), 'u1', 'en', 'medium');

    expect(getWeeklyScoresAbove).toHaveBeenCalledWith(400, 'en', 'medium', 5);
    expect(ladder).toEqual({ rank: 6, total: 20, rivals: [{ name: 'al', score: 450 }] });
  });

  it('starts from the bottom of the board when unranked', async () => {
    vi.mocked(getWeeklyStanding).mockResolvedValue(null);
    vi.mocked(getWeeklyScoresAbove).mockResolvedValue([]);

    const ladder = await loadBlastLadder(supabaseWith([]), 'u1', 'en', 'medium');

    expect(getWeeklyScoresAbove).toHaveBeenCalledWith(0, 'en', 'medium', 5);
    expect(ladder).toEqual({ rank: null, total: null, rivals: [] });
  });
});
