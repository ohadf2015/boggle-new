'use client';
import { useState } from 'react';
import { m, useReducedMotion, type Variants } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  SCHOOL_LEAD_ROLES,
  STUDENT_COUNT_BUCKETS,
  SCHOOL_LEAD_INTERESTS,
  type SchoolLeadRole,
  type StudentCountBucket,
  type SchoolLeadInterest,
  type SchoolLeadPayload,
} from '@/lib/education/schoolLead';
import type { TeacherLocale } from '@/lib/education/types';

const FIELD_CLASS =
  'mt-1 w-full rounded-neo border-neo bg-neo-navy text-neo-white placeholder-neo-white/40 p-3 ' +
  'transition-all duration-150 outline-none ' +
  'focus:border-neo-lime focus:shadow-hard focus:-translate-y-0.5';
const LABEL_CLASS = 'block text-sm font-semibold text-neo-white font-neo-display';

export function SchoolLeadForm() {
  const { t, language } = useLanguage();
  const shouldReduceMotion = useReducedMotion();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [school, setSchool] = useState('');
  const [role, setRole] = useState<SchoolLeadRole>('school_admin');
  const [studentCount, setStudentCount] = useState<StudentCountBucket>('200_500');
  const [interests, setInterests] = useState<SchoolLeadInterest[]>([]);
  const [country, setCountry] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const nameOk = fullName.trim().length >= 2;
  const emailOk = /\S+@\S+\.\S+/.test(email);
  const schoolOk = school.trim().length >= 2;
  const canSubmit = nameOk && emailOk && schoolOk && !submitting;

  const toggleInterest = (key: SchoolLeadInterest) =>
    setInterests((prev) => (prev.includes(key) ? prev.filter((i) => i !== key) : [...prev, key]));

  const container: Variants = {
    hidden: {},
    show: { transition: { staggerChildren: shouldReduceMotion ? 0 : 0.05 } },
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
      const res = await fetch('/api/education/school-lead', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          email,
          full_name: fullName,
          role,
          school_or_district: school,
          student_count: studentCount,
          interests,
          country: country || undefined,
          message: message || undefined,
          locale: language as TeacherLocale,
        } satisfies SchoolLeadPayload),
      });
      if (!res.ok) {
        setError(res.status === 429 ? t('education.forSchools.form.rate_limited') : t('education.forSchools.form.submit_error'));
        return;
      }
      setSuccess(true);
    } catch {
      setError(t('education.forSchools.form.submit_error'));
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
        <div className="mx-auto mb-3 text-4xl" aria-hidden="true">🎉</div>
        <h3 className="text-2xl font-bold font-neo-display">{t('education.forSchools.form.success_title')}</h3>
        <p className="mt-2 text-neo-navy/85">{t('education.forSchools.form.success_body')}</p>
      </m.div>
    );
  }

  return (
    <m.form onSubmit={handleSubmit} className="space-y-4" variants={container} initial="hidden" animate="show">
      <m.div variants={item}>
        <label htmlFor="sl-full_name" className={LABEL_CLASS}>{t('education.forSchools.form.full_name')}</label>
        <input id="sl-full_name" required value={fullName} onChange={(e) => setFullName(e.target.value)} className={FIELD_CLASS} />
      </m.div>
      <m.div variants={item}>
        <label htmlFor="sl-email" className={LABEL_CLASS}>{t('education.forSchools.form.email')}</label>
        <input id="sl-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={FIELD_CLASS} />
      </m.div>
      <m.div variants={item}>
        <label htmlFor="sl-school" className={LABEL_CLASS}>{t('education.forSchools.form.school_or_district')}</label>
        <input id="sl-school" required value={school} onChange={(e) => setSchool(e.target.value)} className={FIELD_CLASS} />
      </m.div>
      <m.div variants={item}>
        <label htmlFor="sl-role" className={LABEL_CLASS}>{t('education.forSchools.form.role')}</label>
        <select id="sl-role" value={role} onChange={(e) => setRole(e.target.value as SchoolLeadRole)} className={FIELD_CLASS}>
          {SCHOOL_LEAD_ROLES.map((r) => <option key={r} value={r}>{t(`education.forSchools.form.role_${r}`)}</option>)}
        </select>
      </m.div>
      <m.div variants={item}>
        <label htmlFor="sl-student_count" className={LABEL_CLASS}>{t('education.forSchools.form.student_count')}</label>
        <select id="sl-student_count" value={studentCount} onChange={(e) => setStudentCount(e.target.value as StudentCountBucket)} className={FIELD_CLASS}>
          {STUDENT_COUNT_BUCKETS.map((b) => <option key={b} value={b}>{t(`education.forSchools.form.count_${b}`)}</option>)}
        </select>
      </m.div>
      <m.fieldset variants={item} className="space-y-2">
        <legend className={LABEL_CLASS}>{t('education.forSchools.form.interests_legend')}</legend>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {SCHOOL_LEAD_INTERESTS.map((key) => (
            <label key={key} htmlFor={`sl-int-${key}`} className="flex cursor-pointer items-center gap-2 rounded-neo border-neo bg-neo-navy p-2 text-sm text-neo-white">
              <input
                id={`sl-int-${key}`}
                type="checkbox"
                checked={interests.includes(key)}
                onChange={() => toggleInterest(key)}
                className="h-4 w-4 accent-neo-lime"
              />
              <span>{t(`education.forSchools.form.interest_${key}`)}</span>
            </label>
          ))}
        </div>
      </m.fieldset>
      <m.div variants={item}>
        <label htmlFor="sl-country" className={LABEL_CLASS}>{t('education.forSchools.form.country')}</label>
        <input id="sl-country" value={country} onChange={(e) => setCountry(e.target.value)} className={FIELD_CLASS} />
      </m.div>
      <m.div variants={item}>
        <label htmlFor="sl-message" className={LABEL_CLASS}>{t('education.forSchools.form.message')}</label>
        <textarea id="sl-message" maxLength={800} rows={3} value={message} onChange={(e) => setMessage(e.target.value)} className={FIELD_CLASS} />
      </m.div>
      {error && <p role="alert" aria-live="polite" className="text-neo-red font-semibold">{error}</p>}
      <m.button
        type="submit"
        disabled={!canSubmit}
        variants={item}
        whileHover={canSubmit && !shouldReduceMotion ? { y: -2 } : undefined}
        whileTap={canSubmit && !shouldReduceMotion ? { y: 1 } : undefined}
        transition={{ type: 'spring', stiffness: 400, damping: 17 }}
        className="w-full rounded-neo border-neo-thick bg-neo-lime px-4 py-3 font-bold text-neo-navy font-neo-display shadow-hard hover:shadow-hard-sm active:shadow-hard-pressed disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {submitting ? t('education.forSchools.form.submitting') : t('education.forSchools.form.submit')}
      </m.button>
      <p className="text-center text-xs text-neo-white/60">{t('education.forSchools.form.privacy_note')}</p>
    </m.form>
  );
}
