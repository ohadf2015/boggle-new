import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { buildChallengeUrl, buildResultUrl, shareQuickResult } from '../challengeShare';
import type { QuickRoundResult } from '../types';

vi.mock('@/lib/analytics/lazyPosthog', () => ({
  default: { capture: vi.fn() },
}));
vi.mock('@/utils/share', () => ({ trackShareCompleted: vi.fn() }));
import posthog from '@/lib/analytics/lazyPosthog';
import { trackShareCompleted } from '@/utils/share';

const EMOJI = /\p{Extended_Pictographic}/u;

const result: QuickRoundResult = {
  mode: 'word-hunt', seed: 'seed-x', score: 540, perfectScore: 800,
  scorePct: 68, wordsFound: 2, totalWords: 22, durationMs: 60000,
  targetWord: 'planets', targetWordFound: true,
  words: [{ word: 'planets', score: 30 }, { word: 'cat', score: 3 }],
};

const t = (k: string) => k;

describe('buildChallengeUrl', () => {
  it('builds locale-aware challenge link with share utm', () => {
    expect(buildChallengeUrl('abc', 'he', 'https://lexiclash.live')).toBe(
      'https://lexiclash.live/he/quick-play?challenge=abc&utm_source=share&utm_medium=quick_results&utm_campaign=challenge'
    );
  });
});

describe('buildResultUrl', () => {
  it('drops the friend straight into the same mode, tagged for attribution', () => {
    expect(buildResultUrl('word-hunt', 'es', 'https://lexiclash.live')).toBe(
      'https://lexiclash.live/es/quick-play?mode=word-hunt&utm_source=share&utm_medium=quick_results&utm_campaign=word-hunt'
    );
  });
});

describe('shareQuickResult', () => {
  const fetchMock = vi.fn();
  const shareMock = vi.fn();
  const writeText = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ id: 'ch-1' }) });
    shareMock.mockResolvedValue(undefined);
    writeText.mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { share: shareMock, clipboard: { writeText } });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('Given a signed-in player, When sharing, Then the challenge link goes out with the recap text', async () => {
    const out = await shareQuickResult({ result, locale: 'en', t, isGuest: false, dayStreak: 0 });
    expect(out).toBe('shared');
    expect(fetchMock).toHaveBeenCalledWith('/api/quick-play/challenge', expect.objectContaining({ method: 'POST' }));
    const payload = shareMock.mock.calls[0][0];
    expect(payload.url).toContain('/en/quick-play?challenge=ch-1');
    expect(payload.text).toContain('quickPlay.solo.recap.header');
    expect(vi.mocked(posthog.capture)).toHaveBeenCalledWith(
      'quick_play_challenge_shared',
      expect.objectContaining({ mode: 'word-hunt', seed: 'seed-x' })
    );
    expect(trackShareCompleted).toHaveBeenCalledWith('web_share_api', { surface: 'quick_results', mode: 'word-hunt' });
  });

  it('Given a guest, When sharing, Then no challenge row is requested and the plain result link is shared', async () => {
    const out = await shareQuickResult({ result, locale: 'he', t, isGuest: true, dayStreak: 0 });
    expect(out).toBe('shared');
    expect(fetchMock).not.toHaveBeenCalled();
    expect(shareMock.mock.calls[0][0].url).toMatch(/\/he\/quick-play\?mode=word-hunt&utm_source=share&utm_medium=quick_results&utm_campaign=word-hunt$/);
    expect(trackShareCompleted).toHaveBeenCalledWith('web_share_api', { surface: 'quick_results', mode: 'word-hunt' });
  });

  it('Given the challenge row fails, When sharing, Then it still shares the result link instead of doing nothing', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 500, json: async () => ({}) });
    const out = await shareQuickResult({ result, locale: 'en', t, isGuest: false, dayStreak: 0 });
    expect(out).toBe('shared');
    expect(shareMock.mock.calls[0][0].url).toContain('utm_campaign=word-hunt');
  });

  it('Given the challenge request throws, When sharing, Then it falls back to the result link', async () => {
    fetchMock.mockRejectedValue(new Error('offline'));
    const out = await shareQuickResult({ result, locale: 'en', t, isGuest: false, dayStreak: 0 });
    expect(out).toBe('shared');
    expect(shareMock).toHaveBeenCalledTimes(1);
  });

  it('Given no native share sheet, When sharing, Then the text and link are copied and tracked as clipboard', async () => {
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    const out = await shareQuickResult({ result, locale: 'en', t, isGuest: true, dayStreak: 4 });
    expect(out).toBe('copied');
    const copied = writeText.mock.calls[0][0] as string;
    expect(copied).toContain('quickPlay.solo.recap.streak');
    expect(copied).toMatch(/\nhttps?:\/\/\S+\/en\/quick-play\?mode=word-hunt&utm_source=share/);
    expect(trackShareCompleted).toHaveBeenCalledWith('clipboard', { surface: 'quick_results', mode: 'word-hunt' });
  });

  it('Given the share sheet errors, When it falls back to copying, Then it is tracked as fallback_clipboard', async () => {
    shareMock.mockRejectedValue(new Error('not allowed'));
    const out = await shareQuickResult({ result, locale: 'en', t, isGuest: true, dayStreak: 0 });
    expect(out).toBe('copied');
    expect(trackShareCompleted).toHaveBeenCalledWith('fallback_clipboard', { surface: 'quick_results', mode: 'word-hunt' });
  });

  it('Given the player cancels the share sheet, When sharing, Then nothing is tracked as completed', async () => {
    shareMock.mockRejectedValue(new DOMException('cancel', 'AbortError'));
    const out = await shareQuickResult({ result, locale: 'en', t, isGuest: true, dayStreak: 0 });
    expect(out).toBe('cancelled');
    expect(trackShareCompleted).not.toHaveBeenCalled();
  });

  it('never puts the found words or emoji in the shared text', async () => {
    await shareQuickResult({ result, locale: 'en', t: (k: string) => `${k} 🎯`, isGuest: true, dayStreak: 3 });
    const payload = shareMock.mock.calls[0][0];
    expect(payload.text).not.toMatch(/planets|\bcat\b/);
    expect(payload.text).not.toMatch(EMOJI);
  });
});
