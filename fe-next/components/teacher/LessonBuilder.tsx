'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { useLessons } from '@/hooks/useVocabularyLesson';
import { useClassrooms } from '@/hooks/useClassroom';
import { useTemplates, type CreateTemplateData, type UpdateTemplateData } from '@/hooks/useLessonTemplate';
import { useLessonDraft } from '@/hooks/useLessonDraft';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import LessonTemplateEditor from './LessonTemplateEditor';
import LessonAssignmentDialog from './LessonAssignmentDialog';
import { BulkImportEnhanced } from './lesson-creation';
import LessonBuilderCreateDialog from './LessonBuilderCreateDialog';
import LessonBuilderEditDialog from './LessonBuilderEditDialog';
import LessonBuilderDraftPrompt from './LessonBuilderDraftPrompt';
import { Plus, CheckCircle, AlertCircle, Pencil, Play, Settings, Clock, Share2 } from 'lucide-react';
import toast from 'react-hot-toast';
import type { Language, VocabularyWord, VocabularyLesson } from '@/lib/supabase/education';
import { LessonCardSkeleton, SkeletonGrid } from '@/components/ui/EducationSkeletons';
import { StarterPacksSection } from './StarterPacksSection';
import { convertPackWordsToLessonWords } from '@/lib/education/createLessonFromPack';

