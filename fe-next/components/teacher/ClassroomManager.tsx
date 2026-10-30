'use client';

import { type ReactNode, useState } from 'react';
import Link from 'next/link';
import { m } from 'framer-motion';
import { Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { useClassrooms } from '@/hooks/useClassroom';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { useTeacherPro } from '@/hooks/useTeacherPro';
import { teacherAssignHref } from '@/hooks/useTeacherDashboardDeepLink';
import { cn } from '@/lib/utils';
import { buildGoogleClassroomShareUrl } from '@/lib/education/googleClassroomShare';
import { classroomInvitePayload } from '@/lib/education/classroomInvitePayload';
import { teacherHostHref } from '@/lib/education/teacherHostHref';
import { trackEduJoinCodeCopied, trackEduJoinCodeShared } from '@/lib/education/telemetry';
import { useTeacherAccess } from '@/lib/education/useTeacherAccess';
import { isEligibleForTeacherProUpgradeCta } from '@/lib/education/trial';
import { type Language } from '@/lib/supabase/education/types';
import { shareWithFallback } from '@/utils/shareWithFallback';
import { ConfirmationDialog } from '@/components/ui/ConfirmationDialog';
import { ClassroomCardSkeleton, SkeletonGrid } from '@/components/ui/EducationSkeletons';
import { TEACHER_PRO_CHECKOUT_PATH, teacherProUpgradeCtaLabel } from '@/components/education/TeacherProCheckoutCta';
import { ClassCapMeter } from '@/components/teacher/ClassCapMeter';
import { useTeacherReveal } from './motion/useTeacherReveal';
import { ClassCard } from './classroom/ClassCard';
import { ClassAvatarStack } from './classroom/ClassAvatarStack';
import { OUTLINE_BUTTON } from './home/homeStyles';
import { RehearseWithBotsButton } from './home/RehearseWithBotsButton';
import { ClassroomEmptyState } from './classroom/ClassroomEmptyState';
import { ClassCarousel } from './hq/ClassCarousel';
import { ClassroomCardActivity } from './hq/ClassroomCardActivity';
import { HqProjectorSheet } from './hq/HqProjectorSheet';
import type { HqClassroom } from './hq/GetStudentsInCard';
import { CLASS_GRID_QUERIES, classesPerView } from './hq/classPaging';
import { ClassroomFormDialog } from './ClassroomFormDialog';
import { stagger } from './teacherDashboardTabs';

// Re-exported for the existing contract test; the map itself is shared with the
// lobby language chips (lib/i18n/languageLabels.ts) so it can only drift once.
export { LANGUAGE_LABEL_KEYS } from '@/lib/i18n/languageLabels';

interface ClassroomManagerProps {
  /** The page title; shares the New class row so a phone doesn't spend two rows on chrome. */
  heading?: ReactNode;
}

const SHORT_LANDSCAPE_BUTTON =
  '[@media(orientation:landscape)_and_(max-height:500px)]:h-9 [@media(orientation:landscape)_and_(max-height:500px)]:min-h-9 [@media(orientation:landscape)_and_(max-height:500px)]:py-1';

/** The Classes tab: one card per class in a swipeable carousel; one "New class" link into /teacher/classroom/new. */
export default function ClassroomManager({ heading }: ClassroomManagerProps = {}) {
  const { t, language } = useLanguage();
  const { classrooms, isLoading, updateClassroom, deleteClassroom } = useClassrooms();
  const { trial, isLoading: accessLoading } = useTeacherAccess();
  const { hasPro, loading: proLoading } = useTeacherPro();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [projector, setProjector] = useState<HqClassroom | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const isSm = useMediaQuery(CLASS_GRID_QUERIES.sm);
  const isLg = useMediaQuery(CLASS_GRID_QUERIES.lg);
  const isShort = useMediaQuery(CLASS_GRID_QUERIES.short);
  const pageSize = classesPerView({ sm: isSm, lg: isLg, short: isShort }, classrooms.length);
  const revealRef = useTeacherReveal<HTMLDivElement>(`${pageSize}-${classrooms.length}`);

  const newClassHref = `/${language}/teacher/classroom/new`;
  const editing = classrooms.find((c) => c.id === editingId);

  const handleEdit = async (name: string, classroomLanguage: Language) => {
    if (!editingId) return;
    setIsSaving(true);
    const result = await updateClassroom(editingId, { name, language: classroomLanguage });
    setIsSaving(false);
    if (result.success) {
      toast.success(t('teacher.classroom.success.updated'));
      setEditingId(null);
    } else {
      toast.error(result.error || t('teacher.classroom.error.updateFailed'));
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    setIsSaving(true);
    const result = await deleteClassroom(deletingId);
    setIsSaving(false);
    if (result.success) {
      toast.success(t('teacher.classroom.success.deleted'));
      setDeletingId(null);
    } else {
      toast.error(result.error || t('teacher.classroom.error.deleteFailed'));
    }
  };

  // The code alone, pasted into a class chat, leaves a student with nowhere to type it.
  const copyJoinCode = (classroomId: string, code: string) => {
    navigator.clipboard
      .writeText(classroomInvitePayload(window.location.origin, language, code))
      .then(() => {
        toast.success(t('teacher.classroom.codeCopied'));
        trackEduJoinCodeCopied({ classroomId });
      })
      .catch(() => toast.error(t('share.codeCopyError')));
  };

  const shareInvite = async (classroomId: string, name: string, code: string) => {
    const url = `${window.location.origin}/${language}/join/${code}`;
    const result = await shareWithFallback({
      title: name,
      text: t('teacher.classroom.shareInviteText', 'Join {{name}} on LexiClash with code {{code}}', { name, code }),
      url,
      clipboardText: url,
    });
    if (result === 'shared') trackEduJoinCodeShared({ classroomId, method: 'native' });
    if (result === 'copied') {
      toast.success(t('teacher.classroom.linkCopied'));
      trackEduJoinCodeShared({ classroomId, method: 'copy_fallback' });
    }
  };

  /** Google's own share dialog with the join link: no OAuth, no student data. Null when it cannot be built. */
  const googleClassroomHref = (name: string, code: string): string | null => {
    if (typeof window === 'undefined') return null;
    try {
      return buildGoogleClassroomShareUrl({
        joinUrl: `${window.location.origin}/${language}/join/${code}`,
        title: t('teacher.classroom.googleClassroomTitle', 'Join {{name}} on LexiClash', { name }),
        body: t('teacher.classroom.googleClassroomBody', 'Tap the link to join our class. No account needed, just pick a name.'),
      });
    } catch {
      return null;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-40 animate-pulse rounded bg-neo-white/10" />
        <SkeletonGrid count={3} skeleton={ClassroomCardSkeleton} />
      </div>
    );
  }

  const topActions = (
    <div className="flex shrink-0 items-center gap-2">
      {isEligibleForTeacherProUpgradeCta({ trial, hasPro, proLoading, accessLoading }) ? (
        <Link
          href={`/${language}${TEACHER_PRO_CHECKOUT_PATH}`}
          data-testid="classrooms-upgrade-teacher-pro"
          className={cn(OUTLINE_BUTTON, 'max-sm:px-2')}
        >
          <span className="rounded-full border-2 border-neo-black bg-neo-yellow px-1.5 font-neo-display text-[0.65rem] font-black leading-4 text-neo-black">
            {t('teacher.lastGame.proBadge')}
          </span>
          {teacherProUpgradeCtaLabel(language)}
        </Link>
      ) : null}
      {classrooms.length > 0 ? (
        <Link href={newClassHref} data-testid="classroom-create-link" className={cn(OUTLINE_BUTTON, SHORT_LANDSCAPE_BUTTON)}>
          <Plus className="size-4" aria-hidden="true" />
          {t('eduShell.home.newClass', 'New class')}
        </Link>
      ) : null}
    </div>
  );

  return (
    <div className="space-y-3 sm:space-y-4 [@media(orientation:landscape)_and_(max-height:500px)]:space-y-1.5">
      <div data-testid="classroom-manager-toprow" className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        {heading}
        {topActions}
      </div>

      {classrooms.length === 0 ? (
        <>
          <ClassCapMeter count={classrooms.length} />
          <ClassroomEmptyState createHref={newClassHref} />
        </>
      ) : (
        <m.div ref={revealRef} variants={stagger} initial="hidden" animate="visible">
          <ClassCarousel
            perView={pageSize}
            header={<ClassCapMeter count={classrooms.length} />}
            label={t('academy.teacher.classesTitle', 'Your classes')}
            slides={classrooms.map((classroom) => ({
              key: classroom.id,
              node: (
                <div data-tm>
                  <ClassCard
                    classroom={classroom}
                    expanded={expandedId === classroom.id}
                    onToggleExpanded={() => setExpandedId(expandedId === classroom.id ? null : classroom.id)}
                    onCopy={() => copyJoinCode(classroom.id, classroom.join_code)}
                    onShare={() => shareInvite(classroom.id, classroom.name, classroom.join_code)}
                    googleHref={googleClassroomHref(classroom.name, classroom.join_code)}
                    onEdit={() => setEditingId(classroom.id)}
                    onDelete={() => setDeletingId(classroom.id)}
                    activity={<ClassroomCardActivity classroomId={classroom.id} rosterCount={classroom.member_count || 0} />}
                    studentPreview={<ClassAvatarStack classroomId={classroom.id} />}
                    startGameHref={teacherHostHref(language, { classroomId: classroom.id })}
                    rehearse={<RehearseWithBotsButton classroomId={classroom.id} source="class" language={language} t={t} className="self-center" />}
                    assignHref={teacherAssignHref(language, classroom.id)}
                    reportHref={`/${language}/teacher/classroom/${classroom.id}/analytics`}
                    onOpenProjector={
                      classroom.join_code
                        ? () => setProjector({ id: classroom.id, name: classroom.name, join_code: classroom.join_code, member_count: classroom.member_count })
                        : undefined
                    }
                  />
                </div>
              ),
            }))}
          />
        </m.div>
      )}

      <ClassroomFormDialog
        open={!!editing}
        onOpenChange={(open) => {
          if (!open) setEditingId(null);
        }}
        initialName={editing?.name ?? ''}
        initialLanguage={editing?.language}
        isSaving={isSaving}
        onSubmit={handleEdit}
      />

      <ConfirmationDialog
        open={!!deletingId}
        onOpenChange={(open) => {
          if (!open) setDeletingId(null);
        }}
        title={t('teacher.classroom.delete')}
        description={t('teacher.classroom.confirmDelete')}
        confirmText={isSaving ? t('common.loading') : t('teacher.classroom.delete')}
        cancelText={t('common.cancel')}
        onConfirm={handleDelete}
        variant="danger"
      />

      {projector ? <HqProjectorSheet classroom={projector} onClose={() => setProjector(null)} /> : null}
    </div>
  );
}
