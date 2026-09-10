'use client';

import { useEffect, useState } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { useClassrooms } from '@/hooks/useClassroom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ConfirmationDialog } from '@/components/ui/ConfirmationDialog';
import { Plus, Copy, Share2, Edit2, Trash2, Users, ChevronDown, ChevronUp, GraduationCap } from 'lucide-react';
import { buildGoogleClassroomShareUrl } from '@/lib/education/googleClassroomShare';
import toast from 'react-hot-toast';
import { type Language } from '@/lib/supabase/education/types';
import ClassroomStudentList from './ClassroomStudentList';
import ClassLimitUpsellModal from './ClassLimitUpsellModal';
import CreateClassroomWizard from './CreateClassroomWizard';
import { ClassroomFormDialog } from './ClassroomFormDialog';
import { ClassroomCardSkeleton, SkeletonGrid } from '@/components/ui/EducationSkeletons';
import { fireConfetti } from '@/utils/confettiUtils';
import { shareWithFallback } from '@/utils/shareWithFallback';
import { classroomInvitePayload } from '@/lib/education/classroomInvitePayload';
import { FREE_TIER_LIMITS } from '@/lib/education/freeTierLimits';
import { trackEduClassroomCreated } from '@/lib/education/telemetry';
import { stagger, slideUp } from './teacherDashboardTabs';

// Re-exported for the existing contract test; the map itself is shared with the
// lobby language chips (lib/i18n/languageLabels.ts) so it can only drift once.
export { LANGUAGE_LABEL_KEYS } from '@/lib/i18n/languageLabels';

interface ClassroomManagerProps {
  autoOpenCreate?: boolean;
}

