'use client';
import { useRef, useState } from 'react';
import Link from 'next/link';
import { RotateCcw } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { trackGrowthEvent } from '@/utils/growthTracking';
import { profileReady, type AccessApproval } from '@/components/education/AccessRequestHandoff';
import type { TeacherAccessRequest } from '@/lib/education/types';

type Outcome = 'idle' | 'sending' | 'still' | 'error' | 'rateLimited';

/** Re-sending a stranded request re-runs the approval, so that is the next step, not "check back later". */
export function AccessPendingCard({ request, onApproved }: { request: TeacherAccessRequest | null; onApproved: (approval: AccessApproval) => void }) {
  const { t, language } = useLanguage();
  const { refreshProfile } = useAuth();
  const [outcome, setOutcome] = useState<Outcome>('idle');
  const inFlight = useRef(false);

  const finish = async () => {
    if (inFlight.current || !request) return;
    inFlight.current = true;
    setOutcome('sending');
    let next: Outcome = 'error';
    try {
      const res = await fetch('/api/education/access-request', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ locale: language, use_case: request.use_case, role: request.role }),
      });
      const json = (await res.json().catch(() => null)) as { approvalPending?: boolean; paidDay0?: boolean; alreadyApproved?: boolean } | null;
      if (res.ok && !json?.approvalPending) {
        onApproved({ paidDay0: !!json?.paidDay0, alreadyApproved: !!json?.alreadyApproved, ready: profileReady(refreshProfile) });
        next = 'sending';
      } else {
        next = res.ok ? 'still' : res.status === 429 ? 'rateLimited' : 'error';
      }
      try {
        trackGrowthEvent('edu_access_pending_finish', { ok: res.ok, status: res.status, still_pending: !!json?.approvalPending });
      } catch {
        /* telemetry must never break access request */
      }
    } catch {
      next = 'error';
    } finally {
      inFlight.current = false;
      setOutcome(next);
    }
  };

  return (
    <div data-testid="access-pending" className="rounded-neo border-neo-thick border-neo-black bg-neo-cyan p-6 text-neo-navy shadow-hard-lg">
      <h2 className="font-neo-display text-2xl font-black tracking-[-0.02em]">{t('education.access.pending_title')}</h2>
      <p className="mt-2 text-neo-navy/90">{t('education.access.pending_finish_body')}</p>
      {request?.created_at && (
        <p className="mt-2 text-sm font-semibold text-neo-navy/70">
          {t('education.access.submitted_on')}: {new Date(request.created_at).toLocaleString(language)}
        </p>
      )}
      <button
        type="button"
        onClick={() => void finish()}
        disabled={outcome === 'sending' || !request}
        className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-neo border-neo-thick border-neo-black bg-neo-lime px-5 py-3 font-neo-display text-base font-black text-neo-navy shadow-hard transition-[box-shadow,transform] duration-100 hover:-translate-y-0.5 hover:shadow-hard-lg active:translate-y-0 active:shadow-hard-pressed focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-navy disabled:cursor-wait"
      >
        <RotateCcw className="size-5" aria-hidden="true" />
        {t('education.access.pending_finish_cta')}
      </button>
      {outcome === 'still' && (
        <p role="status" className="mt-3 text-sm font-semibold">
          {t('education.access.pending_still')}
        </p>
      )}
      {(outcome === 'error' || outcome === 'rateLimited') && (
        <p role="alert" className="mt-3 text-sm font-bold text-neo-navy">
          {t(outcome === 'rateLimited' ? 'education.access.rate_limited' : 'education.access.submit_error')}
        </p>
      )}
      <p className="mt-4 border-t-2 border-neo-navy/20 pt-3 text-sm text-neo-navy/85">
        {t('education.access.pending_meanwhile')}{' '}
        <Link href={`/${language}/education/games-for-teachers`} className="font-bold underline underline-offset-4">
          {t('education.access.pending_meanwhile_link')}
        </Link>
      </p>
    </div>
  );
}
