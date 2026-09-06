'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { m, useReducedMotion, type Variants } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import type { TeacherAccessSubmission, TeacherAccessRole, TeacherLocale } from '@/lib/education/types';

/** Fun emoji per role — turns a boring dropdown into a tap-to-pick card grid. */
const ROLE_OPTIONS: { value: TeacherAccessRole; emoji: string }[] = [
  { value: 'teacher', emoji: '🍎' },
  { value: 'tutor', emoji: '📚' },
  { value: 'admin', emoji: '🏫' },
  { value: 'parent', emoji: '🏡' },
  { value: 'researcher', emoji: '🔬' },
  { value: 'other', emoji: '✨' },
];

const USE_CASE_EXAMPLE_KEYS = ['use_case_ex1', 'use_case_ex2', 'use_case_ex3'] as const;

const FIELD_CLASS =
  'mt-1 w-full rounded-neo border-neo bg-neo-navy text-neo-white placeholder-neo-white/40 p-3 ' +
  'transition-all duration-150 outline-none ' +
  'focus:border-neo-lime focus:shadow-hard focus:-translate-y-0.5';
const LABEL_CLASS = 'block text-sm font-semibold text-neo-white font-neo-display';

/**
 * Teacher-access request form.
 *
 * The gate ({@link AccessRequestGate}) only renders this for a signed-up,
 * email-verified account, so we ALREADY know the applicant's name and email
 * from signup — we never ask for them again. The server derives name, email,
 * and country from the account itself; this form collects only the two things
 * signup doesn't capture: who they are (role) and how they'll use LexiClash.
 */
