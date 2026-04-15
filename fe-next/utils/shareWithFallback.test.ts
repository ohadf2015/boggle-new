import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { shareWithFallback } from './shareWithFallback';

describe('shareWithFallback', () => {
  const originalShare = (globalThis.navigator as Navigator & { share?: unknown }).share;
  const originalClipboard = globalThis.navigator.clipboard;
  const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

  beforeEach(() => {
    consoleErrorSpy.mockClear();
  });

  afterEach(() => {
    Object.defineProperty(globalThis.navigator, 'share', {
      value: originalShare,
      configurable: true,
      writable: true,
    });
    Object.defineProperty(globalThis.navigator, 'clipboard', {
      value: originalClipboard,
      configurable: true,
      writable: true,
    });
  });

  function setShare(impl: ((data: ShareData) => Promise<void>) | undefined) {
    Object.defineProperty(globalThis.navigator, 'share', {
      value: impl,
      configurable: true,
      writable: true,
    });
  }

  function setClipboard(writeText: ((text: string) => Promise<void>) | null) {
    Object.defineProperty(globalThis.navigator, 'clipboard', {
      value: writeText ? { writeText } : undefined,
      configurable: true,
      writable: true,
    });
  }

  it('returns "shared" when native share succeeds', async () => {
    const shareFn = vi.fn().mockResolvedValue(undefined);
    setShare(shareFn);
    const clipboardFn = vi.fn().mockResolvedValue(undefined);
    setClipboard(clipboardFn);

    const result = await shareWithFallback({ text: 'hi', url: 'https://x.test' });

    expect(result).toBe('shared');
    expect(shareFn).toHaveBeenCalledOnce();
    expect(clipboardFn).not.toHaveBeenCalled();
  });

  it('returns "cancelled" on AbortError without falling back to clipboard', async () => {
    const abort = new DOMException('user cancelled', 'AbortError');
    const shareFn = vi.fn().mockRejectedValue(abort);
    setShare(shareFn);
    const clipboardFn = vi.fn().mockResolvedValue(undefined);
    setClipboard(clipboardFn);

    const result = await shareWithFallback({ text: 'hi', url: 'https://x.test' });

    expect(result).toBe('cancelled');
    expect(clipboardFn).not.toHaveBeenCalled();
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  it('falls back to clipboard when navigator.share is unavailable', async () => {
    setShare(undefined);
    const clipboardFn = vi.fn().mockResolvedValue(undefined);
    setClipboard(clipboardFn);

    const result = await shareWithFallback({ text: 'hello ', url: 'world' });

    expect(result).toBe('copied');
    expect(clipboardFn).toHaveBeenCalledWith('hello world');
  });

  it('falls back to clipboard on non-Abort share error', async () => {
    const shareFn = vi.fn().mockRejectedValue(new Error('share broke'));
    setShare(shareFn);
    const clipboardFn = vi.fn().mockResolvedValue(undefined);
    setClipboard(clipboardFn);

    const result = await shareWithFallback({ text: 'a', url: 'b' });

    expect(result).toBe('copied');
    expect(clipboardFn).toHaveBeenCalledOnce();
  });

  it('silences clipboard NotAllowedError (Android focus quirk) and returns "failed"', async () => {
    setShare(undefined);
    const notAllowed = new DOMException('Document is not focused', 'NotAllowedError');
    const clipboardFn = vi.fn().mockRejectedValue(notAllowed);
    setClipboard(clipboardFn);

    const result = await shareWithFallback({ text: 'a', url: 'b' });

    expect(result).toBe('failed');
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  it('uses clipboardText override when provided', async () => {
    setShare(undefined);
    const clipboardFn = vi.fn().mockResolvedValue(undefined);
    setClipboard(clipboardFn);

    await shareWithFallback({ text: 't', url: 'u', clipboardText: 'custom' });

    expect(clipboardFn).toHaveBeenCalledWith('custom');
  });
});
