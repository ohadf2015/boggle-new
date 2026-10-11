'use client';

import { useState, useEffect, useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useAssignments } from '@/hooks/useAssignments';
import { useTeacherPro } from '@/hooks/useTeacherPro';
import { FREE_TIER_LIMITS } from '@/lib/education/freeTierLimits';
import { AssignmentLimitUpsell } from './AssignmentLimitUpsell';
import { FirstAssignmentTemplatePicker } from './FirstAssignmentTemplatePicker';
import { useLessons } from '@/hooks/useVocabularyLesson';
import { useClassrooms } from '@/hooks/useClassroom';
import { labelLessonsForPicker } from '@/lib/education/lessonLabels';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import { Swords, BookOpen, Crosshair, Lock, Grid2x2 } from 'lucide-react';
import { AssignmentCreatorDueDate, assignmentSubmitHintKey } from './AssignmentCreatorDueDate';
import { AssignmentStep } from './AssignmentStep';
import { Button } from '@/components/ui/button';
import toast from 'react-hot-toast';
import {
  VOCAB_FOCUSES,
  MIN_WORDS_PER_FOCUS,
  focusQuestionCounts,
  type PracticeFocusSetting,
} from '@/lib/education/vocabFocus';
import { WORDCRAFT_FOCUS } from '@/lib/education/wordcraftAssignment';
import {
  assignFirstAssignmentTemplate,
  firstAssignmentTemplatesFor,
  type FirstAssignmentTemplate,
} from '@/lib/education/firstAssignmentTemplates';
import {
  trackTeacherFirstAssignmentTemplate,
  trackEduFirstAssignmentCreated,
} from '@/lib/education/telemetry';
import type { Language } from '@/lib/supabase/education/types';
import { AssignmentGoalModes } from './AssignmentGoalModes';
import { createWordGoalAssignment } from '@/lib/education/createWordGoalAssignment';
import {
  validateWordGoal,
  WORD_COUNT_DEFAULT,
  type WordGoalKind,
} from '@/lib/education/wordGoalAssignment';

interface AssignmentCreatorProps {
  classroomId: string;
  onComplete: () => void;
  isOpen: boolean;
  onClose: () => void;
  /** Preselect a lesson (e.g. a list just copied from Discover). */
  initialLessonId?: string;
}

/**
 * 'wordcraft' is the recommended default: students play Word Craft solo vs the
 * bot. `lesson_assignments` has no mode column, so it is saved as
 * practice_focus 'wordcraft'; 'practice' saves a focus or 'any' (→ NULL).
 */
type AssignmentType = 'wordcraft' | 'practice' | 'duel' | WordGoalKind;

