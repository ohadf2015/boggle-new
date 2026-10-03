'use client';

import { useEffect, useState } from 'react';
import { Copy, Download, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { getClassrooms } from '@/lib/supabase/education/classrooms';
import { downloadCsvFile } from '@/lib/education/assignmentProgressReport';
import { trackGrowthEvent } from '@/utils/growthTracking';
import { parentLinksToCsv, parentLinksToText, absoluteReportUrl, PARENT_LINK_DAYS, type ParentLink } from '@/lib/education/pro/parentLinks';

interface ClassOption { id: string; name: string; member_count: number }

const BTN =
  'inline-flex min-h-11 items-center justify-center gap-1.5 rounded-neo border-2 border-neo-black px-3 text-sm font-black shadow-hard-sm transition-transform hover:-translate-y-0.5 disabled:opacity-50 motion-reduce:transition-none';

export function ParentReportPack() {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const [classes, setClasses] = useState<ClassOption[] | null>(null);
  const [hasAnyClass, setHasAnyClass] = useState(false);
  const [classId, setClassId] = useState('');
  const [links, setLinks] = useState<ParentLink[] | null>(null);
  const [className, setClassName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    let live = true;
    void getClassrooms(user.id).then(({ data }) => {
      if (!live) return;
      const all = (data ?? []).map((c) => ({ id: c.id, name: c.name, member_count: c.member_count }));
      const list = all.filter((c) => c.member_count > 0);
      setHasAnyClass(all.length > 0);
      setClasses(list);
      setClassId((prev) => prev || list[0]?.id || '');
    });
    return () => { live = false; };
  }, [user?.id]);

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const named = (links ?? []).map((l, i) => ({ ...l, name: l.name || t('eg2Pro.pack.unnamed', { n: i + 1 }) }));

  const make = async () => {
    if (!classId || busy) return;
    setBusy(true);
    setError(null);
    setLinks(null);
    try {
      const res = await fetch('/api/teacher/pro/parent-links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ classroomId: classId }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok || !body?.ok) {
        setError(t(res.status === 402 ? 'eg2Pro.pack.needsPro' : 'eg2Pro.pack.failed'));
        return;
      }
      setLinks(body.links as ParentLink[]);
      setClassName(String(body.classroomName ?? ''));
      trackGrowthEvent('landing_cta_clicked', { cta: 'parent_pack_made', source: 'teacher_pro', count: body.links.length });
    } catch {
      setError(t('eg2Pro.pack.failed'));
    } finally {
      setBusy(false);
    }
  };

  const copyAll = async () => {
    try {
      await navigator.clipboard.writeText(parentLinksToText(named, { origin, locale: language }));
      toast.success(t('eg2Pro.pack.copied', { count: named.length }));
    } catch {
      toast.error(t('eg2Pro.ask.copyFailed'));
    }
  };

  const csv = () => {
    downloadCsvFile(
      t('eg2Pro.pack.fileName', { className: className || '' }),
      parentLinksToCsv(named, { origin, locale: language, studentHeader: t('eg2Pro.pack.colStudent'), linkHeader: t('eg2Pro.pack.colLink') }),
    );
  };

  return (
    <section data-testid="parent-report-pack" className="rounded-neo border-3 border-neo-black bg-neo-cream p-4 text-neo-black shadow-hard sm:p-5">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-neo border-2 border-neo-black bg-neo-cyan">
          <Users className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0">
          <h2 className="font-neo-display text-lg font-black">{t('eg2Pro.pack.title')}</h2>
          <p className="text-sm font-bold text-neo-black/75">{t('eg2Pro.pack.lead')}</p>
        </div>
      </div>

      {classes && classes.length === 0 ? (
        hasAnyClass ? (
          <p data-testid="parent-pack-no-students" className="mt-3 text-sm font-bold">{t('eg2Polish.pack.noStudents')}</p>
        ) : (
          <p className="mt-3 text-sm font-bold">{t('eg2Pro.pack.noClasses')}</p>
        )
      ) : (
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <label className="flex-1 text-xs font-black uppercase tracking-wide">
            <span className="sr-only">{t('eg2Pro.pack.pickClass')}</span>
            <select
              aria-label={t('eg2Pro.pack.pickClass')}
              value={classId}
              onChange={(e) => { setClassId(e.target.value); setLinks(null); }}
              className="min-h-11 w-full rounded-neo border-2 border-neo-black bg-neo-white px-3 text-sm font-bold"
            >
              {(classes ?? []).map((c) => (
                <option key={c.id} value={c.id}>{t('eg2Pro.pack.classOption', { name: c.name, count: c.member_count })}</option>
              ))}
            </select>
          </label>
          <button type="button" onClick={() => { void make(); }} disabled={!classId || busy} className={`${BTN} bg-neo-black text-neo-white`}>
            {busy ? t('common.loading') : t('eg2Pro.pack.make')}
          </button>
        </div>
      )}

      {error && (
        <p role="alert" className="mt-3 rounded-neo border-2 border-neo-black bg-neo-pink px-3 py-2 text-sm font-black">{error}</p>
      )}

      {links && links.length === 0 && <p className="mt-3 text-sm font-bold">{t('eg2Pro.pack.emptyClass')}</p>}

      {links && links.length > 0 && (
        <div className="mt-3">
          <div className="mb-2 flex flex-wrap gap-2">
            <button type="button" onClick={() => { void copyAll(); }} className={`${BTN} bg-neo-yellow`}>
              <Copy className="h-4 w-4" aria-hidden /> {t('eg2Pro.pack.copyAll')}
            </button>
            <button type="button" onClick={csv} className={`${BTN} bg-neo-white`}>
              <Download className="h-4 w-4" aria-hidden /> {t('eg2Pro.pack.csv')}
            </button>
          </div>
          <ul className="max-h-56 space-y-1 overflow-y-auto rounded-neo border-2 border-neo-black bg-neo-white p-2">
            {named.map((l) => (
              <li key={l.studentId} data-testid="parent-pack-row" className="flex items-center justify-between gap-2 text-sm font-bold">
                <span className="truncate">{l.name}</span>
                <a
                  href={absoluteReportUrl(origin, language, l.path)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 text-xs font-black text-neo-black underline"
                >
                  {t('eg2Pro.pack.open')}
                </a>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs font-bold text-neo-black/70">{t('eg2Pro.pack.expiry', { days: PARENT_LINK_DAYS })}</p>
        </div>
      )}
    </section>
  );
}
