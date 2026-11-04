'use client';

/**
 * Delete affordance for one class. The account-delete interstitial links here
 * so "delete one class instead" is not a dead route (analytics has no delete).
 */
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { TeacherGate } from '@/components/education/TeacherGate';
import { EducationShell } from '@/components/education/shell/EducationShell';
import { ConfirmationDialog } from '@/components/ui/ConfirmationDialog';
import { fetchWithAuth } from '@/utils/authFetch';
import { cn } from '@/lib/utils';

export default function DeleteClassPageClient({ classroomId }: { classroomId: string }) {
  const { t } = useLanguage();
  return (
    <EducationShell scrollRegionLabel={t('teacher.nav.classes')}>
      <TeacherGate>
        <DeleteClassPanel classroomId={classroomId} />
      </TeacherGate>
    </EducationShell>
  );
}

function DeleteClassPanel({ classroomId }: { classroomId: string }) {
  const { t, language } = useLanguage();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (working) return;
    setWorking(true);
    setError(null);
    try {
      const res = await fetchWithAuth(`/api/education/classroom/${classroomId}`, {
        method: 'DELETE',
        requireSession: true,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(typeof body?.error === 'string' ? body.error : t('teacher.classroom.error.deleteFailed'));
        setWorking(false);
        return;
      }
      router.push(`/${language}/teacher/classroom`);
    } catch {
      setError(t('teacher.classroom.error.deleteFailed'));
      setWorking(false);
    }
  };

  return (
    <main className="mx-auto max-w-lg p-4">
      <h1 className="font-neo-display text-2xl font-bold text-neo-cream mb-4">
        {t('teacher.classroom.delete')}
      </h1>
      <p className="text-sm text-neo-cream/80 mb-4">{t('teacher.classroom.confirmDelete')}</p>
      {error ? (
        <p className="text-neo-red text-sm font-medium mb-3" role="alert">{error}</p>
      ) : null}
      <button
        type="button"
        onClick={() => setOpen(true)}
        data-testid="delete-class-affordance"
        className={cn(
          'inline-flex items-center gap-2 px-4 py-2 rounded-neo border-3 border-neo-red',
          'bg-neo-red/10 text-neo-red font-bold text-sm min-h-[44px]'
        )}
      >
        <Trash2 className="w-4 h-4" />
        {t('teacher.classroom.delete')}
      </button>
      <ConfirmationDialog
        open={open}
        onOpenChange={setOpen}
        title={t('teacher.classroom.delete')}
        description={t('teacher.classroom.confirmDelete')}
        confirmText={working ? t('common.loading') : t('teacher.classroom.delete')}
        cancelText={t('common.cancel')}
        onConfirm={handleDelete}
        variant="danger"
      />
    </main>
  );
}
