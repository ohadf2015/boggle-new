import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en' }),
}));

vi.mock('framer-motion', () => ({
  m: { div: ({ children, ...p }: React.PropsWithChildren<Record<string, unknown>>) =>
    React.createElement('div', p as never, children) },
}));

// Avatar renders a deterministic RANDOM face without `customAvatar`, and a
// permanent skeleton when it has neither customAvatar nor userId. Mirror both
// so the tests can tell "real avatar" from "stand-in" from "never resolves".
vi.mock('@/components/Avatar', () => ({
  __esModule: true,
  default: ({ customAvatar, userId }: { customAvatar?: unknown; userId?: string }) =>
    React.createElement('div', {
      'data-testid': 'lb-avatar',
      'data-avatar-type': customAvatar ? 'custom' : userId ? 'generated' : 'skeleton',
    }),
}));

import { CustomChallengeStats } from '../CustomChallengeStats';

const STATS = {
  puzzleCode: 'ABCD', creatorDisplayName: 'Maker', targetWord: 'HOUSE', language: 'en',
  createdAt: '2026-08-01T00:00:00Z', creatorEfficiencyScore: 90,
  totalAttempts: 5, totalSolved: 3, solveRate: 0.6, avgAttemptsSolved: 2,
  avgEfficiencyScore: 80, maxEfficiencyScore: 95,
  attemptDistribution: { '1': 1, '2': 2 }, beatCreatorCount: 1,
};

/** The leaderboard view/API returns `player_id` — never `user_id`. */
const apiRow = {
  rank_position: 1,
  player_id: 'abc-123',
  display_name: 'Tali',
  avatar_emoji: '🦊',
  avatar_color: '#BFFF00',
  avatar_config: { base: 'diamond', eyes: 'dizzy' },
  solved: true,
  attempts_used: 2,
  efficiency_score: 88,
  completed_at: '2026-08-12T00:00:00Z',
};

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes('/leaderboard')) {
      return { ok: true, json: async () => ({ success: true, data: [apiRow] }) } as Response;
    }
    return { ok: true, json: async () => ({ success: true, stats: STATS }) } as Response;
  }));
});

afterEach(() => vi.unstubAllGlobals());

describe('CustomChallengeStats leaderboard avatars', () => {
  it('renders the solver REAL avatar from the API row', async () => {
    render(<CustomChallengeStats puzzleCode="ABCD" />);
    const avatar = await screen.findByTestId('lb-avatar');
    expect(avatar.getAttribute('data-avatar-type')).toBe('custom');
  });

  it('falls back to a seeded avatar — never an unresolved skeleton — without avatar_config', async () => {
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/leaderboard')) {
        return {
          ok: true,
          json: async () => ({ success: true, data: [{ ...apiRow, avatar_config: null }] }),
        } as Response;
      }
      return { ok: true, json: async () => ({ success: true, stats: STATS }) } as Response;
    }));
    render(<CustomChallengeStats puzzleCode="ABCD" />);
    const avatar = await screen.findByTestId('lb-avatar');
    expect(avatar.getAttribute('data-avatar-type')).toBe('generated');
  });
});
