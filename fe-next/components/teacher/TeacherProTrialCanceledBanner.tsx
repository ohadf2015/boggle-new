'use client';

import { useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { PRO_BANNER_CTA, ProBanner, ProShine } from './pro/ProBanner';
import { TrialUsageRecap } from './pro/TrialUsageRecap';
import { NEO_FOCUS } from '@/components/ui/neoStyles';

const DATE_LOCALE: Record<string, string> = {
  en: 'en-US', he: 'he-IL', sv: 'sv-SE', ja: 'ja-JP', es: 'es-ES', ru: 'ru-RU',
};

export function planEndDate(iso: string | null, language: string): string {
  const d = iso ? new Date(iso) : null;
  if (!d || Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(DATE_LOCALE[language] || language || 'en-US', { month: 'long', day: 'numeric' });
}

/**
 * The one-tap "why are you going?" chips on a cancelled trial. One POST per
 * tap; the row stores the first answer only (the API is the dedupe), so an
 * answered teacher sees the thanks line, not the chips, on the next read.
 */
const CANCEL_REASON_CHIPS = [
  { reason: 'too_expensive', labelKey: 'teacher.subscription.reasonTooExpensive' },
  { reason: 'school_pays', labelKey: 'teacher.subscription.reasonSchoolPays' },
  { reason: 'just_testing', labelKey: 'teacher.subscription.reasonJustTesting' },
  { reason: 'missing_feature', labelKey: 'teacher.subscription.reasonMissingFeature' },
] as const;

const CHIP = cn(
  'min-h-[36px] rounded-neo-pill border-2 border-neo-black bg-neo-cream px-3 font-neo-body text-xs font-black text-neo-navy shadow-hard-sm transition-transform duration-150 hover:-translate-y-0.5 active:scale-[0.97] motion-reduce:transition-none',
  NEO_FOCUS,
);

export function CancelReasonChips({ initialReason }: { initialReason: string | null }) {
  const { t } = useLanguage();
  const [answered, setAnswered] = useState<string | null>(initialReason);
  const [pending, setPending] = useState<string | null>(null);

  const pick = async (reason: string) => {
    if (pending || answered) return;
    setPending(reason);
    try {
      const res = await fetch('/api/subscription/cancel-reason', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ reason }),
      });
      if (!res.ok) throw new Error(`cancel-reason ${res.status}`);
      setAnswered(reason);
    } catch {
      toast.error(t('teacher.subscription.cancelReasonError'));
    } finally {
      setPending(null);
    }
  };

  if (answered) {
    return (
      <p data-testid="cancel-reason-thanks" className="mt-2 text-xs font-bold text-edu-ink/70">
        {t('teacher.subscription.cancelReasonThanks')}
      </p>
    );
  }
  return (
    <div data-testid="cancel-reason-row" className="mt-3 border-t-2 border-edu-line/15 pt-3">
      <p data-testid="cancel-reason-prompt" className="text-xs font-black uppercase tracking-wide text-edu-ink/70">
        {t('teacher.subscription.cancelReasonPrompt')}
      </p>
      <div className="mt-2 flex flex-wrap gap-2" data-testid="teacher-pro-trial-cancel-reasons">
        {CANCEL_REASON_CHIPS.map(({ reason, labelKey }) => (
          <button
            key={reason}
            type="button"
            data-testid={`teacher-pro-trial-cancel-reason-${reason}`}
            disabled={pending !== null}
            aria-busy={pending === reason || undefined}
            onClick={() => void pick(reason)}
            className={CHIP}
          >
            {pending === reason ? t('common.loading') : t(labelKey)}
          </button>
        ))}
      </div>
    </div>
  );
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
export function TeacherProTrialCanceledBanner({ endsAt, onResumed, cancelReason }: { endsAt: string | null; onResumed: () => void; cancelReason?: string | null }) {
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
          <Link
            href={`/${language}/teacher/classroom/new`}
            data-testid="teacher-pro-trial-canceled-lesson"
            className="mt-1 block font-bold underline underline-offset-2"
          >
            {t('teacher.subscription.canceledTrialPlanLesson')}
          </Link>
          <TrialUsageRecap trialExpires={endsAt} className="mt-1 block" />
          <CancelReasonChips initialReason={cancelReason ?? null} />
        </>
      }
      action={<ResumeProButton onResumed={onResumed} />}
    />
  );
}
