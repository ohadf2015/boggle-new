'use client';

import { useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { shareOrCopy } from '@/lib/education/shareOrCopy';
import { trackEduParentReportShared } from '@/lib/education/shareTelemetry';

interface ShareParentReportButtonProps {
  classroomId: string;
  studentId: string;
}

/**
 * "Share with parent" — mints a signed, no-account report link for ONE
 * student in ONE classroom (Teacher Pro) and hands it to the share sheet
 * (WhatsApp, Messages…), the clipboard, or, failing both, shows it to copy.
 *
 * Lives inside `StudentProgressTable`, which is already rendered behind
 * `<ProGate feature="analytics">` — no extra gating needed here. The API
 * route enforces ownership/membership/Pro server-side regardless.
 */
export function ShareParentReportButton({ classroomId, studentId }: ShareParentReportButtonProps) {
  const { t, language } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [manualUrl, setManualUrl] = useState<string | null>(null);

  const handleClick = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation();
      if (loading) return;
      setLoading(true);
      try {
        const res = await fetch(`/api/education/classroom/${classroomId}/members/${studentId}/parent-report`, {
          method: 'POST',
        });
        const body = await res.json().catch(() => null);
        if (!res.ok || !body?.ok || typeof body.path !== 'string') {
          toast.error(t('education.analytics.shareParentReportFailed'));
          return;
        }
        const url = `${window.location.origin}/${language}${body.path}`;
        const outcome = await shareOrCopy({ title: t('education.analytics.shareParentReport'), url });
        if (outcome === 'native' || outcome === 'copy') trackEduParentReportShared({ classroomId, method: outcome });
        if (outcome === 'copy') toast.success(t('share.linkCopied'));
        if (outcome === 'failed') {
          setManualUrl(url);
          toast.error(t('education.analytics.shareParentReportFailed'));
        }
      } catch {
        toast.error(t('education.analytics.shareParentReportFailed'));
      } finally {
        setLoading(false);
      }
    },
    [classroomId, studentId, language, t, loading],
  );

  if (manualUrl) {
    return (
      <input
        readOnly
        dir="ltr"
        value={manualUrl}
        aria-label={t('education.analytics.shareParentReport')}
        onClick={(e) => {
          e.stopPropagation();
          e.currentTarget.select();
        }}
        className="w-40 rounded-neo border-2 border-neo-cream/40 bg-neo-navy px-2 py-1 text-xs text-neo-white"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className="px-2 py-1 rounded-neo border-3 border-neo-cream/40 bg-neo-navy text-neo-white text-xs font-neo-body hover:bg-neo-cyan/10 disabled:opacity-50"
    >
      {t('education.analytics.shareParentReport')}
    </button>
  );
}
