'use client';

import { useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { TRIAL_CANCEL_REASONS } from '@/lib/education/trialCancelReason';
import { PRO_BANNER_CTA, ProBanner, ProShine } from './pro/ProBanner';
import { TrialUsageRecap } from './pro/TrialUsageRecap';

const DATE_LOCALE: Record<string, string> = {
  en: 'en-US', he: 'he-IL', sv: 'sv-SE', ja: 'ja-JP', es: 'es-ES', ru: 'ru-RU',
};

export function planEndDate(iso: string | null, language: string): string {
  const d = iso ? new Date(iso) : null;
  if (!d || Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(DATE_LOCALE[language] || language || 'en-US', { month: 'long', day: 'numeric' });
}

/** Undo a cancel in place (same subscription, same charge date). */
export function ResumeProButton({ onResumed, className }: { onResumed: () => void; className?: string }) {
  const { t } = useLanguage();
  const [pending, setPending] = useState(false);

  const resume = async () => {
    if (pending) return;
    setPending(true);
    try {
      const res = await fetch('/api/subscription/resume', { method: 'POST', credentials: 'same-origin' });
      if (!res.ok) throw new Error(`resume ${res.status}`);
      toast.success(t('teacher.subscription.resumeDone'));
      onResumed();
    } catch {
      toast.error(t('teacher.subscription.resumeError'));
    } finally {
      setPending(false);
    }
  };

  return (
    <button
      type="button"
      data-testid="teacher-pro-resume-cta"
      disabled={pending}
      aria-busy={pending || undefined}
      onClick={() => void resume()}
      className={cn(PRO_BANNER_CTA, className)}
    >
      <ProShine />
      {pending ? t('common.loading') : t('teacher.subscription.resumeCta')}
    </button>
  );
}

/** A card trial the teacher cancelled: Pro runs to the end date, nothing is charged. */
export function TeacherProTrialCanceledBanner({ endsAt, onResumed }: { endsAt: string | null; onResumed: () => void }) {
  const { t, language } = useLanguage();
  const [picked, setPicked] = useState<string | null>(null);

  const pickReason = async (reason: string) => {
    if (picked) return;
    setPicked(reason);
    try {
      await fetch('/api/subscription/cancel-reason', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
    } catch {
      /* a missed reason must not block the classroom */
    }
  };

  return (
    <ProBanner
      testId="teacher-pro-trial-canceled"
      tone="calm"
      proLabel={t('eduShell.nav.pro')}
      title={t('teacher.subscription.canceledTrialTitle', { date: planEndDate(endsAt, language) })}
      body={
        <>
          <span>{t('teacher.subscription.canceledTrialBody')}</span>
          <Link
            href={`/${language}/teacher/classroom/new`}
            data-testid="teacher-pro-trial-canceled-lesson"
            className="mt-1 block font-bold underline underline-offset-2"
          >
            {t('teacher.subscription.canceledTrialPlanLesson')}
          </Link>
          <TrialUsageRecap trialExpires={endsAt} className="mt-1 block" />
          <div className="mt-2 flex flex-wrap gap-2" data-testid="teacher-pro-trial-cancel-reasons">
            {picked ? (
              <span>{t('teacher.subscription.cancelReasonThanks')}</span>
            ) : (
              TRIAL_CANCEL_REASONS.map((reason) => (
                <button
                  key={reason}
                  type="button"
                  data-testid={`teacher-pro-trial-cancel-reason-${reason}`}
                  onClick={() => void pickReason(reason)}
                  className="rounded-full border border-neo-cream/40 px-3 py-1 text-xs font-bold text-neo-cream"
                >
                  {t(`teacher.subscription.cancelReason_${reason}`)}
                </button>
              ))
            )}
          </div>
        </>
      }
      action={<ResumeProButton onResumed={onResumed} />}
    />
  );
}
