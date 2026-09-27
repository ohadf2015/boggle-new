import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { buildDuelShareData, performDuelShare } from '../duelShare';

describe('buildDuelShareData', () => {
  it('wraps buildDuelUrl and carries the share title + text', () => {
    const data = buildDuelShareData(
      'https://www.lexiclash.live',
      'en',
      { seed: 123, name: 'Ada', score: 50 },
      'I scored 50 — beat my board?',
      'Challenge me',
    );
    expect(data.title).toBe('Challenge me');
    expect(data.text).toBe('I scored 50 — beat my board?');
    expect(data.url).toContain('/en/word-craft?');
    expect(data.url).toContain('seed=123');
    expect(data.url).toContain('duel=1');
    expect(data.url).toContain('ds=50');
  });
});

/** jsdom exposes navigator.share/clipboard as getter-only — define, don't assign. */
function setShare(fn: ((data: unknown) => Promise<void>) | undefined) {
  Object.defineProperty(navigator, 'share', { value: fn, configurable: true, writable: true });
}
function setClipboard(writeText: (t: string) => Promise<void>) {
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
}

describe('performDuelShare', () => {
  const data = { title: 'T', text: 'X', url: 'https://x/duel' };
  const onCopied = vi.fn<() => void>();
  const onCopyFailed = vi.fn<() => void>();

  beforeEach(() => {
    onCopied.mockReset();
    onCopyFailed.mockReset();
  });
  afterEach(() => {
    setShare(undefined);
    vi.restoreAllMocks();
  });

  it('uses the native share sheet when available and does NOT touch clipboard', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    setShare(share);
    const writeText = vi.fn().mockResolvedValue(undefined);
    setClipboard(writeText);

    await performDuelShare(data, { onCopied, onCopyFailed });

    expect(share).toHaveBeenCalledWith({ title: 'T', text: 'X', url: 'https://x/duel' });
    expect(writeText).not.toHaveBeenCalled();
    expect(onCopied).not.toHaveBeenCalled(); // native share success = no toast
  });

  it('falls back to clipboard + onCopied when native share is unavailable', async () => {
    setShare(undefined);
    const writeText = vi.fn().mockResolvedValue(undefined);
    setClipboard(writeText);

    await performDuelShare(data, { onCopied, onCopyFailed });

    expect(writeText).toHaveBeenCalledWith('https://x/duel');
    expect(onCopied).toHaveBeenCalledTimes(1);
    expect(onCopyFailed).not.toHaveBeenCalled();
  });

  it('is silent when the user cancels the native share (AbortError)', async () => {
    const share = vi.fn().mockRejectedValue(Object.assign(new Error('cancel'), { name: 'AbortError' }));
    setShare(share);
    const writeText = vi.fn().mockResolvedValue(undefined);
    setClipboard(writeText);

    await performDuelShare(data, { onCopied, onCopyFailed });

    expect(writeText).not.toHaveBeenCalled();
    expect(onCopied).not.toHaveBeenCalled();
    expect(onCopyFailed).not.toHaveBeenCalled();
  });

  it('falls back to clipboard when native share throws a non-cancel error', async () => {
    const share = vi.fn().mockRejectedValue(Object.assign(new Error('boom'), { name: 'NotAllowedError' }));
    setShare(share);
    const writeText = vi.fn().mockResolvedValue(undefined);
    setClipboard(writeText);

    await performDuelShare(data, { onCopied, onCopyFailed });

    expect(writeText).toHaveBeenCalledWith('https://x/duel');
    expect(onCopied).toHaveBeenCalledTimes(1);
  });

  it('reports onCopyFailed when clipboard write rejects', async () => {
    setShare(undefined);
    const writeText = vi.fn().mockRejectedValue(new Error('denied'));
    setClipboard(writeText);

    await performDuelShare(data, { onCopied, onCopyFailed });

    expect(onCopyFailed).toHaveBeenCalledTimes(1);
    expect(onCopied).not.toHaveBeenCalled();
  });
});
