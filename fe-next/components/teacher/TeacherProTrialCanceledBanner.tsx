'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
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
  return (
    <ProBanner
      testId="teacher-pro-trial-canceled"
      tone="calm"
      proLabel={t('eduShell.nav.pro')}
      title={t('teacher.subscription.canceledTrialTitle', { date: planEndDate(endsAt, language) })}
      body={
        <>
          <span>{t('teacher.subscription.canceledTrialBody')}</span>
          <TrialUsageRecap trialExpires={endsAt} className="mt-1 block" />
        </>
      }
      action={<ResumeProButton onResumed={onResumed} />}
    />
  );
}
