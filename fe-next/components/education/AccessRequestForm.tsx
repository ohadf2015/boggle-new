'use client';
import { useState } from 'react';
import { m, useReducedMotion, type Variants } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { TeacherAccessFormPayload, TeacherAccessRole, TeacherLocale } from '@/lib/education/types';

const ROLES: TeacherAccessRole[] = ['teacher', 'tutor', 'admin', 'parent', 'researcher', 'other'];

const FIELD_CLASS =
  'mt-1 w-full rounded-neo border-neo bg-neo-navy text-neo-white placeholder-neo-white/40 p-3 ' +
  'transition-all duration-150 outline-none ' +
  'focus:border-neo-lime focus:shadow-hard focus:-translate-y-0.5';
const LABEL_CLASS = 'block text-sm font-semibold text-neo-white font-neo-display';

export function AccessRequestForm({ lockedEmail }: { lockedEmail?: string } = {}) {
  const { t, language } = useLanguage();
  const shouldReduceMotion = useReducedMotion();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState(lockedEmail ?? '');
  const [school, setSchool] = useState('');
  const [country, setCountry] = useState('');
  const [role, setRole] = useState<TeacherAccessRole>('teacher');
  const [useCase, setUseCase] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const nameOk = fullName.trim().length >= 2;
  const emailOk = /\S+@\S+\.\S+/.test(email);
  const useCaseOk = useCase.trim().length >= 10;
  const completed = [nameOk, emailOk, useCaseOk];
  const canSubmit = nameOk && emailOk && useCaseOk && !submitting;

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
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch('/api/education/access-request', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          email, full_name: fullName, role, locale: language as TeacherLocale,
          use_case: useCase,
          school_or_org: school || undefined,
          country: country || undefined,
        } satisfies TeacherAccessFormPayload),
      });
      if (!res.ok) {
        setError(res.status === 429 ? t('education.access.rate_limited') : t('education.access.submit_error'));
        return;
      }
      setSuccess(true);
    } catch {
      setError(t('education.access.submit_error'));
    } finally {
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
      className="space-y-4"
      variants={container}
      initial="hidden"
      animate="show"
    >
      {/* Decorative completeness meter — 3 required fields. Hidden from assistive tech. */}
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

      <m.div variants={item}>
        <label htmlFor="tar-full_name" className={LABEL_CLASS}>{t('education.access.full_name')}</label>
        <input id="tar-full_name" required value={fullName} onChange={(e) => setFullName(e.target.value)}
          className={FIELD_CLASS} />
      </m.div>
      <m.div variants={item}>
        <label htmlFor="tar-email" className={LABEL_CLASS}>{t('education.access.email')}</label>
        <input id="tar-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
          readOnly={!!lockedEmail} aria-readonly={lockedEmail ? true : undefined}
          className={`${FIELD_CLASS}${lockedEmail ? ' opacity-70 cursor-not-allowed' : ''}`} />
        {lockedEmail && (
          <p className="mt-1 text-xs text-neo-white/60">{t('education.access.email_locked_hint')}</p>
        )}
      </m.div>
      <m.div variants={item}>
        <label htmlFor="tar-role" className={LABEL_CLASS}>{t('education.access.role')}</label>
        <Select value={role} onValueChange={(v) => setRole(v as TeacherAccessRole)}>
          <SelectTrigger id="tar-role" className={FIELD_CLASS}><SelectValue /></SelectTrigger>
          <SelectContent>
            {ROLES.map((r) => <SelectItem key={r} value={r}>{t(`education.access.role_${r}`)}</SelectItem>)}
          </SelectContent>
        </Select>
      </m.div>
      <m.div variants={item}>
        <label htmlFor="tar-school" className={LABEL_CLASS}>{t('education.access.school_or_org')}</label>
        <input id="tar-school" value={school} onChange={(e) => setSchool(e.target.value)}
          className={FIELD_CLASS} />
      </m.div>
      <m.div variants={item}>
        <label htmlFor="tar-country" className={LABEL_CLASS}>{t('education.access.country')}</label>
        <input id="tar-country" value={country} onChange={(e) => setCountry(e.target.value)}
          className={FIELD_CLASS} />
      </m.div>
      <m.div variants={item}>
        <label htmlFor="tar-use_case" className={LABEL_CLASS}>{t('education.access.use_case')}</label>
        <textarea id="tar-use_case" required minLength={10} maxLength={800} rows={4}
          value={useCase} onChange={(e) => setUseCase(e.target.value)}
          className={FIELD_CLASS} />
        <p className={`text-xs mt-1 ${useCaseOk ? 'text-neo-lime' : 'text-neo-white'}`}>{useCase.length}/800</p>
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
