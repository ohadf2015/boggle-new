import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { buildChallengeUrl, shareChallenge } from '../challengeShare';
import type { QuickRoundResult } from '../types';

vi.mock('@/lib/analytics/lazyPosthog', () => ({
  default: { capture: vi.fn() },
}));
import posthog from '@/lib/analytics/lazyPosthog';

const result: QuickRoundResult = {
  mode: 'blast', seed: 'seed-x', score: 540, perfectScore: 800,
  scorePct: 68, wordsFound: 14, totalWords: 22, durationMs: 60000,
};

describe('buildChallengeUrl', () => {
  it('builds locale-aware challenge link', () => {
    expect(buildChallengeUrl('abc', 'he', 'https://lexiclash.live')).toBe(
      'https://lexiclash.live/he/quick-play?challenge=abc'
    );
  });
});

describe('shareChallenge', () => {
  const fetchMock = vi.fn();
  const shareMock = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ id: 'ch-1' }) });
    Object.assign(navigator, { share: shareMock });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('creates challenge row then shares URL with score text', async () => {
    await shareChallenge(result, 'en', (k: string) => k);
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/quick-play/challenge',
      expect.objectContaining({ method: 'POST' })
    );
    expect(shareMock).toHaveBeenCalledWith(
      expect.objectContaining({ url: expect.stringContaining('/en/quick-play?challenge=ch-1') })
    );
    expect(vi.mocked(posthog.capture)).toHaveBeenCalledWith(
      'quick_play_challenge_shared',
      expect.objectContaining({ mode: 'blast', seed: 'seed-x' })
    );
  });

  it('returns null silently when challenge creation fails', async () => {
    fetchMock.mockResolvedValue({ ok: false, json: async () => ({}) });
    const out = await shareChallenge(result, 'en', (k: string) => k);
    expect(out).toBeNull();
    expect(shareMock).not.toHaveBeenCalled();
  });
});
