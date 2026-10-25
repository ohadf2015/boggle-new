'use client';

import { useEffect, useState } from 'react';
import { isCheckoutBlockedInApp } from '@/lib/education/postTeacherProCheckout';

/** True inside the Capacitor wrapper, after mount (false during SSR so hydration matches). */
export function useCheckoutBlockedInApp(): boolean {
  const [blocked, setBlocked] = useState(false);
  useEffect(() => {
    setBlocked(isCheckoutBlockedInApp());
  }, []);
  return blocked;
}
