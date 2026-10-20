'use client';

import {
  useContext,
  useEffect,
  useLayoutEffect,
  useState,
  type ComponentType,
  type ReactNode,
} from 'react';
import { usePathname } from 'next/navigation';
import { isLandingPath } from '@/lib/i18n/isLandingPath';
// Type + context object only — AuthContext.tsx does not import gotrue.
import { AuthContext, type AuthContextValue } from '@/contexts/AuthContext';

const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

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
 * Rendered inside the lazily loaded AuthProvider. Copies its (memoized) context
 * value up to the stable AuthContext.Provider that wraps the app.
 */
function AuthValueBridge({ onValue }: { onValue: (value: AuthContextValue | null) => void }) {
  const value = useContext(AuthContext);
  useIsomorphicLayoutEffect(() => {
    onValue(value);
  }, [value, onValue]);
  return null;
}

/**
 * Mounts AuthProvider immediately on every route except the PSI landing
 * (`/` `/en` / …). Landing waits for a real pointer/key so gotrue stays out
 * of the eager bundle and the no-interaction trace. Once loaded, the provider
 * stays mounted across client navigations (including back to landing).
 *
 * The app subtree is always rendered under the same AuthContext.Provider.
 * The loaded AuthProvider is mounted as a sibling and bridged up. Wrapping
 * children in it directly (`<>{children}</>` -> `<Provider>{children}</Provider>`)
 * changes the element type above the whole app, so React unmounted and
 * remounted every provider and page once the chunk resolved: on landing the
 * first tap (e.g. the mobile menu) was lost, and every route remounted once
 * right after hydration.
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

  const [value, setValue] = useState<AuthContextValue | null>(null);

  return (
    <AuthContext.Provider value={value}>
      {Provider ? (
        <Provider>
          <AuthValueBridge onValue={setValue} />
        </Provider>
      ) : null}
      {children}
    </AuthContext.Provider>
  );
}
