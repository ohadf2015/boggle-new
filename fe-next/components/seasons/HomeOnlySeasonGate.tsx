'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

const SUSPENSE_DELAY_MS = 1500;
const INTERACTION_EVENTS = ['pointerdown', 'touchstart', 'keydown', 'scroll'] as const;
const HOME_RE = /^\/[a-z]{2}\/?$/;

function isHomePath(pathname: string | null): boolean {
  if (!pathname) return false;
  return HOME_RE.test(pathname);
}

interface HomeOnlySeasonGateProps {
  children: ReactNode;
}

export function HomeOnlySeasonGate({ children }: HomeOnlySeasonGateProps) {
  const pathname = usePathname();
  const isHome = isHomePath(pathname);
  const { isAuthenticated } = useAuth();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!isHome || !isAuthenticated) {
      setReady(false);
      return;
    }
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    const cleanup = () => {
      INTERACTION_EVENTS.forEach((evt) => window.removeEventListener(evt, onInteract));
      if (timeoutId) clearTimeout(timeoutId);
    };
    const onInteract = () => {
      INTERACTION_EVENTS.forEach((evt) => window.removeEventListener(evt, onInteract));
      timeoutId = setTimeout(() => setReady(true), SUSPENSE_DELAY_MS);
    };
    INTERACTION_EVENTS.forEach((evt) =>
      window.addEventListener(evt, onInteract, { once: true, passive: true }),
    );
    return cleanup;
  }, [isHome, isAuthenticated]);

  if (!isHome || !isAuthenticated || !ready) return null;
  return <>{children}</>;
}