export default function ClassroomManager({ autoOpenCreate }: ClassroomManagerProps = {}) {
  const { t, language } = useLanguage();
  const isRTL = language === 'he';
  const { classrooms, isLoading, createClassroom, updateClassroom, deleteClassroom } =
    useClassrooms();

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isUpsellModalOpen, setIsUpsellModalOpen] = useState(false);
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

  // If the parent asks us to open the create dialog (e.g. from the dashboard header
  // shortcut or a deep-link), open it once on mount.
  useEffect(() => {
    if (autoOpenCreate) {
      setIsCreateDialogOpen(true);
    }
     
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

  const openCreateDialog = () => {
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
    <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Create Classroom Button */}
      <div className="flex justify-between items-center">
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

      {/* Classroom Grid — one column on phones, two on tablets, three on desktop.
          Previously 1 -> 3 at lg, which left the most common tablet layout
          (a teacher holding the class iPad portrait) with a single mile-wide card. */}
      {classrooms.length === 0 ? (
        <CreateClassroomWizard onCreateClassroom={openCreateDialog} />
      ) : (
        <m.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
          variants={stagger}
          initial="hidden"
          animate="visible"
        >
          {classrooms.map((classroom, idx) => {
            // Alternate card accent colors
            const headerColors = ['bg-neo-cyan', 'bg-neo-lime', 'bg-neo-pink'];
            const headerBg = headerColors[idx % headerColors.length];

            return (
              <m.div
                key={classroom.id}
                variants={slideUp}
                className="border-3 border-black rounded-neo shadow-hard bg-neo-cream overflow-hidden hover:-translate-y-0.5 hover:shadow-hard-lg transition-all"
              >
                {/* Colored header */}
                <div className={cn('px-5 py-4', headerBg)}>
                  <h3 className="text-xl font-neo-display font-black text-black text-balance truncate">
                    {classroom.name}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="px-2 py-0.5 bg-black text-white text-xs font-black rounded-neo">
                      {classroom.language.toUpperCase()}
                    </span>
                    <span className="text-sm text-black/70 font-bold">
                      {classroom.member_count === 1
                        ? t('teacher.classroom.member')
                        : t('teacher.classroom.members', { count: classroom.member_count || 0 })}
                    </span>
                  </div>
                </div>

                {/* Card body — join code is the hero */}
                <div className="p-4 space-y-3">
                  <div className="bg-neo-yellow border-3 border-black p-4 rounded-neo shadow-hard-sm">
                    <p
                      data-testid="invite-students-label"
                      className="text-xs font-neo-body font-black uppercase tracking-wide text-black mb-2"
                    >
                      {t('teacher.classroom.inviteStudents', 'Invite students')}
                    </p>
                    <code
                      data-testid="classroom-join-code"
                      className="block text-4xl sm:text-5xl font-neo-display font-black text-black tracking-wider tabular-nums text-center"
                    >
                      {classroom.join_code}
                    </code>
                    <div className="mt-3 flex gap-2">
                      <Button
                        type="button"
                        data-testid="copy-join-code"
                        onClick={() => copyJoinCode(classroom.join_code)}
                        className="flex-1 min-h-11 bg-neo-cyan text-black font-black border-2 border-black shadow-hard-sm hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-hard-pressed transition-all"
                        aria-label={t('teacher.classroom.copyCode')}
                      >
                        <Copy className="w-4 h-4 me-2" />
                        {t('teacher.classroom.copyCode')}
                      </Button>
                      <Button
                        type="button"
                        data-testid="share-join-code"
                        onClick={() => shareInvite(classroom.name, classroom.join_code)}
                        className="flex-1 min-h-11 bg-neo-cream text-black font-black border-2 border-black shadow-hard-sm hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-hard-pressed transition-all"
                        aria-label={t('teacher.classroom.share')}
                      >
                        <Share2 className="w-4 h-4 me-2" />
                        {t('teacher.classroom.share')}
                      </Button>
                    </div>
                    {googleClassroomHref(classroom.name, classroom.join_code) && (
                      <a
                        href={googleClassroomHref(classroom.name, classroom.join_code)!}
                        target="_blank"
                        rel="noopener noreferrer"
                        data-testid="share-to-google-classroom"
                        className="mt-2 flex min-h-11 items-center justify-center gap-2 rounded-neo border-2 border-black bg-neo-white px-3 text-sm font-black text-black shadow-hard-sm transition-all hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-hard-pressed"
                      >
                        <GraduationCap className="w-4 h-4" />
                        {t('teacher.classroom.googleClassroom', 'Post to Google Classroom')}
                      </a>
                    )}
                  </div>

                  {/* View Students Button */}
                  <button
                    type="button"
                    onClick={() => setExpandedClassroomId(expandedClassroomId === classroom.id ? null : classroom.id)}
                    aria-expanded={expandedClassroomId === classroom.id}
                    className={cn(
                      'w-full flex items-center justify-between px-3 py-2 rounded-neo border-2 border-black font-bold text-sm transition-all shadow-hard-sm',
                      expandedClassroomId === classroom.id
                        ? 'bg-black text-white'
                        : 'bg-neo-cream text-black hover:bg-black/5'
                    )}
                  >
                    <span className="flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      {t('teacher.classrooms.students.count', { count: classroom.member_count || 0 })}
                    </span>
                    <ChevronDown
                      className={cn(
                        'w-4 h-4 shrink-0 transition-transform',
                        expandedClassroomId === classroom.id && 'rotate-180'
                      )}
                    />
                  </button>

                  {/* Student List (Expanded) — AnimatePresence so the roster
                      slides in and out instead of popping the layout. */}
                  <AnimatePresence initial={false}>
                    {expandedClassroomId === classroom.id && (
                      <m.div
                        key="student-list"
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                      >
                        <ClassroomStudentList classroomId={classroom.id} joinCode={classroom.join_code} />
                      </m.div>
                    )}
                  </AnimatePresence>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => {
                        setSelectedClassroomId(classroom.id);
                        setIsEditDialogOpen(true);
                      }}
                      className="flex-1 bg-neo-cyan text-black font-black border-2 border-black shadow-hard-sm hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-hard-pressed transition-all"
                    >
                      <Edit2 className="w-4 h-4 me-2" />
                      {t('teacher.classroom.edit')}
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => {
                        setSelectedClassroomId(classroom.id);
                        setIsDeleteDialogOpen(true);
                      }}
                      className="bg-neo-pink text-black font-black border-2 border-black shadow-hard-sm hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-hard-pressed transition-all"
                      aria-label={t('teacher.classroom.delete')}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </m.div>
            );
          })}
        </m.div>
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
    </div>
  );
}
