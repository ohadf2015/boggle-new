'use client';

import { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TemplateLessonSelector } from './lesson-creation';
import { splitImportLines } from './lesson-creation/splitImportLines';
import WordListEditor from './WordListEditor';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { BookTemplate, ChevronDown } from 'lucide-react';
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
  t: (key: string, params?: Record<string, string | number>) => string;
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
  const [pasted, setPasted] = useState('');
  const parsed = useMemo(() => splitImportLines(pasted), [pasted]);

  const addParsedWords = () => {
    onWordsChange([...words, ...parsed.map((word) => ({ word, canIntegrate: true }))]);
    setPasted('');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl bg-neo-navy text-neo-white p-6" closeButtonLabel={t('common.close')}>
          <DialogTitle className="text-2xl font-neo-display normal-case text-neo-white mb-4 text-balance">
            {t('teacher.lesson.create')}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {t('teacher.lesson.dialog.createDescription')}
          </DialogDescription>

          <div className="space-y-4">
            {/* Paste a list — the primary way a lesson gets made */}
            <div>
              <label
                htmlFor="lesson-paste-box"
                className="block text-sm font-neo-body text-neo-white mb-2"
              >
                {t('teacher.lesson.pasteWords')}
              </label>
              <textarea
                id="lesson-paste-box"
                data-testid="lesson-paste-box"
                value={pasted}
                onChange={(e) => setPasted(e.target.value)}
                rows={4}
                placeholder={t('teacher.lesson.pasteWordsPlaceholder')}
                className={cn(
                  'w-full px-4 py-2 bg-neo-navy border-neo border-neo-black',
                  'text-neo-white font-neo-body shadow-hard-sm',
                  'focus:outline-hidden focus:ring-2 focus:ring-neo-cyan'
                )}
              />
              {parsed.length > 0 && (
                <div className="mt-2 space-y-2">
                  <p data-testid="lesson-paste-preview" className="text-sm font-neo-body text-neo-white">
                    <span className="text-neo-lime font-bold">
                      {t('teacher.lesson.pasteWordsParsed', { count: parsed.length })}
                    </span>
                    <span className="ms-2 text-neo-white/80">{parsed.join(' · ')}</span>
                  </p>
                  <Button
                    data-testid="lesson-paste-add"
                    onClick={addParsedWords}
                    className="bg-neo-lime text-neo-black font-bold shadow-hard hover:shadow-hard-pressed"
                  >
                    {t('teacher.lesson.pasteWordsAdd', { count: parsed.length })}
                  </Button>
                </div>
              )}
            </div>

            {/* Template Selector - Collapsible */}
            <div className="border-neo border-neo-black rounded-neo p-4 bg-neo-navy/50">
              <button type="button"
                onClick={onToggleTemplateSelector}
                className="flex items-center justify-between w-full text-start"
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

      </DialogContent>
    </Dialog>
  );
}
