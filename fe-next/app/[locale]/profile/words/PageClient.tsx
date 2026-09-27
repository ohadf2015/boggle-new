'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BookOpen } from 'lucide-react';
import Header from '@/components/Header';
import { WordMasteryLists } from '@/components/profile/WordMasteryLists';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useExperiment } from '@/hooks/useExperiment';
import { isWordMasteryEnvEnabled, resolveWordMasteryAccess } from '@/lib/wordMastery/isEnabled';
import { writeMasteryPracticeRound } from '@/lib/wordMastery/practiceStorage';
import type { MasteryListRow } from '@/lib/wordMastery';

interface MasteryResponse {
  mastered: MasteryListRow[];
  learning: MasteryListRow[];
}

export default function WordMasteryPageClient() {
  const { t, language } = useLanguage();
  const { user, isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const { variant, trackExposure } = useExperiment('word-mastery-v1');
  const enabled = resolveWordMasteryAccess({
    envEnabled: isWordMasteryEnvEnabled(),
    dbFlagEnabled: false,
    experimentVariant: variant,
  });

  const [mastered, setMastered] = useState<MasteryListRow[]>([]);
  const [learning, setLearning] = useState<MasteryListRow[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [practiceLoading, setPracticeLoading] = useState(false);

  useEffect(() => {
    if (enabled) trackExposure();
  }, [enabled, trackExposure]);

  useEffect(() => {
    if (loading || !enabled || !isAuthenticated || !user) return;
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch(`/api/word-mastery?language=${encodeURIComponent(language)}`);
        if (!res.ok) {
          if (!cancelled) setLoadError(t('wordMastery.error'));
          return;
        }
        const body = (await res.json()) as MasteryResponse;
        if (cancelled) return;
        setMastered(body.mastered ?? []);
        setLearning(body.learning ?? []);
        setLoadError(null);
      } catch {
        if (!cancelled) setLoadError(t('wordMastery.error'));
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [enabled, isAuthenticated, language, loading, t, user]);

  const onPractice = useCallback(async () => {
    setPracticeLoading(true);
    try {
      const res = await fetch('/api/word-mastery/practice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language }),
      });
      if (!res.ok) {
        setLoadError(t('wordMastery.error'));
        return;
      }
      const body = (await res.json()) as { grid: string[][]; seedWords: string[] };
      writeMasteryPracticeRound({ grid: body.grid, seedWords: body.seedWords });
      router.push(`/${language}/singleplayer?autoStart=practice&mastery=1`);
    } catch {
      setLoadError(t('wordMastery.error'));
    } finally {
      setPracticeLoading(false);
    }
  }, [language, router, t]);

  return (
    <div className="flex-1 flex flex-col bg-neo-navy min-h-screen page-content-safe">
      <Header />
      <main className="flex-1 w-full max-w-lg mx-auto px-3 py-4 sm:px-4 sm:py-6 pb-24">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-neo border-2 border-neo-black bg-neo-cyan/20 flex items-center justify-center shadow-hard-sm">
            <BookOpen className="w-5 h-5 text-neo-cyan" aria-hidden="true" />
          </div>
          <div>
            <h1 className="font-neo-display text-2xl font-black text-neo-white uppercase tracking-wide">
              {t('wordMastery.title')}
            </h1>
            <p className="text-neo-white/70 text-sm">{t('wordMastery.subtitle')}</p>
          </div>
        </div>

        {!enabled && (
          <p className="text-neo-white/80 text-sm">{t('wordMastery.gated')}</p>
        )}

        {enabled && !loading && !isAuthenticated && (
          <p className="text-neo-white/80 text-sm">{t('wordMastery.signIn')}</p>
        )}

        {enabled && isAuthenticated && loadError && (
          <p className="text-neo-pink text-sm mb-4" role="alert">{loadError}</p>
        )}

        {enabled && isAuthenticated && !loadError && (
          <WordMasteryLists
            mastered={mastered}
            learning={learning}
            onPractice={onPractice}
            practiceDisabled={learning.length === 0}
            practiceLoading={practiceLoading}
          />
        )}
      </main>
    </div>
  );
}