export default function AssignmentCreator({
  classroomId,
  onComplete,
  isOpen,
  onClose,
  initialLessonId,
}: AssignmentCreatorProps) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { createAssignment, assignments } = useAssignments(classroomId);
  const { hasPro, loading: proLoading } = useTeacherPro();
  // Soft paywall: a free teacher at the per-class assignment cap gets the
  // upsell instead of the form. Pro lifts the cap; the entitlement must be
  // resolved first so we neither flash the gate at a paying teacher nor lock
  // them out while loading. `assignments` is undefined in older hook mocks —
  // treat a missing list as 0 rather than at-cap.
  const assignmentCount = assignments?.length ?? 0;
  const atAssignmentCap =
    !proLoading && !hasPro && assignmentCount >= FREE_TIER_LIMITS.assignmentsPerClass;
  const { lessons, isLoading: isLoadingLessons, createLesson } = useLessons();
  // `useLessons()` spans every class this teacher owns, and reusing one list
  // across periods is intended — so two rows can read "Week 3 Vocabulary" with
  // nothing to tell them apart. Name the classroom, but only where it is
  // actually ambiguous.
  const { classrooms = [] } = useClassrooms();
  const lessonLabels = useMemo(() => {
    const namesById: Record<string, string> = {};
    for (const c of classrooms) namesById[c.id] = c.name;
    const labelled = labelLessonsForPicker(lessons, namesById);
    return new Map(labelled.map((l) => [l.id, l.label]));
  }, [lessons, classrooms]);

  const [selectedType, setSelectedType] = useState<AssignmentType>('wordcraft');
  const [selectedLessonId, setSelectedLessonId] = useState<string>('');
  const [dueDate, setDueDate] = useState<string>('');
  const [instructions, setInstructions] = useState<string>('');
  const [focus, setFocus] = useState<PracticeFocusSetting>('any');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [wordCount, setWordCount] = useState(WORD_COUNT_DEFAULT);
  const [wordListRaw, setWordListRaw] = useState('');
  const isWordGoal = selectedType === 'word_count' || selectedType === 'word_list';

  const selectedLesson = lessons.find(l => l.id === selectedLessonId);
  // How many questions each skill can really build off this lesson. The teacher
  // sees the number BEFORE assigning, so "context clues" never turns out empty.
  const focusCounts = useMemo(
    () =>
      selectedLesson
        ? focusQuestionCounts(selectedLesson.words || [], { language: selectedLesson.language })
        : null,
    [selectedLesson]
  );
  const supportedFocuses = focusCounts ? VOCAB_FOCUSES.filter((f) => focusCounts[f] > 0) : [];

  const classroom = classrooms.find((c) => c.id === classroomId);
  const classroomLanguage: Language = classroom?.language ?? 'en';
  const starterPacks = useMemo(
    () => firstAssignmentTemplatesFor(classroomLanguage),
    [classroomLanguage],
  );
  const showStarterPacks = !isLoadingLessons && lessons.length === 0;

  useEffect(() => {
    if (!isOpen || !showStarterPacks || starterPacks.length === 0) return;
    trackTeacherFirstAssignmentTemplate({ templateId: starterPacks[0].id, action: 'view' });
  }, [isOpen, showStarterPacks, starterPacks]);

  // Reset form when dialog opens
  useEffect(() => {
    if (isOpen) {
      setSelectedType('wordcraft');
      setSelectedLessonId(initialLessonId ?? '');
      setDueDate('');
      setInstructions('');
      setFocus('any');
      setWordCount(WORD_COUNT_DEFAULT);
      setWordListRaw('');
    }
  }, [isOpen, initialLessonId]);

  // A focus the newly chosen lesson cannot support falls back to "any"
  useEffect(() => {
    if (focus !== 'any' && !supportedFocuses.includes(focus)) {
      setFocus('any');
    }
    // supportedFocuses is derived from selectedLessonId; keying on the id avoids a new array each render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLessonId, focus]);

  const submitHint = isWordGoal
    ? assignmentSubmitHintKey(true, Boolean(dueDate))
    : assignmentSubmitHintKey(Boolean(selectedLessonId), Boolean(dueDate));

  const handleSubmit = async () => {
    if (!user) {
      toast.error(t('teacher.assignment.missingFields'));
      return;
    }

    if (isWordGoal) {
      const validated = validateWordGoal({
        kind: selectedType as WordGoalKind,
        dueDate,
        target: wordCount,
        wordListRaw,
      });
      if (!validated.ok) {
        toast.error(t('teacher.assignment.wordGoalMissing'));
        return;
      }
      setIsSubmitting(true);
      const result = await createWordGoalAssignment({
        goal: validated.goal,
        classroomId,
        teacherId: user.id,
        language: classroomLanguage,
        createLesson,
        findNWordsLabel: (n) => t('teacher.assignment.findNWords', { count: n }),
      });
      setIsSubmitting(false);
      if (result.success && result.assigned) {
        toast.success(t('teacher.assignment.created'));
        if (assignmentCount === 0) {
          trackEduFirstAssignmentCreated({ classroomId });
        }
        onComplete();
        onClose();
      } else {
        toast.error(result.error || t('teacher.assignment.error'));
      }
      return;
    }

    if (!selectedLessonId || !dueDate) {
      toast.error(t('teacher.assignment.missingFields'));
      return;
    }

    setIsSubmitting(true);

    const result = await createAssignment({
      classroom_id: classroomId,
      lesson_id: selectedLessonId,
      teacher_id: user.id,
      assignment_type: selectedType === 'duel' ? 'duel' : 'practice',
      due_date: dueDate,
      instructions: instructions || null,
      practice_focus: selectedType === 'practice' ? focus : selectedType === 'wordcraft' ? WORDCRAFT_FOCUS : null,
    });

    setIsSubmitting(false);

    if (result.success) {
      toast.success(t('teacher.assignment.created'));
      if (assignmentCount === 0) {
        trackEduFirstAssignmentCreated({ classroomId });
      }
      onComplete();
      onClose();
    } else {
      toast.error(result.error || t('teacher.assignment.error'));
    }
  };

  const handleAssignTemplate = async (template: FirstAssignmentTemplate) => {
    if (!user) {
      toast.error(t('teacher.assignment.error'));
      return;
    }
    setIsSubmitting(true);
    trackTeacherFirstAssignmentTemplate({ templateId: template.id, action: 'assign' });
    const result = await assignFirstAssignmentTemplate({
      template,
      classroomId,
      teacherId: user.id,
      lessonName: t(template.nameKey),
      lessonDescription: t(template.descriptionKey),
      createLesson,
    });
    setIsSubmitting(false);
    if (result.success && result.assigned) {
      toast.success(t('teacher.assignment.created'));
      if (assignmentCount === 0) {
        trackEduFirstAssignmentCreated({ classroomId });
      }
      onComplete();
      onClose();
      return;
    }
    toast.error(
      result.assignmentError || result.error || t('teacher.assignment.error'),
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent
        noDescription
        closeButtonLabel={t('common.close')}
        className={cn(
          'w-full max-w-xl sm:max-w-xl lg:max-w-xl xl:max-w-xl p-6 sm:max-h-[94vh]',
          'bg-neo-navy border-neo-cream text-neo-white'
        )}
      >
        <DialogTitle className="text-2xl font-neo-display text-neo-white mb-3 normal-case tracking-normal">
          {atAssignmentCap
            ? t('teacher.subscription.assignmentLimitTitle')
            : t('teacher.assignment.createTitle')}
        </DialogTitle>

        {atAssignmentCap ? (
          <AssignmentLimitUpsell currentCount={assignmentCount} onClose={onClose} />
        ) : showStarterPacks ? (
          <FirstAssignmentTemplatePicker
            packs={starterPacks}
            isSubmitting={isSubmitting}
            onAssign={(pack) => void handleAssignTemplate(pack)}
            onClose={onClose}
          />
        ) : (
        <div className="space-y-4">
            {!isWordGoal && (
            <AssignmentStep step="list" n={1} label={t('teacher.assignment.lessonLabel')}>
              <select
                value={selectedLessonId}
                onChange={(e) => setSelectedLessonId(e.target.value)}
                className="w-full p-3 rounded-neo border-neo border-neo-cream/40 bg-neo-navy text-neo-white font-neo-body"
                disabled={isLoadingLessons}
              >
                <option value="">{t('teacher.assignment.selectLesson')}</option>
                {lessons.map((lesson) => (
                  <option key={lesson.id} value={lesson.id}>
                    {lessonLabels.get(lesson.id) ?? lesson.name} ({lesson.words.length} {t('teacher.assignment.words')})
                  </option>
                ))}
              </select>
            </AssignmentStep>
            )}

            <AssignmentStep step="who" n={2} label={t('eg2Rep.assign.who')}>
              <p
                data-testid="assignment-who"
                className="flex flex-wrap items-center gap-2 rounded-neo border-2 border-neo-cream/50 bg-neo-navy-light px-3 py-2 font-neo-body text-sm text-neo-white"
              >
                <span dir="auto" className="font-bold">{classroom?.name}</span>
                <span className="text-neo-cream/70">·</span>
                <span className="text-neo-cream/80">{t('eg2Rep.assign.students', { count: classroom?.member_count ?? 0 })}</span>
              </p>
            </AssignmentStep>

            <AssignmentStep step="mode" n={3} label={t('teacher.assignment.typeLabel')}>
              <button
                type="button"
                data-testid="assignment-mode-wordcraft"
                aria-pressed={selectedType === 'wordcraft'}
                onClick={() => setSelectedType('wordcraft')}
                className={cn(
                  'w-full mb-3 px-4 py-3 rounded-neo border-neo transition-all flex items-center gap-3 text-start',
                  selectedType === 'wordcraft'
                    ? 'bg-neo-lime border-neo-lime text-neo-black shadow-hard-sm'
                    : 'bg-neo-navy/50 border-neo-cream/40 text-neo-white hover:bg-neo-navy/80'
                )}
              >
                <Grid2x2 className="w-8 h-8 shrink-0" aria-hidden="true" />
                <span className="flex-1 min-w-0">
                  <span className="font-bold block">{t('education.wordcraftAssignment.title')}</span>
                  <span className="text-xs opacity-80 block">{t('education.wordcraftAssignment.teacherHint')}</span>
                </span>
                <span className="shrink-0 rounded-neo border-2 border-black bg-neo-yellow px-2 py-0.5 text-xs font-black uppercase text-neo-black">
                  {t('education.wordcraftAssignment.recommended')}
                </span>
              </button>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedType('practice')}
                  className={cn(
                    'px-4 py-3 rounded-neo border-neo transition-all',
                    'flex items-center justify-center gap-2',
                    selectedType === 'practice'
                      ? 'bg-neo-cyan border-neo-cyan text-neo-black shadow-hard-sm'
                      : 'bg-neo-navy/50 border-neo-black text-neo-white hover:bg-neo-navy/80'
                  )}
                >
                  <BookOpen className="w-6 h-6 shrink-0" aria-hidden="true" />
                  <span className="font-bold">{t('teacher.assignment.practiceMode')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedType('duel')}
                  className={cn(
                    'px-4 py-3 rounded-neo border-neo transition-all',
                    'flex items-center justify-center gap-2',
                    selectedType === 'duel'
                      ? 'bg-neo-pink border-neo-pink text-neo-black shadow-hard-sm'
                      : 'bg-neo-navy/50 border-neo-black text-neo-white hover:bg-neo-navy/80'
                  )}
                >
                  <Swords className="w-6 h-6 shrink-0" aria-hidden="true" />
                  <span className="font-bold">{t('teacher.assignment.duelChallenge')}</span>
                </button>
              </div>
              <AssignmentGoalModes
                selectedType={selectedType}
                onSelect={(kind) => setSelectedType(kind)}
                wordCount={wordCount}
                onWordCount={setWordCount}
                wordListRaw={wordListRaw}
                onWordListRaw={setWordListRaw}
                t={t}
              />
            </AssignmentStep>

            {/* Vocabulary focus (practice only, once a lesson is chosen) */}
            {selectedType === 'practice' && selectedLesson && (
              <div>
                <label className="block text-sm font-neo-body text-neo-white mb-1">
                  {t('teacher.assignment.focus.label')}
                </label>
                <p className="text-xs text-neo-white/70 font-neo-body mb-2 text-pretty">
                  {t('teacher.assignment.focus.help')}
                </p>
                <div
                  role="radiogroup"
                  aria-label={t('teacher.assignment.focus.label')}
                  className="grid grid-cols-1 sm:grid-cols-2 gap-2"
                >
                  <button
                    type="button"
                    role="radio"
                    aria-checked={focus === 'any'}
                    onClick={() => setFocus('any')}
                    className={cn(
                      'min-h-12 p-3 rounded-neo border-neo text-start transition-all',
                      focus === 'any'
                        ? 'bg-neo-cyan border-neo-cyan text-neo-black shadow-hard-sm'
                        : 'bg-neo-navy/50 border-neo-black text-neo-white hover:bg-neo-navy/80'
                    )}
                  >
                    <span className="font-bold block">{t('teacher.assignment.focus.any')}</span>
                    <span className="text-xs opacity-80 block">{t('teacher.assignment.focus.anyHint')}</span>
                  </button>
                  {VOCAB_FOCUSES.map((option) => {
                    const supported = supportedFocuses.includes(option);
                    const active = focus === option;
                    return (
                      <button
                        key={option}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        disabled={!supported}
                        onClick={() => supported && setFocus(option)}
                        className={cn(
                          'min-h-12 p-3 rounded-neo border-neo text-start transition-all',
                          active && 'bg-neo-yellow border-neo-yellow text-neo-black shadow-hard-sm',
                          !active && supported && 'bg-neo-navy/50 border-neo-black text-neo-white hover:bg-neo-navy/80',
                          !supported && 'bg-neo-navy/30 border-neo-black/40 text-neo-white/50 cursor-not-allowed'
                        )}
                      >
                        <span className="font-bold flex items-center gap-1.5">
                          {supported ? <Crosshair className="w-4 h-4" aria-hidden="true" /> : <Lock className="w-4 h-4" aria-hidden="true" />}
                          {t(`education.vocabFocus.focus.${option}`)}
                        </span>
                        <span className="text-xs opacity-80 block">
                          {supported
                            ? t('teacher.assignment.focus.questionCount', {
                                count: focusCounts?.[option] ?? 0,
                                skill: t(`education.vocabFocus.instructions.${option}`),
                              })
                            : t(`education.vocabFocus.unlock.${option}`, { min: MIN_WORDS_PER_FOCUS })}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <AssignmentStep step="due" n={4} label={t('teacher.assignment.dueDate')}>
              <AssignmentCreatorDueDate value={dueDate} onChange={setDueDate} />
            </AssignmentStep>

            {/* Optional Instructions */}
            <div>
              <label className="block text-sm font-neo-body text-neo-white mb-2">
                {t('teacher.assignment.instructionsLabel')} {t('common.optional')}
              </label>
              <textarea
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                rows={2}
                aria-label={t('teacher.assignment.instructionsLabel')}
                className="w-full p-3 rounded-neo border-neo border-neo-cream/40 bg-neo-navy text-neo-white font-neo-body resize-none"
                placeholder={t('teacher.assignment.instructionsPlaceholder')}
              />
            </div>

            {/* Actions */}
            {submitHint && (
              <p
                id="assignment-submit-hint"
                data-testid="assignment-submit-hint"
                role="status"
                className="-mb-2 text-sm font-bold text-neo-cream/80"
              >
                {t(submitHint)}
              </p>
            )}
            <div data-testid="assignment-actions" className="sticky -bottom-6 z-10 -mx-6 -mb-6 flex gap-3 border-t-2 border-neo-cream/60 bg-neo-navy px-6 pb-6 pt-4">
              <Button
                onClick={handleSubmit}
                aria-describedby={submitHint ? 'assignment-submit-hint' : undefined}
                disabled={isSubmitting || (!isWordGoal && !selectedLessonId) || !dueDate}
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
        )}
      </DialogContent>
    </Dialog>
  );
}
