'use client';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { DirectionalIcon } from '@/components/ui/DirectionalIcon';
import { trackGrowthEvent } from '@/utils/growthTracking';
import type { TeacherAccessRole, TeacherLocale } from '@/lib/education/types';
import { accessHandoffHref, type AccessApproval } from './AccessRequestHandoff';

const ROLE_OPTIONS: { value: TeacherAccessRole; emoji: string }[] = [
  { value: 'teacher', emoji: '🍎' },
  { value: 'tutor', emoji: '📚' },
  { value: 'parent', emoji: '🏡' },
  { value: 'other', emoji: '✨' },
];

const REFRESH_CAP_MS = 4000;
const USE_CASE_MIN = 10;
const USE_CASE_MAX = 800;

const PRIMARY_CTA_CLASS =
  'group flex min-h-14 w-full items-center justify-center gap-3 rounded-neo border-neo-thick border-neo-black ' +
  'bg-neo-lime px-5 py-4 font-neo-display text-base font-black tracking-[-0.01em] text-neo-navy text-balance ' +
  'shadow-hard-lg transition-[box-shadow,transform] duration-100 hover:-translate-y-0.5 hover:shadow-hard-xl ' +
  'active:translate-y-0 active:shadow-hard-pressed focus:outline-hidden focus-visible:ring-4 focus-visible:ring-neo-cyan ' +
  'disabled:cursor-wait disabled:hover:translate-y-0 disabled:hover:shadow-hard-lg sm:text-xl';

/**
 * The last step before class setup. Access is granted on submit. The reason is required
 * free text (no preset answers), role is an optional tap, and the server fills the rest
 * from the account.
 */
