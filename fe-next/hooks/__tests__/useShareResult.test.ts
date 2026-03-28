// @vitest-environment jsdom
import { vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useShareResult } from '../useShareResult';
import type { ShareParams } from '@/shared/utils/shareResultGenerator';

// Mock clipboard API
Object.assign(navigator, {
  clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
  share: undefined,
});

// Mock window.open
const mockOpen = vi.fn();
window.open = mockOpen;

describe('useShareResult', () => {
  const mockT = (key: string) => key;

  const defaultParams: ShareParams = {
    gameMode: 'singleplayer',
    score: 100,
    wordsFound: 8,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should generate share text from params', () => {
    const { result } = renderHook(() => useShareResult(defaultParams, mockT));

    expect(result.current.shareText).toContain('100');
    expect(result.current.shareText).toContain('lexiclash.live');
  });

  it('should copy text to clipboard and set copied flag', async () => {
    const { result } = renderHook(() => useShareResult(defaultParams, mockT));

    await act(async () => {
      await result.current.handleCopy();
    });

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(result.current.shareText);
    expect(result.current.copied).toBe(true);
  });

  it('should open WhatsApp share URL', () => {
    const { result } = renderHook(() => useShareResult(defaultParams, mockT));

    act(() => {
      result.current.handleWhatsApp();
    });

    expect(mockOpen).toHaveBeenCalledWith(
      expect.stringContaining('wa.me'),
      '_blank'
    );
  });

  it('should open Twitter share URL', () => {
    const { result } = renderHook(() => useShareResult(defaultParams, mockT));

    act(() => {
      result.current.handleTwitter();
    });

    expect(mockOpen).toHaveBeenCalledWith(
      expect.stringContaining('twitter.com/intent/tweet'),
      '_blank'
    );
  });
});
