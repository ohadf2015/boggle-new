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
import { hasProAccess } from '@/lib/education/teacherPlanGate';
import { freeInsightClassId } from '@/lib/education/pro/freeClassInsight';
import { type Language, type LeaderboardVisibility } from '@/lib/supabase/education/types';
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
import { NewClassSeat } from './classroom/NewClassSeat';
import { NB_BLOCK, NB_DARK_EDGE, NB_SMALL, type NbColor } from './nb/nbStyles';

// Each class gets its own color band, in the game's order, so a teacher can find a class by color.
// No lime: lime is kept for the one Start a game button on each card.
const CARD_COLORS = ['pink', 'cyan', 'yellow', 'purple', 'orange'] as const satisfies readonly NbColor[];
import { ClassroomCardActivity } from './hq/ClassroomCardActivity';
import { HqProjectorSheet } from './hq/HqProjectorSheet';
import type { HqClassroom } from './hq/GetStudentsInCard';
import { CLASS_GRID_QUERIES, classesPerView } from './hq/classPaging';
import { ClassroomFormDialog } from './ClassroomFormDialog';
import { stagger } from './teacherDashboardTabs';
import { ProBadge } from '@/components/ui/ProBadge';

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
  const pro = useTeacherPro();
  const { hasPro, loading: proLoading } = pro;
  const [nowMs] = useState(() => Date.now());
  const insightClassId = !proLoading && pro.known && !hasProAccess(pro, nowMs) ? freeInsightClassId(classrooms) : null;

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
  // A wide row with fewer classes than seats ends in a New class card instead of empty space.
  const seatFree = classrooms.length > 0 && pageSize > classrooms.length;
  const editing = classrooms.find((c) => c.id === editingId);

  const handleEdit = async (name: string, classroomLanguage: Language, leaderboard?: LeaderboardVisibility) => {
    if (!editingId) return;
    setIsSaving(true);
    const result = await updateClassroom(editingId, {
      name,
      language: classroomLanguage,
      ...(leaderboard ? { leaderboard_visibility: leaderboard } : {}),
    });
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
      {isEligibleForTeacherProUpgradeCta({ trial, hasPro, proLoading, accessLoading, trialUsed: pro.known ? pro.trialUsed : undefined }) ? (
        <Link
          href={`/${language}${TEACHER_PRO_CHECKOUT_PATH}`}
          data-testid="classrooms-upgrade-teacher-pro"
          className={cn(OUTLINE_BUTTON, 'max-sm:px-2')}
        >
          <ProBadge size="xs" label={t('teacher.lastGame.proBadge')} />
          {teacherProUpgradeCtaLabel(language)}
        </Link>
      ) : null}
      {/* One "New class" entry: the seat card when the row has an empty seat, else this quiet link (lime stays Start a game's). */}
      {classrooms.length > 0 && !seatFree ? (
        <Link href={newClassHref} data-testid="classroom-create-link" className={cn(NB_SMALL, NB_BLOCK.navy, NB_DARK_EDGE, SHORT_LANDSCAPE_BUTTON)}>
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
          <div className="mb-3">
            <ClassCapMeter count={classrooms.length} />
          </div>
          <ul
            data-testid="classroom-grid"
            aria-label={t('academy.teacher.classesTitle', 'Your classes')}
            // Columns follow the same per-view count as before, so a row never ends in an empty column.
            className="grid gap-4"
            style={{ gridTemplateColumns: `repeat(${pageSize}, minmax(0, 1fr))` }}
          >
            {classrooms.map((classroom, i) => (
              <li key={classroom.id} data-tm className="flex">
                <ClassCard
                  classroom={classroom}
                  color={CARD_COLORS[i % CARD_COLORS.length]}
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
                  rehearse={<RehearseWithBotsButton classroomId={classroom.id} source="class" language={language} t={t} />}
                  assignHref={teacherAssignHref(language, classroom.id)}
                  reportHref={`/${language}/teacher/classroom/${classroom.id}/analytics`}
                  classHref={`/${language}/teacher/classroom/${classroom.id}`}
                  insightHref={insightClassId === classroom.id ? `/${language}/teacher/classroom/${classroom.id}/analytics` : undefined}
                  onOpenProjector={
                    classroom.join_code
                      ? () => setProjector({ id: classroom.id, name: classroom.name, join_code: classroom.join_code, member_count: classroom.member_count })
                      : undefined
                  }
                />
              </li>
            ))}
            {/* Wider screens: the next class is a tile in the grid, so the row never ends in empty space. */}
            {seatFree ? (
              <li className="flex">
                <NewClassSeat
                  href={newClassHref}
                  label={t('eduShell.home.newClass', 'New class')}
                  hint={t('teacher.classroom.newClassHint')}
                  perView={pageSize}
                  accent={CARD_COLORS[classrooms.length % CARD_COLORS.length]}
                />
              </li>
            ) : null}
          </ul>
        </m.div>
      )}

      <ClassroomFormDialog
        open={!!editing}
        onOpenChange={(open) => {
          if (!open) setEditingId(null);
        }}
        initialName={editing?.name ?? ''}
        initialLanguage={editing?.language}
        classroomId={editing?.id}
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
