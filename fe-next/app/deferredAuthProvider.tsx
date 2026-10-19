'use client';

import { useEffect, useState, type ComponentType, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { isLandingPath } from '@/lib/i18n/isLandingPath';

/**
 * Pointer/key only. Lighthouse scrolls; scroll must not pull @supabase/gotrue
 * into the landing PSI trace (same rule as GoogleOneTapInitializer).
 */
const ARM_EVENTS = ['pointerdown', 'keydown', 'touchstart'] as const;

type AuthProviderComponent = ComponentType<{ children: ReactNode }>;

let cachedProvider: AuthProviderComponent | null = null;

export function resetDeferredAuthForTests(): void {
  cachedProvider = null;
}

function loadAuthProvider(): Promise<AuthProviderComponent> {
  if (cachedProvider) return Promise.resolve(cachedProvider);
  return import(
    /* webpackPrefetch: false, webpackPreload: false */
    '@/contexts/AuthProvider'
  ).then((mod) => {
    cachedProvider = mod.AuthProvider;
    return mod.AuthProvider;
  });
}

/**
 * Mounts AuthProvider immediately on every route except the PSI landing
 * (`/` `/en` / …). Landing waits for a real pointer/key so gotrue stays out
 * of the eager bundle and the no-interaction trace. Once loaded, the provider
 * stays mounted across client navigations (including back to landing).
 */
export function DeferredAuthProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const landing = isLandingPath(pathname ?? '');
  const [armed, setArmed] = useState(!landing || cachedProvider !== null);
  const [Provider, setProvider] = useState<AuthProviderComponent | null>(cachedProvider);

  useEffect(() => {
    if (!landing) {
      setArmed(true);
      return;
    }
    if (armed) return;
    const opts = { capture: true, passive: true } as const;
    const arm = () => setArmed(true);
    for (const type of ARM_EVENTS) window.addEventListener(type, arm, opts);
    return () => {
      for (const type of ARM_EVENTS) window.removeEventListener(type, arm, opts);
    };
  }, [landing, armed]);

  useEffect(() => {
    if (!armed || Provider) return;
    let cancelled = false;
    void loadAuthProvider().then((Loaded) => {
      if (!cancelled) setProvider(() => Loaded);
    });
    return () => {
      cancelled = true;
    };
  }, [armed, Provider]);

  if (!Provider) return <>{children}</>;
  return <Provider>{children}</Provider>;
}
