'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import { Download, Loader2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { ProGate } from '@/components/teacher/ProGate';
import { getTeacherExportRows } from '@/lib/supabase/education/teacherExportAllClasses';
import { teacherExportToCsv } from '@/lib/education/teacherExportAllClasses';
import { downloadCsvFile } from '@/lib/education/assignmentProgressReport';

/**
 * Teacher Pro "Export all classes" button — one CSV covering every classroom
 * the signed-in teacher owns x every student in them (lessons completed,
 * words mastered, total XP, last active, games played, scoped per classroom).
 *
 * Gated by <ProGate feature="reports"> so a free teacher sees the same
 * upsell card as the rest of /teacher/reports instead of a working button.
 */
export function ExportAllClassesButton() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const handleExport = async () => {
    if (!user?.id || isLoading) return;
    setIsLoading(true);
    try {
      const { data: rows, error } = await getTeacherExportRows(user.id);
      if (error) {
        toast.error(t('teacher.reports.exportAllClasses.failed'));
        return;
      }
      if (rows.length === 0) {
        toast(t('teacher.reports.exportAllClasses.empty'));
        return;
      }
      const csv = teacherExportToCsv(rows, {
        classroom: t('teacher.reports.exportAllClasses.columns.classroom'),
        student: t('teacher.reports.exportAllClasses.columns.student'),
        lessonsCompleted: t('teacher.reports.exportAllClasses.columns.lessonsCompleted'),
        wordsMastered: t('teacher.reports.exportAllClasses.columns.wordsMastered'),
        totalXp: t('teacher.reports.exportAllClasses.columns.totalXp'),
        lastActive: t('teacher.reports.exportAllClasses.columns.lastActive'),
        gamesPlayed: t('teacher.reports.exportAllClasses.columns.gamesPlayed'),
        anonymousStudent: t('teacher.reports.exportAllClasses.anonymousStudent'),
      });
      downloadCsvFile(t('teacher.reports.exportAllClasses.fileName'), csv);
    } catch {
      // getTeacherExportRows always resolves {data, error} — this only fires
      // on a bug (e.g. a thrown network error), and must not fail silently.
      toast.error(t('teacher.reports.exportAllClasses.failed'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ProGate feature="reports">
      <button
        type="button"
        onClick={handleExport}
        disabled={isLoading}
        aria-busy={isLoading}
        className="inline-flex min-h-11 items-center gap-2 rounded-neo border-2 border-neo-cream bg-neo-navy-light px-4 py-2 text-sm font-bold text-neo-white shadow-hard-sm transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-hard focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neo-cyan active:translate-y-0 active:shadow-none disabled:pointer-events-none disabled:opacity-70"
      >
        {isLoading ? (
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        ) : (
          <Download className="size-4" aria-hidden="true" />
        )}
        {isLoading
          ? t('teacher.reports.exportAllClasses.downloading')
          : t('teacher.reports.exportAllClasses.button')}
      </button>
    </ProGate>
  );
}
