'use client';

/**
 * Delete affordance for one class. The account-delete interstitial links here
 * so "delete one class instead" is not a dead route (analytics has no delete).
 */
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Trash2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { TeacherGate } from '@/components/education/TeacherGate';
import { EducationShell } from '@/components/education/shell/EducationShell';
import { ConfirmationDialog } from '@/components/ui/ConfirmationDialog';
import { fetchWithAuth } from '@/utils/authFetch';
import { cn } from '@/lib/utils';
import { useClassrooms } from '@/hooks/useClassroom';
import { DirectionalIcon } from '@/components/ui/DirectionalIcon';
import { NB_BLOCK, NB_PANEL, NB_SMALL, NB_STICKER } from '@/components/teacher/nb/nbStyles';
import { NeoButton } from '@/components/ui/button';
import { NeoPanel } from '@/components/ui/panel';

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
  const { classrooms } = useClassrooms();
  const name = classrooms.find((c) => c.id === classroomId)?.name;

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
    <main className="mx-auto flex max-w-lg flex-col gap-4 p-4">
      <Link href={`/${language}/teacher/classroom`} className={cn(NB_SMALL, NB_BLOCK.navy, 'self-start')}>
        <DirectionalIcon icon={ArrowLeft} className="size-4" />
        {t('education.analytics.backToClassroom')}
      </Link>
      <NeoPanel asChild tone="card" radius="neo-xl" shadow="xl" className="flex flex-col gap-3 p-4 sm:p-5">
      <section>
        <h1 className="font-neo-display text-2xl font-black text-neo-cream">{t('teacher.classroom.delete')}</h1>
        {name ? (
          <span data-testid="delete-class-name" dir="auto" className={cn(NB_STICKER, NB_BLOCK.cream, 'self-start text-sm')}>
            {name}
          </span>
        ) : null}
        <p className="text-sm font-semibold text-neo-cream/80">{t('teacher.classroom.confirmDelete')}</p>
        {error ? (
          <p className="text-sm font-bold text-neo-red" role="alert">{error}</p>
        ) : null}
        <NeoButton
          variant="small"
          onClick={() => setOpen(true)}
          data-testid="delete-class-affordance"
          className="min-h-12 self-start border-neo-black bg-neo-red px-4 text-base text-white"
        >
          <Trash2 className="size-4" aria-hidden="true" />
          {t('teacher.classroom.delete')}
        </NeoButton>
      </section>
      </NeoPanel>
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
