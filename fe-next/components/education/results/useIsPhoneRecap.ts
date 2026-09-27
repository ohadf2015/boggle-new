'use client';

import { useEffect, useState } from 'react';

/**
 * Below `lg` the projector recap is on a teacher's PHONE (classroom rooms are
 * always TV mode), where the wall's 7xl numbers push Play again off-screen.
 *
 * Read synchronously on the first client render (lazy state), so the wall
 * never paints phone-sized for a frame and then jumps (Pitfall Class 1). The
 * recap only ever mounts client-side after a round; the server default is the
 * wall. Defaults to the WALL wherever matchMedia cannot answer.
 */
const PHONE_QUERY = '(max-width: 1023.98px)';

function readPhone(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  try {
    return window.matchMedia(PHONE_QUERY).matches;
  } catch {
    return false;
  }
}

export function useIsPhoneRecap(): boolean {
  const [phone, setPhone] = useState(readPhone);
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    let mq: MediaQueryList;
    try {
      mq = window.matchMedia(PHONE_QUERY);
    } catch {
      return;
    }
    const onChange = (e: MediaQueryListEvent) => setPhone(e.matches);
    setPhone(mq.matches);
    mq.addEventListener?.('change', onChange);
    return () => mq.removeEventListener?.('change', onChange);
  }, []);
  return phone;
}
