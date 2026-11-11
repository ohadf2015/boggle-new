import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const rpc = vi.fn();
const profiles = vi.fn();

vi.mock('@/utils/supabase/server', () => ({
  createClient: async () => ({
    rpc,
    from: () => ({ select: () => ({ in: profiles }) }),
  }),
}));
vi.mock('@/lib/apiRateLimit', () => ({ checkApiRateLimit: () => ({ success: true }) }));
vi.mock('@/utils/sentry', () => ({ captureApiError: vi.fn() }));

import { GET } from '../route';

describe('GET /api/quick-play/leaderboard', () => {
  beforeEach(() => {
    rpc.mockResolvedValue({
      data: [
        { user_id: 'a', best_score_pct: 90, best_score: 9, rounds: 3, rank: 1 },
        { user_id: 'b', best_score_pct: 80, best_score: 8, rounds: 2, rank: 2 },
        { user_id: 'c', best_score_pct: 70, best_score: 7, rounds: 1, rank: 3 },
      ],
      error: null,
    });
    profiles.mockResolvedValue({
      data: [
        { id: 'a', username: 'Player_aaaa1111', display_name: null, avatar_config: null },
        { id: 'b', username: 'shit', display_name: 'Sneaky Potato', avatar_config: null },
        { id: 'c', username: 'Zigzag', display_name: null, avatar_config: null },
      ],
    });
  });

  it('Given players without a public name, When the board is read, Then only public names show, ranked without a gap', async () => {
    const res = await GET(new NextRequest('http://x/api/quick-play/leaderboard?range=today'));
    const body = await res.json();
    expect(body.entries.map((e: { name: string; rank: number }) => [e.rank, e.name])).toEqual([[1, 'Zigzag']]);
  });
});
