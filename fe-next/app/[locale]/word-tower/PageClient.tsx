'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useExperiment } from '@/hooks/useExperiment';
import { useLanguage } from '@/contexts/LanguageContext';
import { WordTowerGame } from '@/components/wordTower/WordTowerGame';

/**
 * Word Tower solo is an admin-only dev preview — gated on `isAdmin` alone
 * (matching the landing card + sibling admin previews). Non-admins are
 * redirected home and never see the route exists (no flash of content).
 * `trackExposure` still fires for admin-usage analytics on the `word-tower`
 * experiment, but is no longer part of the access gate.
 */
export function WordTowerPageClient() {
  const { language } = useLanguage();
  const router = useRouter();
  const { isAdmin, loading } = useAuth();
  const { trackExposure } = useExperiment('word-tower');
  const allowed = isAdmin;

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
