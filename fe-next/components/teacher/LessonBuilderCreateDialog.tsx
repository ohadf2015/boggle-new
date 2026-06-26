'use client';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TemplateLessonSelector } from './lesson-creation';
import WordListEditor from './WordListEditor';
import * as Dialog from '@radix-ui/react-dialog';
import { X, BookTemplate, ChevronDown } from 'lucide-react';
import type { Language, VocabularyWord } from '@/lib/supabase/education';

interface Classroom {
  id: string;
  name: string;
}

interface LessonBuilderCreateDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  formData: {
    name: string;
    description: string;
    language: Language;
    classroomId: string;
    isPublic: boolean;
  };
  onFormDataChange: (data: LessonBuilderCreateDialogProps['formData']) => void;
  words: VocabularyWord[];
  onWordsChange: (words: VocabularyWord[]) => void;
  classrooms: Classroom[];
  isSaving: boolean;
  showTemplateSelector: boolean;
  onToggleTemplateSelector: () => void;
  onTemplateSelect: (template: {
    id: string;
    name: string;
    description: string;
    language: Language;
    wordCount: number;
    category: string;
    words: VocabularyWord[];
  }) => void;
  onBulkImportOpen: () => void;
  onCreate: () => void;
  t: (key: string) => string;
}

export default function LessonBuilderCreateDialog({
  isOpen,
  onOpenChange,
  formData,
  onFormDataChange,
  words,
  onWordsChange,
  classrooms,
  isSaving,
  showTemplateSelector,
  onToggleTemplateSelector,
  onTemplateSelect,
  onBulkImportOpen,
  onCreate,
  t,
}: LessonBuilderCreateDialogProps) {
  return (
    <Dialog.Root open={isOpen} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-neo-black/80 z-50" />
        <Dialog.Content
          className={cn(
            'fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
            'w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6',
            'bg-neo-navy border-neo border-neo-black shadow-hard-lg z-50 rounded-neo'
          )}
        >
          <Dialog.Title className="text-2xl font-neo-display text-neo-white mb-4 text-balance">
            {t('teacher.lesson.create')}
          </Dialog.Title>
          <Dialog.Description className="sr-only">
            {t('teacher.lesson.dialog.createDescription')}
          </Dialog.Description>

          <div className="space-y-4">
            {/* Template Selector - Collapsible */}
            <div className="border-neo border-neo-black rounded-neo p-4 bg-neo-navy/50">
              <button type="button"
                onClick={onToggleTemplateSelector}
                className="flex items-center justify-between w-full text-left"
              >
                <div className="flex items-center gap-2">
                  <BookTemplate className="w-5 h-5 text-neo-lime" />
                  <span className="font-neo-body font-bold text-neo-white">
                    {t('teacher.lesson.startFromTemplate')}
                  </span>
                </div>
                <ChevronDown
                  className={cn(
                    'w-5 h-5 text-neo-white transition-transform',
                    showTemplateSelector && 'rotate-180'
                  )}
                />
              </button>

              {showTemplateSelector && (
                <div className="mt-4">
                  <TemplateLessonSelector
                    classroomLanguage={formData.language}
                    onSelect={onTemplateSelect}
                  />
                </div>
              )}
            </div>

            {/* Lesson Name */}
            <div>
              <label className="block text-sm font-neo-body text-neo-white mb-2">
                {t('teacher.lesson.name')}
              </label>
              <Input
                value={formData.name}
                onChange={(e) => onFormDataChange({ ...formData, name: e.target.value })}
                placeholder={t('teacher.lesson.namePlaceholder')}
                className="border-neo border-neo-black shadow-hard-sm"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-neo-body text-neo-white mb-2">
                {t('teacher.lesson.description')}
              </label>
              <Input
                value={formData.description}
                onChange={(e) => onFormDataChange({ ...formData, description: e.target.value })}
                placeholder={t('teacher.lesson.descriptionPlaceholder')}
                className="border-neo border-neo-black shadow-hard-sm"
              />
            </div>

            {/* Language */}
            <div>
              <label className="block text-sm font-neo-body text-neo-white mb-2">
                {t('teacher.classroom.language')}
              </label>
              <select
                value={formData.language}
                onChange={(e) => onFormDataChange({ ...formData, language: e.target.value as Language })}
                className={cn(
                  'w-full px-4 py-2 bg-neo-navy border-neo border-neo-black',
                  'text-neo-white font-neo-body shadow-hard-sm',
                  'focus:outline-hidden focus:ring-2 focus:ring-neo-cyan'
                )}
              >
                <option value="en">English</option>
                <option value="he">Hebrew</option>
                <option value="sv">Swedish</option>
                <option value="ja">Japanese</option>
              </select>
            </div>

            {/* Classroom Assignment */}
            <div>
              <label className="block text-sm font-neo-body text-neo-white mb-2">
                {t('teacher.lesson.assignToClassroom')}
              </label>
              <select
                value={formData.classroomId}
                onChange={(e) => onFormDataChange({ ...formData, classroomId: e.target.value })}
                className={cn(
                  'w-full px-4 py-2 bg-neo-navy border-neo border-neo-black',
                  'text-neo-white font-neo-body shadow-hard-sm',
                  'focus:outline-hidden focus:ring-2 focus:ring-neo-cyan'
                )}
              >
                <option value="">{t('teacher.lesson.noClassroomSelected')}</option>
                {classrooms.map((classroom) => (
                  <option key={classroom.id} value={classroom.id}>
                    {classroom.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Words List */}
            <WordListEditor
              words={words}
              onWordsChange={onWordsChange}
              language={formData.language}
              showAddInput
              showBulkImport
              onBulkImportOpen={onBulkImportOpen}
            />

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <Button
                onClick={onCreate}
                disabled={isSaving || !formData.name.trim() || words.length === 0}
                className="flex-1 bg-neo-cyan text-neo-black font-bold shadow-hard hover:shadow-hard-pressed"
              >
                {isSaving ? t('teacher.lesson.saving') : t('teacher.lesson.save')}
              </Button>
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="border-neo-pink text-neo-pink hover:bg-neo-pink/20"
              >
                {t('common.cancel')}
              </Button>
            </div>
          </div>

          <Dialog.Close asChild>
            <button type="button"
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
