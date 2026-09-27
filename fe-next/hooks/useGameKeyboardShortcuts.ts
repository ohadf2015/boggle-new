/**
 * useGameKeyboardShortcuts - Desktop keyboard shortcuts for game actions
 *
 * Provides common shortcuts:
 * - Escape: exit / go back
 * - R: rematch / replay
 * - Space: play again / start
 *
 * Ignores input when:
 * - Typing in input/textarea/contenteditable
 * - Modifier keys are held (Ctrl, Meta, Alt) — except for Escape
 * - Hook is disabled
 */

import { useEffect, useCallback } from 'react';
import { isTypingTarget } from '@/lib/dom/isTypingTarget';

interface UseGameKeyboardShortcutsOptions {
  /** Called on Escape key */
  onEscape?: () => void;
  /** Called on "R" key (rematch/replay) */
  onRematch?: () => void;
  /** Called on Space key (play again / start) */
  onPlayAgain?: () => void;
  /** Enable/disable all shortcuts (default: true) */
  enabled?: boolean;
}

export function useGameKeyboardShortcuts({
  onEscape,
  onRematch,
  onPlayAgain,
  enabled = true,
}: UseGameKeyboardShortcutsOptions): void {
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!enabled) return;

    // Don't intercept when user is typing in an input
    if (isTypingTarget(e)) return;

    const hasModifier = e.ctrlKey || e.metaKey || e.altKey;

    switch (e.key) {
      case 'Escape':
        // Escape works even with modifiers
        onEscape?.();
        break;
      case 'r':
      case 'R':
        if (!hasModifier) onRematch?.();
        break;
      case ' ':
        if (!hasModifier) {
          e.preventDefault(); // Prevent page scroll
          onPlayAgain?.();
        }
        break;
    }
  }, [enabled, onEscape, onRematch, onPlayAgain]);

  useEffect(() => {
    if (!enabled) return;
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled, handleKeyDown]);
}
