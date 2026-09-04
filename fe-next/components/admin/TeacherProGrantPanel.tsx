'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { fetchWithAuth } from '@/utils/authFetch';
import toast from 'react-hot-toast';
import { teacherProGift } from '@/lib/email/templates/teacherProGift';
import { PRO_GRANT_DEFAULT_DAYS, proGrantExpiry, type ProGrantStatus } from '@/lib/education/proGrant';
import type { TeacherLocale } from '@/lib/education/types';
import { Gift, Mail, RefreshCw, Ban, Eye, EyeOff } from 'lucide-react';

interface GrantRow {
  id: string;
  email: string;
  full_name: string | null;
  locale: TeacherLocale;
  days: number;
  note: string | null;
  reason: string | null;
  expires_at: string;
  applied_at: string | null;
  email_sent_at: string | null;
  welcomed_at: string | null;
  revoked_at: string | null;
  user_id: string | null;
  created_at: string;
  status: ProGrantStatus;
}

const DURATIONS = [30, 90, 180, 365, 730] as const;
const LOCALES: TeacherLocale[] = ['en', 'he', 'es', 'sv', 'ja', 'ru'];

const STATUS_TONE: Record<ProGrantStatus, string> = {
  active: 'bg-neo-lime text-black',
  pending_signup: 'bg-neo-yellow text-black',
  expired: 'bg-slate-600 text-neo-white',
  revoked: 'bg-neo-red text-neo-white',
};

/**
 * Give a specific teacher Teacher Pro, by email, for a chosen stretch of time —
 * and see the email they will get before it goes out.
 *
 * One form, one list. The form is deliberately short: address, how long, one
 * personal line. Everything else (name, locale) is inferred server-side from
 * the access request or profile, and can be overridden when it matters.
 */
