'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useAssignments } from '@/hooks/useAssignments';
import { useTeacherPro } from '@/hooks/useTeacherPro';
import { FREE_TIER_LIMITS } from '@/lib/education/freeTierLimits';
import { hasProAccess } from '@/lib/education/teacherPlanGate';
import { AssignmentLimitUpsell } from './AssignmentLimitUpsell';
import { AssignmentTemplateGallery } from './AssignmentTemplateGallery';
import { useLessons } from '@/hooks/useVocabularyLesson';
import { useClassrooms } from '@/hooks/useClassroom';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import { Swords, BookOpen, Crosshair, Lock, Grid2x2 } from 'lucide-react';
import { AssignmentCreatorDueDate, assignmentSubmitHintKey } from './AssignmentCreatorDueDate';
import { AssignmentStep } from './AssignmentStep';
import { AssignmentLessonStep } from './AssignmentLessonStep';
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
  assignAssignmentTemplate,
  assignmentTemplatesFor,
  type AssignmentTemplate,
} from '@/lib/education/assignmentTemplates';
import {
  trackEduTemplateAssigned,
  trackEduFirstAssignmentCreated,
} from '@/lib/education/telemetry';
import {
  captureTeacherOnboardingFunnel,
  TEACHER_ONBOARDING_FUNNEL_EVENTS,
  teacherFunnelPlan,
} from '@/lib/education/teacherOnboardingFunnel';
import type { Language } from '@/lib/supabase/education/types';
import { AssignmentGoalModes } from './AssignmentGoalModes';
import { createWordGoalAssignment } from '@/lib/education/createWordGoalAssignment';
import { SINGLE_WORDS_ONLY_KEY, formatRejectedTerms } from '@/lib/education/singleWordTerm';
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
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const { createAssignment, assignments } = useAssignments(classroomId);
  const pro = useTeacherPro();
  const { hasPro, status, loading: proLoading } = pro;
  const [nowMs] = useState(() => Date.now());
  // Soft paywall: Pro or a live access trial lifts it; wait for the entitlement so a
  // paying teacher never sees the gate. `assignments` is undefined in older hook mocks.
  const assignmentCount = assignments?.length ?? 0;
  const atAssignmentCap =
    !proLoading && !hasProAccess(pro, nowMs) && assignmentCount >= FREE_TIER_LIMITS.assignmentsPerClass;
  const { lessons, isLoading: isLoadingLessons, createLesson } = useLessons();
  const { classrooms = [] } = useClassrooms();

  const [selectedType, setSelectedType] = useState<AssignmentType>('wordcraft');
  const [selectedLessonId, setSelectedLessonId] = useState<string>('');
  const [dueDate, setDueDate] = useState<string>('');
  const [instructions, setInstructions] = useState<string>('');
  const [focus, setFocus] = useState<PracticeFocusSetting>('any');
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Synchronous guard: a double-click fires twice before `isSubmitting`
  // re-renders the button disabled, which inserted the same lesson twice.
  const submittingRef = useRef(false);
  const [wordCount, setWordCount] = useState(WORD_COUNT_DEFAULT);
  const [wordListRaw, setWordListRaw] = useState('');
  const [galleryOpen, setGalleryOpen] = useState(false);
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
  const galleryTemplates = useMemo(
    () => assignmentTemplatesFor(classroomLanguage),
    [classroomLanguage],
  );
  const emptyLessonList = !isLoadingLessons && lessons.length === 0;

  // Reset form when dialog opens. Empty classrooms land on the gallery so the
  // first assignment is a preview + one tap, not a blank lesson dropdown.
  useEffect(() => {
    if (isOpen) {
      setSelectedType('wordcraft');
      setSelectedLessonId(initialLessonId ?? '');
      setDueDate('');
      setInstructions('');
      setFocus('any');
      setWordCount(WORD_COUNT_DEFAULT);
      setWordListRaw('');
      setGalleryOpen(emptyLessonList);
    }
  }, [isOpen, initialLessonId, emptyLessonList]);

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
    if (submittingRef.current) return;
    submittingRef.current = true;
    try {
      await submitAssignment();
    } finally {
      submittingRef.current = false;
    }
  };

  const submitAssignment = async () => {
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
        toast.error(
          validated.error === 'multi_word_terms'
            ? t(SINGLE_WORDS_ONLY_KEY, { terms: formatRejectedTerms(validated.rejected ?? []) })
            : t('teacher.assignment.wordGoalMissing'),
        );
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
        // UI locale, not the class language. Plan is mapped inside
        // createWordGoalAssignment so this path cannot stamp trial as pro.
        funnel: { locale: language, hasPro, status, loading: proLoading },
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

    if (result.alreadyAssigned) {
      // Re-assigning a lesson this class already has updates that assignment
      // (due date, mode) rather than failing or creating a second copy.
      if (result.success) {
        toast.success(t('teacher.assignment.alreadyAssignedUpdated'));
        onComplete();
        onClose();
      } else {
        toast.error(t('teacher.assignment.alreadyAssigned'));
      }
      return;
    }

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

  const handleAssignTemplate = async (template: AssignmentTemplate) => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    try {
      await assignTemplate(template);
    } finally {
      submittingRef.current = false;
    }
  };

  const assignTemplate = async (template: AssignmentTemplate) => {
    if (!user) {
      toast.error(t('teacher.assignment.error'));
      return;
    }
    setIsSubmitting(true);
    const result = await assignAssignmentTemplate({
      template,
      classroomId,
      teacherId: user.id,
      lessonName: t(template.nameKey),
      lessonDescription: t(template.descriptionKey),
      createLesson,
    });
    setIsSubmitting(false);
    if (result.success && result.assigned) {
      trackEduTemplateAssigned({ templateId: template.id, classroomId });
      // The template gallery is the one publish path that never emitted
      // `assignment_created` (lesson/word-goal paths fire it inside
      // useAssignments/createWordGoalAssignment). Without it a teacher whose
      // FIRST assignment is a starter pack showed up as a funnel drop-off.
      captureTeacherOnboardingFunnel(TEACHER_ONBOARDING_FUNNEL_EVENTS.assignmentCreated, {
        locale: language,
        plan: teacherFunnelPlan({ hasPro, status, loading: proLoading }),
      });
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
        ) : galleryOpen ? (
          <AssignmentTemplateGallery
            templates={galleryTemplates}
            isSubmitting={isSubmitting}
            onAssign={(pack) => void handleAssignTemplate(pack)}
            onClose={onClose}
            onCreateOwn={() => setGalleryOpen(false)}
          />
        ) : (
        <div className="space-y-4">
            <Button
              type="button"
              variant="outline"
              data-testid="assignment-browse-templates"
              onClick={() => setGalleryOpen(true)}
              className="w-full border-neo-cyan text-neo-cyan hover:bg-neo-cyan/20"
            >
              {t('teacher.assignment.galleryBrowse')}
            </Button>
            {!isWordGoal && (
            <AssignmentLessonStep
              lessons={lessons}
              classrooms={classrooms}
              classroomId={classroomId}
              classroomLanguage={classroomLanguage}
              selectedLessonId={selectedLessonId}
              isLoading={isLoadingLessons}
              onSelect={setSelectedLessonId}
            />
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
