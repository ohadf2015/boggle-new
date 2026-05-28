'use client';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import WordListEditor from './WordListEditor';
import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import type { VocabularyWord, VocabularyLesson } from '@/lib/supabase/education';

interface LessonBuilderEditDialogProps {
  editingLesson: VocabularyLesson | null;
  onClose: () => void;
  editWords: VocabularyWord[];
  onEditWordsChange: (words: VocabularyWord[]) => void;
  isEditSaving: boolean;
  onSaveEdit: () => void;
  t: (key: string) => string;
}

export default function LessonBuilderEditDialog({
  editingLesson,
  onClose,
  editWords,
  onEditWordsChange,
  isEditSaving,
  onSaveEdit,
  t,
}: LessonBuilderEditDialogProps) {
  return (
    <Dialog.Root open={!!editingLesson} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-neo-black/80 z-50" />
        <Dialog.Content
          className={cn(
            'fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
            'w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6',
            'bg-neo-navy border-neo border-neo-black shadow-hard-lg z-50 rounded-neo'
          )}
        >
          <Dialog.Title className="text-2xl font-neo-display text-neo-white mb-2 text-balance">
            {t('teacher.lesson.editLesson')}
          </Dialog.Title>
          <Dialog.Description className="text-sm text-neo-white mb-4 text-pretty">
            {t('teacher.lesson.dialog.editDescription')}
          </Dialog.Description>

          <WordListEditor
            words={editWords}
            onWordsChange={onEditWordsChange}
            language={editingLesson?.language || 'en'}
            showAddInput
            maxHeight="max-h-[50vh]"
          />

          <div className="flex gap-3 pt-4">
            <Button
              onClick={onSaveEdit}
              disabled={isEditSaving}
              className="flex-1 bg-neo-cyan text-neo-black font-bold shadow-hard hover:shadow-hard-pressed"
            >
              {isEditSaving ? t('teacher.lesson.saving') : t('teacher.lesson.saveChanges')}
            </Button>
            <Button
              variant="outline"
              onClick={onClose}
              className="border-neo-pink text-neo-pink hover:bg-neo-pink/20"
            >
              {t('common.cancel')}
            </Button>
          </div>

          <Dialog.Close asChild>
            <button
              className="absolute top-4 right-4 text-neo-white hover:text-neo-white"
              aria-label={t('common.close')}
            >
              <X className="w-5 h-5" />
            </button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
