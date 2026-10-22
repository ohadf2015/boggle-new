'use client';

import { useEffect, useState } from 'react';
import { Copy, Download, ExternalLink, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { getClassrooms, getClassroomStudents } from '@/lib/supabase/education/classrooms';
import { resolveDisplayName } from '@/lib/displayName';
import { downloadCsvFile } from '@/lib/education/assignmentProgressReport';
import { trackGrowthEvent } from '@/utils/growthTracking';
import { parentLinksToCsv, parentLinksToText, absoluteReportUrl, PARENT_LINK_DAYS, type ParentLink } from '@/lib/education/pro/parentLinks';
import { ParentStudentSelect, type SelectableStudent } from './ParentStudentSelect';

interface ClassOption { id: string; name: string; member_count: number }

const BTN =
  'inline-flex min-h-11 items-center justify-center gap-1.5 rounded-neo border-2 border-neo-black px-3 text-sm font-black shadow-hard-sm transition-transform hover:-translate-y-0.5 disabled:opacity-50 motion-reduce:transition-none';

type Roster = { status: 'loading' } | { status: 'error' } | { status: 'ok'; students: SelectableStudent[] };

interface ParentReportPackProps {
  /** Set when the class is already chosen (the class report): skips the class picker. */
  classroomId?: string;
}

export function ParentReportPack({ classroomId: fixedClassId }: ParentReportPackProps = {}) {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const [classes, setClasses] = useState<ClassOption[] | null>(null);
  const [hasAnyClass, setHasAnyClass] = useState(false);
  const [pickedClassId, setPickedClassId] = useState('');
  const classId = fixedClassId ?? pickedClassId;
  const [roster, setRoster] = useState<Roster>({ status: 'loading' });
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [links, setLinks] = useState<ParentLink[] | null>(null);
  const [className, setClassName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (fixedClassId || !user?.id) return;
    let live = true;
    void getClassrooms(user.id).then(({ data }) => {
      if (!live) return;
      const all = (data ?? []).map((c) => ({ id: c.id, name: c.name, member_count: c.member_count }));
      const list = all.filter((c) => c.member_count > 0);
      setHasAnyClass(all.length > 0);
      setClasses(list);
      setPickedClassId((prev) => prev || list[0]?.id || '');
    });
    return () => { live = false; };
  }, [fixedClassId, user?.id]);

  useEffect(() => {
    if (!classId) return;
    let live = true;
    setRoster({ status: 'loading' });
    setSelected(new Set());
    setLinks(null);
    void getClassroomStudents(classId).then(({ data, error: rosterError }) => {
      if (!live) return;
      if (rosterError) {
        setRoster({ status: 'error' });
        return;
      }
      setRoster({
        status: 'ok',
        students: (data ?? []).map((s, i) => ({
          id: s.student_id,
          name: resolveDisplayName([s.profiles?.display_name, s.profiles?.username], t('eg2Pro.pack.unnamed', { n: i + 1 })),
        })),
      });
    });
    return () => { live = false; };
    // `t` changing identity must not wipe the teacher's selection.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classId]);

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const nameOf = new Map(roster.status === 'ok' ? roster.students.map((s) => [s.id, s.name]) : []);
  const named = (links ?? []).map((l) => ({ ...l, name: nameOf.get(l.studentId) || l.name }));
  const urlOf = (l: ParentLink) => absoluteReportUrl(origin, language, l.path);

  const changeSelection = (next: Set<string>) => {
    setSelected(next);
    setLinks(null);
  };

  const make = async () => {
    if (!classId || busy || selected.size === 0) return;
    setBusy(true);
    setError(null);
    setLinks(null);
    try {
      const studentIds = roster.status === 'ok' ? roster.students.map((s) => s.id).filter((id) => selected.has(id)) : [...selected];
      const res = await fetch('/api/teacher/pro/parent-links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ classroomId: classId, studentIds }),
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

  const copy = async (text: string, success: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(success);
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

  const noClassPicker = !fixedClassId && classes && classes.length === 0;

  return (
    <section data-testid="parent-report-pack" className="rounded-neo border-3 border-neo-black bg-neo-cream p-4 text-neo-black shadow-hard sm:p-5">
      {fixedClassId ? (
        <p className="text-sm font-bold text-neo-black/75">{t('parentReportsFlow.lead')}</p>
      ) : (
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-neo border-2 border-neo-black bg-neo-cyan">
            <Users className="h-5 w-5" aria-hidden />
          </span>
          <div className="min-w-0">
            <h2 className="font-neo-display text-lg font-black">{t('parentReportsFlow.title')}</h2>
            <p className="text-sm font-bold text-neo-black/75">{t('parentReportsFlow.lead')}</p>
          </div>
        </div>
      )}

      {noClassPicker ? (
        hasAnyClass ? (
          <p data-testid="parent-pack-no-students" className="mt-3 text-sm font-bold">{t('eg2Polish.pack.noStudents')}</p>
        ) : (
          <p className="mt-3 text-sm font-bold">{t('eg2Pro.pack.noClasses')}</p>
        )
      ) : (
        <div className="mt-3 space-y-3">
          {!fixedClassId && (
            <select
              aria-label={t('eg2Pro.pack.pickClass')}
              value={classId}
              onChange={(e) => setPickedClassId(e.target.value)}
              className="min-h-11 w-full rounded-neo border-2 border-neo-black bg-neo-white px-3 text-sm font-bold"
            >
              {(classes ?? []).map((c) => (
                <option key={c.id} value={c.id}>{t('eg2Pro.pack.classOption', { name: c.name, count: c.member_count })}</option>
              ))}
            </select>
          )}

          {roster.status === 'error' && (
            <p role="alert" className="rounded-neo border-2 border-neo-black bg-neo-pink px-3 py-2 text-sm font-black">{t('parentReportsFlow.rosterFailed')}</p>
          )}
          {roster.status === 'loading' && classId && <p className="text-sm font-bold" role="status">{t('common.loading')}</p>}
          {roster.status === 'ok' && roster.students.length === 0 && <p className="text-sm font-bold">{t('eg2Pro.pack.emptyClass')}</p>}
          {roster.status === 'ok' && roster.students.length > 0 && (
            <>
              <ParentStudentSelect students={roster.students} selected={selected} onChange={changeSelection} />
              <button type="button" onClick={() => { void make(); }} disabled={selected.size === 0 || busy} className={`${BTN} w-full bg-neo-black text-neo-white`}>
                {busy ? t('common.loading') : t('parentReportsFlow.make', { count: selected.size })}
              </button>
            </>
          )}
        </div>
      )}

      {error && (
        <p role="alert" className="mt-3 rounded-neo border-2 border-neo-black bg-neo-pink px-3 py-2 text-sm font-black">{error}</p>
      )}

      {links && links.length === 0 && <p className="mt-3 text-sm font-bold">{t('eg2Pro.pack.emptyClass')}</p>}

      {links && links.length > 0 && (
        <div className="mt-3">
          <div className="mb-2 flex flex-wrap gap-2">
            <button type="button" onClick={() => { void copy(parentLinksToText(named, { origin, locale: language }), t('eg2Pro.pack.copied', { count: named.length })); }} className={`${BTN} bg-neo-yellow`}>
              <Copy className="h-4 w-4" aria-hidden /> {t('eg2Pro.pack.copyAll')}
            </button>
            <button type="button" onClick={csv} className={`${BTN} bg-neo-white`}>
              <Download className="h-4 w-4" aria-hidden /> {t('eg2Pro.pack.csv')}
            </button>
          </div>
          <ul className="max-h-64 space-y-1 overflow-y-auto rounded-neo border-2 border-neo-black bg-neo-white p-2">
            {named.map((l) => (
              <li key={l.studentId} data-testid="parent-pack-row" className="flex items-center gap-2 text-sm font-bold">
                <bdi className="min-w-0 flex-1 truncate" title={l.name}>{l.name}</bdi>
                <a
                  href={urlOf(l)}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={t('parentReportsFlow.previewFor', { name: l.name })}
                  className="inline-flex min-h-9 shrink-0 items-center gap-1 rounded-neo border-2 border-neo-black px-2 text-xs font-black"
                >
                  <ExternalLink className="size-3.5" aria-hidden /> {t('parentReportsFlow.preview')}
                </a>
                <button
                  type="button"
                  onClick={() => { void copy(urlOf(l), t('share.linkCopied')); }}
                  aria-label={t('parentReportsFlow.copyOneFor', { name: l.name })}
                  className="inline-flex min-h-9 shrink-0 items-center gap-1 rounded-neo border-2 border-neo-black bg-neo-cyan px-2 text-xs font-black"
                >
                  <Copy className="size-3.5" aria-hidden /> {t('parentReportsFlow.copyOne')}
                </button>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs font-bold text-neo-black/70">{t('eg2Pro.pack.expiry', { days: PARENT_LINK_DAYS })}</p>
        </div>
      )}
    </section>
  );
}
