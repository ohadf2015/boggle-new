'use client';

import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import type { CuratorProposalKind } from '@/lib/curator/curatorScope';

interface InvalidWord {
  id: string;
  word: string;
  submission_count: number;
  reason: string;
}

interface CuratorInvalidWordsProps {
  language: string;
}

/**
 * Lists rejected / not-yet-approved word submissions for the curator's language
 * and lets them PROPOSE an action (approve as valid, or flag as not-a-word).
 * Each action creates a curator_proposals row via /api/curator/propose — never
 * a direct dictionary write. Optimistically removes the row on success.
 */
export function CuratorInvalidWords({ language }: CuratorInvalidWordsProps) {
  const { t } = useLanguage();
  const [words, setWords] = useState<InvalidWord[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyWord, setBusyWord] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/curator/invalid-words?lang=${encodeURIComponent(language)}`);
      const json = res.ok ? await res.json() : null;
      setWords(json?.words ?? []);
    } catch {
      setWords([]);
    } finally {
      setLoading(false);
    }
  }, [language]);

  useEffect(() => {
    void load();
  }, [load]);

  const propose = useCallback(
    async (word: string, kind: CuratorProposalKind) => {
      setBusyWord(word);
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        const res = await fetch('/api/curator/propose', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
          },
          body: JSON.stringify({ kind, language, targetRef: word }),
        });
        if (res.ok) {
          toast.success(t('curator.invalidWords.sent'));
          setWords((prev) => prev.filter((w) => w.word !== word));
        } else {
          toast.error(t('curator.toast.proposeError'));
        }
      } catch {
        toast.error(t('curator.toast.proposeError'));
      } finally {
        setBusyWord(null);
      }
    },
    [language, t]
  );

  if (loading) return <p className="font-neo-body text-neo-cream">{t('curator.loading')}</p>;
  if (words.length === 0) {
    return <p className="font-neo-body text-neo-cream">{t('curator.invalidWords.empty')}</p>;
  }

  return (
    <div>
      <h2 className="text-lg font-neo-display text-neo-white">{t('curator.invalidWords.title')}</h2>
      <p className="mb-3 text-sm font-neo-body text-neo-cream">{t('curator.invalidWords.subtitle')}</p>
      <ul className="flex flex-col gap-2">
        {words.map((w) => (
          <li
            key={w.id}
            data-testid="curator-word-row"
            className="flex flex-wrap items-center justify-between gap-2 rounded-neo border-neo border-black bg-neo-navy-light p-3"
          >
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-neo-display text-neo-lime">{w.word}</span>
              <span className="text-xs font-neo-body text-neo-cream">
                {t('curator.invalidWords.submissions', { count: w.submission_count })}
              </span>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => propose(w.word, 'word_approve')}
                disabled={busyWord === w.word}
              >
                {t('curator.invalidWords.approve')}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => propose(w.word, 'word_flag_invalid')}
                disabled={busyWord === w.word}
              >
                {t('curator.invalidWords.flag')}
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
