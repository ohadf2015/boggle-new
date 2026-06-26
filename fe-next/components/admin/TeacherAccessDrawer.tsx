'use client';
import { useState, useRef, useEffect, useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { fetchWithAuth } from '@/utils/authFetch';
import toast from 'react-hot-toast';
import type { TeacherAccessRequest } from '@/lib/education/types';
import { teacherAccessConfirmation } from '@/lib/email/templates/teacherAccessConfirmation';
import { teacherTrialExpiry } from '@/lib/education/trial';

interface Props { row: TeacherAccessRequest; onClose: () => void; onActioned: () => void; }

export function TeacherAccessDrawer({ row, onClose, onActioned }: Props) {
  const { t } = useLanguage();
  const [note, setNote] = useState(row.admin_note || '');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);

  // Live render of the approval welcome email so the admin can see exactly how
  // their personal note — and the trial countdown the applicant will receive —
  // will appear before sending. Use the row's existing deadline on re-approval,
  // otherwise preview a fresh trial window.
  const previewTrialExpiresAt = row.trial_expires_at || teacherTrialExpiry(Date.now());
  const email = useMemo(
    () => teacherAccessConfirmation({
      full_name: row.full_name, locale: row.locale, message: note, trialExpiresAt: previewTrialExpiresAt,
    }),
    [row.full_name, row.locale, note, previewTrialExpiresAt],
  );

  async function copyEmail() {
    try {
      await navigator.clipboard.writeText(email.html);
      toast.success(t('admin.teacherAccess.copy_success', 'Email HTML copied to clipboard'));
    } catch {
      toast.error(t('admin.teacherAccess.copy_error', 'Failed to copy email'));
    }
  }

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

  async function resend() {
    setErr(null);
    setBusy(true);
    try {
      const res = await fetchWithAuth(`/api/admin/teacher-access/${row.id}/resend`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ message: note }),
      });
      if (!res.ok) throw new Error(await res.text());
      toast.success(t('admin.teacherAccess.resendSuccess', 'Approval email re-sent'));
    } catch {
      const errorMsg = t('admin.teacherAccess.resendError', 'Failed to resend approval email');
      setErr(errorMsg);
      toast.error(errorMsg);
    } finally {
      setBusy(false);
    }
  }

  async function act(kind: 'approve' | 'decline') {
    setErr(null);
    setBusy(true);
    try {
      const res = await fetchWithAuth(`/api/admin/teacher-access/${row.id}/${kind}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        // approve → personal note included in the welcome email; decline → reason.
        body: kind === 'decline' ? JSON.stringify({ reason: note }) : JSON.stringify({ message: note }),
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
            className="mt-1 w-full rounded border-2 border-slate-300 bg-white p-2 text-sm text-neo-navy placeholder:text-slate-400" />
          <p className="mt-1 text-xs text-slate-500">
            {t('admin.teacherAccess.note_hint', 'On approve, this note is included in the welcome email to the applicant. On decline, it’s used as the reason.')}
          </p>
        </div>
        <div className="mt-4">
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" onClick={() => setShowPreview((v) => !v)}
              className="rounded-lg border-2 border-neo-navy px-3 py-2 text-sm font-bold text-neo-navy">
              {showPreview
                ? t('admin.teacherAccess.hide_preview', 'Hide preview')
                : t('admin.teacherAccess.show_preview', 'Preview email')}
            </button>
            <button type="button" onClick={copyEmail}
              className="rounded-lg border-2 border-neo-navy px-3 py-2 text-sm font-bold text-neo-navy">
              {t('admin.teacherAccess.copy_email', 'Copy email HTML')}
            </button>
          </div>
          {showPreview && (
            <div className="mt-3 rounded-lg border-2 border-slate-300 p-3">
              <p className="text-xs font-semibold text-slate-500">
                {t('admin.teacherAccess.preview_subject', 'Subject')}
              </p>
              <p className="mb-2 text-sm font-bold text-neo-navy">{email.subject}</p>
              <iframe
                title={t('admin.teacherAccess.preview_title', 'Email preview')}
                srcDoc={email.html}
                sandbox=""
                className="h-96 w-full rounded border border-slate-200 bg-white"
              />
            </div>
          )}
        </div>
        {err && <p role="alert" className="mt-3 text-neo-red">{err}</p>}
        {row.status === 'approved' && (
          <div className="mt-4">
            <button type="button" disabled={busy} onClick={resend}
              className="w-full rounded-lg bg-neo-cyan px-4 py-3 font-bold text-neo-navy disabled:opacity-50">
              {t('admin.teacherAccess.resend', 'Resend approval email')}
            </button>
            <p className="mt-1 text-xs text-slate-500">
              {t('admin.teacherAccess.resend_hint', 'Re-sends the welcome email (with the note above) to the applicant. Does not change their access.')}
            </p>
          </div>
        )}
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
