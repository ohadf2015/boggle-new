'use client';
import { useEffect, useState, useCallback } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { fetchWithAuth } from '@/utils/authFetch';
import { TeacherAccessDrawer } from './TeacherAccessDrawer';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
    const res = await fetchWithAuth(`/api/admin/teacher-access?${qs}`);
    const j = await res.json();
    setRows(j.rows || []);
    setLoading(false);
  }, [status, locale, country, page]);

  const fetchCounts = useCallback(async () => {
    const one = (s: TeacherAccessStatus | '') =>
      fetchWithAuth(`/api/admin/teacher-access?status=${s}&page=0`).then((r) => r.json()).then((j) => j.count || 0);
    const [p, a, d, total] = await Promise.all([one('pending'), one('approved'), one('declined'), one('')]);
    setCounts({ pending: p, approved: a, declined: d, total });
  }, []);

  useEffect(() => { fetchRows(); }, [fetchRows]);
  useEffect(() => { fetchCounts(); }, [fetchCounts]);

  return (
    <div className="mx-auto max-w-6xl p-6">
      <h1 className="text-3xl font-extrabold text-neo-white">{t('admin.teacherAccess.title')}</h1>
      <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
        {(['pending', 'approved', 'declined', 'total'] as const).map((k) => (
          <div key={k} className="rounded-neo border-neo border-2 bg-neo-navy-light p-3">
            <div className="text-xs uppercase text-slate-400">{t(`admin.teacherAccess.count.${k}`)}</div>
            <div className="text-3xl font-extrabold text-neo-white">{counts[k]}</div>
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm text-neo-white">
          {t('admin.teacherAccess.filter_status')}
          <Select value={status || '_all'} onValueChange={(v) => { setPage(0); setStatus((v === '_all' ? '' : v) as any); }}>
            <SelectTrigger className="h-8 w-auto rounded border-2 border-slate-600 bg-neo-navy-light p-1 text-neo-white"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">{t('admin.teacherAccess.filter_status_all')}</SelectItem>
              <SelectItem value="pending">pending</SelectItem>
              <SelectItem value="approved">approved</SelectItem>
              <SelectItem value="declined">declined</SelectItem>
            </SelectContent>
          </Select>
        </label>
        <label className="flex items-center gap-2 text-sm text-neo-white">
          {t('admin.teacherAccess.filter_locale')}
          <Select value={locale || '_all'} onValueChange={(v) => { setPage(0); setLocale(v === '_all' ? '' : v); }}>
            <SelectTrigger className="h-8 w-auto rounded border-2 border-slate-600 bg-neo-navy-light p-1 text-neo-white"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">all</SelectItem>
              {['en', 'he', 'sv', 'ja', 'es'].map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
            </SelectContent>
          </Select>
        </label>
        <input placeholder={t('admin.teacherAccess.filter_country')} value={country}
          aria-label={t('admin.teacherAccess.filter_country')}
          onChange={(e) => { setPage(0); setCountry(e.target.value); }}
          className="rounded border-2 border-slate-600 bg-neo-navy-light p-1 text-sm text-neo-white placeholder-slate-500" />
        <button type="button" onClick={() => { fetchRows(); fetchCounts(); }}
          className="ml-auto rounded bg-neo-lime px-3 py-1 text-sm font-bold text-neo-navy">
          {t('admin.teacherAccess.refresh')}
        </button>
      </div>

      {/* Mobile: card list (the table scrolls awkwardly on phones) */}
      <div className="mt-4 grid gap-2 sm:hidden">
        {loading ? (
          <div className="p-6 text-center text-slate-400">…</div>
        ) : rows.length === 0 ? (
          <div className="p-6 text-center text-slate-400">{t('admin.teacherAccess.empty', 'No requests')}</div>
        ) : (
          rows.map((r) => (
            <button
              type="button"
              key={r.id}
              onClick={() => setOpen(r)}
              className="w-full text-left rounded-neo border-2 border-slate-700 bg-neo-navy-light p-3 hover:border-neo-lime focus:outline-none focus-visible:ring-2 focus-visible:ring-neo-lime"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold text-neo-white truncate">{r.full_name}</span>
                <span className={`shrink-0 rounded px-2 py-0.5 text-xs font-bold ${
                  r.status === 'pending' ? 'bg-neo-cyan text-neo-navy' :
                  r.status === 'approved' ? 'bg-neo-lime text-neo-navy' : 'bg-neo-pink text-neo-white'
                }`}>{r.status}</span>
              </div>
              <div className="mt-1 text-sm text-slate-300 truncate">{r.email}</div>
              <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-slate-400">
                <span>{r.role}</span>
                <span>{r.locale}</span>
                {r.country && <span>{r.country}</span>}
                <span>{new Date(r.created_at).toLocaleDateString()}</span>
              </div>
            </button>
          ))
        )}
      </div>

      {/* Desktop: full table */}
      <div className="mt-4 overflow-x-auto hidden sm:block">
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
        <button type="button" disabled={page === 0} onClick={() => setPage(page - 1)} className="rounded border-2 border-slate-600 px-2 py-1 disabled:opacity-50">←</button>
        <span>{t('admin.teacherAccess.page')} {page + 1}</span>
        <button type="button" disabled={rows.length < 50} onClick={() => setPage(page + 1)} className="rounded border-2 border-slate-600 px-2 py-1 disabled:opacity-50">→</button>
        <a href={`/api/admin/teacher-access/export?${new URLSearchParams({ status, locale, country })}`}
          className="ml-auto rounded bg-neo-lime px-3 py-1 font-bold text-neo-navy">
          {t('admin.teacherAccess.export_csv')}
        </a>
      </div>

      {open && <TeacherAccessDrawer row={open} onClose={() => setOpen(null)} onActioned={() => { fetchRows(); fetchCounts(); }} />}
    </div>
  );
}