export function TeacherProGrantPanel() {
  const { t, language } = useLanguage();
  const [rows, setRows] = useState<GrantRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [locale, setLocale] = useState<TeacherLocale>('en');
  const [days, setDays] = useState<number>(PRO_GRANT_DEFAULT_DAYS);
  const [note, setNote] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ status: 'active' | 'pending_signup'; emailSent: boolean; expiresAt: string; email: string } | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [listError, setListError] = useState(false);

  // No `t` in the deps: the language context hands out a fresh `t` per render,
  // and a load that re-fired on every render would hammer the API.
  const load = useCallback(async () => {
    setLoading(true);
    setListError(false);
    try {
      const res = await fetchWithAuth('/api/admin/teacher-pro');
      const j = await res.json();
      setRows(j.rows || []);
    } catch {
      setListError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const previewExpires = useMemo(() => proGrantExpiry(Date.now(), days), [days]);
  const preview = useMemo(
    () => teacherProGift({ full_name: fullName.trim() || email.split('@')[0] || 'Teacher', locale, note, expiresAt: previewExpires, pending: false }),
    [fullName, email, locale, note, previewExpires],
  );

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);
    setBusy(true);
    try {
      const res = await fetchWithAuth('/api/admin/teacher-pro', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          days,
          note: note.trim() || undefined,
          reason: reason.trim() || undefined,
          fullName: fullName.trim() || undefined,
          locale,
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j.ok) {
        const code = j.error === 'already_paid' || j.error === 'invalid_email' ? j.error : 'generic';
        setError(code === 'generic' ? `${t('admin.teacherPro.error.generic')} ${j.error || res.status}` : t(`admin.teacherPro.error.${code}`));
        return;
      }
      setResult({ status: j.status, emailSent: j.emailSent, expiresAt: j.expiresAt, email: j.email });
      toast.success(t('admin.teacherPro.result.toast'));
      setEmail(''); setFullName(''); setNote(''); setReason('');
      load();
    } catch (err) {
      setError(`${t('admin.teacherPro.error.generic')} ${err instanceof Error ? err.message : ''}`);
    } finally {
      setBusy(false);
    }
  }

  async function revoke(row: GrantRow) {
    if (!window.confirm(t('admin.teacherPro.list.revokeConfirm', { email: row.email }))) return;
    const res = await fetchWithAuth(`/api/admin/teacher-pro/${row.id}/revoke`, { method: 'POST' });
    if (res.ok) { toast.success(t('admin.teacherPro.list.revoked')); load(); }
    else toast.error(t('admin.teacherPro.error.generic'));
  }

  const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString(language === 'he' ? 'he-IL' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—');
  const inputCls = 'w-full rounded border-2 border-slate-600 bg-neo-navy p-2 text-neo-white placeholder:text-slate-500 focus:border-neo-lime focus:outline-hidden';

  return (
    <div className="mx-auto max-w-6xl p-6">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-neo border-2 border-black bg-neo-lime"><Gift className="h-5 w-5 text-black" /></span>
        <div>
          <h1 className="text-3xl font-extrabold text-neo-white">{t('admin.teacherPro.title')}</h1>
          <p className="text-sm text-slate-300">{t('admin.teacherPro.subtitle')}</p>
        </div>
      </div>

      <form onSubmit={submit} data-testid="teacher-pro-grant-form" className="mt-6 rounded-neo border-2 border-neo bg-neo-navy-light p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm text-neo-white">
            <span className="mb-1 block font-bold">{t('admin.teacherPro.form.email')}</span>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} placeholder="teacher@school.org" aria-label={t('admin.teacherPro.form.email')} />
          </label>
          <label className="block text-sm text-neo-white">
            <span className="mb-1 block font-bold">{t('admin.teacherPro.form.fullName')}</span>
            <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} className={inputCls} placeholder={t('admin.teacherPro.form.fullNameHint')} aria-label={t('admin.teacherPro.form.fullName')} />
          </label>
          <label className="block text-sm text-neo-white">
            <span className="mb-1 block font-bold">{t('admin.teacherPro.form.duration')}</span>
            <select value={days} onChange={(e) => setDays(Number(e.target.value))} className={inputCls} aria-label={t('admin.teacherPro.form.duration')}>
              {DURATIONS.map((d) => <option key={d} value={d}>{t(`admin.teacherPro.form.days.${d}`)}</option>)}
            </select>
            <span className="mt-1 block text-xs text-slate-400">{t('admin.teacherPro.form.until', { date: fmt(previewExpires) })}</span>
          </label>
          <label className="block text-sm text-neo-white">
            <span className="mb-1 block font-bold">{t('admin.teacherPro.form.locale')}</span>
            <select value={locale} onChange={(e) => setLocale(e.target.value as TeacherLocale)} className={inputCls} aria-label={t('admin.teacherPro.form.locale')}>
              {LOCALES.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
          </label>
          <label className="block text-sm text-neo-white sm:col-span-2">
            <span className="mb-1 block font-bold">{t('admin.teacherPro.form.note')}</span>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} maxLength={1000} className={inputCls} placeholder={t('admin.teacherPro.form.noteHint')} aria-label={t('admin.teacherPro.form.note')} />
          </label>
          <label className="block text-sm text-neo-white sm:col-span-2">
            <span className="mb-1 block font-bold">{t('admin.teacherPro.form.reason')}</span>
            <input type="text" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={200} className={inputCls} placeholder={t('admin.teacherPro.form.reasonHint')} aria-label={t('admin.teacherPro.form.reason')} />
          </label>
        </div>

        {error && <p role="alert" className="mt-4 rounded border-2 border-neo-red bg-neo-red/10 p-3 text-sm font-bold text-neo-red">{error}</p>}
        {result && (
          <div data-testid="teacher-pro-grant-result" className="mt-4 rounded-neo border-2 border-black bg-neo-lime p-3 text-sm font-bold text-black">
            <p>{t(`admin.teacherPro.result.${result.status}`, { email: result.email, date: fmt(result.expiresAt) })}</p>
            <p className="mt-1 flex items-center gap-1 text-xs">
              <Mail className="h-3.5 w-3.5" />
              {result.emailSent ? t('admin.teacherPro.result.emailSent') : t('admin.teacherPro.result.emailFailed')}
            </p>
          </div>
        )}

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button type="submit" disabled={busy || !email} className="rounded-neo border-2 border-black bg-neo-lime px-5 py-2.5 font-black text-black shadow-hard disabled:opacity-50">
            {busy ? t('admin.teacherPro.form.submitting') : t('admin.teacherPro.form.submit')}
          </button>
          <button type="button" onClick={() => setShowPreview((v) => !v)} className="inline-flex items-center gap-2 rounded-neo border-2 border-slate-500 px-4 py-2.5 font-bold text-neo-white">
            {showPreview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            {t('admin.teacherPro.form.preview')}
          </button>
          <span className="text-xs text-slate-400">{t('admin.teacherPro.form.help')}</span>
        </div>

        {showPreview && (
          <div className="mt-4 overflow-hidden rounded-neo border-2 border-slate-600 bg-white">
            <iframe title={t('admin.teacherPro.form.previewTitle')} srcDoc={preview.html} className="h-[640px] w-full" sandbox="" />
          </div>
        )}
      </form>

      <div className="mt-8 flex items-center justify-between">
        <h2 className="text-xl font-extrabold text-neo-white">{t('admin.teacherPro.list.title')}</h2>
        <button type="button" onClick={load} className="inline-flex items-center gap-1 text-sm text-slate-300 hover:text-neo-white"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />{t('admin.teacherPro.list.refresh')}</button>
      </div>
      <div className="mt-3 overflow-x-auto rounded-neo border-2 border-neo">
        <table className="w-full text-sm text-neo-white">
          <thead className="bg-neo-navy-light text-left text-xs uppercase text-slate-400">
            <tr>
              <th className="p-3">{t('admin.teacherPro.list.col.teacher')}</th>
              <th className="p-3">{t('admin.teacherPro.list.col.status')}</th>
              <th className="p-3">{t('admin.teacherPro.list.col.until')}</th>
              <th className="p-3">{t('admin.teacherPro.list.col.email')}</th>
              <th className="p-3">{t('admin.teacherPro.list.col.granted')}</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={6} className="p-6 text-center text-slate-400">{loading ? t('admin.teacherPro.list.loading') : listError ? t('admin.teacherPro.list.loadError') : t('admin.teacherPro.list.empty')}</td></tr>
            )}
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-slate-700">
                <td className="p-3">
                  <div className="font-bold">{r.full_name || '—'}</div>
                  <div className="text-slate-300">{r.email}</div>
                  {r.note && <div className="mt-1 max-w-xs truncate text-xs italic text-slate-400" title={r.note}>{r.note}</div>}
                </td>
                <td className="p-3"><span className={`rounded px-2 py-0.5 text-xs font-black uppercase ${STATUS_TONE[r.status]}`}>{t(`admin.teacherPro.status.${r.status}`)}</span></td>
                <td className="p-3">{fmt(r.expires_at)}<div className="text-xs text-slate-400">{t('admin.teacherPro.list.daysCount', { count: String(r.days) })}</div></td>
                <td className="p-3">{r.email_sent_at ? t('admin.teacherPro.list.sent') : t('admin.teacherPro.list.notSent')}{r.welcomed_at && <div className="text-xs text-slate-400">{t('admin.teacherPro.list.seenInApp')}</div>}</td>
                <td className="p-3">{fmt(r.created_at)}</td>
                <td className="p-3 text-right">
                  {(r.status === 'active' || r.status === 'pending_signup') && (
                    <button type="button" onClick={() => revoke(r)} className="inline-flex items-center gap-1 rounded border-2 border-neo-red px-2 py-1 text-xs font-bold text-neo-red hover:bg-neo-red/10"><Ban className="h-3 w-3" />{t('admin.teacherPro.list.revoke')}</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
