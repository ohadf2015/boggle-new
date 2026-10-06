'use client';

import { useCallback, useEffect, useState } from 'react';
import { X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { NeoPanel } from '@/components/ui/panel';
import { cn } from '@/lib/utils';
import {
  goToPolarCheckout,
  postTeacherProCheckout,
} from '@/lib/education/postTeacherProCheckout';
import { trackTrialCtaTap, trackTrialCtaView } from '@/lib/education/proFunnelTelemetry';

export function TeacherActivationCompleteCard({
  onDismiss,
}: {
  onDismiss?: () => void;
}) {
  const { t, language } = useLanguage();
  const [pending, setPending] = useState(false);

  useEffect(() => {
    try {
      trackTrialCtaView({ source: 'activation_checklist' });
    } catch {
      /* analytics must never block the till */
    }
  }, []);

  const startTrial = useCallback(async () => {
    if (pending) return;
    try {
      trackTrialCtaTap({ source: 'activation_checklist' });
    } catch {
      /* analytics must never block the till */
    }
    setPending(true);
    try {
      const result = await postTeacherProCheckout(fetch, { trial: true, locale: language });
      if (!result.ok) {
        if (result.status === 401) toast.error(t('teacher.subscription.signInRequired'));
        else if (result.status === 503) toast.error(t('teacher.subscription.checkoutUnavailable'));
        else toast.error(t('teacher.subscription.checkoutError'));
        return;
      }
      goToPolarCheckout(result.url);
    } catch {
      toast.error(t('teacher.subscription.checkoutError'));
    } finally {
      setPending(false);
    }
  }, [pending, t, language]);

  return (
    <NeoPanel
      tone="navy"
      shadow="md"
      data-testid="teacher-activation-complete"
      className="p-3"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-neo-display text-sm font-black uppercase tracking-tight text-neo-white">
            {t('teacher.onboardingChecklist.completeTitle')}
          </p>
          <p className="mt-1 font-neo-body text-xs font-bold text-neo-white/70 text-pretty">
            {t('teacher.onboardingChecklist.completeBody')}
          </p>
        </div>
        {onDismiss ? (
          <button
            type="button"
            data-testid="teacher-activation-dismiss"
            aria-label={t('teacher.onboardingChecklist.dismiss')}
            onClick={onDismiss}
            className={cn(
              'inline-flex size-9 shrink-0 items-center justify-center rounded-neo border-2 border-neo-cream/50',
              'text-neo-white hover:border-neo-cream focus:outline-hidden focus-visible:ring-4 focus-visible:ring-neo-cyan',
            )}
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        ) : null}
      </div>
      <button
        type="button"
        data-testid="teacher-activation-trial-cta"
        disabled={pending}
        aria-busy={pending || undefined}
        onClick={() => {
          void startTrial();
        }}
        className={cn(
          'mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-neo border-3 border-black',
          'bg-neo-cyan px-4 font-neo-display text-sm font-black uppercase tracking-wide text-black shadow-hard-sm',
          'hover:-translate-y-0.5 hover:shadow-hard active:translate-y-0.5 disabled:opacity-60',
          'focus:outline-hidden focus-visible:ring-4 focus-visible:ring-neo-lime',
        )}
      >
        {t('teacher.onboardingChecklist.trialCta')}
      </button>
    </NeoPanel>
  );
}
