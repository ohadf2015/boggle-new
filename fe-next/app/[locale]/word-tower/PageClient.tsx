'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useExperiment } from '@/hooks/useExperiment';
import { useLanguage } from '@/contexts/LanguageContext';
import { WordTowerGame } from '@/components/wordTower/WordTowerGame';

/**
 * Word Tower is admin-only during development AND behind the `word-tower`
 * experiment. Both must pass; otherwise we redirect home. Non-admins never see
 * the route exists (no flash of content).
 */
export function WordTowerPageClient() {
  const { language } = useLanguage();
  const router = useRouter();
  const { isAdmin, loading } = useAuth();
  const { variant, trackExposure } = useExperiment('word-tower');
  const allowed = isAdmin && variant === 'on';

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
