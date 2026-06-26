'use client';

import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useAssignments } from '@/hooks/useAssignments';
import { useLessons } from '@/hooks/useVocabularyLesson';
import { cn } from '@/lib/utils';
import * as Dialog from '@radix-ui/react-dialog';
import { X, Calendar, Swords, BookOpen, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import toast from 'react-hot-toast';

interface AssignmentCreatorProps {
  classroomId: string;
  onComplete: () => void;
  isOpen: boolean;
  onClose: () => void;
}

type AssignmentType = 'practice' | 'duel';

export default function AssignmentCreator({
  classroomId,
  onComplete,
  isOpen,
  onClose,
}: AssignmentCreatorProps) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { createAssignment } = useAssignments(classroomId);
  const { lessons, isLoading: isLoadingLessons } = useLessons();

  const [selectedType, setSelectedType] = useState<AssignmentType>('practice');
  const [selectedLessonId, setSelectedLessonId] = useState<string>('');
  const [dueDate, setDueDate] = useState<string>('');
  const [instructions, setInstructions] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Reset form when dialog opens
  useEffect(() => {
    if (isOpen) {
      setSelectedType('practice');
      setSelectedLessonId('');
      setDueDate('');
      setInstructions('');
    }
  }, [isOpen]);

  const handleQuickDate = (days: number) => {
    const date = new Date();
    date.setDate(date.getDate() + days);
    setDueDate(date.toISOString().split('T')[0]);
    setShowDatePicker(false);
  };

  const handleSubmit = async () => {
    if (!selectedLessonId || !dueDate || !user) {
      toast.error(t('teacher.assignment.missingFields'));
      return;
    }

    setIsSubmitting(true);

    const result = await createAssignment({
      classroom_id: classroomId,
      lesson_id: selectedLessonId,
      teacher_id: user.id,
      assignment_type: selectedType,
      due_date: dueDate,
      instructions: instructions || null,
    });

    setIsSubmitting(false);

    if (result.success) {
      toast.success(t('teacher.assignment.created'));
      onComplete();
      onClose();
    } else {
      toast.error(result.error || t('teacher.assignment.error'));
    }
  };

  const selectedLesson = lessons.find(l => l.id === selectedLessonId);

  return (
    <Dialog.Root open={isOpen} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-neo-black/80 z-50" />
        <Dialog.Content
          className={cn(
            'fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
            'w-full max-w-xl p-6',
            'bg-neo-navy border-neo border-neo-black shadow-hard-lg z-50 rounded-neo'
          )}
        >
          <Dialog.Title className="text-2xl font-neo-display text-neo-white mb-4">
            {t('teacher.assignment.createTitle')}
          </Dialog.Title>

          <div className="space-y-5">
            {/* Assignment Type Selector */}
            <div>
              <label className="block text-sm font-neo-body text-neo-white mb-2">
                {t('teacher.assignment.typeLabel')}
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedType('practice')}
                  className={cn(
                    'p-4 rounded-neo border-neo transition-all',
                    'flex flex-col items-center gap-2',
                    selectedType === 'practice'
                      ? 'bg-neo-cyan border-neo-cyan text-neo-black shadow-hard-sm'
                      : 'bg-neo-navy/50 border-neo-black text-neo-white hover:bg-neo-navy/80'
                  )}
                >
                  <BookOpen className="w-8 h-8" />
                  <span className="font-bold">{t('teacher.assignment.practiceMode')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedType('duel')}
                  className={cn(
                    'p-4 rounded-neo border-neo transition-all',
                    'flex flex-col items-center gap-2',
                    selectedType === 'duel'
                      ? 'bg-neo-pink border-neo-pink text-neo-black shadow-hard-sm'
                      : 'bg-neo-navy/50 border-neo-black text-neo-white hover:bg-neo-navy/80'
                  )}
                >
                  <Swords className="w-8 h-8" />
                  <span className="font-bold">{t('teacher.assignment.duelChallenge')}</span>
                </button>
              </div>
            </div>

            {/* Lesson Selector */}
            <div>
              <label className="block text-sm font-neo-body text-neo-white mb-2">
                {t('teacher.assignment.lessonLabel')}
              </label>
              <select
                value={selectedLessonId}
                onChange={(e) => setSelectedLessonId(e.target.value)}
                className="w-full p-3 rounded-neo border-neo border-neo-black bg-neo-navy text-neo-white font-neo-body"
                disabled={isLoadingLessons}
              >
                <option value="">{t('teacher.assignment.selectLesson')}</option>
                {lessons.map((lesson) => (
                  <option key={lesson.id} value={lesson.id}>
                    {lesson.name} ({lesson.words.length} {t('teacher.assignment.words')})
                  </option>
                ))}
              </select>
            </div>

            {/* Due Date Picker */}
            <div>
              <label className="block text-sm font-neo-body text-neo-white mb-2">
                {t('teacher.assignment.dueDate')}
              </label>
              <button
                type="button"
                onClick={() => setShowDatePicker(!showDatePicker)}
                className="w-full p-3 rounded-neo border-neo border-neo-black bg-neo-navy text-neo-white font-neo-body flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  <span>{dueDate || t('teacher.assignment.selectDate')}</span>
                </div>
                <ChevronDown className={cn('w-5 h-5 transition-transform', showDatePicker && 'rotate-180')} />
              </button>
              {showDatePicker && (
                <div className="mt-2 p-4 bg-neo-navy border-neo border-neo-black rounded-neo shadow-hard space-y-3">
                  <div className="text-sm font-neo-body text-neo-white mb-2">
                    {t('teacher.assignment.quickSelect')}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      onClick={() => handleQuickDate(0)}
                      className="bg-neo-cyan/20 border-neo border-neo-cyan text-neo-cyan hover:bg-neo-cyan/30"
                    >
                      {t('teacher.assignment.today')}
                    </Button>
                    <Button
                      onClick={() => handleQuickDate(1)}
                      className="bg-neo-cyan/20 border-neo border-neo-cyan text-neo-cyan hover:bg-neo-cyan/30"
                    >
                      {t('teacher.assignment.tomorrow')}
                    </Button>
                    <Button
                      onClick={() => handleQuickDate(7)}
                      className="bg-neo-cyan/20 border-neo border-neo-cyan text-neo-cyan hover:bg-neo-cyan/30"
                    >
                      {t('teacher.assignment.nextWeek')}
                    </Button>
                    <Button
                      onClick={() => handleQuickDate(30)}
                      className="bg-neo-cyan/20 border-neo border-neo-cyan text-neo-cyan hover:bg-neo-cyan/30"
                    >
                      {t('teacher.assignment.nextMonth')}
                    </Button>
                  </div>
                  <div className="border-t border-neo-black/30 pt-3">
                    <label className="block text-xs text-neo-white mb-1">
                      {t('teacher.assignment.customDate')}
                    </label>
                    <input
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      aria-label={t('teacher.assignment.customDate')}
                      className="w-full p-2 rounded-neo border-neo border-neo-black bg-neo-navy text-neo-white text-sm"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Optional Instructions */}
            <div>
              <label className="block text-sm font-neo-body text-neo-white mb-2">
                {t('teacher.assignment.instructionsLabel')} {t('common.optional')}
              </label>
              <textarea
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                rows={3}
                aria-label={t('teacher.assignment.instructionsLabel')}
                className="w-full p-3 rounded-neo border-neo border-neo-black bg-neo-navy text-neo-white font-neo-body resize-none"
                placeholder={t('teacher.assignment.instructionsPlaceholder')}
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4 border-t border-neo-black/30">
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting || !selectedLessonId || !dueDate}
                className="flex-1 bg-neo-cyan text-neo-black font-bold shadow-hard hover:shadow-hard-pressed disabled:opacity-50"
              >
                {isSubmitting ? t('teacher.assignment.creating') : t('teacher.assignment.create')}
              </Button>
              <Button
                variant="outline"
                onClick={onClose}
                disabled={isSubmitting}
                className="border-neo-pink text-neo-pink hover:bg-neo-pink/20"
              >
                {t('common.cancel')}
              </Button>
            </div>
          </div>

          <Dialog.Close asChild>
            <button
              type="button"
              className="absolute top-4 right-4 text-neo-white hover:text-neo-white"
              aria-label="Close"
              disabled={isSubmitting}
            >
              <X className="w-5 h-5" />
            </button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
