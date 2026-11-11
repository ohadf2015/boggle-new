'use client';

import { useEffect } from 'react';

/** Leaving with a tower standing banks it (once per run, keepalive so the POST outlives the page). */
export function useBankOnLeave(bankRun: (keepalive?: boolean) => Promise<unknown>, flushDaily: (o: { keepalive: boolean }) => void): void {
  useEffect(() => {
    const onHide = () => {
      flushDaily({ keepalive: true });
      void bankRun(true);
    };
    window.addEventListener('pagehide', onHide);
    return () => {
      window.removeEventListener('pagehide', onHide);
      void bankRun(true);
    };
  }, [bankRun, flushDaily]);
}
