'use client';
import { useEffect, useState, useCallback } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { fetchWithAuth } from '@/utils/authFetch';
import {
  SCHOOL_LEAD_ROLES,
  STUDENT_COUNT_BUCKETS,
  SCHOOL_LEAD_INTERESTS,
} from '@/lib/education/schoolLead';

interface SchoolLeadRow {
  id: string;
  created_at: string;
  email: string;
  full_name: string;
  role: string;
  school_or_district: string;
  student_count: string;
  interests: string[];
  country: string | null;
  message: string | null;
  locale: string;
}

const SIZE_LABEL: Record<string, string> = {
  lt_50: '<50', '50_200': '50–200', '200_500': '200–500', '500_2000': '500–2k', gte_2000: '2k+',
};

export function SchoolLeadsQueue() {
  const { t } = useLanguage();
  const [rows, setRows] = useState<SchoolLeadRow[]>([]);
  const [counts, setCounts] = useState({ total: 0, pricing: 0, large: 0 });
  const [role, setRole] = useState('');
  const [studentCount, setStudentCount] = useState('');
  const [locale, setLocale] = useState('');
  const [interest, setInterest] = useState('');
  const [page, setPage] = useState(0);
  const [open, setOpen] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const filterQs = useCallback(() => {
    const qs = new URLSearchParams();
    if (role) qs.set('role', role);
    if (studentCount) qs.set('student_count', studentCount);
    if (locale) qs.set('locale', locale);
    if (interest) qs.set('interest', interest);
    return qs;
  }, [role, studentCount, locale, interest]);

  const fetchRows = useCallback(async () => {
    setLoading(true);
    const qs = filterQs();
    qs.set('page', String(page));
    const res = await fetchWithAuth(`/api/admin/school-leads?${qs}`);
    const j = await res.json();
    setRows(j.rows || []);
    setLoading(false);
  }, [filterQs, page]);

  const fetchCounts = useCallback(async () => {
    const one = (extra: string) =>
      fetchWithAuth(`/api/admin/school-leads?${extra}&page=0`).then((r) => r.json()).then((j) => j.count || 0);
    // "Hot lead" signals: explicit pricing interest + the largest (highest-revenue) districts.
    const [total, pricing, large] = await Promise.all([
      one(''),
      one('interest=pricing_info'),
      one('student_count=gte_2000'),
    ]);
    setCounts({ total, pricing, large });
  }, []);

  useEffect(() => { fetchRows(); }, [fetchRows]);
  useEffect(() => { fetchCounts(); }, [fetchCounts]);

  return (
    <div className="mx-auto max-w-6xl p-6">
      <h1 className="text-3xl font-extrabold text-neo-white">{t('admin.schoolLeads.title')}</h1>
      <p className="mt-1 text-sm text-slate-400">{t('admin.schoolLeads.subtitle')}</p>

      <div className="mt-4 grid grid-cols-3 gap-3">
        {([['total', counts.total], ['pricing', counts.pricing], ['large', counts.large]] as const).map(([k, v]) => (
          <div key={k} className="rounded-neo border-neo border-2 bg-neo-navy-light p-3">
            <div className="text-xs uppercase text-slate-400">{t(`admin.schoolLeads.count.${k}`)}</div>
            <div className="text-3xl font-extrabold text-neo-white">{v}</div>
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <select value={role} onChange={(e) => { setPage(0); setRole(e.target.value); }}
          className="rounded border-2 border-slate-600 bg-neo-navy-light p-1 text-sm text-neo-white">
          <option value="">{t('admin.schoolLeads.filter_role_all')}</option>
          {SCHOOL_LEAD_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
        <select value={studentCount} onChange={(e) => { setPage(0); setStudentCount(e.target.value); }}
          className="rounded border-2 border-slate-600 bg-neo-navy-light p-1 text-sm text-neo-white">
          <option value="">{t('admin.schoolLeads.filter_size_all')}</option>
          {STUDENT_COUNT_BUCKETS.map((b) => <option key={b} value={b}>{SIZE_LABEL[b]}</option>)}
        </select>
        <select value={interest} onChange={(e) => { setPage(0); setInterest(e.target.value); }}
          className="rounded border-2 border-slate-600 bg-neo-navy-light p-1 text-sm text-neo-white">
          <option value="">{t('admin.schoolLeads.filter_interest_all')}</option>
          {SCHOOL_LEAD_INTERESTS.map((i) => <option key={i} value={i}>{i}</option>)}
        </select>
        <select value={locale} onChange={(e) => { setPage(0); setLocale(e.target.value); }}
          className="rounded border-2 border-slate-600 bg-neo-navy-light p-1 text-sm text-neo-white">
          <option value="">all</option>
          {['en', 'he', 'sv', 'ja', 'es'].map((l) => <option key={l} value={l}>{l}</option>)}
        </select>
        <button type="button" onClick={() => { fetchRows(); fetchCounts(); }}
          className="ml-auto rounded bg-neo-lime px-3 py-1 text-sm font-bold text-neo-navy">
          {t('admin.schoolLeads.refresh')}
        </button>
      </div>

      {/* Mobile cards */}
      <div className="mt-4 grid gap-2 sm:hidden">
        {loading ? <div className="p-6 text-center text-slate-400">…</div>
          : rows.length === 0 ? <div className="p-6 text-center text-slate-400">{t('admin.schoolLeads.empty')}</div>
          : rows.map((r) => (
            <button type="button" key={r.id} onClick={() => setOpen(open === r.id ? null : r.id)}
              className="w-full text-left rounded-neo border-2 border-slate-700 bg-neo-navy-light p-3 hover:border-neo-lime">
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold text-neo-white truncate">{r.school_or_district}</span>
                <span className="shrink-0 rounded bg-neo-cyan px-2 py-0.5 text-xs font-bold text-neo-navy">{SIZE_LABEL[r.student_count]}</span>
              </div>
              <div className="mt-1 text-sm text-slate-300 truncate">{r.full_name} · {r.email}</div>
              <div className="mt-1 flex flex-wrap gap-1">
                {r.interests?.map((i) => <span key={i} className="rounded bg-neo-navy px-1.5 py-0.5 text-[10px] text-neo-lime">{i}</span>)}
              </div>
              {open === r.id && r.message && <p className="mt-2 text-xs text-slate-300">{r.message}</p>}
            </button>
          ))}
      </div>

      {/* Desktop table */}
      <div className="mt-4 overflow-x-auto hidden sm:block">
        <table className="w-full text-sm text-neo-white">
          <thead><tr className="border-b-2 border-slate-600 text-left">
            <th className="p-2">{t('admin.schoolLeads.col.date')}</th>
            <th className="p-2">{t('admin.schoolLeads.col.school')}</th>
            <th className="p-2">{t('admin.schoolLeads.col.contact')}</th>
            <th className="p-2">{t('admin.schoolLeads.col.role')}</th>
            <th className="p-2">{t('admin.schoolLeads.col.size')}</th>
            <th className="p-2">{t('admin.schoolLeads.col.interests')}</th>
            <th className="p-2">{t('admin.schoolLeads.col.country')}</th>
          </tr></thead>
          <tbody>
            {loading ? <tr><td colSpan={7} className="p-6 text-center">…</td></tr>
              : rows.length === 0 ? <tr><td colSpan={7} className="p-6 text-center text-slate-400">{t('admin.schoolLeads.empty')}</td></tr>
              : rows.map((r) => (
                <tr key={r.id} onClick={() => setOpen(open === r.id ? null : r.id)}
                  className="cursor-pointer hover:bg-neo-navy-light border-b border-slate-700 align-top">
                  <td className="p-2 whitespace-nowrap">{new Date(r.created_at).toLocaleDateString()}</td>
                  <td className="p-2 font-semibold">{r.school_or_district}</td>
                  <td className="p-2">
                    <div>{r.full_name}</div>
                    <div className="text-xs text-slate-400">{r.email}</div>
                    {open === r.id && r.message && <div className="mt-1 max-w-xs text-xs text-slate-300">{r.message}</div>}
                  </td>
                  <td className="p-2">{r.role}</td>
                  <td className="p-2">
                    <span className={`rounded px-2 py-0.5 text-xs font-bold ${
                      r.student_count === 'gte_2000' || r.student_count === '500_2000' ? 'bg-neo-lime text-neo-navy' : 'bg-neo-cyan text-neo-navy'
                    }`}>{SIZE_LABEL[r.student_count]}</span>
                  </td>
                  <td className="p-2">
                    <div className="flex flex-wrap gap-1">
                      {r.interests?.map((i) => (
                        <span key={i} className={`rounded px-1.5 py-0.5 text-[10px] ${i === 'pricing_info' ? 'bg-neo-pink text-neo-white' : 'bg-neo-navy text-neo-lime'}`}>{i}</span>
                      ))}
                    </div>
                  </td>
                  <td className="p-2">{r.country || '—'}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center gap-2 text-sm text-neo-white">
        <button type="button" disabled={page === 0} onClick={() => setPage(page - 1)} className="rounded border-2 border-slate-600 px-2 py-1 disabled:opacity-50">←</button>
        <span>{t('admin.schoolLeads.page')} {page + 1}</span>
        <button type="button" disabled={rows.length < 50} onClick={() => setPage(page + 1)} className="rounded border-2 border-slate-600 px-2 py-1 disabled:opacity-50">→</button>
        <a href={`/api/admin/school-leads/export?${filterQs()}`}
          className="ml-auto rounded bg-neo-lime px-3 py-1 font-bold text-neo-navy">
          {t('admin.schoolLeads.export_csv')}
        </a>
      </div>
    </div>
  );
}
