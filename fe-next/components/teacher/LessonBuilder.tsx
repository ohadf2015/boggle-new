'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { useLessons } from '@/hooks/useVocabularyLesson';
import { useClassrooms } from '@/hooks/useClassroom';
import { useWordIntegration } from '@/hooks/useWordIntegration';
import { useTemplates, type CreateTemplateData, type UpdateTemplateData } from '@/hooks/useLessonTemplate';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NeoLoader } from '@/components/ui/NeoLoader';
import LessonTemplateEditor from './LessonTemplateEditor';
import LessonAssignmentDialog from './LessonAssignmentDialog';
import * as Dialog from '@radix-ui/react-dialog';
import { Plus, CheckCircle, AlertCircle, X, Trash2, Play, Settings, Clock, Share2 } from 'lucide-react';
import toast from 'react-hot-toast';
import type { Language, VocabularyWord, VocabularyLesson } from '@/lib/supabase/teacher';

export default function LessonBuilder() {
  const { t, language } = useLanguage();
  const router = useRouter();
  const isRTL = language === 'he';
  const { lessons, isLoading, createLesson } = useLessons();
  const { classrooms } = useClassrooms();
  const { checkWordIntegration } = useWordIntegration();

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    language: language as Language,
    classroomId: '',
    isPublic: false,
  });
  const [words, setWords] = useState<VocabularyWord[]>([]);
  const [currentWord, setCurrentWord] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Template editor state
  const [selectedLesson, setSelectedLesson] = useState<VocabularyLesson | null>(null);
  const [isTemplateEditorOpen, setIsTemplateEditorOpen] = useState(false);
  const [isTemplateSaving, setIsTemplateSaving] = useState(false);

  // Assignment dialog state
  const [assigningLesson, setAssigningLesson] = useState<VocabularyLesson | null>(null);

  // Template hook for the selected lesson
  const { templates, createTemplate, updateTemplate, getDefaultTemplate } = useTemplates(selectedLesson?.id);

  const handleOpenTemplateEditor = (lesson: VocabularyLesson) => {
    setSelectedLesson(lesson);
    setIsTemplateEditorOpen(true);
  };

  const handleSaveTemplate = async (data: CreateTemplateData | ({ id: string } & UpdateTemplateData)) => {
    setIsTemplateSaving(true);
    try {
      if ('id' in data) {
        const { id, ...updates } = data;
        return await updateTemplate(id, updates);
      } else {
        return await createTemplate(data as CreateTemplateData);
      }
    } finally {
      setIsTemplateSaving(false);
    }
  };

  const handleStartGame = (lesson: VocabularyLesson) => {
    // Navigate to classroom game route (education-specific, no main app escape)
    router.push(`/${language}/education/classroom-game?lessonId=${lesson.id}`);
  };

  // Get default template for a lesson
  const getLessonDefaultTemplate = (lessonId: string) => {
    return templates.find((t) => t.is_default && t.lesson_id === lessonId);
  };

  const handleAddWord = () => {
    if (!currentWord.trim()) return;

    const result = checkWordIntegration(currentWord.trim(), formData.language);
    const newWord: VocabularyWord = {
      word: result.word,
      canIntegrate: result.canIntegrate,
      definition: '',
    };

    setWords([...words, newWord]);
    setCurrentWord('');
  };

  const handleRemoveWord = (index: number) => {
    setWords(words.filter((_, i) => i !== index));
  };

  const handleCreate = async () => {
    if (!formData.name.trim()) {
      toast.error('Lesson name is required');
      return;
    }
    if (words.length === 0) {
      toast.error('Add at least one word');
      return;
    }

    setIsSaving(true);
    const result = await createLesson({
      name: formData.name.trim(),
      description: formData.description.trim() || undefined,
      language: formData.language,
      words,
      classroomId: formData.classroomId || undefined,
      isPublic: formData.isPublic,
    });
    setIsSaving(false);

    if (result.success) {
      toast.success(t('teacher.lesson.saved'));
      setIsCreateDialogOpen(false);
      setFormData({
        name: '',
        description: '',
        language: language as Language,
        classroomId: '',
        isPublic: false,
      });
      setWords([]);
    } else {
      toast.error(result.error || 'Failed to create lesson');
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <NeoLoader variant="mascot-letters" size="lg" text={t('common.loading')} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Create Lesson Button */}
      <div className="flex justify-between items-center">
        <Button
          onClick={() => {
            setFormData({
              name: '',
              description: '',
              language: language as Language,
              classroomId: '',
              isPublic: false,
            });
            setWords([]);
            setIsCreateDialogOpen(true);
          }}
          className={cn(
            'bg-neo-cyan text-neo-black font-neo-body font-bold',
            'border-neo border-neo-black shadow-hard hover:shadow-hard-pressed',
            'transition-all'
          )}
        >
          <Plus className={cn('w-5 h-5', isRTL ? 'ml-2' : 'mr-2')} />
          {t('teacher.lesson.create')}
        </Button>
      </div>

      {/* Lessons Grid */}
      {lessons.length === 0 ? (
        <Card className="border-neo border-neo-black shadow-hard bg-neo-navy/50">
          <CardContent className="py-12 text-center">
            <h3 className="text-xl font-neo-display text-neo-white mb-2">
              {t('teacher.lesson.noLessons')}
            </h3>
            <p className="text-slate-400 mb-6">{t('teacher.lesson.createFirst')}</p>
            <Button
              onClick={() => setIsCreateDialogOpen(true)}
              className="bg-neo-cyan text-neo-black font-bold shadow-hard hover:shadow-hard-pressed"
            >
              <Plus className={cn('w-5 h-5', isRTL ? 'ml-2' : 'mr-2')} />
              {t('teacher.lesson.create')}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {lessons.map((lesson) => {
            const defaultTemplate = getLessonDefaultTemplate(lesson.id);
            return (
              <Card
                key={lesson.id}
                className="border-neo border-neo-black shadow-hard bg-neo-navy/80 hover:shadow-hard-lg transition-all flex flex-col"
              >
                <CardHeader className="pb-3">
                  <CardTitle className="text-xl font-neo-display text-neo-white">
                    {lesson.name}
                  </CardTitle>
                  {lesson.description && (
                    <p className="text-sm text-slate-400 mt-1">{lesson.description}</p>
                  )}
                  <p className="text-sm text-slate-400 mt-1">
                    {lesson.language.toUpperCase()} •{' '}
                    {lesson.words.length === 1
                      ? t('teacher.lesson.word')
                      : t('teacher.lesson.words').replace('{{count}}', String(lesson.words.length))}
                  </p>
                  {/* Show default template info if exists */}
                  {defaultTemplate && (
                    <div className="flex items-center gap-2 mt-2 text-xs text-neo-cyan">
                      <Clock className="w-3 h-3" />
                      <span>
                        {Math.floor(defaultTemplate.timer_seconds / 60)}min •{' '}
                        {defaultTemplate.difficulty}
                      </span>
                    </div>
                  )}
                </CardHeader>
                <CardContent className="flex-1 flex flex-col">
                  <div className="space-y-2 flex-1">
                    {lesson.words.slice(0, 5).map((word, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-sm">
                        {word.canIntegrate ? (
                          <CheckCircle className="w-4 h-4 text-neo-cyan shrink-0" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-neo-yellow shrink-0" />
                        )}
                        <span className="text-neo-white font-neo-body">{word.word}</span>
                      </div>
                    ))}
                    {lesson.words.length > 5 && (
                      <p className="text-xs text-slate-500 mt-2">
                        +{lesson.words.length - 5} more words
                      </p>
                    )}
                  </div>

                  {/* Lesson Actions */}
                  <div className="flex gap-2 mt-4 pt-4 border-t border-neo-black/30">
                    <Button
                      size="sm"
                      onClick={() => handleStartGame(lesson)}
                      className={cn(
                        'flex-1 bg-neo-cyan text-neo-black font-bold',
                        'border-neo border-neo-black shadow-hard hover:shadow-hard-pressed',
                        'transition-all text-xs'
                      )}
                    >
                      <Play className={cn('w-4 h-4', isRTL ? 'ml-1' : 'mr-1')} />
                      {t('education.template.startGame') || 'Start Game'}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setAssigningLesson(lesson)}
                      className={cn(
                        'border-neo border-neo-black shadow-hard hover:shadow-hard-pressed',
                        'bg-neo-navy/50 text-neo-white hover:bg-neo-navy',
                        'transition-all'
                      )}
                      title={t('teacher.lessons.assign.trigger')}
                    >
                      <Share2 className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleOpenTemplateEditor(lesson)}
                      className={cn(
                        'border-neo border-neo-black shadow-hard hover:shadow-hard-pressed',
                        'bg-neo-navy/50 text-neo-white hover:bg-neo-navy',
                        'transition-all'
                      )}
                    >
                      <Settings className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog.Root open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-neo-black/80 z-50" />
          <Dialog.Content
            className={cn(
              'fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
              'w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6',
              'bg-neo-navy border-neo border-neo-black shadow-hard-lg z-50 rounded-neo'
            )}
          >
            <Dialog.Title className="text-2xl font-neo-display text-neo-white mb-4">
              {t('teacher.lesson.create')}
            </Dialog.Title>
            <Dialog.Description className="sr-only">
              Form to create a new vocabulary lesson with words and definitions
            </Dialog.Description>

            <div className="space-y-4">
              {/* Lesson Name */}
              <div>
                <label className="block text-sm font-neo-body text-neo-white mb-2">
                  {t('teacher.lesson.name')}
                </label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Animal Vocabulary"
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
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Optional description"
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

              {/* Classroom Assignment */}
              <div>
                <label className="block text-sm font-neo-body text-neo-white mb-2">
                  {t('teacher.lesson.assignToClassroom')}
                </label>
                <select
                  value={formData.classroomId}
                  onChange={(e) => setFormData({ ...formData, classroomId: e.target.value })}
                  className={cn(
                    'w-full px-4 py-2 bg-neo-navy border-neo border-neo-black',
                    'text-neo-white font-neo-body shadow-hard-sm',
                    'focus:outline-none focus:ring-2 focus:ring-neo-cyan'
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
              <div>
                <label className="block text-sm font-neo-body text-neo-white mb-2">
                  {t('teacher.lesson.words')} ({words.length})
                </label>

                {/* Add Word Input */}
                <div className="flex gap-2 mb-3">
                  <Input
                    value={currentWord}
                    onChange={(e) => setCurrentWord(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddWord();
                      }
                    }}
                    placeholder={t('teacher.lesson.wordPlaceholder')}
                    className="flex-1 border-neo border-neo-black shadow-hard-sm"
                  />
                  <Button
                    onClick={handleAddWord}
                    disabled={!currentWord.trim()}
                    className="bg-neo-cyan text-neo-black font-bold shadow-hard hover:shadow-hard-pressed"
                  >
                    <Plus className="w-5 h-5" />
                  </Button>
                </div>

                {/* Words Display */}
                {words.length > 0 && (
                  <div className="bg-neo-black/30 border-2 border-neo-cyan p-4 rounded-neo max-h-60 overflow-y-auto">
                    <div className="space-y-2">
                      {words.map((word, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between bg-neo-navy/50 p-2 rounded border border-neo-black"
                        >
                          <div className="flex items-center gap-2 flex-1">
                            {word.canIntegrate ? (
                              <div className="flex items-center gap-1 text-neo-cyan">
                                <CheckCircle className="w-4 h-4" />
                                <span className="text-xs">{t('teacher.lesson.canIntegrate')}</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1 text-neo-yellow">
                                <AlertCircle className="w-4 h-4" />
                                <span className="text-xs">{t('teacher.lesson.cannotIntegrate')}</span>
                              </div>
                            )}
                            <span className="text-neo-white font-neo-body ml-2">{word.word}</span>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleRemoveWord(idx)}
                            className="text-neo-pink hover:bg-neo-pink/20"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {words.length === 0 && (
                  <p className="text-sm text-slate-500 text-center py-4">
                    {t('teacher.lesson.noWords')}
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <Button
                  onClick={handleCreate}
                  disabled={isSaving || !formData.name.trim() || words.length === 0}
                  className="flex-1 bg-neo-cyan text-neo-black font-bold shadow-hard hover:shadow-hard-pressed"
                >
                  {isSaving ? t('teacher.lesson.saving') : t('teacher.lesson.save')}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setIsCreateDialogOpen(false)}
                  className="border-neo-pink text-neo-pink hover:bg-neo-pink/20"
                >
                  {t('common.cancel')}
                </Button>
              </div>
            </div>

            <Dialog.Close asChild>
              <button
                className="absolute top-4 right-4 text-slate-400 hover:text-neo-white"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </Dialog.Close>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Template Editor Dialog */}
      {selectedLesson && (
        <LessonTemplateEditor
          isOpen={isTemplateEditorOpen}
          onClose={() => {
            setIsTemplateEditorOpen(false);
            setSelectedLesson(null);
          }}
          lessonId={selectedLesson.id}
          lessonName={selectedLesson.name}
          existingTemplate={getDefaultTemplate()}
          onSave={handleSaveTemplate}
          isSaving={isTemplateSaving}
        />
      )}

      {/* Assignment Dialog */}
      {assigningLesson && (
        <LessonAssignmentDialog
          isOpen={!!assigningLesson}
          onClose={() => setAssigningLesson(null)}
          lessonId={assigningLesson.id}
          lessonName={assigningLesson.name}
        />
      )}
    </div>
  );
}
