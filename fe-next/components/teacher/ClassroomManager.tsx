'use client';

import { useEffect, useState } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { useClassrooms } from '@/hooks/useClassroom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ConfirmationDialog } from '@/components/ui/ConfirmationDialog';
import { Plus, Copy, Share2, GraduationCap } from 'lucide-react';
import { buildGoogleClassroomShareUrl } from '@/lib/education/googleClassroomShare';
import toast from 'react-hot-toast';
import { type Language } from '@/lib/supabase/education/types';
import { ClassroomCard } from './hq/ClassroomCard';
import { ClassPager } from './hq/ClassPager';
import { ClassroomCardActivity } from './hq/ClassroomCardActivity';
import { classPageSize, pageOf, pageSlice } from './hq/classPaging';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import ClassLimitUpsellModal from './ClassLimitUpsellModal';
import CreateClassroomWizard from './CreateClassroomWizard';
import { ClassroomFormDialog } from './ClassroomFormDialog';
import { ClassroomCardSkeleton, SkeletonGrid } from '@/components/ui/EducationSkeletons';
import { fireConfetti } from '@/utils/confettiUtils';
import { shareWithFallback } from '@/utils/shareWithFallback';
import { classroomInvitePayload } from '@/lib/education/classroomInvitePayload';
import { FREE_TIER_LIMITS } from '@/lib/education/freeTierLimits';
import { trackEduClassroomCreated } from '@/lib/education/telemetry';
import { useTeacherAccess } from '@/lib/education/useTeacherAccess';
import { isEligibleForTeacherProUpgradeCta } from '@/lib/education/trial';
import { useTeacherPro } from '@/hooks/useTeacherPro';
import {
  TEACHER_PRO_CHECKOUT_PATH,
  teacherProUpgradeCtaLabel,
} from '@/components/education/TeacherProCheckoutCta';
import Link from 'next/link';
import { stagger, slideUp } from './teacherDashboardTabs';

// Re-exported for the existing contract test; the map itself is shared with the
// lobby language chips (lib/i18n/languageLabels.ts) so it can only drift once.
export { LANGUAGE_LABEL_KEYS } from '@/lib/i18n/languageLabels';

interface ClassroomManagerProps {
  autoOpenCreate?: boolean;
  /** Classes tab: cards carry recent activity, next step and "Start a game". */
  richCards?: boolean;
}

