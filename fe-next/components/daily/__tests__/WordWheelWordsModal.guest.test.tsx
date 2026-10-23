import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { WordWheelWordsModal } from '../WordWheelWordsModal';

const t = (_k: string, fallback?: string) => fallback ?? _k;

describe('WordWheelWordsModal for a guest opponent', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('looks the guest up by POST body, keeping the fingerprint out of the URL', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ wordsFound: ['cat'], wordCount: 1, score: 5, longestWord: 'cat', displayName: 'Zigzag' }), { status: 200 }),
    );
    vi.stubGlobal('fetch', fetchMock);

    render(
      <WordWheelWordsModal isOpen onClose={vi.fn()} puzzleDate="2026-10-23" language={'en' as never}
        playerId={null} guestFingerprint="fp-1" playerName="Zigzag" t={t} />,
    );

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/daily-challenge/word-wheel/words/2026-10-23/en');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual({ guestFingerprint: 'fp-1' });
  });
});
