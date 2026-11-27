'use client';

import { useEffect, useState } from 'react';

export const WHEEL_HINT_SEEN_KEY = 'lexiclash_wheel_hint_seen';

/** True only in the first wheel round a player ever sees. Starts false so a returning player never gets a flash. */
export function useFirstWheelHint(): boolean {
  const [show, setShow] = useState(false);
  useEffect(() => {
    try {
      if (localStorage.getItem(WHEEL_HINT_SEEN_KEY) === '1') return;
      localStorage.setItem(WHEEL_HINT_SEEN_KEY, '1');
    } catch {
      /* storage blocked: show it this round only */
    }
    setShow(true);
  }, []);
  return show;
}
