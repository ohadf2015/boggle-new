'use client';

import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';

interface Proposal {
  id: string;
  curator_id: string;
  language: string;
  kind: string;
  target_ref: string;
  payload?: Record<string, unknown>;
}

async function authedPost(url: string, body: unknown): Promise<boolean> {
  const {
    data: { session },
  } = (await supabase?.auth.getSession()) ?? { data: { session: null } };
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  return res.ok;
}

/**
 * Admin review inbox for pending curator proposals. Approve → ratify (applies
 * the effect + grants the curator's reward); Reject → no effect. Optimistically
 * removes the row on success.
 */
export function CuratorProposalsInbox() {
  const { t } = useLanguage();
  const [items, setItems] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/curator-proposals?status=proposed');
      const json = res.ok ? await res.json() : null;
      setItems(json?.proposals ?? []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const resolve = useCallback(
    async (id: string, decision: 'ratify' | 'reject') => {
      setBusy(id);
      try {
        const ok = await authedPost(`/api/admin/curator-proposals/${id}/ratify`, { decision });
        if (ok) {
          toast.success(
            decision === 'ratify' ? t('curator.admin.inbox.ratified') : t('curator.admin.inbox.rejected')
          );
          setItems((prev) => prev.filter((p) => p.id !== id));
        } else {
          toast.error(t('curator.toast.proposeError'));
        }
      } catch {
        toast.error(t('curator.toast.proposeError'));
      } finally {
        setBusy(null);
      }
    },
    [t]
  );

  if (loading) return <p className="font-neo-body text-neo-cream">{t('curator.loading')}</p>;

  return (
    <section>
      <h2 className="text-lg font-neo-display text-neo-white">{t('curator.admin.inbox.title')}</h2>
      {items.length === 0 ? (
        <p className="mt-2 font-neo-body text-neo-cream">{t('curator.admin.inbox.empty')}</p>
      ) : (
        <ul className="mt-2 flex flex-col gap-2">
          {items.map((p) => (
            <li
              key={p.id}
              data-testid="proposal-row"
              className="flex flex-wrap items-center justify-between gap-2 rounded-neo border-neo border-black bg-neo-navy-light p-3"
            >
              <div className="flex items-baseline gap-2">
                <span className="rounded bg-neo-purple px-2 py-0.5 text-xs font-neo-body text-neo-white">
                  {t(`curator.admin.inbox.kind.${p.kind}`)}
                </span>
                <span className="text-lg font-neo-display text-neo-lime">{p.target_ref}</span>
                <span className="text-xs font-neo-body text-neo-cream uppercase">{p.language}</span>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => resolve(p.id, 'ratify')} disabled={busy === p.id}>
                  {t('curator.admin.inbox.ratify')}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => resolve(p.id, 'reject')}
                  disabled={busy === p.id}
                >
                  {t('curator.admin.inbox.reject')}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
