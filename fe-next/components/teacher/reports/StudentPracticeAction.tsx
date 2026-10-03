'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CalendarCheck, Loader2, Lock, Sparkles } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTeacherPro } from '@/hooks/useTeacherPro';
import { SPACED_REVIEW_DAYS } from '@/lib/education/wordMasteryReport';
import { fetchWithAuth } from '@/utils/authFetch';
import { cn } from '@/lib/utils';

type Status = 'idle' | 'saving' | 'done' | 'already' | 'nothing' | 'failed';

function localDay(d = new Date()) {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

const BUTTON =
  'inline-flex min-h-11 items-center gap-2 rounded-neo border-2 px-4 py-2 font-neo-display text-sm font-black uppercase shadow-hard transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-hard-lg active:translate-y-0.5 active:shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neo-white motion-reduce:transition-none motion-reduce:hover:translate-y-0';

export function StudentPracticeAction({
  classroomId,
  studentName,
  words,
}: {
  classroomId: string;
  studentName: string;
  words: string[];
}) {
  const { t, language } = useLanguage();
  const { hasPro } = useTeacherPro();
  const [status, setStatus] = useState<Status>('idle');
  const [assigned, setAssigned] = useState(0);

  if (words.length === 0) return null;

  const cta = t('eg2Polish.arc.practice.cta', { count: words.length, name: studentName });

  if (!hasPro) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <Link
          data-testid="student-practice-locked"
          href={`/${language}/teacher/upgrade`}
          className={cn(BUTTON, 'border-neo-lime bg-neo-navy text-neo-lime')}
        >
          <Lock className="size-4" aria-hidden="true" />
          {cta}
        </Link>
        <span className="text-xs font-bold text-neo-cream/70">{t('eg2Polish.arc.practice.proHint')}</span>
      </div>
    );
  }

  if (status === 'done') {
    return (
      <p
        data-testid="student-practice-done"
        role="status"
        className="flex items-center gap-2 rounded-neo border-2 border-black bg-neo-lime px-3 py-2 text-sm font-black text-neo-black shadow-hard"
      >
        <CalendarCheck className="size-5 shrink-0" aria-hidden="true" />
        {t('eg2Polish.arc.practice.done', { count: assigned, name: studentName })}
      </p>
    );
  }

  const assign = async () => {
    if (status === 'saving') return;
    setStatus('saving');
    const date = new Date().toLocaleDateString(language);
    const names = SPACED_REVIEW_DAYS.map((_, i) =>
      t('eg2Polish.arc.practice.roundName', { name: studentName, n: i + 1, date }),
    );
    try {
      const res = await fetchWithAuth(`/api/education/classroom/${classroomId}/missed-practice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ today: localDay(), names, words }),
      });
      const body = await res.json().catch(() => null);
      if (res.status === 409) return setStatus('already');
      if (res.status === 422) return setStatus('nothing');
      if (!res.ok || !body?.ok) return setStatus('failed');
      setAssigned(Array.isArray(body.words) ? body.words.length : words.length);
      setStatus('done');
    } catch {
      setStatus('failed');
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          data-testid="student-practice-cta"
          onClick={assign}
          disabled={status === 'saving'}
          className={cn(BUTTON, 'border-black bg-neo-lime text-neo-black disabled:opacity-70')}
        >
          {status === 'saving' ? (
            <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
          ) : (
            <Sparkles className="size-4" aria-hidden="true" />
          )}
          {cta}
        </button>
        <span className="text-xs font-bold text-neo-cream/70">{t('eg2Polish.arc.practice.hint')}</span>
      </div>
      {status === 'already' && (
        <p role="status" className="text-sm font-black text-neo-cyan">{t('eg2Polish.arc.practice.already')}</p>
      )}
      {status === 'nothing' && (
        <p role="alert" className="text-sm font-black text-neo-pink">{t('eg2Polish.arc.practice.nothing')}</p>
      )}
      {status === 'failed' && (
        <p role="alert" className="text-sm font-black text-neo-pink">{t('eduPro.practice.failed')}</p>
      )}
    </div>
  );
}
