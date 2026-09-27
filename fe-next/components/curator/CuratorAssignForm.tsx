'use client';

import { useState, type FormEvent } from 'react';
import toast from 'react-hot-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { SUPPORTED_LANGUAGES, MAX_CURATOR_TIER } from '@/lib/curator/curatorScope';

interface CuratorAssignFormProps {
  onAssigned?: () => void;
}

/** Admin form to grant a Language Curator assignment (POST /api/admin/curators). */
export function CuratorAssignForm({ onAssigned }: CuratorAssignFormProps) {
  const { t } = useLanguage();
  const [userId, setUserId] = useState('');
  const [language, setLanguage] = useState<string>(SUPPORTED_LANGUAGES[0]);
  const [tier, setTier] = useState(1);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
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
        body: JSON.stringify({ userId: userId.trim(), language, trustTier: tier }),
      });
      if (res.ok) {
        toast.success(t('curator.admin.assign.success'));
        setUserId('');
        onAssigned?.();
      } else {
        toast.error(t('curator.admin.assign.error'));
      }
    } catch {
      toast.error(t('curator.admin.assign.error'));
    } finally {
      setBusy(false);
    }
  };

  const fieldClass =
    'rounded-neo border-neo border-black bg-neo-navy px-3 py-2 text-neo-white font-neo-body';

  return (
    <form onSubmit={submit} className="flex flex-wrap items-end gap-3">
      <label className="flex flex-col gap-1 text-xs font-neo-body text-neo-cream">
        {t('curator.admin.assign.userIdLabel')}
        <input
          data-testid="assign-user-id"
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          className={`${fieldClass} w-72`}
          required
        />
      </label>
      <label className="flex flex-col gap-1 text-xs font-neo-body text-neo-cream">
        {t('curator.admin.assign.languageLabel')}
        <select
          data-testid="assign-language"
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          className={fieldClass}
        >
          {SUPPORTED_LANGUAGES.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-xs font-neo-body text-neo-cream">
        {t('curator.admin.assign.tierLabel')}
        <select
          data-testid="assign-tier"
          value={tier}
          onChange={(e) => setTier(Number(e.target.value))}
          className={fieldClass}
        >
          {Array.from({ length: MAX_CURATOR_TIER }, (_, i) => i + 1).map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </label>
      <Button type="submit" disabled={busy}>
        {t('curator.admin.assign.submit')}
      </Button>
    </form>
  );
}
