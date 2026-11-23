'use client';

import { useHoldToClear } from '@/hooks/useHoldToClear';
import { useHoldHint } from '@/hooks/useHoldHint';

/** Backspace key: tap removes a letter, hold clears the word, and a burst of taps shows "hold to clear" once. */
export function useBackspaceKey({ onTap, onHold }: { onTap: () => void; onHold?: () => void }) {
  const hint = useHoldHint();
  const handlers = useHoldToClear({
    onTap: () => {
      onTap();
      if (onHold) hint.noteTap();
    },
    onHold: onHold ? () => { hint.noteHold(); onHold(); } : undefined,
  });
  return { handlers, showHint: hint.show };
}
