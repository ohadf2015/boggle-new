'use client';

import { useCallback, useEffect, useState } from 'react';
import { m } from 'framer-motion';
import { ArrowBigUp, Sparkles, Users } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import {
  fetchUgcList,
  submitUgc,
  voteUgc,
  readVotedIds,
  markVoted,
  type UgcRiddle,
} from '@/lib/connections/ugcClient';

/**
 * Community riddles — browse approved suggestions ranked by upvotes (the dynamic
 * ranking), vote them up, and suggest your own (lands pending for moderation).
 */
export default function ConnectionsCommunity() {
  const { t, language } = useLanguage();
  const { profile } = useAuth();
  const [riddles, setRiddles] = useState<UgcRiddle[]>([]);
  const [loading, setLoading] = useState(true);
  const [voted, setVoted] = useState<Set<string>>(() => readVotedIds());
  const [form, setForm] = useState({ word1: '', word2: '', bridge: '' });
  const [submitState, setSubmitState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetchUgcList(language).then((rows) => {
      if (!cancelled) {
        setRiddles(rows);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [language]);

  const handleVote = useCallback(
    async (id: string) => {
      if (voted.has(id)) return;
      setVoted((prev) => new Set(prev).add(id));
      markVoted(id);
      const upvotes = await voteUgc(id);
      if (upvotes != null) {
        setRiddles((prev) => prev.map((r) => (r.id === id ? { ...r, upvotes } : r)));
      }
    },
    [voted],
  );

  const handleSubmit = useCallback(async () => {
    setSubmitState('sending');
    setSubmitError(null);
    const displayName = profile?.display_name || profile?.username || t('connections.daily.guestName');
    const res = await submitUgc({ ...form, language, displayName });
    if (res.ok) {
      setSubmitState('done');
      setForm({ word1: '', word2: '', bridge: '' });
    } else {
      setSubmitState('error');
      setSubmitError(res.error ?? 'error');
    }
  }, [form, language, profile, t]);

  const canSubmit =
    form.word1.trim() && form.word2.trim() && form.bridge.trim() && submitState !== 'sending';

  const inputCls =
    'flex-1 min-w-0 rounded-neo border-neo border-neo-white/20 bg-neo-navy px-3 py-2 text-center font-neo-display font-bold text-neo-white outline-none focus:border-neo-cyan';

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-4 px-4 py-5">
      <h1 className="flex items-center gap-2 font-neo-display text-2xl font-black text-neo-white">
        <Users className="h-6 w-6 text-neo-pink" strokeWidth={2.5} aria-hidden="true" />
        {t('connections.community.title')}
      </h1>

      {/* Suggest a riddle */}
      <section className="rounded-neo border-neo-thick border-neo-pink bg-neo-navy-light p-4 shadow-hard">
        <h2 className="mb-2 flex items-center gap-2 font-neo-display text-base font-black text-neo-pink">
          <Sparkles className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" />
          {t('connections.community.suggest')}
        </h2>
        <p className="mb-3 font-neo-body text-xs text-neo-white/60">{t('connections.community.suggestHint')}</p>
        <div className="flex items-center gap-2" dir={language === 'he' ? 'rtl' : 'ltr'}>
          <input
            data-testid="ugc-input-word1"
            value={form.word1}
            onChange={(e) => setForm((f) => ({ ...f, word1: e.target.value }))}
            placeholder={t('connections.community.word1')}
            className={inputCls}
            maxLength={24}
          />
          <span className="font-mono text-neo-cyan">→</span>
          <input
            data-testid="ugc-input-bridge"
            value={form.bridge}
            onChange={(e) => setForm((f) => ({ ...f, bridge: e.target.value }))}
            placeholder={t('connections.community.bridge')}
            className={`${inputCls} border-neo-cyan/60`}
            maxLength={24}
          />
          <span className="font-mono text-neo-cyan">→</span>
          <input
            data-testid="ugc-input-word2"
            value={form.word2}
            onChange={(e) => setForm((f) => ({ ...f, word2: e.target.value }))}
            placeholder={t('connections.community.word2')}
            className={inputCls}
            maxLength={24}
          />
        </div>
        <button
          data-testid="ugc-submit"
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="mt-3 w-full rounded-neo border-neo-thick border-neo-pink bg-neo-pink px-4 py-2 font-neo-display font-black text-neo-navy shadow-hard disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {t('connections.community.submitBtn')}
        </button>
        {submitState === 'done' && <p className="mt-2 text-center text-sm font-bold text-neo-lime">{t('connections.community.submitted')}</p>}
        {submitState === 'error' && <p className="mt-2 text-center text-sm font-bold text-neo-red">{submitError || t('connections.community.submitFailed')}</p>}
      </section>

      {/* Ranked approved riddles */}
      <section className="flex flex-col gap-2">
        <h2 className="font-neo-display text-base font-black text-neo-white/80">{t('connections.community.top')}</h2>
        {loading ? (
          <p className="py-6 text-center font-neo-body text-sm text-neo-white/50">{t('connections.daily.loading')}</p>
        ) : riddles.length === 0 ? (
          <p className="py-6 text-center font-neo-body text-sm text-neo-white/50">{t('connections.community.empty')}</p>
        ) : (
          riddles.map((r) => {
            const hasVoted = voted.has(r.id);
            return (
              <div
                key={r.id}
                data-testid={`ugc-riddle-${r.id}`}
                className="flex items-center gap-3 rounded-neo border-neo border-neo-white/15 bg-neo-navy px-3 py-2"
                dir={language === 'he' ? 'rtl' : 'ltr'}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-neo-display font-bold text-neo-white">
                    {r.word1} <span className="text-neo-cyan">→ {r.bridge} →</span> {r.word2}
                  </p>
                  <p className="truncate font-neo-body text-xs text-neo-white/40">{r.creator_display_name}</p>
                </div>
                <m.button
                  data-testid={`ugc-upvote-${r.id}`}
                  type="button"
                  onClick={() => handleVote(r.id)}
                  disabled={hasVoted}
                  whileTap={{ scale: 0.9 }}
                  aria-label={t('connections.community.upvote')}
                  className={[
                    'flex shrink-0 flex-col items-center rounded-neo border-2 px-2 py-1 font-neo-display font-black',
                    hasVoted ? 'border-neo-lime bg-neo-lime/10 text-neo-lime' : 'border-neo-white/20 text-neo-white',
                  ].join(' ')}
                >
                  <ArrowBigUp className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" />
                  <span className="text-xs tabular-nums">{r.upvotes}</span>
                </m.button>
              </div>
            );
          })
        )}
      </section>
    </div>
  );
}
