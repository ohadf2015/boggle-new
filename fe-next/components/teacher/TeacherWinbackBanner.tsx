'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  checkoutFailureKey,
  goToPolarCheckout,
  postTeacherProCheckout,
} from '@/lib/education/postTeacherProCheckout';
import { teacherWinbackCopy } from '@/lib/education/pro/teacherWinbackCopy';
import {
  trackTeacherWinbackClicked,
  trackTeacherWinbackDismissed,
  trackTeacherWinbackShown,
} from '@/lib/education/teacherWinbackTelemetry';
import { PRO_BANNER_CTA, ProBanner, ProShine } from './pro/ProBanner';

/** Polar checkout placement for the approved-never-tried recall. */
export const TEACHER_WINBACK_PLACEMENT = 'dashboard_teacher_winback';

/**
 * Teacher dashboard recall for an approved teacher who never started Teacher Pro.
 *
 * Mount only from the teacher home banner slot. `approved` is a second guard
 * so a student surface that imported this still renders nothing.
 */
export function TeacherWinbackBanner({
  approved,
  onDismiss,
}: {
  approved: boolean;
  onDismiss?: () => void;
}) {
  const { t, language } = useLanguage();
  const [pending, setPending] = useState(false);
  const shownRef = useRef(false);
  const copy = teacherWinbackCopy(language);

  useEffect(() => {
    if (!approved || shownRef.current) return;
    shownRef.current = true;
    try {
      trackTeacherWinbackShown();
    } catch {
      /* analytics must never block the till */
    }
  }, [approved]);

  const start = useCallback(async () => {
    if (pending || !approved) return;
    try {
      trackTeacherWinbackClicked();
    } catch {
      /* analytics must never block the till */
    }
    setPending(true);
    try {
      const result = await postTeacherProCheckout(fetch, {
        trial: true,
        locale: language,
        placement: TEACHER_WINBACK_PLACEMENT,
      });
      if (!result.ok) {
        toast.error(t(checkoutFailureKey(result)));
        return;
      }
      goToPolarCheckout(result.url);
    } catch {
      toast.error(t('teacher.subscription.checkoutError'));
    } finally {
      setPending(false);
    }
  }, [approved, language, pending, t]);

  if (!approved) return null;

  return (
    <div dir={copy.dir} data-testid="teacher-winback">
      <ProBanner
        testId="teacher-winback-card"
        tone="calm"
        proLabel={t('eduShell.nav.pro')}
        title={copy.title}
        onDismiss={() => {
          try {
            trackTeacherWinbackDismissed();
          } catch {
            /* analytics must never block */
          }
          onDismiss?.();
        }}
        dismissLabel={copy.dismiss}
        dismissTestId="teacher-winback-dismiss"
        action={
          <button
            type="button"
            data-testid="teacher-winback-cta"
            disabled={pending}
            aria-busy={pending || undefined}
            onClick={() => {
              void start();
            }}
            className={PRO_BANNER_CTA}
          >
            <ProShine />
            {pending ? t('common.loading') : copy.cta}
          </button>
        }
      />
    </div>
  );
}
