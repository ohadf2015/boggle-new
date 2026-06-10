'use client';
import { useState, useRef, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { fetchWithAuth } from '@/utils/authFetch';
import toast from 'react-hot-toast';
import type { TeacherAccessRequest } from '@/lib/education/types';

interface Props { row: TeacherAccessRequest; onClose: () => void; onActioned: () => void; }

export function TeacherAccessDrawer({ row, onClose, onActioned }: Props) {
  const { t } = useLanguage();
  const [note, setNote] = useState(row.admin_note || '');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    }
    dialog?.addEventListener('keydown', handleKeyDown);
    return () => {
      dialog?.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  async function act(kind: 'approve' | 'decline') {
    setErr(null);
    setBusy(true);
    try {
      const res = await fetchWithAuth(`/api/admin/teacher-access/${row.id}/${kind}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: kind === 'decline' ? JSON.stringify({ reason: note }) : undefined,
      });
      if (!res.ok) throw new Error(await res.text());
      toast.success(t(`admin.teacherAccess.${kind}Success`));
      onActioned();
      onClose();
    } catch (e: any) {
      const errorMsg = t(`admin.teacherAccess.${kind}Error`);
      setErr(errorMsg);
      toast.error(errorMsg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div ref={dialogRef} className="fixed inset-0 z-50 flex items-stretch justify-end bg-black/40" role="dialog" aria-labelledby="tar-drawer-title">
      <div className="w-full max-w-xl bg-neo-white p-6 shadow-2xl overflow-y-auto">
        <button onClick={onClose} className="text-sm text-slate-500 underline">{t('admin.teacherAccess.close')}</button>
        <h2 id="tar-drawer-title" className="mt-2 text-2xl font-bold text-neo-navy">{t('admin.teacherAccess.drawer_title')}</h2>
        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <dt className="font-semibold">{t('admin.teacherAccess.field.name')}</dt><dd>{row.full_name}</dd>
          <dt className="font-semibold">{t('admin.teacherAccess.field.email')}</dt><dd>{row.email}</dd>
          <dt className="font-semibold">{t('admin.teacherAccess.field.role')}</dt><dd>{row.role}</dd>
          <dt className="font-semibold">{t('admin.teacherAccess.field.locale')}</dt><dd>{row.locale}</dd>
          <dt className="font-semibold">{t('admin.teacherAccess.field.country')}</dt><dd>{row.country || '—'}</dd>
          <dt className="font-semibold">{t('admin.teacherAccess.field.school')}</dt><dd>{row.school_or_org || '—'}</dd>
          <dt className="font-semibold">{t('admin.teacherAccess.field.status')}</dt><dd>{row.status}</dd>
          <dt className="font-semibold">{t('admin.teacherAccess.field.submitted')}</dt><dd>{new Date(row.created_at).toLocaleString()}</dd>
        </dl>
        <div className="mt-4">
          <h3 className="font-semibold">{t('admin.teacherAccess.field.use_case')}</h3>
          <p className="mt-1 whitespace-pre-wrap rounded bg-slate-100 p-3 text-sm text-neo-navy">{row.use_case}</p>
        </div>
        <div className="mt-4">
          <label htmlFor="admin-note" className="font-semibold">{t('admin.teacherAccess.admin_note')}</label>
          <textarea id="admin-note" rows={3} value={note} onChange={(e) => setNote(e.target.value)}
            className="mt-1 w-full rounded border-2 border-slate-300 p-2 text-sm" />
        </div>
        {err && <p role="alert" className="mt-3 text-neo-red">{err}</p>}
        {row.status === 'pending' && (
          <div className="mt-4 flex gap-3">
            <button disabled={busy} onClick={() => act('approve')}
              className="flex-1 rounded-lg bg-neo-lime px-4 py-3 font-bold text-neo-navy disabled:opacity-50">
              {t('admin.teacherAccess.approve')}
            </button>
            <button disabled={busy} onClick={() => act('decline')}
              className="flex-1 rounded-lg bg-neo-pink px-4 py-3 font-bold text-neo-white disabled:opacity-50">
              {t('admin.teacherAccess.decline')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
