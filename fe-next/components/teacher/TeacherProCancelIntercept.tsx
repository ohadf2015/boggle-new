'use client';

import { useEffect, useId, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { NB_BLOCK, NB_SMALL } from './nb/nbStyles';
import { TEACHER_PRO_REFRESH_EVENT } from '@/lib/education/cancelRetention';
import {
  trackCancelInterceptChosen,
  trackCancelInterceptShown,
  type CancelInterceptSurface,
} from '@/lib/education/cancelRetentionTelemetry';

const OFFER_BTN = cn(NB_SMALL, 'min-h-12 w-full justify-start px-4 text-start text-base');

/**
 * Shown instead of dropping a teacher straight into the Polar portal, where
 * cancel is one tap. Pause and half-price are the loud actions. Cancel stays
 * a quiet link to the same portal — no-JS still reaches it via the trigger's href.
 */
export function TeacherProCancelIntercept({
  href,
  phase,
  surface,
  onClose,
}: {
  href: string;
  phase: 'trial' | 'paid';
  surface: CancelInterceptSurface;
  onClose: () => void;
}) {
  const { t, dir } = useLanguage();
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const shown = useRef(false);
  const [pending, setPending] = useState<'pause' | 'discount' | null>(null);

  useEffect(() => {
    if (shown.current) return;
    shown.current = true;
    trackCancelInterceptShown({ surface, phase });
  }, [surface, phase]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panelRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || pending) return;
      trackCancelInterceptChosen({ surface, phase, offer: 'dismiss' });
      onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose, pending, phase, surface]);

  const apply = async (offer: 'pause' | 'discount') => {
    if (pending) return;
    setPending(offer);
    trackCancelInterceptChosen({ surface, phase, offer });
    try {
      const res = await fetch('/api/subscription/retain', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ offer }),
      });
      if (!res.ok) throw new Error(`retain ${res.status}`);
      const body = (await res.json()) as { mechanism?: string };
      const done =
        body.mechanism === 'trial_extend'
          ? 'teacher.subscription.cancelKeepDoneTrialPause'
          : body.mechanism === 'pause_at_period_end'
            ? 'teacher.subscription.cancelKeepDonePause'
            : 'teacher.subscription.cancelKeepDoneDiscount';
      toast.success(t(done));
      window.dispatchEvent(new Event(TEACHER_PRO_REFRESH_EVENT));
      onClose();
    } catch {
      toast.error(t('teacher.subscription.cancelKeepError'));
      setPending(null);
    }
  };

  const leave = (offer: 'continue' | 'keep') => {
    if (pending) return;
    trackCancelInterceptChosen({ surface, phase, offer });
    if (offer === 'continue') {
      const opened = window.open(href, '_blank', 'noopener,noreferrer');
      if (!opened) window.location.assign(href);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-neo-black/70 p-3 sm:items-center" dir={dir}>
      <button
        type="button"
        aria-label={t('teacher.subscription.cancelKeepStay')}
        className="absolute inset-0 cursor-default"
        onClick={() => leave('keep')}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        data-testid="teacher-cancel-intercept"
        data-phase={phase}
        data-surface={surface}
        className="relative w-full max-w-md animate-[cancel-keep-pop_180ms_ease-out] rounded-neo-xl border-[3px] border-neo-black bg-neo-cream p-5 text-neo-black shadow-hard-xl outline-none"
      >
        <style>{'@keyframes cancel-keep-pop{from{transform:translateY(10px);opacity:0}to{transform:none;opacity:1}}'}</style>
        <h2 id={titleId} className="font-neo-display text-2xl font-black leading-tight">
          {t('teacher.subscription.cancelKeepTitle')}
        </h2>
        <p className="mt-2 font-neo-body text-sm font-semibold leading-snug text-neo-black/80">
          {t('teacher.subscription.cancelKeepBody')}
        </p>
        <div className="mt-4 flex flex-col gap-2">
          <button
            type="button"
            data-testid="teacher-cancel-pause"
            disabled={pending !== null}
            aria-busy={pending === 'pause' || undefined}
            onClick={() => void apply('pause')}
            className={cn(OFFER_BTN, NB_BLOCK.lime)}
          >
            <span className="block font-black">{pending === 'pause' ? t('common.loading') : t('teacher.subscription.cancelKeepPause')}</span>
            <span className="mt-0.5 block text-xs font-bold leading-snug opacity-80">
              {t(phase === 'trial' ? 'teacher.subscription.cancelKeepPauseTrialNote' : 'teacher.subscription.cancelKeepPausePaidNote')}
            </span>
          </button>
          <button
            type="button"
            data-testid="teacher-cancel-discount"
            disabled={pending !== null}
            aria-busy={pending === 'discount' || undefined}
            onClick={() => void apply('discount')}
            className={cn(OFFER_BTN, NB_BLOCK.yellow)}
          >
            <span className="block font-black">{pending === 'discount' ? t('common.loading') : t('teacher.subscription.cancelKeepDiscount')}</span>
            <span className="mt-0.5 block text-xs font-bold leading-snug opacity-80">{t('teacher.subscription.cancelKeepDiscountNote')}</span>
          </button>
          <button
            type="button"
            data-testid="teacher-cancel-keep"
            disabled={pending !== null}
            onClick={() => leave('keep')}
            className="min-h-11 rounded-neo px-2 text-start font-neo-body text-sm font-black underline decoration-2 underline-offset-4"
          >
            {t('teacher.subscription.cancelKeepStay')}
          </button>
        </div>
        <button
          type="button"
          data-testid="teacher-cancel-continue"
          disabled={pending !== null}
          onClick={() => leave('continue')}
          className="mt-3 min-h-11 w-full text-center font-neo-body text-xs font-bold text-neo-black/60 underline underline-offset-2 hover:text-neo-black"
        >
          {t('teacher.subscription.cancelKeepContinue')}
        </button>
      </div>
    </div>
  );
}