export default function LessonBuilder() {
  const { t, language } = useLanguage();
  const router = useRouter();
  const { lessons, isLoading, createLesson, updateLesson } = useLessons();
  const { classrooms } = useClassrooms();

  const { hasDraft, saveDraft, clearDraft, restoreDraft, draftAge } = useLessonDraft();

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    language: language as Language,
    classroomId: '',
    isPublic: false,
  });
  const [words, setWords] = useState<VocabularyWord[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
  const [showDraftPrompt, setShowDraftPrompt] = useState(false);
  const [showTemplateSelector, setShowTemplateSelector] = useState(true);

  const [editingLesson, setEditingLesson] = useState<VocabularyLesson | null>(null);
  const [editWords, setEditWords] = useState<VocabularyWord[]>([]);
  const [isEditSaving, setIsEditSaving] = useState(false);

  const [selectedLesson, setSelectedLesson] = useState<VocabularyLesson | null>(null);
  const [isTemplateEditorOpen, setIsTemplateEditorOpen] = useState(false);
  const [isTemplateSaving, setIsTemplateSaving] = useState(false);

  const [assigningLesson, setAssigningLesson] = useState<VocabularyLesson | null>(null);
  const [isCreatingFromPack, setIsCreatingFromPack] = useState(false);

  const { templates, createTemplate, updateTemplate, getDefaultTemplate } = useTemplates(selectedLesson?.id);

  useEffect(() => {
    if (isCreateDialogOpen && hasDraft) setShowDraftPrompt(true);
  }, [isCreateDialogOpen, hasDraft]);

  useEffect(() => {
    if (!isCreateDialogOpen) return;
    if (!formData.name && words.length === 0) return;
    const interval = setInterval(() => {
      saveDraft({ name: formData.name, description: formData.description, language: formData.language, classroomId: formData.classroomId, words });
    }, 30000);
    return () => clearInterval(interval);
  }, [isCreateDialogOpen, formData, words, saveDraft]);

  const handleBulkImport = useCallback((importedWords: VocabularyWord[]) => {
    setWords((prev) => [...prev, ...importedWords]);
    toast.success(t('teacher.lesson.bulkImportDetected', { count: importedWords.length }));
  }, [t]);

  const handleTemplateSelect = useCallback((template: {
    id: string; name: string; description: string; language: Language; wordCount: number; category: string; words: VocabularyWord[];
  }) => {
    setFormData(prev => ({ ...prev, name: template.name, description: template.description, language: template.language }));
    setWords(template.words);
    setShowTemplateSelector(false);
    toast.success(t('teacher.lesson.templateLoaded', { count: template.words.length }));
  }, [t]);

  const handleRestoreDraft = useCallback(() => {
    const draftData = restoreDraft();
    if (draftData) {
      setFormData({ name: draftData.name, description: draftData.description, language: draftData.language, classroomId: draftData.classroomId, isPublic: false });
      setWords(draftData.words);
      toast.success(t('teacher.lesson.resumeDraft'));
    }
    setShowDraftPrompt(false);
  }, [restoreDraft, t]);

  const handleDiscardDraft = useCallback(() => { clearDraft(); setShowDraftPrompt(false); }, [clearDraft]);

  const formatDraftAge = useCallback((ageMs: number | null): string => {
    if (!ageMs) return '';
    const minutes = Math.floor(ageMs / 60000);
    if (minutes < 60) return `${minutes}m ago`;
    return `${Math.floor(minutes / 60)}h ago`;
  }, []);

  const handleSaveTemplate = async (data: CreateTemplateData | ({ id: string } & UpdateTemplateData)) => {
    setIsTemplateSaving(true);
    try {
      if ('id' in data) { const { id, ...updates } = data; return await updateTemplate(id, updates); }
      else { return await createTemplate(data as CreateTemplateData); }
    } finally { setIsTemplateSaving(false); }
  };

  const handleStartGame = (lesson: VocabularyLesson) => {
    router.push(`/${language}/education/classroom-game?lessonId=${lesson.id}`);
  };

  const handleSelectStarterPack = useCallback(
    async (pack: { name: string; description: string; language: string; words: any[] }) => {
      setIsCreatingFromPack(true);
      try {
        const vocabularyWords = convertPackWordsToLessonWords(pack.words);

        const result = await createLesson({
          name: pack.name,
          description: pack.description,
          language: pack.language as Language,
          words: vocabularyWords,
        });

        if (result.success && result.data) {
          toast.success(t('education.lesson.created'));
          // Reset and show the new lesson in the list
        } else {
          toast.error(result.error || t('education.lesson.creationFailed'));
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        toast.error(t('education.lesson.creationFailed'));
      } finally {
        setIsCreatingFromPack(false);
      }
    },
    [createLesson, t]
  );

  const getLessonDefaultTemplate = (lessonId: string) => {
    return templates.find((t) => t.is_default && t.lesson_id === lessonId);
  };

  const handleOpenEdit = (lesson: VocabularyLesson) => {
    setEditingLesson(lesson);
    setEditWords([...lesson.words]);
  };

  const handleSaveEdit = async () => {
    if (!editingLesson) return;
    setIsEditSaving(true);
    const result = await updateLesson(editingLesson.id, { words: editWords });
    setIsEditSaving(false);
    if (result.success) { toast.success(t('teacher.lesson.saved')); setEditingLesson(null); }
    else { toast.error(result.error || t('teacher.lesson.error.updateFailed')); }
  };

  const handleCreate = async () => {
    if (!formData.name.trim()) { toast.error(t('teacher.lesson.validation.nameRequired')); return; }
    if (words.length === 0) { toast.error(t('teacher.lesson.validation.wordsRequired')); return; }

    setIsSaving(true);
    const result = await createLesson({
      name: formData.name.trim(), description: formData.description.trim() || undefined,
      language: formData.language, words, classroomId: formData.classroomId || undefined, isPublic: formData.isPublic,
    });
    setIsSaving(false);

    if (result.success) {
      toast.success(t('teacher.lesson.saved'));
      clearDraft();
      setIsCreateDialogOpen(false);
      setFormData({ name: '', description: '', language: language as Language, classroomId: '', isPublic: false });
      setWords([]);
    } else {
      toast.error(result.error || t('teacher.lesson.error.createFailed'));
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="h-10 w-40 bg-neo-white/10 rounded animate-pulse" />
        </div>
        <SkeletonGrid count={3} skeleton={LessonCardSkeleton} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Create Lesson Button */}
      <div className="flex justify-between items-center">
        <Button
          onClick={() => {
            setFormData({ name: '', description: '', language: language as Language, classroomId: '', isPublic: false });
            setWords([]);
            setIsCreateDialogOpen(true);
          }}
          className={cn(
            'bg-neo-cyan text-neo-black font-neo-body font-bold',
            'border-neo border-neo-black shadow-hard hover:shadow-hard-pressed',
            'transition-all'
          )}
        >
          <Plus className="w-5 h-5 me-2" />
          {t('teacher.lesson.create')}
        </Button>
      </div>

      {/* Lessons Grid */}
      {lessons.length === 0 ? (
        <div className={isCreatingFromPack ? 'opacity-50 pointer-events-none' : ''}>
          <Card className="border-neo border-neo-black shadow-hard bg-neo-navy/50 mb-6">
            <CardContent className="p-6">
              <StarterPacksSection onSelectPack={handleSelectStarterPack} />
            </CardContent>
          </Card>
          {isCreatingFromPack && (
            <div className="text-center mb-6">
              <div className="inline-block">
                <div className="animate-spin">
                  <Plus className="w-6 h-6 text-neo-cyan" />
                </div>
              </div>
              <p className="text-neo-white mt-2">{t('teacher.classroom.settingUp')}</p>
            </div>
          )}
          <Card className="border-neo border-neo-black shadow-hard bg-neo-navy/50">
            <CardContent className="py-12 text-center">
              <h3 className="text-xl font-neo-display text-neo-white mb-2 text-balance">
                {t('teacher.lesson.noLessons')}
              </h3>
              <p className="text-neo-white mb-6 text-pretty">{t('teacher.lesson.createFirst')}</p>
              <Button
                onClick={() => setIsCreateDialogOpen(true)}
                className="bg-neo-cyan text-neo-black font-bold shadow-hard hover:shadow-hard-pressed"
              >
                <Plus className="w-5 h-5 me-2" />
                {t('teacher.lesson.create')}
              </Button>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {lessons.map((lesson) => {
            const defaultTemplate = getLessonDefaultTemplate(lesson.id);
            const defCount = lesson.words.filter((w) => w.definition).length;
            const totalWords = lesson.words.length;
            return (
              <Card
                key={lesson.id}
                className="border-neo border-neo-black shadow-hard bg-neo-navy/80 hover:shadow-hard-lg transition-all flex flex-col"
              >
                <CardHeader className="pb-3">
                  <CardTitle className="text-xl font-neo-display text-neo-white text-balance">
                    {lesson.name}
                  </CardTitle>
                  {lesson.description && (
                    <p className="text-sm text-neo-white mt-1">{lesson.description}</p>
                  )}
                  <div className="flex flex-wrap items-center gap-2 mt-1 text-sm text-neo-white">
                    <span className="font-bold">
                      {lesson.language.toUpperCase()} •{' '}
                      {lesson.words.length === 1
                        ? t('teacher.lesson.word')
                        : t('teacher.lesson.words', { count: lesson.words.length })}
                    </span>
                    <span
                      className={cn(
                        'text-xs font-bold px-1.5 py-0.5 rounded shrink-0',
                        defCount === totalWords && totalWords > 0
                          ? 'text-neo-cyan bg-neo-cyan/15'
                          : defCount > 0
                            ? 'text-neo-lime bg-neo-lime/15'
                            : 'text-neo-white bg-neo-white/10'
                      )}
                    >
                      {t('teacher.lesson.definitionCoverage', { count: defCount, total: totalWords })}
                    </span>
                  </div>
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
                      <div key={`word-${idx}-${word.word}`} className="flex items-center gap-2 text-sm">
                        {word.canIntegrate ? (
                          <CheckCircle className="w-4 h-4 text-neo-cyan shrink-0" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-neo-lime shrink-0" />
                        )}
                        <span className="text-neo-white font-neo-body">{word.word}</span>
                        {word.definition && (
                          <span className="text-xs text-neo-white truncate max-w-[120px]">
                            — {word.definition}
                          </span>
                        )}
                      </div>
                    ))}
                    {lesson.words.length > 5 && (
                      <p className="text-xs text-neo-white mt-2 font-bold">
                        {t('teacher.lesson.moreWords', { count: lesson.words.length - 5 })}
                      </p>
                    )}
                  </div>

                  {/* Lesson Actions */}
                  <div className="flex gap-2 mt-4 pt-4 border-t border-neo-black/30">
                    <Button size="sm" onClick={() => handleStartGame(lesson)} className={cn('flex-1 bg-neo-cyan text-neo-black font-bold', 'border-neo border-neo-black shadow-hard hover:shadow-hard-pressed', 'transition-all text-xs')}>
                      <Play className="w-4 h-4 me-1" />
                      {t('education.template.startGame')}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleOpenEdit(lesson)} className={cn('border-neo border-neo-black shadow-hard hover:shadow-hard-pressed', 'bg-neo-navy/50 text-neo-white hover:bg-neo-navy', 'transition-all')} aria-label={t('teacher.lesson.editLesson')}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setAssigningLesson(lesson)} className={cn('border-neo border-neo-black shadow-hard hover:shadow-hard-pressed', 'bg-neo-navy/50 text-neo-white hover:bg-neo-navy', 'transition-all')} aria-label={t('teacher.lessons.assign.trigger')}>
                      <Share2 className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => { setSelectedLesson(lesson); setIsTemplateEditorOpen(true); }} className={cn('border-neo border-neo-black shadow-hard hover:shadow-hard-pressed', 'bg-neo-navy/50 text-neo-white hover:bg-neo-navy', 'transition-all')} aria-label={t('education.template.settings')}>
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
      <LessonBuilderCreateDialog
        isOpen={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        formData={formData}
        onFormDataChange={setFormData}
        words={words}
        onWordsChange={setWords}
        classrooms={classrooms}
        isSaving={isSaving}
        showTemplateSelector={showTemplateSelector}
        onToggleTemplateSelector={() => setShowTemplateSelector(!showTemplateSelector)}
        onTemplateSelect={handleTemplateSelect}
        onBulkImportOpen={() => setIsBulkImportOpen(true)}
        onCreate={handleCreate}
        t={t}
      />

      {/* Edit Lesson Dialog */}
      <LessonBuilderEditDialog
        editingLesson={editingLesson}
        onClose={() => setEditingLesson(null)}
        editWords={editWords}
        onEditWordsChange={setEditWords}
        isEditSaving={isEditSaving}
        onSaveEdit={handleSaveEdit}
        t={t}
      />

      {/* Template Editor Dialog */}
      {selectedLesson && (
        <LessonTemplateEditor
          isOpen={isTemplateEditorOpen}
          onClose={() => { setIsTemplateEditorOpen(false); setSelectedLesson(null); }}
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

      {/* Bulk Word Importer */}
      <BulkImportEnhanced
        isOpen={isBulkImportOpen}
        onClose={() => setIsBulkImportOpen(false)}
        onImport={handleBulkImport}
        language={formData.language}
      />

      {/* Draft Resume Prompt */}
      <LessonBuilderDraftPrompt
        open={showDraftPrompt}
        onOpenChange={setShowDraftPrompt}
        onRestore={handleRestoreDraft}
        onDiscard={handleDiscardDraft}
        formattedAge={formatDraftAge(draftAge)}
        t={t}
      />
    </div>
  );
}