export function AccessRequestForm({
  knownName,
  onApproved,
}: { knownName?: string; knownEmail?: string; onApproved?: (approval: AccessApproval) => void } = {}) {
  const { t, language } = useLanguage();
  const { refreshProfile } = useAuth();
  const router = useRouter();
  const [role, setRole] = useState<TeacherAccessRole | null>(null);
  const [useCase, setUseCase] = useState('');
  const [submitting, setSubmitting] = useState(false);
  // `submitting` disables the button only on the next render; two submits in one tick both pass it.
  const inFlight = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [approvalPending, setApprovalPending] = useState(false);

  const useCaseLen = useCase.trim().length;
  const useCaseOk = useCaseLen >= USE_CASE_MIN;
  const firstName = (knownName ?? '').trim().split(/\s+/)[0] || '';

  const handOff = (paidDay0: boolean, alreadyApproved: boolean) => {
    // The next page's gate re-reads a stale profile itself, so a stuck refresh must not hold the teacher here.
    const ready = Promise.race([
      Promise.resolve()
        .then(() => refreshProfile())
        .then(
          () => undefined,
          () => undefined,
        ),
      new Promise<void>((resolve) => setTimeout(resolve, REFRESH_CAP_MS)),
    ]);
    if (onApproved) {
      onApproved({ paidDay0, alreadyApproved, ready });
      return;
    }
    void ready.then(() => router.replace(accessHandoffHref(language, { paidDay0, alreadyApproved }, null)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (inFlight.current || !useCaseOk) return;
    inFlight.current = true;
    setError(null);
    setSubmitting(true);
    let leaving = false;
    try {
      const res = await fetch('/api/education/access-request', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ locale: language as TeacherLocale, use_case: useCase.trim(), ...(role ? { role } : {}) }),
      });
      try {
        trackGrowthEvent('edu_access_request_submitted', { ok: res.ok, status: res.status });
      } catch {
        /* telemetry must never break access request */
      }
      if (!res.ok) {
        setError(res.status === 429 ? t('education.access.rate_limited') : t('education.access.submit_error'));
        return;
      }
      const json = await res.json().catch(() => null);
      if (json?.approvalPending) {
        setApprovalPending(true);
        return;
      }
      leaving = true;
      handOff(!!json?.paidDay0, !!json?.alreadyApproved);
    } catch {
      setError(t('education.access.submit_error'));
    } finally {
      inFlight.current = false;
      if (!leaving) setSubmitting(false);
    }
  };

  if (approvalPending) {
    return (
      <div role="status" className="rounded-neo border-neo-thick border-neo-black bg-neo-cyan p-6 text-center text-neo-navy shadow-hard">
        <span className="mb-3 block text-5xl" aria-hidden="true">📬</span>
        <h3 className="font-neo-display text-2xl font-bold">{t('education.access.approval_pending_title')}</h3>
        <p className="mt-2 text-neo-navy/85">{t('education.access.approval_pending_body')}</p>
        <p className="mt-3 text-sm text-neo-navy/75">{t('education.access.approval_pending_retry')}</p>
        <button
          type="button"
          onClick={() => setApprovalPending(false)}
          className="mt-4 min-h-11 rounded-neo border-neo border-neo-cream/40 bg-neo-navy px-4 py-2 font-neo-display text-sm font-bold text-neo-white shadow-hard-sm transition hover:-translate-y-0.5 hover:shadow-hard active:shadow-hard-pressed focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cyan"
        >
          {t('education.access.approval_pending_back')}
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="text-neo-white">
      <h2 className="font-neo-display text-2xl font-black tracking-[-0.02em]">
        {firstName
          ? t('education.access.greeting', { name: firstName })
          : t('education.access.greeting_noname')}
      </h2>

      <div className="mt-5">
        <label htmlFor="tar-use_case" className="block font-neo-display text-sm font-semibold text-neo-white/80">
          {t('education.access.use_case_q')}
        </label>
        <p className="mt-0.5 text-sm text-neo-white/70">{t('education.access.use_case_hint')}</p>
        <textarea
          id="tar-use_case"
          required
          minLength={USE_CASE_MIN}
          maxLength={USE_CASE_MAX}
          rows={3}
          value={useCase}
          onChange={(e) => setUseCase(e.target.value)}
          placeholder={t('education.access.use_case_placeholder')}
          className="mt-2 w-full rounded-neo border-neo border-neo-cream/40 bg-neo-navy px-3 py-2 text-neo-white placeholder:text-neo-white/50 focus:outline-hidden focus-visible:ring-4 focus-visible:ring-neo-cyan"
        />
        <p className={`mt-1 text-xs ${useCaseOk ? 'text-neo-lime' : 'text-neo-white/70'}`}>
          {useCaseOk
            ? t('education.access.use_case_ready')
            : t('education.access.use_case_remaining', { count: USE_CASE_MIN - useCaseLen })}
        </p>
      </div>

      <fieldset className="mt-5">
        <legend className="font-neo-display text-sm font-semibold text-neo-white/80">
          {t('education.access.role')} <span className="font-normal text-neo-white/60">· {t('common.optional')}</span>
        </legend>
        <div role="radiogroup" aria-label={t('education.access.role')} className="mt-2 grid grid-cols-2 gap-2">
          {ROLE_OPTIONS.map(({ value, emoji }) => {
            const selected = role === value;
            return (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setRole(selected ? null : value)}
                className={`flex min-h-11 items-center gap-2 rounded-neo border-neo px-3 py-2 text-start font-neo-display text-sm font-semibold leading-tight shadow-hard-sm transition-[box-shadow,transform] duration-100 focus:outline-hidden focus-visible:ring-4 focus-visible:ring-neo-cyan ${
                  selected
                    ? 'border-neo-black bg-neo-lime text-neo-navy shadow-hard'
                    : 'border-neo-cream/40 bg-neo-navy text-neo-white hover:-translate-y-0.5 hover:shadow-hard'
                }`}
              >
                <span aria-hidden="true">{emoji}</span>
                {t(`education.access.role_${value}`)}
              </button>
            );
          })}
        </div>
      </fieldset>

      {error && (
        <p role="alert" aria-live="polite" className="mt-4 font-semibold text-neo-red">
          {error}
        </p>
      )}
      <button type="submit" disabled={submitting || !useCaseOk} className={`mt-6 ${PRIMARY_CTA_CLASS}`}>
        {submitting
          ? t('education.access.class_ready_creating')
          : t('education.trial.cta')}
        {!submitting && (
          <DirectionalIcon
            icon={ArrowRight}
            className="size-5 transition-transform group-hover:translate-x-1 rtl:group-hover:-translate-x-1"
          />
        )}
      </button>
    </form>
  );
}
