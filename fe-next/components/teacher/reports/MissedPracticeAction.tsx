'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, m, useReducedMotion } from 'framer-motion';
import { CalendarCheck, Loader2, Lock, Sparkles } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { SPACED_REVIEW_DAYS } from '@/lib/education/wordMasteryReport';
import { trackGrowthEvent } from '@/utils/growthTracking';
import { fetchWithAuth } from '@/utils/authFetch';
import { cn } from '@/lib/utils';

type Status =
  | { kind: 'idle' }
  | { kind: 'saving' }
  | { kind: 'done'; words: string[]; dueDates: string[] }
  | { kind: 'already' }
  | { kind: 'failed' };

function localDay(d = new Date()) {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

const PRESS =
  'transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-hard-lg active:translate-y-0.5 active:shadow-none motion-reduce:transition-none motion-reduce:hover:translate-y-0';

export function MissedPracticeAction({
  classroomId,
  classroomName,
  locked,
}: {
  classroomId: string;
  classroomName: string;
  locked: boolean;
}) {
  const { t, language } = useLanguage();
  const reduceMotion = useReducedMotion();
  const [status, setStatus] = useState<Status>({ kind: 'idle' });

  if (locked) {
    return (
      <div className="flex flex-wrap items-center gap-3">
      <Link
        href={`/${language}/teacher/upgrade`}
        onClick={() => trackGrowthEvent('landing_cta_clicked', { cta: 'pro_gate_missedPractice' })}
        className={cn(
          'inline-flex min-h-11 items-center gap-2 rounded-neo border-2 border-neo-lime bg-neo-navy px-4 py-2 font-neo-display text-sm font-black uppercase text-neo-lime shadow-hard',
          PRESS,
        )}
      >
        <Lock className="size-4" aria-hidden="true" />
        {t('eduPro.practice.cta')}
        <span className="rounded-neo border-2 border-black bg-neo-lime px-1.5 text-[11px] text-neo-black">{t('eduPro.mastery.proBadge')}</span>
      </Link>
      <span className="text-xs font-bold text-neo-cream/70">{t('eduPro.practice.hint')}</span>
      </div>
    );
  }

  const assign = async () => {
    if (status.kind === 'saving') return;
    setStatus({ kind: 'saving' });
    const date = new Date().toLocaleDateString(language);
    const names = SPACED_REVIEW_DAYS.map((_, i) => t('eduPro.practice.roundName', { classroom: classroomName, n: i + 1, date }));
    try {
      const res = await fetchWithAuth(`/api/education/classroom/${classroomId}/missed-practice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ today: localDay(), names }),
      });
      const body = await res.json().catch(() => null);
      if (res.status === 409) return setStatus({ kind: 'already' });
      if (!res.ok || !body?.ok) return setStatus({ kind: 'failed' });
      setStatus({ kind: 'done', words: body.words, dueDates: body.rounds.map((r: { dueDate: string }) => r.dueDate) });
    } catch {
      setStatus({ kind: 'failed' });
    }
  };

  const dayLabel = (iso: string, offset: number) => {
    const when = new Date(`${iso}T12:00:00`).toLocaleDateString(language, { weekday: 'short', day: 'numeric', month: 'short' });
    const rel = offset === 1 ? t('eduPro.practice.tomorrow') : t('eduPro.practice.inDays', { count: offset });
    return { rel, when };
  };

  return (
    <div className="space-y-2">
      <AnimatePresence mode="wait" initial={false}>
        {status.kind === 'done' ? (
          <m.div
            key="done"
            data-testid="missed-practice-assigned"
            role="status"
            initial={reduceMotion ? false : { scale: 0.85, rotate: -2 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 16 }}
            className="relative rounded-neo border-2 border-black bg-neo-lime p-3 text-neo-black shadow-hard"
          >
            <p className="flex items-center gap-2 font-neo-display text-xl font-black uppercase">
              <CalendarCheck className="size-6" aria-hidden="true" />
              {t('eduPro.practice.assigned')}
            </p>
            <p className="mt-0.5 text-sm font-bold">{t('eduPro.practice.assignedBody', { count: status.words.length })}</p>
            <ol className="mt-2 grid grid-cols-3 gap-1.5">
              {status.dueDates.map((iso, i) => {
                const { rel, when } = dayLabel(iso, SPACED_REVIEW_DAYS[i]);
                return (
                  <m.li
                    key={iso}
                    data-testid="missed-practice-round"
                    initial={reduceMotion ? false : { y: 10, scale: 0.8 }}
                    animate={{ y: 0, scale: 1 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 18, delay: 0.15 + i * 0.12 }}
                    className="rounded-neo border-2 border-black bg-neo-cream px-2 py-1.5 text-center text-neo-black"
                  >
                    <span className="block text-[11px] font-black uppercase text-neo-black/70">{t('eduPro.practice.round', { n: i + 1 })}</span>
                    <span className="block font-neo-display text-sm font-black leading-tight">{rel}</span>
                    <span className="block text-[11px] font-bold text-neo-black/70">{when}</span>
                  </m.li>
                );
              })}
            </ol>
          </m.div>
        ) : (
          <m.div key="cta" className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={assign}
              disabled={status.kind === 'saving'}
              className={cn(
                'inline-flex min-h-11 items-center gap-2 rounded-neo border-2 border-black bg-neo-lime px-4 py-2 font-neo-display text-sm font-black uppercase text-neo-black shadow-hard',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neo-white disabled:opacity-70',
                PRESS,
              )}
            >
              {status.kind === 'saving' ? (
                <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
              ) : (
                <Sparkles className="size-4" aria-hidden="true" />
              )}
              {status.kind === 'saving' ? t('eduPro.practice.assigning') : t('eduPro.practice.cta')}
            </button>
            <span className="text-xs font-bold text-neo-cream/70">{t('eduPro.practice.hint')}</span>
          </m.div>
        )}
      </AnimatePresence>
      {status.kind === 'already' && (
        <p role="status" className="text-sm font-black text-neo-cyan">{t('eduPro.practice.already')}</p>
      )}
      {status.kind === 'failed' && (
        <p role="alert" className="text-sm font-black text-neo-pink">{t('eduPro.practice.failed')}</p>
      )}
    </div>
  );
}
