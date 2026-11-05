import { useSyncExternalStore } from 'react';
import { usePathname } from 'next/navigation';
import { isLandingPath } from '@/lib/i18n/isLandingPath';
import { hasPriorEngagement, onFirstEngagement } from '@/lib/perf/onFirstEngagement';
import { hasSupabaseSession } from '@/utils/onboardingStorage';
import { isNativeShell } from '@/utils/returningVisitor';

const AUTH_QUERY_KEYS = [
  'auth_error',
  'code',
  'token_hash',
  'access_token',
  'refresh_token',
  'error',
  'error_code',
  'error_description',
];
const AUTH_HASH_KEYS = [...AUTH_QUERY_KEYS, 'provider_token', 'type'];

export function hasAuthParamsInUrl(search: string, hash: string): boolean {
  const query = new URLSearchParams(search);
  const fragment = new URLSearchParams(hash.replace(/^#/, ''));
  return AUTH_QUERY_KEYS.some((key) => query.has(key)) || AUTH_HASH_KEYS.some((key) => fragment.has(key));
}

let open = false;
let cancelEngagement: (() => void) | null = null;
const subscribers = new Set<() => void>();

/**
 * Whether the Supabase client may load now. Stays closed only for a cold,
 * signed-out landing visit with no interaction, and only when every check
 * actually answered: a check that throws opens the gate.
 */
export function isLandingAuthGateOpen(): boolean {
  if (open) return true;
  if (typeof window === 'undefined') return false;
  try {
    const { pathname, search, hash } = window.location;
    // hasSupabaseSession reads blocked storage as "no session", which is not an answer.
    void window.localStorage;
    open =
      !isLandingPath(pathname) ||
      isNativeShell() ||
      hasSupabaseSession() ||
      hasPriorEngagement() ||
      hasAuthParamsInUrl(search, hash);
  } catch {
    open = true;
  }
  return open;
}

function subscribe(onChange: () => void): () => void {
  subscribers.add(onChange);
  if (!open && !cancelEngagement) {
    cancelEngagement = onFirstEngagement(() => {
      open = true;
      for (const notify of subscribers) notify();
    });
  }
  return () => {
    subscribers.delete(onChange);
  };
}

export function useLandingAuthGate(): boolean {
  const pathname = usePathname();
  const gateOpen = useSyncExternalStore(subscribe, isLandingAuthGateOpen, () => false);
  return gateOpen || !isLandingPath(pathname ?? '');
}

export function resetLandingAuthGateForTests(): void {
  cancelEngagement?.();
  cancelEngagement = null;
  open = false;
  subscribers.clear();
}
