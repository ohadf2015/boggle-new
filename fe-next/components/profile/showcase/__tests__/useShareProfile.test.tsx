import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock('react-hot-toast', () => ({ default: toast }));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'he' }),
}));

import { useShareProfile } from '../useShareProfile';

const nav = navigator as unknown as { share?: unknown; clipboard?: unknown };

describe('useShareProfile', () => {
  let writeText: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    toast.success.mockClear();
    toast.error.mockClear();
  });
  afterEach(() => {
    delete nav.share;
  });

  it('Given no Web Share, When sharing, Then copies the locale public URL and confirms', async () => {
    delete nav.share;
    const { result } = renderHook(() => useShareProfile({ username: 'ron', name: 'Ron', isOwn: true }));
    await act(async () => { await result.current(); });
    expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/he/u/ron`);
    expect(toast.success).toHaveBeenCalledWith('profile.showcase.linkCopied');
  });

  it('Given Web Share, When sharing, Then uses the native sheet and does not copy', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'share', { value: share, configurable: true });
    const { result } = renderHook(() => useShareProfile({ username: 'ron', name: 'Ron', isOwn: false }));
    await act(async () => { await result.current(); });
    expect(share).toHaveBeenCalledWith(expect.objectContaining({ url: `${window.location.origin}/he/u/ron` }));
    expect(writeText).not.toHaveBeenCalled();
  });

  it('Given the clipboard fails, Then an error toast is shown', async () => {
    delete nav.share;
    writeText.mockRejectedValueOnce(new Error('denied'));
    const { result } = renderHook(() => useShareProfile({ username: 'ron', name: 'Ron', isOwn: true }));
    await act(async () => { await result.current(); });
    expect(toast.error).toHaveBeenCalledWith('profile.showcase.shareFailed');
  });

  it('Given no username, Then does nothing', async () => {
    const { result } = renderHook(() => useShareProfile({ username: null, name: '', isOwn: true }));
    await act(async () => { await result.current(); });
    expect(writeText).not.toHaveBeenCalled();
  });
});
