'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCuratorStatus } from '@/lib/curator/useCuratorStatus';
import { detectRankUp, curatorTier, MAX_CURATOR_TIER, type CuratorRank } from '@/lib/curator/curatorScope';
import { CuratorRankCard } from '@/components/curator/CuratorRankCard';
import { CuratorInvalidWords } from '@/components/curator/CuratorInvalidWords';
import { Button } from '@/components/ui/button';
import Header from '@/components/Header';

/**
 * Language Curator dashboard. Gates on useCuratorStatus (non-curators see an
 * access-required message). For curators it shows their prestige rank card and
 * the rejected-word review list, scoped to the active language. Multi-language
 * curators get a language switcher.
 */
export default function CuratorPageClient() {
  const router = useRouter();
  const { t, language } = useLanguage();
  const { isCurator, isAdmin, languages, assignments, isLoading } = useCuratorStatus();
  const [active, setActive] = useState<string | null>(null);
  const [celebrate, setCelebrate] = useState<CuratorRank | null>(null);

  const activeLang = active ?? languages[0];
  const points = assignments.find((a) => a.language === activeLang)?.curator_points ?? 0;
  // Capability tier for the active language — drives which review actions show.
  // Admins hold no assignment rows but curate everything, so treat them as max.
  const tier = isAdmin ? MAX_CURATOR_TIER : curatorTier(assignments, activeLang);

  // One-time rank-up celebration: compare this language's points to what we last
  // saw stored locally. Fires only on an actual rank increase.
  useEffect(() => {
    if (!activeLang || typeof window === 'undefined') return;
    const key = `lexiclash:curator_points:${activeLang}`;
    const prevRaw = window.localStorage.getItem(key);
    const prev = prevRaw != null ? Number(prevRaw) : points;
    setCelebrate(detectRankUp(prev, points));
    window.localStorage.setItem(key, String(points));
  }, [activeLang, points]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-1 items-center justify-center bg-neo-navy text-neo-white">
        <p className="font-neo-body">{t('curator.loading')}</p>
      </div>
    );
  }

  if (!isCurator) {
    return (
      <div className="flex min-h-screen flex-1 flex-col items-center justify-center gap-4 bg-neo-navy px-4 text-center text-neo-white">
        <h1 className="text-2xl font-neo-display">{t('curator.accessRequired')}</h1>
        <Button variant="outline" onClick={() => router.push(`/${language}`)}>
          {t('curator.backHome')}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-1 flex-col bg-neo-navy">
      <Header />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6">
        <h1 className="text-3xl font-neo-display text-neo-white">{t('curator.title')}</h1>
        <p className="mb-4 font-neo-body text-neo-cream">
          {t('curator.subtitle', { language: activeLang })}
        </p>

        {languages.length > 1 && (
          <div role="tablist" className="mb-4 flex flex-wrap gap-2">
            {languages.map((l) => (
              <Button
                key={l}
                size="sm"
                variant={l === activeLang ? 'default' : 'outline'}
                onClick={() => setActive(l)}
              >
                {l}
              </Button>
            ))}
          </div>
        )}

        <div className="mb-6">
          <CuratorRankCard points={points} celebrateRank={celebrate} />
        </div>

        <CuratorInvalidWords key={activeLang} language={activeLang} tier={tier} />
      </main>
    </div>
  );
}
