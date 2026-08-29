'use client';

import { useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguageSafe } from '@/contexts/LanguageContext';

/**
 * Pixi touches `window` at import time, so the game must never be server
 * rendered. `ssr: false` is only legal inside a Client Component, which is what
 * this wrapper exists to provide — the same shape v1 uses.
 */
const WordTowerV2 = dynamic(() => import('@/components/wordTowerV2/WordTowerV2'), {
  ssr: false,
});

/**
 * Word Tower v2 — beta testers and admins only.
 *
 * Gated on canSeeInWorkModes, mirroring Adventure and Wordfall. v1 stays the
 * public Word Tower; this route is the in-work preview of the physics rebuild.
 */
export function WordTowerV2PageClient() {
  const { canSeeInWorkModes, loading } = useAuth();
  const { language } = useLanguageSafe();
  const router = useRouter();
  const isDev = process.env.NODE_ENV === 'development';
  const allowed = canSeeInWorkModes || isDev;

  // Wait for auth before judging access. `canSeeInWorkModes` starts false and
  // flips true once auth resolves, so redirecting on that transient false
  // throws a real beta tester back to the home page before their access is
  // even known. Redirect from an effect, never during render.
  useEffect(() => {
    if (!loading && !allowed) router.replace(`/${language}`);
  }, [loading, allowed, language, router]);

  if (!allowed) return null;

  return <WordTowerV2 />;
}
