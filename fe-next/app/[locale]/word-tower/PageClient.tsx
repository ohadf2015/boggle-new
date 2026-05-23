'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useExperiment } from '@/hooks/useExperiment';
import { useLanguage } from '@/contexts/LanguageContext';
import { useWordTowerEnabled } from '@/hooks/useWordTowerEnabled';
import { WordTowerGame } from '@/components/wordTower/WordTowerGame';

/**
 * The WHOLE Word Tower game is feature-gated: admins always have access (dev
 * preview), and everyone else is gated behind the single `word-tower` PostHog
 * flag (`useWordTowerEnabled`, with a `?word-tower=1` live-verify override). When
 * neither is true, non-admins are redirected home and never see the route exists
 * (no flash of content). `trackExposure` fires for usage analytics.
 */
export function WordTowerPageClient() {
  const { language } = useLanguage();
  const router = useRouter();
  const { isAdmin, loading } = useAuth();
  const { trackExposure } = useExperiment('word-tower');
  const gameEnabled = useWordTowerEnabled();
  const allowed = isAdmin || gameEnabled;

  useEffect(() => {
    if (allowed) trackExposure();
  }, [allowed, trackExposure]);

  useEffect(() => {
    if (!loading && !allowed) router.replace(`/${language}`);
  }, [loading, allowed, language, router]);

  if (loading || !allowed) {
    return <div className="min-h-[100dvh] bg-neo-navy" aria-hidden />;
  }

  return <WordTowerGame />;
}
