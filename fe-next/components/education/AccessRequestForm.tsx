'use client';
import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import type { TeacherAccessFormPayload, TeacherAccessRole, TeacherLocale } from '@/lib/education/types';

const ROLES: TeacherAccessRole[] = ['teacher', 'tutor', 'admin', 'parent', 'researcher', 'other'];

export function AccessRequestForm() {
  const { t, language } = useLanguage();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [school, setSchool] = useState('');
  const [country, setCountry] = useState('');
  const [role, setRole] = useState<TeacherAccessRole>('teacher');
  const [useCase, setUseCase] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const canSubmit = fullName.length >= 2 && /\S+@\S+\.\S+/.test(email) && useCase.length >= 10 && !submitting;

  async function handleSubmit(e: React.FormEvent) {
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
  }

  if (success) {
    return (
      <div role="status" className="rounded-neo border-neo bg-neo-lime p-6 text-center">
        <h3 className="text-2xl font-bold text-neo-navy">{t('education.access.success_title')}</h3>
        <p className="mt-2 text-neo-navy/85">{t('education.access.success_body')}</p>
        <p className="mt-3 text-sm text-neo-navy/75">{t('education.access.success_next')}</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="tar-full_name" className="block text-sm font-semibold text-neo-white">{t('education.access.full_name')}</label>
        <input id="tar-full_name" required value={fullName} onChange={(e) => setFullName(e.target.value)}
          className="mt-1 w-full rounded-neo border-neo bg-neo-navy-light text-neo-white placeholder-neo-white/50 p-3" />
      </div>
      <div>
        <label htmlFor="tar-email" className="block text-sm font-semibold text-neo-white">{t('education.access.email')}</label>
        <input id="tar-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
          className="mt-1 w-full rounded-neo border-neo bg-neo-navy-light text-neo-white placeholder-neo-white/50 p-3" />
      </div>
      <div>
        <label htmlFor="tar-role" className="block text-sm font-semibold text-neo-white">{t('education.access.role')}</label>
        <select id="tar-role" value={role} onChange={(e) => setRole(e.target.value as TeacherAccessRole)}
          className="mt-1 w-full rounded-neo border-neo bg-neo-navy-light text-neo-white p-3">
          {ROLES.map((r) => <option key={r} value={r}>{t(`education.access.role_${r}`)}</option>)}
        </select>
      </div>
      <div>
        <label htmlFor="tar-school" className="block text-sm font-semibold text-neo-white">{t('education.access.school_or_org')}</label>
        <input id="tar-school" value={school} onChange={(e) => setSchool(e.target.value)}
          className="mt-1 w-full rounded-neo border-neo bg-neo-navy-light text-neo-white placeholder-neo-white/50 p-3" />
      </div>
      <div>
        <label htmlFor="tar-country" className="block text-sm font-semibold text-neo-white">{t('education.access.country')}</label>
        <input id="tar-country" value={country} onChange={(e) => setCountry(e.target.value)}
          className="mt-1 w-full rounded-neo border-neo bg-neo-navy-light text-neo-white placeholder-neo-white/50 p-3" />
      </div>
      <div>
        <label htmlFor="tar-use_case" className="block text-sm font-semibold text-neo-white">{t('education.access.use_case')}</label>
        <textarea id="tar-use_case" required minLength={10} maxLength={800} rows={4}
          value={useCase} onChange={(e) => setUseCase(e.target.value)}
          className="mt-1 w-full rounded-neo border-neo bg-neo-navy-light text-neo-white placeholder-neo-white/50 p-3" />
        <p className="text-xs text-neo-white/60 mt-1">{useCase.length}/800</p>
      </div>
      {error && <p role="alert" aria-live="polite" className="text-neo-red font-semibold">{error}</p>}
      <button type="submit" disabled={!canSubmit}
        className="w-full rounded-neo bg-neo-lime px-4 py-3 font-bold text-neo-navy shadow-hard hover:shadow-hard-sm active:shadow-hard-pressed disabled:opacity-50 transition-all">
        {submitting ? t('education.access.submitting') : t('education.access.submit')}
      </button>
    </form>
  );
}
