'use client';

import { useCallback, useRef, useState } from 'react';

// A finger or key still down from the game must not press a button on the screen that replaced it.
export function useFreshTap(ms = 1000) {
  const [opened] = useState(() => performance.now());
  const fresh = useRef(false);
  const arm = useCallback(() => {
    fresh.current = performance.now() - opened >= ms;
  }, [ms, opened]);
  const guard = useCallback(
    (fn: () => void) => () => {
      if (!fresh.current) return;
      fresh.current = false;
      fn();
    },
    [],
  );
  return { surface: { onPointerDownCapture: arm, onKeyDownCapture: arm }, guard };
}
