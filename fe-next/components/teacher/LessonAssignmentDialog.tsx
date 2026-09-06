'use client';

import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useClassrooms } from '@/hooks/useClassroom';
import { useAssignLesson } from '@/hooks/useLessons';
import { cn } from '@/lib/utils';
import * as Dialog from '@radix-ui/react-dialog';
import { X, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Loader } from '@/components/ui/Loader';
import toast from 'react-hot-toast';

interface LessonAssignmentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  lessonId: string;
  lessonName: string;
}

export default function LessonAssignmentDialog({
  isOpen,
  onClose,
  lessonId,
  lessonName,
}: LessonAssignmentDialogProps) {
  const { t } = useLanguage();
  const { classrooms, isLoading: isLoadingClassrooms } = useClassrooms();
  const { assignLesson, isAssigning } = useAssignLesson();

  const [selectedClassroomId, setSelectedClassroomId] = useState<string>('');

  // Reset selected classroom when dialog opens
  useEffect(() => {
    if (isOpen) {
      setSelectedClassroomId('');
    }
  }, [isOpen]);

  const handleAssign = async () => {
    if (!selectedClassroomId) {
      toast.error(t('teacher.lessons.assign.selectClassroom'));
      return;
    }

    const result = await assignLesson(lessonId, selectedClassroomId);

    if (result.success) {
      toast.success(t('teacher.lessons.assign.success'));
      onClose();
    } else {
      if (result.error === 'already_assigned') {
        toast.error(t('teacher.lessons.assign.alreadyAssigned'));
      } else {
        toast.error(result.error || t('teacher.lessons.assign.error'));
      }
    }
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-neo-black/80 z-50" />
        <Dialog.Content
          className={cn(
            'fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
            'w-full max-w-md p-6',
            'bg-neo-navy border-neo border-neo-black shadow-hard-lg z-50 rounded-neo'
          )}
        >
          <Dialog.Title className="text-2xl font-neo-display text-neo-white mb-2">
            {t('teacher.lessons.assign.title')}
          </Dialog.Title>
          <Dialog.Description className="text-sm text-neo-white mb-6">
            {t('teacher.lessons.assign.lessonLabel')}: <span className="text-neo-cyan font-bold">{lessonName}</span>
          </Dialog.Description>

          <div className="space-y-4">
            {/* Classroom Selection */}
            <div>
              <label className="block text-sm font-neo-body text-neo-white mb-2">
                {t('teacher.lessons.assign.classroomLabel')}
              </label>

              {isLoadingClassrooms ? (
                <div className="flex justify-center py-4">
                  <Loader size="sm" />
                </div>
              ) : classrooms.length === 0 ? (
                <div className="bg-neo-black/30 border-neo border-neo-lime p-4 rounded-neo">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-neo-lime shrink-0 mt-0.5" />
                    <p className="text-sm text-neo-white">
                      {t('teacher.lessons.assign.noClassrooms')}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {classrooms.map((classroom) => (
                    <button type="button"
                      key={classroom.id}
                      onClick={() => setSelectedClassroomId(classroom.id)}
                      className={cn(
                        'w-full p-3 rounded-neo border-neo transition-all',
                        'text-start font-neo-body',
                        selectedClassroomId === classroom.id
                          ? 'bg-neo-cyan/20 border-neo-cyan text-neo-white shadow-hard-sm'
                          : 'bg-neo-navy/50 border-neo-black text-neo-white hover:bg-neo-navy/80'
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="font-bold text-base">{classroom.name}</div>
                          <div className="text-xs text-neo-white mt-1">
                            {classroom.language.toUpperCase()} •{' '}
                            {classroom.member_count === 1
                              ? t('teacher.classroom.member')
                              : t('teacher.classroom.members', { count: classroom.member_count })}
                          </div>
                        </div>
                        {selectedClassroomId === classroom.id && (
                          <CheckCircle className="w-5 h-5 text-neo-cyan shrink-0" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4 border-t border-neo-black/30">
              <Button
                onClick={handleAssign}
                disabled={isAssigning || !selectedClassroomId || classrooms.length === 0}
                className="flex-1 bg-neo-cyan text-neo-black font-bold shadow-hard hover:shadow-hard-pressed disabled:opacity-50"
              >
                {isAssigning ? t('teacher.lessons.assign.assigning') : t('teacher.lessons.assign.button')}
              </Button>
              <Button
                variant="outline"
                onClick={onClose}
                disabled={isAssigning}
                className="border-neo-pink text-neo-pink hover:bg-neo-pink/20"
              >
                {t('common.cancel')}
              </Button>
            </div>
          </div>

          <Dialog.Close asChild>
            <button type="button"
              className="absolute top-4 end-4 text-neo-white hover:text-neo-white"
              aria-label="Close"
              disabled={isAssigning}
            >
              <X className="w-5 h-5" />
            </button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
