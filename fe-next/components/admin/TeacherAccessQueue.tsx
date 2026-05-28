'use client';
import { useEffect, useState, useCallback } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { TeacherAccessDrawer } from './TeacherAccessDrawer';
import type { TeacherAccessRequest, TeacherAccessStatus } from '@/lib/education/types';

export function TeacherAccessQueue() {
  const { t } = useLanguage();
  const [rows, setRows] = useState<TeacherAccessRequest[]>([]);
  const [counts, setCounts] = useState({ pending: 0, approved: 0, declined: 0, total: 0 });
  const [status, setStatus] = useState<TeacherAccessStatus | ''>('');
  const [locale, setLocale] = useState('');
  const [country, setCountry] = useState('');
  const [page, setPage] = useState(0);
  const [open, setOpen] = useState<TeacherAccessRequest | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchRows = useCallback(async () => {
    setLoading(true);
    const qs = new URLSearchParams();
    if (status) qs.set('status', status);
    if (locale) qs.set('locale', locale);
    if (country) qs.set('country', country);
    qs.set('page', String(page));
    const res = await fetch(`/api/admin/teacher-access?${qs}`);
    const j = await res.json();
    setRows(j.rows || []);
    setLoading(false);
  }, [status, locale, country, page]);

  const fetchCounts = useCallback(async () => {
    const one = (s: TeacherAccessStatus | '') =>
      fetch(`/api/admin/teacher-access?status=${s}&page=0`).then((r) => r.json()).then((j) => j.count || 0);
    const [p, a, d, total] = await Promise.all([one('pending'), one('approved'), one('declined'), one('')]);
    setCounts({ pending: p, approved: a, declined: d, total });
  }, []);

  useEffect(() => { fetchRows(); }, [fetchRows]);
  useEffect(() => { fetchCounts(); }, [fetchCounts]);

  return (
    <div className="mx-auto max-w-6xl p-6">
      <h1 className="text-3xl font-extrabold text-neo-white">{t('admin.teacherAccess.title')}</h1>
      <div className="mt-4 grid grid-cols-4 gap-3">
        {(['pending', 'approved', 'declined', 'total'] as const).map((k) => (
          <div key={k} className="rounded-neo border-neo border-2 bg-neo-navy-light p-3">
            <div className="text-xs uppercase text-slate-400">{t(`admin.teacherAccess.count.${k}`)}</div>
            <div className="text-3xl font-extrabold text-neo-white">{counts[k]}</div>
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <label className="text-sm text-neo-white">
          {t('admin.teacherAccess.filter_status')}
          <select value={status} onChange={(e) => { setPage(0); setStatus(e.target.value as any); }}
            className="ml-2 rounded border-2 border-slate-600 bg-neo-navy-light p-1 text-neo-white">
            <option value="">{t('admin.teacherAccess.filter_status_all')}</option>
            <option value="pending">pending</option>
            <option value="approved">approved</option>
            <option value="declined">declined</option>
          </select>
        </label>
        <label className="text-sm text-neo-white">
          {t('admin.teacherAccess.filter_locale')}
          <select value={locale} onChange={(e) => { setPage(0); setLocale(e.target.value); }}
            className="ml-2 rounded border-2 border-slate-600 bg-neo-navy-light p-1 text-neo-white">
            <option value="">all</option>
            {['en', 'he', 'sv', 'ja', 'es'].map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
        </label>
        <input placeholder={t('admin.teacherAccess.filter_country')} value={country}
          onChange={(e) => { setPage(0); setCountry(e.target.value); }}
          className="rounded border-2 border-slate-600 bg-neo-navy-light p-1 text-sm text-neo-white placeholder-slate-500" />
        <button onClick={() => { fetchRows(); fetchCounts(); }}
          className="ml-auto rounded bg-neo-lime px-3 py-1 text-sm font-bold text-neo-navy">
          {t('admin.teacherAccess.refresh')}
        </button>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-sm text-neo-white">
          <thead><tr className="border-b-2 border-slate-600 text-left">
            <th className="p-2">{t('admin.teacherAccess.col.name')}</th>
            <th className="p-2">{t('admin.teacherAccess.col.email')}</th>
            <th className="p-2">{t('admin.teacherAccess.col.role')}</th>
            <th className="p-2">{t('admin.teacherAccess.col.locale')}</th>
            <th className="p-2">{t('admin.teacherAccess.col.country')}</th>
            <th className="p-2">{t('admin.teacherAccess.col.status')}</th>
            <th className="p-2">{t('admin.teacherAccess.col.submitted')}</th>
          </tr></thead>
          <tbody>
            {loading ? <tr><td colSpan={7} className="p-6 text-center">…</td></tr> :
              rows.map((r) => (
                <tr
                  key={r.id}
                  onClick={() => setOpen(r)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setOpen(r);
                    }
                  }}
                  tabIndex={0}
                  role="button"
                  aria-label={t('admin.teacherAccess.row_open').replace('{name}', r.full_name)}
                  className="cursor-pointer hover:bg-neo-navy-light border-b border-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-neo-lime focus-visible:ring-inset"
                >
                  <td className="p-2">{r.full_name}</td>
                  <td className="p-2">{r.email}</td>
                  <td className="p-2">{r.role}</td>
                  <td className="p-2">{r.locale}</td>
                  <td className="p-2">{r.country || '—'}</td>
                  <td className="p-2">
                    <span className={`rounded px-2 py-0.5 text-xs font-bold ${
                      r.status === 'pending' ? 'bg-neo-cyan text-neo-navy' :
                      r.status === 'approved' ? 'bg-neo-lime text-neo-navy' : 'bg-neo-pink text-neo-white'
                    }`}>{r.status}</span>
                  </td>
                  <td className="p-2">{new Date(r.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center gap-2 text-sm text-neo-white">
        <button disabled={page === 0} onClick={() => setPage(page - 1)} className="rounded border-2 border-slate-600 px-2 py-1 disabled:opacity-50">←</button>
        <span>{t('admin.teacherAccess.page')} {page + 1}</span>
        <button disabled={rows.length < 50} onClick={() => setPage(page + 1)} className="rounded border-2 border-slate-600 px-2 py-1 disabled:opacity-50">→</button>
        <a href={`/api/admin/teacher-access/export?${new URLSearchParams({ status, locale, country })}`}
          className="ml-auto rounded bg-neo-lime px-3 py-1 font-bold text-neo-navy">
          {t('admin.teacherAccess.export_csv')}
        </a>
      </div>

      {open && <TeacherAccessDrawer row={open} onClose={() => setOpen(null)} onActioned={() => { fetchRows(); fetchCounts(); }} />}
    </div>
  );
}
