'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { hasCompletedOnboarding, hasSupabaseSession } from '@/utils/onboardingStorage';

/**
 * FTUE gate for play surfaces (e.g. /practice). When the user has neither
 * completed onboarding nor a live Supabase session, replace the URL with the
 * locale homepage carrying a `?next=` hint so HomePageClient can auto-open
 * the FTUE flow and route back here on completion.
 *
 * Caller renders its tree unconditionally; the redirect fires in an effect.
 * First-time users may see one frame of the gated content before the URL
 * flips — acceptable for the rare path and avoids SSR/CSR hydration drift
 * that a synchronous skeleton-branch would introduce.
 */
export function useFTUEGate(locale: string, nextPath: string): void {
  const router = useRouter();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (hasCompletedOnboarding() || hasSupabaseSession()) return;
    const next = encodeURIComponent(nextPath);
    router.replace(`/${locale}?next=${next}`);
  }, [locale, nextPath, router]);
}