export default function ClassroomManager({ autoOpenCreate, richCards = false }: ClassroomManagerProps = {}) {
  const { t, language } = useLanguage();
  const isRTL = language === 'he';
  const { classrooms, isLoading, createClassroom, updateClassroom, deleteClassroom } =
    useClassrooms();
  const { trial, isLoading: accessLoading } = useTeacherAccess();
  const { hasPro, loading: proLoading } = useTeacherPro();

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isUpsellModalOpen, setIsUpsellModalOpen] = useState(false);
  const [isTrialUpsellOpen, setIsTrialUpsellOpen] = useState(false);
  const [selectedClassroomId, setSelectedClassroomId] = useState<string | null>(null);
  const [expandedClassroomId, setExpandedClassroomId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [upsellData, setUpsellData] = useState<{ currentCount: number; limit: number } | null>(null);
  const [createdClassroom, setCreatedClassroom] = useState<{
    id: string;
    name: string;
    join_code: string;
  } | null>(null);

  const selectedClassroom = classrooms.find((c) => c.id === selectedClassroomId);

  // Paged, not scrolled. The breakpoints mirror the grid's sm/lg columns.
  const isSm = useMediaQuery('(min-width: 640px)');
  const isLg = useMediaQuery('(min-width: 1024px)');
  const pageSize = classPageSize({ sm: isSm, lg: isLg });
  const [page, setPage] = useState(0);
  const paged = pageSlice(classrooms, page, pageSize);
  // A class the teacher just created jumps into view on whatever page it is.
  const createdId = createdClassroom?.id;
  useEffect(() => {
    if (!createdId) return;
    const idx = classrooms.findIndex((c) => c.id === createdId);
    if (idx >= 0) setPage(pageOf(idx, pageSize));
  }, [createdId, classrooms, pageSize]);

  // If the parent asks us to open the create dialog (e.g. from the dashboard header
  // shortcut or a deep-link), open it once on mount.
  useEffect(() => {
    if (autoOpenCreate) {
      openCreateDialog();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoOpenCreate]);

  const handleCreate = async (name: string, classroomLanguage: Language) => {
    setIsSaving(true);
    const result = await createClassroom(name, classroomLanguage);
    setIsSaving(false);

    if (result.success) {
      fireConfetti();
      toast.success(t('teacher.classroom.success.created'));
      setIsCreateDialogOpen(false);
      if (result.data?.id && result.data.join_code) {
        trackEduClassroomCreated({
          classroomId: result.data.id,
          createdVia: 'dashboard',
          language: result.data.language ?? classroomLanguage,
        });
        setCreatedClassroom({
          id: result.data.id,
          name: result.data.name,
          join_code: result.data.join_code,
        });
        setExpandedClassroomId(result.data.id);
      }
    } else if (result.code === 'CLASS_LIMIT_REACHED' && result.currentCount !== undefined && result.limit !== undefined) {
      // Show upsell modal for class limit
      setUpsellData({ currentCount: result.currentCount, limit: result.limit ?? FREE_TIER_LIMITS.classes });
      setIsUpsellModalOpen(true);
      setIsCreateDialogOpen(false);
    } else {
      toast.error(result.error || t('teacher.classroom.error.createFailed'));
    }
  };

  const handleEdit = async (name: string, classroomLanguage: Language) => {
    if (!selectedClassroomId) return;

    setIsSaving(true);
    const result = await updateClassroom(selectedClassroomId, {
      name,
      language: classroomLanguage,
    });
    setIsSaving(false);

    if (result.success) {
      toast.success(t('teacher.classroom.success.updated'));
      setIsEditDialogOpen(false);
      setSelectedClassroomId(null);
    } else {
      toast.error(result.error || t('teacher.classroom.error.updateFailed'));
    }
  };

  const handleDelete = async () => {
    if (!selectedClassroomId) return;

    setIsSaving(true);
    const result = await deleteClassroom(selectedClassroomId);
    setIsSaving(false);

    if (result.success) {
      toast.success(t('teacher.classroom.success.deleted'));
      setIsDeleteDialogOpen(false);
      setSelectedClassroomId(null);
    } else {
      toast.error(result.error || t('teacher.classroom.error.deleteFailed'));
    }
  };

  const copyJoinCode = (code: string) => {
    // Copy the code AND the page that accepts it. A bare six characters pasted
    // into WhatsApp or Google Classroom leaves the student holding a code with
    // nowhere to type it — lexiclash.live has no code box.
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    navigator.clipboard
      .writeText(classroomInvitePayload(origin, language, code))
      .then(() => toast.success(t('teacher.classroom.codeCopied')))
      // Claiming success on a rejected write is how a teacher pastes nothing
      // into a class chat and never finds out.
      .catch(() => toast.error(t('share.codeCopyError')));
  };

  const shareInvite = async (name: string, code: string) => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const url = `${baseUrl}/${language}/join/${code}`;
    const result = await shareWithFallback({
      title: name,
      text: t(
        'teacher.classroom.shareInviteText',
        'Join {{name}} on LexiClash with code {{code}}',
        { name, code }
      ),
      url,
      clipboardText: url,
    });
    if (result === 'copied') {
      toast.success(t('teacher.classroom.linkCopied'));
    }
  };

  /**
   * Google's own share dialog, pre-filled with this classroom's join link.
   *
   * A teacher's real blocker is not creating the class — that is 3 clicks — it is getting 28
   * children to type six characters. Their class already exists in Google Classroom and every
   * student is already signed in to it, so posting the join link to that Stream skips the code
   * entirely. Google prompts them inside its own dialog; we never learn which class they chose,
   * which is why this needs no OAuth, no scopes and no student data.
   * See docs/2026-08-27-google-classroom-integration.md.
   *
   * Returns null on the server (no window.location.origin) and if the URL cannot be built, so a
   * bad value can never reach an anchor's href.
   */
  const googleClassroomHref = (name: string, code: string): string | null => {
    if (typeof window === 'undefined') return null;
    try {
      return buildGoogleClassroomShareUrl({
        joinUrl: `${window.location.origin}/${language}/join/${code}`,
        title: t('teacher.classroom.googleClassroomTitle', 'Join {{name}} on LexiClash', { name }),
        body: t(
          'teacher.classroom.googleClassroomBody',
          'Tap the link to join our class. No account needed — just pick a name.',
        ),
      });
    } catch {
      return null;
    }
  };

  /**
   * The trial-expiry paywall nudge. A teacher whose 14-day trial has ended (and
   * who never converted to Pro) gets the Pro ask the next time they reach for
   * the create flow — the single highest-intent moment they have. It is a
   * nudge, not a wall: the free tier still works (grandfathering doctrine in
   * freeTierLimits.ts), so the modal carries a "continue free" escape that
   * proceeds into the wizard. While access/pro state is still resolving we
   * show nothing — an eager modal could fire on a paying teacher.
   */
  const openCreateDialog = () => {
    if (!accessLoading && !proLoading && !hasPro && trial?.isExpired) {
      setIsTrialUpsellOpen(true);
      return;
    }
    setIsCreateDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="h-10 w-40 bg-neo-white/10 rounded animate-pulse" />
        </div>
        <SkeletonGrid count={3} skeleton={ClassroomCardSkeleton} />
      </div>
    );
  }

  return (
    <div className="space-y-4" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Create Classroom Button */}
      <div className="flex justify-between items-center gap-3">
        <Button
          onClick={openCreateDialog}
          className={cn(
            'bg-neo-cyan text-black font-neo-body font-black',
            'border-3 border-black shadow-hard hover:-translate-y-0.5 hover:shadow-hard-lg active:translate-y-0.5 active:shadow-hard-pressed',
            'transition-all'
          )}
        >
          <Plus className="w-5 h-5 me-2" />
          {t('teacher.classroom.create')}
        </Button>
        {isEligibleForTeacherProUpgradeCta({
          trial,
          hasPro,
          proLoading,
          accessLoading,
        }) ? (
          <Link
            href={`/${language}${TEACHER_PRO_CHECKOUT_PATH}`}
            data-testid="classrooms-upgrade-teacher-pro"
            className={cn(
              'inline-flex min-h-11 items-center justify-center rounded-neo bg-neo-navy px-4 py-2',
              'font-neo-body font-black text-neo-lime border-neo border-neo-cream/40 shadow-hard',
              'hover:-translate-y-0.5 hover:shadow-hard-lg active:translate-y-0.5 active:shadow-hard-pressed',
              'transition-all whitespace-nowrap',
            )}
          >
            {teacherProUpgradeCtaLabel(language)}
          </Link>
        ) : null}
      </div>

      <AnimatePresence initial={false}>
        {createdClassroom && (
          <m.div
            key="classroom-created-banner"
            data-testid="classroom-created-banner"
            variants={slideUp}
            initial="hidden"
            animate="visible"
            exit="hidden"
            className="rounded-neo border-3 border-black bg-neo-lime px-5 py-4 shadow-hard"
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="min-w-0">
                <p className="font-neo-display font-black text-black text-balance">
                  {t('teacher.classroom.createdBannerTitle', 'Classroom ready!')}
                </p>
                <p className="text-sm font-neo-body font-bold text-black/70 text-pretty">
                  {t('teacher.classroom.createdBannerBody', 'Share this code with your students.')}
                </p>
                <code className="mt-2 inline-block text-3xl sm:text-4xl font-neo-display font-black text-black tracking-wider tabular-nums">
                  {createdClassroom.join_code}
                </code>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  onClick={() => copyJoinCode(createdClassroom.join_code)}
                  className="bg-neo-cyan text-black font-black border-2 border-black shadow-hard-sm hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-hard-pressed transition-all"
                >
                  <Copy className="w-4 h-4 me-2" />
                  {t('teacher.classroom.copyCode')}
                </Button>
                <Button
                  type="button"
                  onClick={() => shareInvite(createdClassroom.name, createdClassroom.join_code)}
                  className="bg-neo-cream text-black font-black border-2 border-black shadow-hard-sm hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-hard-pressed transition-all"
                >
                  <Share2 className="w-4 h-4 me-2" />
                  {t('teacher.classroom.share')}
                </Button>
                {googleClassroomHref(createdClassroom.name, createdClassroom.join_code) && (
                  <a
                    href={googleClassroomHref(createdClassroom.name, createdClassroom.join_code)!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-neo border-2 border-black bg-neo-white px-4 py-2 text-sm font-black text-black shadow-hard-sm transition-all hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-hard-pressed"
                  >
                    <GraduationCap className="w-4 h-4" />
                    {t('teacher.classroom.googleClassroom', 'Post to Google Classroom')}
                  </a>
                )}
                <Button
                  type="button"
                  onClick={() => setCreatedClassroom(null)}
                  className="bg-neo-cream text-black font-black border-2 border-black shadow-hard-sm hover:bg-black/5 transition-all"
                >
                  {t('teacher.classroom.dismissBanner', 'Got it')}
                </Button>
              </div>
            </div>
          </m.div>
        )}
      </AnimatePresence>

      {/* Classroom grid — one column on phones, two on tablets, three on a
          desktop row — and PAGED, never a long column: the Classes tab fits
          the screen without the page scrolling (Teacher HQ contract). */}
      {classrooms.length === 0 ? (
        <CreateClassroomWizard onCreateClassroom={openCreateDialog} />
      ) : (
        <>
          <m.div
            key={paged.page}
            className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6"
            variants={stagger}
            initial="hidden"
            animate="visible"
          >
            {paged.items.map((classroom) => (
              <ClassroomCard
                key={classroom.id}
                classroom={classroom}
                index={classrooms.indexOf(classroom)}
                expanded={expandedClassroomId === classroom.id}
                onToggleExpanded={() =>
                  setExpandedClassroomId(expandedClassroomId === classroom.id ? null : classroom.id)
                }
                onCopy={() => copyJoinCode(classroom.join_code)}
                onShare={() => shareInvite(classroom.name, classroom.join_code)}
                googleHref={googleClassroomHref(classroom.name, classroom.join_code)}
                onEdit={() => {
                  setSelectedClassroomId(classroom.id);
                  setIsEditDialogOpen(true);
                }}
                onDelete={() => {
                  setSelectedClassroomId(classroom.id);
                  setIsDeleteDialogOpen(true);
                }}
                activity={
                  richCards ? (
                    <ClassroomCardActivity
                      classroomId={classroom.id}
                      rosterCount={classroom.member_count || 0}
                    />
                  ) : undefined
                }
                startGameHref={
                  richCards ? `/${language}/teacher?classroomId=${classroom.id}` : undefined
                }
              />
            ))}
            {/* Classes tab on a wide screen with a free slot on the last page:
                a "new class" seat instead of a void. Compact and content-sized
                — beside one class a card-sized slab took half the row and
                shouted louder than the class itself. Phones keep one card. */}
            {richCards && paged.page === paged.pages - 1 && paged.items.length < pageSize ? (
              <m.button
                type="button"
                variants={slideUp}
                data-testid="classroom-add-tile"
                onClick={openCreateDialog}
                className="hidden items-center gap-3 self-start justify-self-start rounded-neo border-[3px] border-dashed border-neo-cream/60 bg-neo-navy/80 py-3 pe-5 ps-3 text-neo-white shadow-hard-sm transition-all hover:-translate-y-0.5 hover:border-neo-cream focus:outline-hidden focus-visible:ring-4 focus-visible:ring-neo-cyan sm:inline-flex"
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full border-[3px] border-neo-black bg-neo-cyan text-black shadow-hard-sm">
                  <Plus className="size-5" strokeWidth={3} aria-hidden="true" />
                </span>
                <span className="font-neo-display text-base font-black uppercase tracking-tight">
                  {t('teacher.classroom.create')}
                </span>
              </m.button>
            ) : null}
          </m.div>
          <ClassPager page={paged.page} pages={paged.pages} onChange={setPage} />
        </>
      )}

      {/* Create/Edit Dialog — one skinned dialog for both modes. */}
      <ClassroomFormDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        mode="create"
        isSaving={isSaving}
        onSubmit={handleCreate}
      />
      <ClassroomFormDialog
        open={isEditDialogOpen}
        onOpenChange={(open) => {
          setIsEditDialogOpen(open);
          if (!open) setSelectedClassroomId(null);
        }}
        mode="edit"
        initialName={selectedClassroom?.name ?? ''}
        initialLanguage={selectedClassroom?.language}
        isSaving={isSaving}
        onSubmit={handleEdit}
      />

      {/* Delete Confirmation */}
      <ConfirmationDialog
        open={isDeleteDialogOpen}
        onOpenChange={(open) => {
          setIsDeleteDialogOpen(open);
          if (!open) setSelectedClassroomId(null);
        }}
        title={t('teacher.classroom.delete')}
        description={t('teacher.classroom.confirmDelete')}
        confirmText={isSaving ? t('common.loading') : t('teacher.classroom.delete')}
        cancelText={t('common.cancel')}
        onConfirm={handleDelete}
        variant="danger"
      />

      {/* Class Limit Upsell Modal */}
      {upsellData && (
        <ClassLimitUpsellModal
          isOpen={isUpsellModalOpen}
          onClose={() => setIsUpsellModalOpen(false)}
          currentCount={upsellData.currentCount}
          limit={upsellData.limit}
        />
      )}

      {/* Trial-expiry nudge — the Pro ask at the create-flow entrance */}
      <ClassLimitUpsellModal
        isOpen={isTrialUpsellOpen}
        onClose={() => setIsTrialUpsellOpen(false)}
        currentCount={classrooms.length}
        limit={FREE_TIER_LIMITS.classes}
        reason="trial_expired"
        onContinueFree={() => {
          setIsTrialUpsellOpen(false);
          setIsCreateDialogOpen(true);
        }}
      />
    </div>
  );
}
