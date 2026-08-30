'use client';

import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useClassrooms } from '@/hooks/useClassroom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader } from '@/components/ui/Loader';
import * as Dialog from '@radix-ui/react-dialog';
import * as AlertDialog from '@radix-ui/react-alert-dialog';
import { Plus, Copy, Link2, Edit2, Trash2, Users, X, ChevronDown, ChevronUp, Monitor } from 'lucide-react';
import toast from 'react-hot-toast';
import { EDUCATION_LANGUAGES, type Language } from '@/lib/supabase/education/types';
import ClassroomStudentList from './ClassroomStudentList';
import ClassLimitUpsellModal from './ClassLimitUpsellModal';
import ClassroomInvitePresenter from './ClassroomInvitePresenter';
import { ClassroomCardSkeleton, SkeletonGrid } from '@/components/ui/EducationSkeletons';

const LANGUAGE_LABEL_KEYS: Record<Language, string> = {
  en: 'languages.english',
  he: 'languages.hebrew',
  sv: 'languages.swedish',
  ja: 'languages.japanese',
  es: 'languages.spanish',
  ru: 'languages.russian',
};

export default function ClassroomManager() {
  const { t, language } = useLanguage();
  const isRTL = language === 'he';
  const { classrooms, isLoading, createClassroom, updateClassroom, deleteClassroom, refresh } =
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
  const [presenterClassroomId, setPresenterClassroomId] = useState<string | null>(null);

  const selectedClassroom = classrooms.find((c) => c.id === selectedClassroomId);

  const handleCreate = async () => {
    if (!formData.name.trim()) {
      toast.error(t('teacher.classroom.validation.nameRequired'));
      return;
    }

    setIsSaving(true);
    const result = await createClassroom(formData.name.trim(), formData.language);
    setIsSaving(false);

    if (result.success) {
      toast.success(t('teacher.classroom.created', { date: 'just now' }));
      setIsCreateDialogOpen(false);
      setFormData({ name: '', language: language as Language });
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
    navigator.clipboard.writeText(code).catch(() => {});
    toast.success(t('teacher.classroom.codeCopied'));
  };

  const copyInviteLink = (code: string) => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const link = `${baseUrl}/${language}/join/${code}`;
    navigator.clipboard.writeText(link).catch(() => {});
    toast.success(t('teacher.classroom.linkCopied'));
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
    <div className="space-y-6">
      {/* Create Classroom Button */}
      <div className="flex justify-between items-center">
        <Button
          onClick={() => {
            setFormData({ name: '', language: language as Language });
            setIsCreateDialogOpen(true);
          }}
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

      {/* Classroom Grid / Zero-State */}
      {classrooms.length === 0 ? (
        <div className="border-3 border-black rounded-neo bg-neo-cream shadow-hard p-8">
          <div className="text-center mb-8 max-w-md mx-auto">
            <div className="w-16 h-16 rounded-neo bg-neo-cyan border-2 border-black flex items-center justify-center mx-auto mb-4 shadow-hard-sm">
              <Users className="w-9 h-9 text-black" />
            </div>
            <h3 className="text-xl font-neo-display font-black text-black mb-2 text-balance">
              {t('teacher.classroom.noClassrooms')}
            </h3>
            <p className="text-black/60 font-bold text-pretty">{t('teacher.classroom.createFirst')}</p>
          </div>

          {/* Inline Create Form - Zero State */}
          <div className="space-y-4 max-w-md mx-auto">
            <div>
              <label className="block text-sm font-neo-body font-black text-black mb-2">
                {t('teacher.classroom.name')}
              </label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder={t('teacher.classroom.namePlaceholder')}
                className="border-2 border-black shadow-hard-sm font-bold w-full"
                autoFocus
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

            <Button
              onClick={handleCreate}
              disabled={isSaving || !formData.name.trim()}
              className="w-full bg-neo-cyan text-black font-black border-2 border-black shadow-hard hover:-translate-y-0.5 transition-all"
            >
              {isSaving ? t('common.loading') : t('teacher.classroom.create')}
            </Button>
          </div>
        </div>
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

                {/* Card body */}
                <div className="p-4 space-y-3">
                  {/* Join Code */}
                  <div className="bg-neo-lime/20 border-2 border-black p-3 rounded-neo">
                    <p className="text-xs text-black/60 font-bold mb-1">{t('teacher.classroom.joinCode')}</p>
                    <div className="flex items-center justify-between">
                      <code className="text-2xl font-neo-display font-black text-black tracking-wider">
                        {classroom.join_code}
                      </code>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => copyJoinCode(classroom.join_code)}
                          className="text-black hover:bg-black/10 border border-black/20 rounded-neo"
                          aria-label={t('teacher.classroom.copyCode')}
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => copyInviteLink(classroom.join_code)}
                          className="text-black hover:bg-black/10 border border-black/20 rounded-neo"
                          aria-label={t('teacher.classroom.copyLink')}
                        >
                          <Link2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
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
                      onClick={() => setPresenterClassroomId(classroom.id)}
                      className="flex-1 bg-neo-lime text-black font-black border-2 border-black shadow-hard-sm hover:-translate-y-0.5 transition-all"
                      aria-label={t('teacher.classroom.presenter.present')}
                    >
                      <Monitor className="w-4 h-4 me-2" />
                      {t('teacher.classroom.presenter.present')}
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => {
                        setSelectedClassroomId(classroom.id);
                        setFormData({ name: classroom.name, language: classroom.language });
                        setIsEditDialogOpen(true);
                      }}
                      className="bg-neo-cyan text-black font-black border-2 border-black shadow-hard-sm hover:-translate-y-0.5 transition-all"
                    >
                      <Edit2 className="w-4 h-4" />
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

      {/* Classroom Invite Presenter */}
      {presenterClassroomId && (
        <ClassroomInvitePresenter
          joinCode={classrooms.find((c) => c.id === presenterClassroomId)?.join_code || ''}
          joinUrl={
            typeof window !== 'undefined'
              ? `${window.location.origin}/${language}/student/join/${classrooms.find((c) => c.id === presenterClassroomId)?.join_code || ''}`
              : ''
          }
          classroomName={classrooms.find((c) => c.id === presenterClassroomId)?.name || ''}
          onClose={() => setPresenterClassroomId(null)}
        />
      )}
    </div>
  );
}
