/**
 * useGameKeyboardShortcuts Tests
 * Desktop keyboard shortcuts for game navigation and actions
 */

import { vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useGameKeyboardShortcuts } from '../useGameKeyboardShortcuts';

describe('useGameKeyboardShortcuts', () => {
  const fireKey = (key: string, opts: Partial<KeyboardEvent> = {}) => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, ...opts }));
  };

  it('should call onEscape when Escape is pressed', () => {
    const onEscape = vi.fn();
    renderHook(() => useGameKeyboardShortcuts({ onEscape }));

    fireKey('Escape');
    expect(onEscape).toHaveBeenCalledTimes(1);
  });

  it('should call onRematch when "r" is pressed', () => {
    const onRematch = vi.fn();
    renderHook(() => useGameKeyboardShortcuts({ onRematch }));

    fireKey('r');
    expect(onRematch).toHaveBeenCalledTimes(1);
  });

  it('should NOT call onRematch when "r" is pressed with modifier keys', () => {
    const onRematch = vi.fn();
    renderHook(() => useGameKeyboardShortcuts({ onRematch }));

    fireKey('r', { ctrlKey: true });
    fireKey('r', { metaKey: true });
    fireKey('r', { altKey: true });
    expect(onRematch).not.toHaveBeenCalled();
  });

  it('should NOT fire shortcuts when typing in an input', () => {
    const onRematch = vi.fn();
    renderHook(() => useGameKeyboardShortcuts({ onRematch }));

    // Simulate keydown originating from an input
    const input = document.createElement('input');
    document.body.appendChild(input);
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'r', bubbles: true }));
    document.body.removeChild(input);

    expect(onRematch).not.toHaveBeenCalled();
  });

  it('should NOT fire when disabled', () => {
    const onEscape = vi.fn();
    renderHook(() => useGameKeyboardShortcuts({ onEscape, enabled: false }));

    fireKey('Escape');
    expect(onEscape).not.toHaveBeenCalled();
  });

  it('should call onPlayAgain when Space is pressed', () => {
    const onPlayAgain = vi.fn();
    renderHook(() => useGameKeyboardShortcuts({ onPlayAgain }));

    fireKey(' ');
    expect(onPlayAgain).toHaveBeenCalledTimes(1);
  });

  it('should cleanup listeners on unmount', () => {
    const onEscape = vi.fn();
    const { unmount } = renderHook(() => useGameKeyboardShortcuts({ onEscape }));

    unmount();

    fireKey('Escape');
    expect(onEscape).not.toHaveBeenCalled();
  });
});
