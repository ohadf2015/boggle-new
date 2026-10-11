/**
 * Teacher HQ: send a word-count or pasted-list homework without first
 * building a lesson. Creates the lesson row students already read, then
 * assigns it so Academy `nextOpenAssignment` and the class progress report
 * pick it up with no second path.
 */
import { createAssignment } from '@/lib/supabase/education/assignments';
import type { Language, VocabularyWord } from '@/lib/supabase/education/types';
import type { CreateLessonFn } from './createLessonWithAssignment';
import { trackAssignmentCreated } from './assignmentEvents';
import {
  type WordGoal,
  wordGoalLessonName,
} from './wordGoalAssignment';
import logger from '@/utils/logger';

const COUNT_SEED: Record<Language, string[]> = {
  en: ['go', 'play', 'find'],
  he: ['לך', 'שחק', 'מצא'],
  es: ['ir', 'jugar', 'buscar'],
  sv: ['gå', 'leka', 'hitta'],
  ja: ['いく', 'あそぶ', 'さがす'],
  ru: ['иди', 'играй', 'найди'],
};

function asWords(list: readonly string[]): VocabularyWord[] {
  return list.map((word) => ({ word, canIntegrate: true }));
}

export interface CreateWordGoalAssignmentArgs {
  goal: WordGoal;
  classroomId: string;
  teacherId: string;
  language: Language;
  createLesson: CreateLessonFn;
  findNWordsLabel: (n: number) => string;
}

export interface CreateWordGoalAssignmentResult {
  success: boolean;
  assigned: boolean;
  assignmentId?: string;
  error?: string;
}

export async function createWordGoalAssignment({
  goal,
  classroomId,
  teacherId,
  language,
  createLesson,
  findNWordsLabel,
}: CreateWordGoalAssignmentArgs): Promise<CreateWordGoalAssignmentResult> {
  const name = wordGoalLessonName(goal, findNWordsLabel);
  const words = goal.kind === 'word_list' ? asWords(goal.words) : asWords(COUNT_SEED[language] ?? COUNT_SEED.en);

  const lesson = await createLesson({
    name,
    language,
    words,
    classroomId,
    isPublic: false,
  });
  if (!lesson.success || !lesson.data?.id) {
    return { success: false, assigned: false, error: lesson.error || 'Lesson failed' };
  }

  try {
    const assignment = await createAssignment({
      classroom_id: classroomId,
      lesson_id: lesson.data.id,
      teacher_id: teacherId,
      assignment_type: 'practice',
      due_date: goal.dueDate,
      title: name,
      word_count_target: goal.kind === 'word_count' ? goal.target : null,
    });
    if (assignment.error || !assignment.data) {
      logger.error('createWordGoalAssignment: assign failed', assignment.error);
      return {
        success: true,
        assigned: false,
        error: assignment.error?.message || 'Assignment failed',
      };
    }
    trackAssignmentCreated({
      classroom_id: classroomId,
      assignment_id: assignment.data.id,
      kind: goal.kind,
      due_date: goal.dueDate,
      word_count_target: goal.kind === 'word_count' ? goal.target : null,
      word_list_length: goal.kind === 'word_list' ? goal.words.length : null,
    });
    return { success: true, assigned: true, assignmentId: assignment.data.id };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    logger.error('createWordGoalAssignment threw', err);
    return { success: true, assigned: false, error: message };
  }
}
