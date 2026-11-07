'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useAssignments } from '@/hooks/useAssignments';
import { useTeacherPro } from '@/hooks/useTeacherPro';
import { FREE_TIER_LIMITS } from '@/lib/education/freeTierLimits';
import { hasProAccess } from '@/lib/education/teacherPlanGate';
import { isAssignmentLimitError } from '@/lib/education/assignmentLimit';
import { AssignmentLimitUpsell } from './AssignmentLimitUpsell';
import { AssignmentTemplateGallery } from './AssignmentTemplateGallery';
import { useLessons } from '@/hooks/useVocabularyLesson';
import { useClassrooms } from '@/hooks/useClassroom';
import { cn } from '@/lib/utils';
import { Dialog } from '@/components/ui/dialog';
import { NbDialogBody, NbDialogContent, NbDialogFooter, NbDialogHeader } from '@/components/teacher/nb/NbDialog';
import { NbAdvanced } from '@/components/teacher/nb/NbAdvanced';
import { NB_BLOCK, NB_INPUT, NB_PRIMARY, NB_SECONDARY, NB_SMALL } from '@/components/teacher/nb/nbStyles';
import { Swords, BookOpen } from 'lucide-react';
import { AssignmentWordcraftOption } from './AssignmentWordcraftOption';
import { contentLanguagesFor } from '@/components/education/pickers/ContentLanguageChips';
import { wordCraftHomeworkSupports } from '@/lib/word-craft/lessonBag';
import { AssignmentCreatorDueDate, assignmentSubmitHintKey } from './AssignmentCreatorDueDate';
import { AssignmentStep } from './AssignmentStep';
import { AssignmentLessonStep } from './AssignmentLessonStep';
import toast from 'react-hot-toast';
import {
  VOCAB_FOCUSES,
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
import { AssignmentFocusPicker } from './AssignmentFocusPicker';
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
  const [dbCapHit, setDbCapHit] = useState(false);
  // Waits for the entitlement so a paying teacher never sees the gate; the DB trigger is the backstop.
  const assignmentCount = assignments?.length ?? 0;
  const atAssignmentCap = dbCapHit ||
    (!proLoading && !hasProAccess(pro, nowMs) && assignmentCount >= FREE_TIER_LIMITS.assignmentsPerClass);
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
  const [galleryLanguage, setGalleryLanguage] = useState<Language | null>(null);
  const contentLanguage: Language = galleryLanguage ?? selectedLesson?.language ?? classroomLanguage;
  const contentLanguages = useMemo(() => contentLanguagesFor(classroomLanguage, lessons.map((l) => l.language)), [classroomLanguage, lessons]);
  const galleryTemplates = useMemo(() => assignmentTemplatesFor(contentLanguage), [contentLanguage]);
  const wordcraftOk = !selectedLesson || wordCraftHomeworkSupports(selectedLesson.language ?? 'en');
  useEffect(() => {
    if (!wordcraftOk) setSelectedType((type) => (type === 'wordcraft' ? 'practice' : type));
  }, [wordcraftOk]);
  const emptyLessonList = !isLoadingLessons && lessons.length === 0;

  // Reset form when dialog opens. Empty classrooms land on the gallery so the
  // first assignment is a preview + one tap, not a blank lesson dropdown.
  useEffect(() => {
    if (isOpen) {
      setSelectedType('wordcraft');
      setGalleryLanguage(null);
      setSelectedLessonId(initialLessonId ?? '');
      setDueDate('');
      setInstructions('');
      setFocus('any');
      setWordCount(WORD_COUNT_DEFAULT);
      setWordListRaw('');
      setGalleryOpen(emptyLessonList);
      setDbCapHit(false);
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

  const showFailure = (err?: string) => (isAssignmentLimitError(err) ? setDbCapHit(true) : toast.error(err || t('teacher.assignment.error')));
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
        showFailure(result.error);
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
      showFailure(result.error);
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
    showFailure(result.assignmentError || result.error);
  };

  const modeButton = (on: boolean, color: 'cyan' | 'pink') =>
    cn(NB_SMALL, 'min-h-12 w-full gap-2 whitespace-normal px-3 text-start', on ? NB_BLOCK[color] : NB_BLOCK.navy);
  const advancedInUse = selectedType !== 'wordcraft' || instructions.trim() !== '';

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <NbDialogContent noDescription size="lg" phone="full">
        <NbDialogHeader
          color="yellow"
          title={atAssignmentCap ? t('teacher.subscription.assignmentLimitTitle') : t('teacher.assignment.createTitle')}
          closeLabel={t('common.close')}
        >
          {!atAssignmentCap && !galleryOpen && classroom ? (
            <p data-testid="assignment-who" className="mt-1 flex flex-wrap items-center gap-x-2 font-neo-body text-sm font-bold">
              <span dir="auto">{classroom.name}</span>
              <span aria-hidden="true">·</span>
              <span>{t('eg2Rep.assign.students', { count: classroom.member_count ?? 0 })}</span>
            </p>
          ) : null}
        </NbDialogHeader>

        {atAssignmentCap ? (
          <NbDialogBody>
            <AssignmentLimitUpsell currentCount={assignmentCount} onClose={onClose} />
          </NbDialogBody>
        ) : galleryOpen ? (
          <NbDialogBody>
            <AssignmentTemplateGallery
              templates={galleryTemplates}
              language={contentLanguage}
              languages={contentLanguages}
              onLanguageChange={setGalleryLanguage}
              isSubmitting={isSubmitting}
              onAssign={(pack) => void handleAssignTemplate(pack)}
              onClose={onClose}
              onCreateOwn={() => setGalleryOpen(false)}
            />
          </NbDialogBody>
        ) : (
          <>
            <NbDialogBody className="space-y-5">
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
              <button
                type="button"
                data-testid="assignment-browse-templates"
                onClick={() => setGalleryOpen(true)}
                className={cn(NB_SECONDARY, 'w-full text-sm')}
              >
                {t('teacher.assignment.galleryBrowse')}
              </button>

              <AssignmentStep step="mode" n={2} label={t('teacher.assignment.typeLabel')}>
                <AssignmentWordcraftOption selected={selectedType === 'wordcraft'} disabled={!wordcraftOk} onSelect={() => setSelectedType('wordcraft')} t={t} />
              </AssignmentStep>

              <AssignmentStep step="due" n={3} label={t('teacher.assignment.dueDate')}>
                <AssignmentCreatorDueDate value={dueDate} onChange={setDueDate} />
              </AssignmentStep>

              <NbAdvanced
                testId="assignment-advanced-toggle"
                forceOpen={advancedInUse}
                label={t('teacher.assignment.moreOptions')}
                closeLabel={t('eduShell.setup.advancedClose')}
              >
                <div className="grid grid-cols-2 gap-3">
                  <button type="button" aria-pressed={selectedType === 'practice'} onClick={() => setSelectedType('practice')} className={modeButton(selectedType === 'practice', 'cyan')}>
                    <BookOpen className="size-5 shrink-0" aria-hidden="true" />
                    <span>{t('teacher.assignment.practiceMode')}</span>
                  </button>
                  <button type="button" aria-pressed={selectedType === 'duel'} onClick={() => setSelectedType('duel')} className={modeButton(selectedType === 'duel', 'pink')}>
                    <Swords className="size-5 shrink-0" aria-hidden="true" />
                    <span>{t('teacher.assignment.duelChallenge')}</span>
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
                {selectedType === 'practice' && selectedLesson && (
                  <AssignmentFocusPicker focus={focus} onFocus={setFocus} supportedFocuses={supportedFocuses} focusCounts={focusCounts} t={t} />
                )}
                <div>
                  <label htmlFor="assignment-instructions" className="mb-2 block font-neo-body text-sm font-bold text-neo-cream">
                    {t('teacher.assignment.instructionsLabel')} {t('common.optional')}
                  </label>
                  <textarea
                    id="assignment-instructions"
                    value={instructions}
                    onChange={(e) => setInstructions(e.target.value)}
                    rows={2}
                    aria-label={t('teacher.assignment.instructionsLabel')}
                    className={cn(NB_INPUT, 'resize-none py-2.5')}
                    placeholder={t('teacher.assignment.instructionsPlaceholder')}
                  />
                </div>
              </NbAdvanced>
            </NbDialogBody>

            <NbDialogFooter data-testid="assignment-actions" className="sm:justify-between">
              {submitHint ? (
                <p
                  id="assignment-submit-hint"
                  data-testid="assignment-submit-hint"
                  role="status"
                  className="font-neo-body text-sm font-bold text-neo-cream/85 max-sm:order-last sm:me-auto"
                >
                  {t(submitHint)}
                </p>
              ) : null}
              <button type="button" onClick={onClose} disabled={isSubmitting} className={NB_SECONDARY}>
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                aria-describedby={submitHint ? 'assignment-submit-hint' : undefined}
                disabled={isSubmitting || (!isWordGoal && !selectedLessonId) || !dueDate}
                className={cn(NB_PRIMARY, 'sm:min-w-44')}
              >
                {isSubmitting ? t('teacher.assignment.creating') : t('teacher.assignment.create')}
              </button>
            </NbDialogFooter>
          </>
        )}
      </NbDialogContent>
    </Dialog>
  );
}
