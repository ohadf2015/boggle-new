'use client';
import { useState, useEffect } from 'react';
import { m, useReducedMotion, type Variants } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { trackGrowthEvent } from '@/utils/growthTracking';
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
import { packageById, type EducationLeadPlan } from '@/lib/education/educationPackages';
import { clampTeachers, MAX_QUOTE_TEACHERS, studentBucketForTeachers } from '@/lib/education/pro/schoolQuote';
import { trackSchoolQuoteRequested } from '@/lib/education/proFunnelTelemetry';

const FIELD_CLASS =
  'mt-1 w-full rounded-neo border-neo border-neo-cream/40 bg-neo-navy text-neo-white placeholder-neo-white/40 p-3 ' +
  'transition-all duration-150 outline-none ' +
  'focus:border-neo-lime focus:shadow-hard focus:-translate-y-0.5';
const LABEL_CLASS = 'block text-sm font-semibold text-neo-white font-neo-display';

const LEAD_LOCALES: readonly TeacherLocale[] = ['en', 'he', 'sv', 'ja', 'es'];

export function SchoolLeadForm({
  plan = 'school',
  surface,
  page,
}: {
  plan?: EducationLeadPlan;
  surface?: string;
  /** Pathname used for school_quote_requested analytics. */
  page?: string;
}) {
  const { t, language } = useLanguage();
  // school_leads.locale has a CHECK on these five; ru answers 400 without the fallback.
  const leadLocale: TeacherLocale = LEAD_LOCALES.includes(language as TeacherLocale) ? (language as TeacherLocale) : 'en';
  const shouldReduceMotion = useReducedMotion();
  // Always school tier — classroom $39/term was retired 2026-10-06.
  const resolvedPlan: EducationLeadPlan = 'school';
  const pkg = packageById('school');
  void plan; // callers may still pass plan; UI is school-only

  useEffect(() => {
    trackGrowthEvent('school_lead_form_viewed', {
      locale: language,
      plan: resolvedPlan,
      ...(surface ? { surface } : {}),
    });
  }, [language, resolvedPlan, surface]);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [school, setSchool] = useState('');
  const [role, setRole] = useState<SchoolLeadRole>('school_admin');
  const [teachers, setTeachers] = useState('5');
  const [studentCount, setStudentCount] = useState<StudentCountBucket>('200_500');
  const [interests, setInterests] = useState<SchoolLeadInterest[]>(['pricing_info']);
  const [country, setCountry] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const teacherCount = clampTeachers(Number(teachers));
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
      const teachersLine = `School quote request: ${teacherCount} teacher${teacherCount === 1 ? '' : 's'}.`;
      const combinedMessage = [teachersLine, message.trim()].filter(Boolean).join('\n').slice(0, 800);
      // Prefer student bucket derived from teachers when the user entered a head count.
      const derivedBucket = teachers.trim() === '' ? studentCount : studentBucketForTeachers(teacherCount);
      const res = await fetch('/api/education/school-lead', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          email,
          full_name: fullName,
          role,
          school_or_district: school,
          student_count: derivedBucket,
          interests,
          country: country || undefined,
          message: combinedMessage || undefined,
          locale: leadLocale,
          source: pkg.leadSource,
        } satisfies SchoolLeadPayload),
      });
      if (!res.ok) {
        setError(res.status === 429 ? t('education.forSchools.form.rate_limited') : t('education.forSchools.form.submit_error'));
        return;
      }
      setSuccess(true);
      const pagePath =
        page ||
        (typeof window !== 'undefined' ? window.location.pathname : '/education/for-schools');
      trackGrowthEvent('school_lead_submitted', {
        role,
        student_count: derivedBucket,
        locale: language,
        plan: resolvedPlan,
        teachers: teacherCount,
        ...(surface ? { surface } : {}),
      });
      try {
        trackSchoolQuoteRequested({ page: pagePath, locale: language, teachers: teacherCount });
      } catch {
        /* analytics must never block */
      }
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
        <Select value={role} onValueChange={(v) => setRole(v as SchoolLeadRole)}>
          <SelectTrigger id="sl-role" className={FIELD_CLASS}><SelectValue /></SelectTrigger>
          <SelectContent>
            {SCHOOL_LEAD_ROLES.map((r) => <SelectItem key={r} value={r}>{t(`education.forSchools.form.role_${r}`)}</SelectItem>)}
          </SelectContent>
        </Select>
      </m.div>
      <m.div variants={item}>
        <label htmlFor="sl-teachers" className={LABEL_CLASS}>{t('education.forSchools.form.teachers')}</label>
        <input
          id="sl-teachers"
          type="number"
          inputMode="numeric"
          min={1}
          max={MAX_QUOTE_TEACHERS}
          value={teachers}
          onChange={(e) => setTeachers(e.target.value)}
          className={FIELD_CLASS}
        />
      </m.div>
      <m.div variants={item}>
        <label htmlFor="sl-student_count" className={LABEL_CLASS}>
          {t('education.forSchools.form.student_count')}
        </label>
        <Select value={studentCount} onValueChange={(v) => setStudentCount(v as StudentCountBucket)}>
          <SelectTrigger id="sl-student_count" className={FIELD_CLASS}><SelectValue /></SelectTrigger>
          <SelectContent>
            {STUDENT_COUNT_BUCKETS.map((b) => <SelectItem key={b} value={b}>{t(`education.forSchools.form.count_${b}`)}</SelectItem>)}
          </SelectContent>
        </Select>
      </m.div>
      <m.fieldset variants={item} className="space-y-2">
        <legend className={LABEL_CLASS}>{t('education.forSchools.form.interests_legend')}</legend>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {SCHOOL_LEAD_INTERESTS.map((key) => (
            <label key={key} htmlFor={`sl-int-${key}`} className="flex cursor-pointer items-center gap-2 rounded-neo border-neo border-neo-cream/40 bg-neo-navy p-2 text-sm text-neo-white">
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
        <Textarea id="sl-message" maxLength={800} rows={3} value={message} onChange={(e) => setMessage(e.target.value)} className={FIELD_CLASS} />
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