export function AccessRequestForm({
  knownName,
  knownEmail,
}: { knownName?: string; knownEmail?: string } = {}) {
  const { t, language } = useLanguage();
  const { refreshProfile } = useAuth();
  const router = useRouter();
  const shouldReduceMotion = useReducedMotion();
  const [role, setRole] = useState<TeacherAccessRole | null>(null);
  const [useCase, setUseCase] = useState('');
  const [school, setSchool] = useState('');
  const [submitting, setSubmitting] = useState(false);
  // Synchronous in-flight guard. `submitting` (which disables the button)
  // only takes effect on the NEXT render — two submits fired in the same
  // tick (e.g. Enter key + click) would both read the pre-update `canSubmit`
  // and both fire. The ref flips immediately, so the second call always bails.
  const inFlight = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Access is granted the moment the POST succeeds — show the success beat
  // briefly, then send the new teacher straight to their dashboard. The
  // profile is refreshed BEFORE navigating so /teacher's role gate reads the
  // freshly-promoted user_role instead of bouncing a stale 'student' home.
  useEffect(() => {
    if (!success) return;
    let cancelled = false;
    const go = async () => {
      try { await refreshProfile(); } catch {}
      if (!cancelled) router.push(`/${language}/teacher`);
    };
    const id = setTimeout(go, 1200);
    return () => { cancelled = true; clearTimeout(id); };
  }, [success, refreshProfile, router, language]);

  const firstName = (knownName ?? '').trim().split(/\s+/)[0] || '';
  const roleOk = role !== null;
  const useCaseOk = useCase.trim().length >= 10;
  const remaining = Math.max(0, 10 - useCase.trim().length);
  const completed = [roleOk, useCaseOk];
  const canSubmit = roleOk && useCaseOk && !submitting;

  // Entrance distance collapses to 0 under reduced-motion (compositor-only: opacity + y).
  const container: Variants = {
    hidden: {},
    show: { transition: { staggerChildren: shouldReduceMotion ? 0 : 0.06 } },
  };
  const item: Variants = {
    hidden: { opacity: 0, y: shouldReduceMotion ? 0 : 12 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 260, damping: 24 } },
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || !role || inFlight.current) return;
    inFlight.current = true;
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch('/api/education/access-request', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          role,
          locale: language as TeacherLocale,
          use_case: useCase,
          school_or_org: school || undefined,
        } satisfies TeacherAccessSubmission),
      });
      if (!res.ok) {
        setError(res.status === 429 ? t('education.access.rate_limited') : t('education.access.submit_error'));
        return;
      }
      setSuccess(true);
    } catch {
      setError(t('education.access.submit_error'));
    } finally {
      inFlight.current = false;
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <m.div
        role="status"
        initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 220, damping: 18 }}
        className="rounded-neo border-neo-thick bg-neo-lime p-6 text-center text-neo-navy shadow-hard"
      >
        <svg viewBox="0 0 52 52" className="mx-auto mb-3 h-14 w-14" aria-hidden="true">
          <m.circle
            cx="26" cy="26" r="24" fill="none" stroke="#1a1a2e" strokeWidth="3"
            initial={shouldReduceMotion ? false : { pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          />
          <m.path
            d="M14 27l8 8 16-16" fill="none" stroke="#1a1a2e" strokeWidth="4"
            strokeLinecap="round" strokeLinejoin="round"
            initial={shouldReduceMotion ? false : { pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.3, ease: 'easeOut', delay: shouldReduceMotion ? 0 : 0.35 }}
          />
        </svg>
        <h3 className="text-2xl font-bold font-neo-display">{t('education.access.success_title')}</h3>
        <p className="mt-2 text-neo-navy/85">{t('education.access.success_body')}</p>
        <p className="mt-3 text-sm text-neo-navy/75">{t('education.access.success_next')}</p>
      </m.div>
    );
  }

  return (
    <m.form
      onSubmit={handleSubmit}
      className="space-y-5"
      variants={container}
      initial="hidden"
      animate="show"
    >
      {/* Friendly greeting — signals we already have their details from signup. */}
      <m.div variants={item}>
        <h2 className="text-2xl font-bold font-neo-display text-neo-white">
          {firstName
            ? t('education.access.greeting', { name: firstName })
            : t('education.access.greeting_noname')}
        </h2>
        <p className="mt-1 text-neo-white/80">{t('education.access.greeting_sub')}</p>
        {knownEmail && (
          <div
            data-testid="applying-as"
            className="mt-3 inline-flex items-center gap-2 rounded-neo border-neo bg-neo-navy px-3 py-1.5 text-sm text-neo-white/80 shadow-hard-sm"
          >
            <span aria-hidden="true">📇</span>
            <span className="font-semibold text-neo-white/60">{t('education.access.applying_as')}</span>
            <span className="font-semibold text-neo-white">
              {knownName ? `${knownName} · ` : ''}{knownEmail}
            </span>
          </div>
        )}
      </m.div>

      {/* Decorative completeness meter — 2 steps (pick a role, tell us why). */}
      <m.div variants={item} data-testid="access-form-progress" aria-hidden="true" className="flex gap-2">
        {completed.map((done, i) => (
          <m.span
            key={i}
            data-progress-tile
            data-filled={done ? 'true' : 'false'}
            animate={{ scale: done && !shouldReduceMotion ? [1, 1.25, 1] : 1 }}
            transition={{ duration: 0.25 }}
            className={`h-2 flex-1 rounded-neo border-neo transition-colors duration-200 ${
              done ? 'bg-neo-lime' : 'bg-neo-navy'
            }`}
          />
        ))}
      </m.div>

      {/* Role — tap-to-pick emoji cards instead of a dropdown. */}
      <m.fieldset variants={item} className="space-y-2">
        <legend className={LABEL_CLASS}>{t('education.access.role_q')}</legend>
        <div role="radiogroup" aria-label={t('education.access.role_q')} className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {ROLE_OPTIONS.map(({ value, emoji }) => {
            const selected = role === value;
            return (
              <m.button
                key={value}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setRole(value)}
                whileTap={shouldReduceMotion ? undefined : { scale: 0.96 }}
                className={`flex items-center gap-2 rounded-neo border-neo p-3 text-start font-semibold font-neo-display shadow-hard-sm transition-all ${
                  selected
                    ? 'bg-neo-lime text-neo-navy -translate-y-0.5 shadow-hard'
                    : 'bg-neo-navy text-neo-white hover:-translate-y-0.5 hover:shadow-hard'
                }`}
              >
                <span className="text-xl" aria-hidden="true">{emoji}</span>
                <span className="text-sm">{t(`education.access.role_${value}`)}</span>
              </m.button>
            );
          })}
        </div>
      </m.fieldset>

      {/* Use case — the one thing only they can tell us. */}
      <m.div variants={item}>
        <label htmlFor="tar-use_case" className={LABEL_CLASS}>{t('education.access.use_case_q')}</label>
        <p className="mt-0.5 text-sm text-neo-white/70">{t('education.access.use_case_hint')}</p>
        <textarea id="tar-use_case" required minLength={10} maxLength={800} rows={4}
          placeholder={t('education.access.use_case_placeholder')}
          value={useCase} onChange={(e) => setUseCase(e.target.value)}
          className={`${FIELD_CLASS} mt-2`} />
        <div className="mt-1 flex items-center justify-between gap-2">
          <p className={`text-xs ${useCaseOk ? 'text-neo-lime' : 'text-neo-white/70'}`}>
            {useCaseOk ? t('education.access.use_case_ready') : t('education.access.use_case_remaining', { count: remaining })}
          </p>
          <p className="text-xs text-neo-white/50">{useCase.length}/800</p>
        </div>
        {/* Quick-fill sparks — one tap drops in a starting sentence. */}
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-neo-white/60">{t('education.access.use_case_spark')}</span>
          {USE_CASE_EXAMPLE_KEYS.map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setUseCase(t(`education.access.${k}`))}
              className="rounded-neo border-neo bg-neo-navy px-2 py-1 text-xs text-neo-white shadow-hard-sm transition-all hover:-translate-y-0.5 hover:bg-neo-cyan hover:text-neo-navy"
            >
              {t(`education.access.${k}`)}
            </button>
          ))}
        </div>
      </m.div>

      {/* School / org — optional; not captured at signup. */}
      <m.div variants={item}>
        <label htmlFor="tar-school" className={LABEL_CLASS}>{t('education.access.school_q')}</label>
        <input id="tar-school" value={school} onChange={(e) => setSchool(e.target.value)}
          placeholder={t('education.access.school_placeholder')}
          className={FIELD_CLASS} />
      </m.div>

      {error && <p role="alert" aria-live="polite" className="text-neo-red font-semibold">{error}</p>}
      <m.button type="submit" disabled={!canSubmit} variants={item}
        whileHover={canSubmit && !shouldReduceMotion ? { y: -2 } : undefined}
        whileTap={canSubmit && !shouldReduceMotion ? { y: 1 } : undefined}
        transition={{ type: 'spring', stiffness: 400, damping: 17 }}
        className="w-full rounded-neo border-neo-thick bg-neo-lime px-4 py-3 font-bold text-neo-navy font-neo-display shadow-hard hover:shadow-hard-sm active:shadow-hard-pressed disabled:opacity-50 disabled:cursor-not-allowed">
        {submitting ? t('education.access.submitting') : t('education.access.submit')}
      </m.button>
    </m.form>
  );
}
