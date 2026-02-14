'use client';

import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useClassrooms } from '@/hooks/useClassroom';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader } from '@/components/ui/Loader';
import * as Dialog from '@radix-ui/react-dialog';
import * as AlertDialog from '@radix-ui/react-alert-dialog';
import { Plus, Copy, Link2, Edit2, Trash2, Users, X, ChevronDown, ChevronUp } from 'lucide-react';
import toast from 'react-hot-toast';
import type { Language } from '@/lib/supabase/education';
import ClassroomStudentList from './ClassroomStudentList';
import { ClassroomCardSkeleton, SkeletonGrid } from '@/components/ui/EducationSkeletons';

export default function ClassroomManager() {
  const { t, language } = useLanguage();
  const isRTL = language === 'he';
  const { classrooms, isLoading, createClassroom, updateClassroom, deleteClassroom, refresh } =
    useClassrooms();

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedClassroomId, setSelectedClassroomId] = useState<string | null>(null);
  const [expandedClassroomId, setExpandedClassroomId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', language: language as Language });
  const [isSaving, setIsSaving] = useState(false);

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
      toast.success(t('teacher.classroom.created').replace('{{date}}', 'just now'));
      setIsCreateDialogOpen(false);
      setFormData({ name: '', language: language as Language });
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
    navigator.clipboard.writeText(code);
    toast.success(t('teacher.classroom.codeCopied'));
  };

  const copyInviteLink = (code: string) => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const link = `${baseUrl}/${language}/join/${code}`;
    navigator.clipboard.writeText(link);
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
            'bg-neo-cyan text-neo-black font-neo-body font-bold',
            'border-neo border-neo-black shadow-hard hover:shadow-hard-pressed',
            'transition-all'
          )}
        >
          <Plus className={cn('w-5 h-5', isRTL ? 'ml-2' : 'mr-2')} />
          {t('teacher.classroom.create')}
        </Button>
      </div>

      {/* Classroom Grid */}
      {classrooms.length === 0 ? (
        <Card className="border-neo border-neo-black shadow-hard bg-neo-navy/50">
          <CardContent className="py-12 text-center">
            <Users className="w-12 h-12 text-neo-white/40 mx-auto mb-4" />
            <h3 className="text-xl font-neo-display text-neo-white mb-2 text-balance">
              {t('teacher.classroom.noClassrooms')}
            </h3>
            <p className="text-neo-white/60 mb-6 text-pretty">{t('teacher.classroom.createFirst')}</p>
            <Button
              onClick={() => {
                setFormData({ name: '', language: language as Language });
                setIsCreateDialogOpen(true);
              }}
              className="bg-neo-cyan text-neo-black font-bold shadow-hard hover:shadow-hard-pressed"
            >
              <Plus className={cn('w-5 h-5', isRTL ? 'ml-2' : 'mr-2')} />
              {t('teacher.classroom.create')}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {classrooms.map((classroom) => (
            <Card
              key={classroom.id}
              className="border-neo border-neo-black shadow-hard bg-neo-navy/80 hover:shadow-hard-lg transition-all"
            >
              <CardHeader className="pb-3">
                <CardTitle className="text-xl font-neo-display text-neo-white text-balance">
                  {classroom.name}
                </CardTitle>
                <p className="text-sm text-neo-white/60 mt-1">
                  {classroom.language.toUpperCase()} •{' '}
                  {classroom.member_count === 1
                    ? t('teacher.classroom.member')
                    : t('teacher.classroom.members').replace('{{count}}', String(classroom.member_count || 0))}
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Join Code */}
                <div className="bg-neo-black/30 border-neo border-neo-yellow p-3 rounded-neo">
                  <p className="text-xs text-neo-white/60 mb-1">{t('teacher.classroom.joinCode')}</p>
                  <div className="flex items-center justify-between">
                    <code className="text-2xl font-neo-display text-neo-yellow tracking-wider">
                      {classroom.join_code}
                    </code>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => copyJoinCode(classroom.join_code)}
                        className="text-neo-yellow hover:bg-neo-yellow/20"
                        aria-label={t('teacher.classroom.copyCode')}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => copyInviteLink(classroom.join_code)}
                        className="text-neo-cyan hover:bg-neo-cyan/20"
                        aria-label={t('teacher.classroom.copyLink')}
                      >
                        <Link2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* View Students Button */}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setExpandedClassroomId(expandedClassroomId === classroom.id ? null : classroom.id)}
                  className={cn(
                    'w-full border-neo-cyan text-neo-cyan hover:bg-neo-cyan/20',
                    'flex items-center justify-between'
                  )}
                >
                  <span className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    {t('teacher.classrooms.students.count').replace('{{count}}', String(classroom.member_count || 0))}
                  </span>
                  {expandedClassroomId === classroom.id ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </Button>

                {/* Student List (Expanded) */}
                {expandedClassroomId === classroom.id && (
                  <div className="mt-4">
                    <ClassroomStudentList classroomId={classroom.id} joinCode={classroom.join_code} />
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSelectedClassroomId(classroom.id);
                      setFormData({ name: classroom.name, language: classroom.language });
                      setIsEditDialogOpen(true);
                    }}
                    className="flex-1 border-neo-cyan text-neo-cyan hover:bg-neo-cyan/20"
                  >
                    <Edit2 className="w-4 h-4 mr-2" />
                    {t('teacher.classroom.edit')}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSelectedClassroomId(classroom.id);
                      setIsDeleteDialogOpen(true);
                    }}
                    className="border-neo-pink text-neo-pink hover:bg-neo-pink/20"
                    aria-label={t('teacher.classroom.delete')}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
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
              'w-full max-w-md p-6 bg-neo-navy border-neo border-neo-black shadow-hard-lg z-50',
              'rounded-neo'
            )}
          >
            <Dialog.Title className="text-2xl font-neo-display text-neo-white mb-4 text-balance">
              {isCreateDialogOpen ? t('teacher.classroom.create') : t('teacher.classroom.edit')}
            </Dialog.Title>
            <Dialog.Description className="sr-only">
              {isCreateDialogOpen
                ? t('teacher.classroom.dialog.createDescription')
                : t('teacher.classroom.dialog.editDescription')}
            </Dialog.Description>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-neo-body text-neo-white mb-2">
                  {t('teacher.classroom.name')}
                </label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder={t('teacher.classroom.namePlaceholder')}
                  className="border-neo border-neo-black shadow-hard-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-neo-body text-neo-white mb-2">
                  {t('teacher.classroom.language')}
                </label>
                <select
                  value={formData.language}
                  onChange={(e) => setFormData({ ...formData, language: e.target.value as Language })}
                  className={cn(
                    'w-full px-4 py-2 bg-neo-navy border-neo border-neo-black',
                    'text-neo-white font-neo-body shadow-hard-sm',
                    'focus:outline-none focus:ring-2 focus:ring-neo-cyan'
                  )}
                >
                  <option value="en">English</option>
                  <option value="he">Hebrew</option>
                  <option value="sv">Swedish</option>
                  <option value="ja">Japanese</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  onClick={isCreateDialogOpen ? handleCreate : handleEdit}
                  disabled={isSaving || !formData.name.trim()}
                  className="flex-1 bg-neo-cyan text-neo-black font-bold shadow-hard hover:shadow-hard-pressed"
                >
                  {isSaving ? t('common.loading') : isCreateDialogOpen ? t('teacher.classroom.create') : t('teacher.classroom.edit')}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsCreateDialogOpen(false);
                    setIsEditDialogOpen(false);
                    setSelectedClassroomId(null);
                  }}
                  className="border-neo-pink text-neo-pink hover:bg-neo-pink/20"
                >
                  {t('common.cancel')}
                </Button>
              </div>
            </div>

            <Dialog.Close asChild>
              <button
                className="absolute top-4 right-4 text-neo-white/60 hover:text-neo-white"
                aria-label={t('common.close')}
              >
                <X className="w-5 h-5" />
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
              'w-full max-w-md p-6 bg-neo-navy border-neo border-neo-black shadow-hard-lg z-50',
              'rounded-neo'
            )}
          >
            <AlertDialog.Title className="text-2xl font-neo-display text-neo-white mb-2 text-balance">
              {t('teacher.classroom.delete')}
            </AlertDialog.Title>
            <AlertDialog.Description className="text-neo-white/60 mb-6 text-pretty">
              {t('teacher.classroom.confirmDelete')}
            </AlertDialog.Description>

            <div className="flex gap-3">
              <AlertDialog.Action asChild>
                <Button
                  onClick={handleDelete}
                  disabled={isSaving}
                  className="flex-1 bg-neo-pink text-neo-black font-bold shadow-hard hover:shadow-hard-pressed"
                >
                  {isSaving ? t('common.loading') : t('teacher.classroom.delete')}
                </Button>
              </AlertDialog.Action>
              <AlertDialog.Cancel asChild>
                <Button variant="outline" className="border-neo-cyan text-neo-cyan hover:bg-neo-cyan/20">
                  {t('common.cancel')}
                </Button>
              </AlertDialog.Cancel>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </div>
  );
}
