'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';
import { TeacherGate } from '@/components/education/TeacherGate';
import { EducationShell } from '@/components/education/shell/EducationShell';
import { ConfirmationDialog } from '@/components/ui/ConfirmationDialog';
import { PageLoader } from '@/components/ui/PageLoader';
import { NeoButton } from '@/components/ui/button';
import { fetchWithAuth } from '@/utils/authFetch';
import { cn } from '@/lib/utils';
import { useClassrooms } from '@/hooks/useClassroom';
import { useAssignments } from '@/hooks/useAssignments';
import { useLessons } from '@/hooks/useVocabularyLesson';
import { teacherHostHref } from '@/lib/education/teacherHostHref';
import { useHomeRoster } from '@/components/teacher/home/HomeRosterLive';
import { HomeClassRoster } from '@/components/teacher/home/HomeClassRoster';
import { useLastClassGame } from '@/components/teacher/home/useLastClassGame';
import { HomeShareSheet } from '@/components/teacher/home/HomeShareSheet';
import { ClassPageView } from '@/components/teacher/classroom/page/ClassPageView';
import { classWordLists } from '@/components/teacher/classroom/page/classWordLists';
import { NB_PANEL, NB_SECONDARY } from '@/components/teacher/nb/nbStyles';

type T = (key: string, params?: Record<string, string | number>) => string;

export default function ClassPageClient({ classroomId }: { classroomId: string }) {
  const { t } = useLanguage();
  return (
    <EducationShell scrollRegionLabel={t('teacher.nav.classes')} contentClassName="p-4 sm:p-6 lg:px-8 lg:py-5">
      <TeacherGate>
        <ClassPage classroomId={classroomId} />
      </TeacherGate>
    </EducationShell>
  );
}

function ClassPage({ classroomId }: { classroomId: string }) {
  const { t: rawT, language } = useLanguage();
  const t = rawT as T;
  const { classrooms, isLoading, error, refresh } = useClassrooms();
  const classroom = classrooms.find((c) => c.id === classroomId);
  if (!classroom && isLoading) return <PageLoader nested />;
  if (!classroom && error) {
    return (
      <div role="alert" className={cn(NB_PANEL, 'mx-auto my-6 flex max-w-md flex-col items-center gap-3 p-6 text-center')}>
        <p className="font-neo-display text-lg font-bold text-neo-cream">{t('education.errors.serverUnavailable')}</p>
        <NeoButton variant="secondary" data-testid="class-page-retry" onClick={() => void refresh()} className="w-full">
          {t('teacher.lastGame.retry')}
        </NeoButton>
      </div>
    );
  }
  if (!classroom?.join_code) {
    return (
      <div role="alert" className={cn(NB_PANEL, 'mx-auto my-6 flex max-w-md flex-col items-center gap-3 p-6 text-center')}>
        <p className="font-neo-display text-lg font-bold text-neo-cream">{t('education.classroomGame.classroomNotFound')}</p>
        <Link href={`/${language}/teacher/classroom`} className={cn(NB_SECONDARY, 'w-full')}>
          {t('eduShell.home.yourClasses')}
        </Link>
      </div>
    );
  }
  return <ClassPageLoaded classroom={{ ...classroom, join_code: classroom.join_code }} t={t} language={language} />;
}

interface LoadedProps {
  classroom: { id: string; name: string; join_code: string; language?: string | null; member_count?: number | null };
  t: T;
  language: string;
}

function ClassPageLoaded({ classroom, t, language }: LoadedProps) {
  const router = useRouter();
  const [nowMs] = useState(() => Date.now());
  const roster = useHomeRoster(classroom.id, nowMs);
  const { assignments, isLoading: assignmentsLoading } = useAssignments(classroom.id);
  const { lessons, isLoading: lessonsLoading } = useLessons();
  const lastGame = useLastClassGame(classroom.id, t('teacher.lastGame.studentFallback'));
  const lists = useMemo(() => classWordLists(assignments, lessons, classroom.id), [assignments, lessons, classroom.id]);
  const [shareOpen, setShareOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (window.location.hash === '#delete') document.getElementById('delete')?.scrollIntoView({ block: 'center' });
  }, []);

  const handleDelete = async () => {
    if (working) return;
    setWorking(true);
    setError(null);
    try {
      const res = await fetchWithAuth(`/api/education/classroom/${classroom.id}`, { method: 'DELETE', requireSession: true });
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
    <main>
      <ClassPageView
        classroom={classroom}
        language={language}
        classesHref={`/${language}/teacher/classroom`}
        startHref={teacherHostHref(language, { classroomId: classroom.id })}
        resultsHref={`/${language}/teacher/classroom/${classroom.id}/analytics`}
        libraryHref={`/${language}/teacher/curriculum`}
        roster={<HomeClassRoster rows={roster.rows} failed={roster.failed} language={language} nowMs={nowMs} t={t} />}
        lists={lists}
        listsLoading={assignmentsLoading || lessonsLoading}
        lastGame={lastGame}
        onShare={() => setShareOpen(true)}
        onRequestDelete={() => setConfirmOpen(true)}
        t={t}
      />
      {error ? <p className="mt-2 text-center text-sm font-bold text-neo-red" role="alert">{error}</p> : null}
      <HomeShareSheet classroom={classroom} open={shareOpen} onOpenChange={setShareOpen} uiLanguage={language} t={t} />
      <ConfirmationDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
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
