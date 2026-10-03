'use client';

import { useState } from 'react';
import { CheckCircle2, Send } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { trackGrowthEvent } from '@/utils/growthTracking';
import { SCHOOL_LEAD_ROLES, type SchoolLeadRole } from '@/lib/education/schoolLead';
import { estimateSchoolAnnualUsd } from '@/lib/education/pro/schoolPricing';
import { buildSchoolQuotePayload, schoolQuoteErrorKey, clampTeachers, MAX_QUOTE_TEACHERS } from '@/lib/education/pro/schoolQuote';

const FIELD =
  'mt-1 w-full rounded-neo border-2 border-neo-black bg-neo-white px-3 py-2 text-sm font-bold text-neo-black outline-none focus:shadow-hard-sm focus-visible:ring-2 focus-visible:ring-neo-cyan';
const LABEL = 'block text-xs font-black uppercase tracking-wide text-neo-black/80';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function SchoolQuoteForm({ requester }: { requester: string }) {
  const { t, language } = useLanguage();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [school, setSchool] = useState('');
  const [role, setRole] = useState<SchoolLeadRole>(requester ? 'school_admin' : 'teacher');
  const [teachers, setTeachers] = useState('5');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);

  const teacherCount = clampTeachers(Number(teachers));
  const annualEstimate = teachers.trim() === '' ? null : estimateSchoolAnnualUsd(teacherCount);

  const canSubmit =
    fullName.trim().length >= 2 && EMAIL_RE.test(email.trim()) && school.trim().length >= 2 && !submitting;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    const payload = buildSchoolQuotePayload({
      fullName,
      email,
      school,
      role,
      teachers: teacherCount,
      message,
      requester,
      locale: language,
    });
    try {
      const res = await fetch('/api/education/school-lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        setError(t(schoolQuoteErrorKey(res.status)));
        return;
      }
      trackGrowthEvent('school_lead_submitted', {
        role,
        student_count: payload.student_count,
        locale: language,
        plan: 'teacher-upgrade',
      });
      setSentTo(payload.email);
    } catch {
      setError(t('eg2Pro.school.errorGeneric'));
    } finally {
      setSubmitting(false);
    }
  };

  if (sentTo) {
    return (
      <div
        data-testid="school-quote-success"
        role="status"
        className="rounded-neo border-3 border-neo-black bg-neo-lime p-5 text-neo-black shadow-hard"
      >
        <CheckCircle2 className="mb-2 h-7 w-7" aria-hidden />
        <p className="font-neo-display text-xl font-black">{t('eg2Pro.school.successTitle')}</p>
        <p className="mt-1 text-sm font-bold">{t('eg2Pro.school.successBody', { email: sentTo })}</p>
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      noValidate
      className="rounded-neo border-3 border-neo-black bg-neo-cream p-4 text-neo-black shadow-hard sm:p-5"
    >
      {requester && (
        <p
          data-testid="school-quote-requester"
          className="mb-3 rounded-neo border-2 border-neo-black bg-neo-yellow px-3 py-2 text-sm font-black"
        >
          {t('eg2Pro.school.requesterBanner', { name: requester })}
        </p>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <label className={LABEL}>
          {t('eg2Pro.school.fieldName')}
          <input className={FIELD} value={fullName} onChange={(e) => setFullName(e.target.value)} autoComplete="name" maxLength={120} />
        </label>
        <label className={LABEL}>
          {t('eg2Pro.school.fieldEmail')}
          <input className={FIELD} type="email" dir="ltr" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" maxLength={254} />
        </label>
        <label className={LABEL}>
          {t('eg2Pro.school.fieldSchool')}
          <input className={FIELD} value={school} onChange={(e) => setSchool(e.target.value)} autoComplete="organization" maxLength={200} />
        </label>
        <label className={LABEL}>
          {t('eg2Pro.school.fieldRole')}
          <select className={FIELD} value={role} onChange={(e) => setRole(e.target.value as SchoolLeadRole)}>
            {SCHOOL_LEAD_ROLES.map((r) => (
              <option key={r} value={r}>{t(`eg2Pro.school.roles.${r}`)}</option>
            ))}
          </select>
        </label>
        <label className={LABEL}>
          {t('eg2Pro.school.fieldTeachers')}
          <input
            className={FIELD}
            type="number"
            inputMode="numeric"
            min={1}
            max={MAX_QUOTE_TEACHERS}
            value={teachers}
            onChange={(e) => setTeachers(e.target.value)}
          />
        </label>
        {annualEstimate !== null && (
          <p data-testid="school-quote-estimate" className="self-end rounded-neo border-2 border-neo-black bg-neo-yellow px-3 py-2 text-sm font-black">
            {t('eg2Pro.school.estimate', { teachers: teacherCount, total: `\u2066$${annualEstimate}\u2069` })}
          </p>
        )}
        <label className={`${LABEL} sm:col-span-2`}>
          {t('eg2Pro.school.fieldMessage')}
          <textarea
            className={`${FIELD} min-h-[72px] resize-y`}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            maxLength={600}
            placeholder={t('eg2Pro.school.messagePlaceholder')}
          />
        </label>
      </div>
      {error && (
        <p role="alert" className="mt-3 rounded-neo border-2 border-neo-black bg-neo-pink px-3 py-2 text-sm font-black">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={!canSubmit}
        className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-neo border-3 border-neo-black bg-neo-black px-5 font-neo-display text-base font-black text-neo-white shadow-hard transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 motion-reduce:transition-none"
      >
        <Send className="h-4 w-4" aria-hidden />
        {submitting ? t('common.loading') : t('eg2Pro.school.submit')}
      </button>
      <p className="mt-2 text-center text-xs font-bold text-neo-black/70">{t('eg2Pro.school.privacyNote')}</p>
    </form>
  );
}
