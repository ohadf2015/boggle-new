import { renderHook, act } from '@testing-library/react';
import { useWordHuntPromo } from '../useWordHuntPromo';

// Wire up localStorage mock with real storage backend
const storageBackend: Record<string, string> = {};

describe('useWordHuntPromo', () => {
  beforeEach(() => {
    Object.keys(storageBackend).forEach(k => delete storageBackend[k]);
    (localStorage.getItem as any).mockImplementation((key: string) => storageBackend[key] ?? null);
    (localStorage.setItem as any).mockImplementation((key: string, value: string) => { storageBackend[key] = value; });
    (localStorage.clear as any).mockImplementation(() => { Object.keys(storageBackend).forEach(k => delete storageBackend[k]); });
  });

  it('allows showing when no impressions recorded', () => {
    const { result } = renderHook(() => useWordHuntPromo());
    expect(result.current.canShow).toBe(true);
  });

  it('blocks showing after 3 impressions', () => {
    localStorage.setItem('wordHuntPromoShown', '3');
    const { result } = renderHook(() => useWordHuntPromo());
    expect(result.current.canShow).toBe(false);
  });

  it('increments count on recordImpression', () => {
    const { result } = renderHook(() => useWordHuntPromo());

    act(() => {
      result.current.recordImpression();
    });

    expect(localStorage.getItem('wordHuntPromoShown')).toBe('1');
  });

  it('sets canShow to false when reaching limit via recordImpression', () => {
    localStorage.setItem('wordHuntPromoShown', '2');
    const { result } = renderHook(() => useWordHuntPromo());

    act(() => {
      result.current.recordImpression();
    });

    expect(result.current.canShow).toBe(false);
  });

  it('allows showing with 1 or 2 impressions', () => {
    localStorage.setItem('wordHuntPromoShown', '2');
    const { result } = renderHook(() => useWordHuntPromo());
    expect(result.current.canShow).toBe(true);
  });
});
