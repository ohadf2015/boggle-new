import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useKonamiCode } from '@/hooks/useKonamiCode';
import { KONAMI_SEQUENCE } from '@/utils/konamiSequence';

function press(key: string, target?: EventTarget) {
  const ev = new KeyboardEvent('keydown', { key, bubbles: true });
  if (target) Object.defineProperty(ev, 'target', { value: target });
  window.dispatchEvent(ev);
}

describe('useKonamiCode', () => {
  it('invokes onUnlock when the full sequence is entered', () => {
    const onUnlock = vi.fn();
    renderHook(() => useKonamiCode(onUnlock));
    KONAMI_SEQUENCE.forEach(k => press(k));
    expect(onUnlock).toHaveBeenCalledTimes(1);
  });

  it('does not fire on a partial sequence', () => {
    const onUnlock = vi.fn();
    renderHook(() => useKonamiCode(onUnlock));
    KONAMI_SEQUENCE.slice(0, 9).forEach(k => press(k));
    expect(onUnlock).not.toHaveBeenCalled();
  });

  it('ignores keystrokes while typing in an input field', () => {
    const onUnlock = vi.fn();
    renderHook(() => useKonamiCode(onUnlock));
    const input = document.createElement('input');
    KONAMI_SEQUENCE.forEach(k => press(k, input));
    expect(onUnlock).not.toHaveBeenCalled();
  });

  it('removes its listener on unmount (no leak / no fire after)', () => {
    const onUnlock = vi.fn();
    const { unmount } = renderHook(() => useKonamiCode(onUnlock));
    unmount();
    KONAMI_SEQUENCE.forEach(k => press(k));
    expect(onUnlock).not.toHaveBeenCalled();
  });
});
