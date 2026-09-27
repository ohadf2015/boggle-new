'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { CuratorAssignForm } from '@/components/curator/CuratorAssignForm';
import { CuratorProposalsInbox } from '@/components/curator/CuratorProposalsInbox';
import { AccessLevelsInfo } from '@/components/admin/AccessLevelsInfo';
import { CuratorTierBadge } from '@/components/admin/CuratorTierBadge';
import { Button } from '@/components/ui/button';
import Header from '@/components/Header';
import { AdminSubNav } from '@/components/admin/sidebar/AdminSubNav';

interface CuratorRow {
  curator_id: string;
  language: string;
  trust_tier: number;
  curator_points: number;
}

export default function CuratorAdminPageClient() {
  const router = useRouter();
  const { t, language } = useLanguage();
  const { user, isAdmin, loading } = useAuth();
  const [curators, setCurators] = useState<CuratorRow[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  const loadCurators = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/curators');
      const json = res.ok ? await res.json() : null;
      setCurators(json?.curators ?? []);
    } catch {
      setCurators([]);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) void loadCurators();
  }, [isAdmin, loadCurators]);

  const revoke = useCallback(
    async (curatorId: string, lang: string) => {
      const key = `${curatorId}:${lang}`;
      setBusy(key);
      try {
        const {
          data: { session },
        } = (await supabase?.auth.getSession()) ?? { data: { session: null } };
        const res = await fetch('/api/admin/curators', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
          },
          body: JSON.stringify({ action: 'revoke', userId: curatorId, language: lang }),
        });
        if (res.ok) {
          toast.success(t('curator.admin.list.revoked'));
          setCurators((prev) => prev.filter((c) => !(c.curator_id === curatorId && c.language === lang)));
        } else {
          toast.error(t('curator.admin.assign.error'));
        }
      } catch {
        toast.error(t('curator.admin.assign.error'));
      } finally {
        setBusy(null);
      }
    },
    [t]
  );

  if (!loading && (!user || !isAdmin)) {
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
      <AdminSubNav />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6">
        <h1 className="text-3xl font-neo-display text-neo-white">{t('curator.admin.title')}</h1>

        <section className="mt-6">
          <AccessLevelsInfo />
        </section>

        <section className="mt-6">
          <h2 className="mb-2 text-lg font-neo-display text-neo-white">{t('curator.admin.assign.title')}</h2>
          <CuratorAssignForm onAssigned={loadCurators} />
        </section>

        <section className="mt-8">
          <h2 className="mb-2 text-lg font-neo-display text-neo-white">{t('curator.admin.list.title')}</h2>
          {curators.length === 0 ? (
            <p className="font-neo-body text-neo-cream">{t('curator.admin.list.empty')}</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {curators.map((c) => (
                <li
                  key={`${c.curator_id}:${c.language}`}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-neo border-neo border-black bg-neo-navy-light p-3"
                >
                  <div className="flex items-center gap-2 font-neo-body text-neo-white">
                    <span className="text-xs uppercase text-neo-cyan">{c.language}</span>
                    <span className="font-mono text-xs text-neo-cream">{c.curator_id.slice(0, 8)}…</span>
                    <CuratorTierBadge tier={c.trust_tier} />
                    <span className="text-xs text-neo-yellow">{t('curator.admin.list.points', { count: c.curator_points })}</span>
                  </div>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => revoke(c.curator_id, c.language)}
                    disabled={busy === `${c.curator_id}:${c.language}`}
                  >
                    {t('curator.admin.list.revoke')}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="mt-8">
          <CuratorProposalsInbox />
        </section>
      </main>
    </div>
  );
}
