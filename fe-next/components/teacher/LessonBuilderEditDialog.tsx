'use client';

import { Button } from '@/components/ui/button';
import WordListEditor from './WordListEditor';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
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
    <Dialog open={!!editingLesson} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl bg-neo-navy text-neo-white p-6" closeButtonLabel={t('common.close')}>
          <DialogTitle className="text-2xl font-neo-display normal-case text-neo-white mb-2 text-balance">
            {t('teacher.lesson.editLesson')}
          </DialogTitle>
          <DialogDescription className="text-sm text-neo-white mb-4 text-pretty">
            {t('teacher.lesson.dialog.editDescription')}
          </DialogDescription>

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

      </DialogContent>
    </Dialog>
  );
}
