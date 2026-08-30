'use client';

import { useEffect, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useClassrooms } from '@/hooks/useClassroom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import * as Dialog from '@radix-ui/react-dialog';
import * as AlertDialog from '@radix-ui/react-alert-dialog';
import { Plus, Copy, Share2, Edit2, Trash2, Users, X, ChevronDown, ChevronUp, GraduationCap } from 'lucide-react';
import { buildGoogleClassroomShareUrl } from '@/lib/education/googleClassroomShare';
import toast from 'react-hot-toast';
import { EDUCATION_LANGUAGES, type Language } from '@/lib/supabase/education/types';
import ClassroomStudentList from './ClassroomStudentList';
import ClassLimitUpsellModal from './ClassLimitUpsellModal';
import CreateClassroomWizard from './CreateClassroomWizard';
import { ClassroomCardSkeleton, SkeletonGrid } from '@/components/ui/EducationSkeletons';
import { fireConfetti } from '@/utils/confettiUtils';
import { shareWithFallback } from '@/utils/shareWithFallback';
import { classroomInvitePayload } from '@/lib/education/classroomInvitePayload';

const LANGUAGE_LABEL_KEYS: Record<Language, string> = {
  en: 'languages.english',
  he: 'languages.hebrew',
  sv: 'languages.swedish',
  ja: 'languages.japanese',
  es: 'languages.spanish',
  ru: 'languages.russian',
};

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
  const [formData, setFormData] = useState({ name: '', language: language as Language });
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
      setFormData({ name: '', language: language as Language });
      setIsCreateDialogOpen(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoOpenCreate]);

  const handleCreate = async () => {
    if (!formData.name.trim()) {
      toast.error(t('teacher.classroom.validation.nameRequired'));
      return;
    }

    setIsSaving(true);
    const result = await createClassroom(formData.name.trim(), formData.language);
    setIsSaving(false);

    if (result.success) {
      fireConfetti();
      toast.success(t('teacher.classroom.success.created', 'Classroom created!'));
      setIsCreateDialogOpen(false);
      setFormData({ name: '', language: language as Language });
      if (result.data?.id && result.data.join_code) {
        setCreatedClassroom({
          id: result.data.id,
          name: result.data.name,
          join_code: result.data.join_code,
        });
        setExpandedClassroomId(result.data.id);
      }
    } else if (result.code === 'CLASS_LIMIT_REACHED' && result.currentCount !== undefined && result.limit !== undefined) {
      // Show upsell modal for class limit
      setUpsellData({ currentCount: result.currentCount, limit: result.limit ?? 2 });
      setIsUpsellModalOpen(true);
      setIsCreateDialogOpen(false);
    } else {
      toast.error(result.error || t('teacher.classroom.error.createFailed'));
    }
  };

  const handleEdit = async () => {
    if (!selectedClassroomId || !formData.name.trim()) return;

    setIsSaving(true);
    const result = await updateClassroom(selectedClassroomId, {
      name: formData.name.trim(),
      language: formData.language,
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
    setFormData({ name: '', language: language as Language });
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
            'border-3 border-black shadow-hard hover:-translate-y-0.5 hover:shadow-hard-lg active:translate-y-0.5',
            'transition-all'
          )}
        >
          <Plus className="w-5 h-5 me-2" />
          {t('teacher.classroom.create')}
        </Button>
      </div>

      {createdClassroom && (
        <div
          data-testid="classroom-created-banner"
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
                className="bg-neo-cyan text-black font-black border-2 border-black shadow-hard-sm hover:-translate-y-0.5 transition-all"
              >
                <Copy className="w-4 h-4 me-2" />
                {t('teacher.classroom.copyCode')}
              </Button>
              <Button
                type="button"
                onClick={() => shareInvite(createdClassroom.name, createdClassroom.join_code)}
                className="bg-neo-cream text-black font-black border-2 border-black shadow-hard-sm hover:-translate-y-0.5 transition-all"
              >
                <Share2 className="w-4 h-4 me-2" />
                {t('teacher.classroom.share', 'Share')}
              </Button>
              {googleClassroomHref(createdClassroom.name, createdClassroom.join_code) && (
                <a
                  href={googleClassroomHref(createdClassroom.name, createdClassroom.join_code)!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-neo border-2 border-black bg-neo-white px-4 py-2 text-sm font-black text-black shadow-hard-sm transition-all hover:-translate-y-0.5"
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
        </div>
      )}

      {/* Classroom Grid */}
      {classrooms.length === 0 ? (
        <CreateClassroomWizard onCreateClassroom={openCreateDialog} />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {classrooms.map((classroom, idx) => {
            // Alternate card accent colors
            const headerColors = ['bg-neo-cyan', 'bg-neo-lime', 'bg-neo-pink'];
            const headerBg = headerColors[idx % headerColors.length];

            return (
              <div
                key={classroom.id}
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
                        className="flex-1 min-h-11 bg-neo-cyan text-black font-black border-2 border-black shadow-hard-sm hover:-translate-y-0.5 transition-all"
                        aria-label={t('teacher.classroom.copyCode')}
                      >
                        <Copy className="w-4 h-4 me-2" />
                        {t('teacher.classroom.copyCode')}
                      </Button>
                      <Button
                        type="button"
                        data-testid="share-join-code"
                        onClick={() => shareInvite(classroom.name, classroom.join_code)}
                        className="flex-1 min-h-11 bg-neo-cream text-black font-black border-2 border-black shadow-hard-sm hover:-translate-y-0.5 transition-all"
                        aria-label={t('teacher.classroom.share', 'Share')}
                      >
                        <Share2 className="w-4 h-4 me-2" />
                        {t('teacher.classroom.share', 'Share')}
                      </Button>
                    </div>
                    {googleClassroomHref(classroom.name, classroom.join_code) && (
                      <a
                        href={googleClassroomHref(classroom.name, classroom.join_code)!}
                        target="_blank"
                        rel="noopener noreferrer"
                        data-testid="share-to-google-classroom"
                        className="mt-2 flex min-h-11 items-center justify-center gap-2 rounded-neo border-2 border-black bg-neo-white px-3 text-sm font-black text-black shadow-hard-sm transition-all hover:-translate-y-0.5"
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
                    {expandedClassroomId === classroom.id ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </button>

                  {/* Student List (Expanded) */}
                  {expandedClassroomId === classroom.id && (
                    <div>
                      <ClassroomStudentList classroomId={classroom.id} joinCode={classroom.join_code} />
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => {
                        setSelectedClassroomId(classroom.id);
                        setFormData({ name: classroom.name, language: classroom.language });
                        setIsEditDialogOpen(true);
                      }}
                      className="flex-1 bg-neo-cyan text-black font-black border-2 border-black shadow-hard-sm hover:-translate-y-0.5 transition-all"
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
                      className="bg-neo-pink text-black font-black border-2 border-black shadow-hard-sm hover:-translate-y-0.5 transition-all"
                      aria-label={t('teacher.classroom.delete')}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog.Root
        open={isCreateDialogOpen || isEditDialogOpen}
        onOpenChange={(open) => {
          setIsCreateDialogOpen(open && isCreateDialogOpen);
          setIsEditDialogOpen(open && isEditDialogOpen);
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-neo-black/80 z-50" />
          <Dialog.Content
            className={cn(
              'fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
              'w-full max-w-md bg-neo-cream border-3 border-black shadow-hard-lg z-50',
              'rounded-neo overflow-hidden'
            )}
          >
            <div className="bg-neo-cyan px-6 py-4 border-b-3 border-black">
              <Dialog.Title className="text-2xl font-neo-display font-black text-black text-balance">
                {isCreateDialogOpen ? t('teacher.classroom.create') : t('teacher.classroom.edit')}
              </Dialog.Title>
            </div>
            <Dialog.Description className="sr-only">
              {isCreateDialogOpen
                ? t('teacher.classroom.dialog.createDescription')
                : t('teacher.classroom.dialog.editDescription')}
            </Dialog.Description>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-neo-body font-black text-black mb-2">
                  {t('teacher.classroom.name')}
                </label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder={t('teacher.classroom.namePlaceholder')}
                  className="border-2 border-black shadow-hard-sm font-bold"
                />
              </div>

              <div>
                <label className="block text-sm font-neo-body font-black text-black mb-2">
                  {t('teacher.classroom.language')}
                </label>
                <select
                  value={formData.language}
                  onChange={(e) => setFormData({ ...formData, language: e.target.value as Language })}
                  className={cn(
                    'w-full px-4 py-2 bg-neo-cream border-2 border-black',
                    'text-black font-neo-body font-bold shadow-hard-sm rounded-neo',
                    'focus:outline-hidden focus:ring-2 focus:ring-neo-cyan'
                  )}
                >
                  {EDUCATION_LANGUAGES.map((code) => (
                    <option key={code} value={code}>{t(LANGUAGE_LABEL_KEYS[code])}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  onClick={isCreateDialogOpen ? handleCreate : handleEdit}
                  disabled={isSaving || !formData.name.trim()}
                  className="flex-1 bg-neo-cyan text-black font-black border-2 border-black shadow-hard hover:-translate-y-0.5 transition-all"
                >
                  {isSaving ? t('common.loading') : isCreateDialogOpen ? t('teacher.classroom.create') : t('teacher.classroom.edit')}
                </Button>
                <Button
                  onClick={() => {
                    setIsCreateDialogOpen(false);
                    setIsEditDialogOpen(false);
                    setSelectedClassroomId(null);
                  }}
                  className="bg-neo-cream text-black font-black border-2 border-black shadow-hard-sm hover:bg-black/5 transition-all"
                >
                  {t('common.cancel')}
                </Button>
              </div>
            </div>

            <Dialog.Close asChild>
              <button
                className="absolute top-4 inset-e-4 w-8 h-8 flex items-center justify-center rounded-neo border-2 border-black bg-neo-cream text-black hover:bg-black hover:text-white transition-all shadow-hard-sm"
                aria-label={t('common.close')}
              >
                <X className="w-4 h-4" />
              </button>
            </Dialog.Close>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Delete Confirmation Dialog */}
      <AlertDialog.Root open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialog.Portal>
          <AlertDialog.Overlay className="fixed inset-0 bg-neo-black/80 z-50" />
          <AlertDialog.Content
            className={cn(
              'fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
              'w-full max-w-md bg-neo-cream border-3 border-black shadow-hard-lg z-50',
              'rounded-neo overflow-hidden'
            )}
          >
            <div className="bg-neo-pink px-6 py-4 border-b-3 border-black">
              <AlertDialog.Title className="text-2xl font-neo-display font-black text-black text-balance">
                {t('teacher.classroom.delete')}
              </AlertDialog.Title>
            </div>
            <div className="p-6">
              <AlertDialog.Description className="text-black/70 font-bold mb-6 text-pretty">
                {t('teacher.classroom.confirmDelete')}
              </AlertDialog.Description>

              <div className="flex gap-3">
                <AlertDialog.Action asChild>
                  <Button
                    onClick={handleDelete}
                    disabled={isSaving}
                    className="flex-1 bg-neo-pink text-black font-black border-2 border-black shadow-hard hover:-translate-y-0.5 transition-all"
                  >
                    {isSaving ? t('common.loading') : t('teacher.classroom.delete')}
                  </Button>
                </AlertDialog.Action>
                <AlertDialog.Cancel asChild>
                  <Button className="bg-neo-cream text-black font-black border-2 border-black shadow-hard-sm hover:bg-black/5 transition-all">
                    {t('common.cancel')}
                  </Button>
                </AlertDialog.Cancel>
              </div>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>

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
