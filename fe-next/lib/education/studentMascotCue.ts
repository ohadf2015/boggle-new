import type { MascotVariant } from '@/components/ui/mascotData';
import type { WordFeedback } from '@/components/game/WordFormingArea';

/**
 * The student's mascot face, as a pure function of the last thing that happened.
 *
 * What separates Duolingo from every quiz product in the research digest is not
 * a bigger animation — it is micro-feedback density carried by ONE character
 * whose expression changes on nearly every screen. Emotional continuity, not
 * spectacle. So this maps each word event onto a single, already-shipped
 * character set; a second mascot lineage would break the whole mechanic
 * silently, which is why the variants are a frozen map rather than free text at
 * each call site.
 *
 * The miss branch is the one that matters. A classroom cue that punishes a
 * wrong word re-creates, once per word, exactly the competence frustration the
 * rank reframe was built to remove — so `oops` never names a score, never
 * reddens, and never compares the student to anyone.
 *
 * Pure and React-free so the emotional mapping is reviewable on its own.
 */

export type StudentMascotMood = 'idle' | 'correct' | 'lesson' | 'oops' | 'roundEnd';

/** The one character set. Every mood resolves inside it. */
export const STUDENT_MASCOT_VARIANTS = {
  idle: 'gaming',
  correct: 'celebration',
  lesson: 'celebration',
  oops: 'oops',
  roundEnd: 'celebration',
} as const satisfies Record<StudentMascotMood, MascotVariant>;

export interface StudentMascotCue {
  mood: StudentMascotMood;
  variant: MascotVariant;
  /** i18n key, or null when the mascot is present but saying nothing. */
  messageKey: string | null;
  /** Panel tone. Never 'danger' — a miss is not an error state. */
  tone: 'ok' | 'info' | 'muted';
  /** Points earned, for a scoring event only. Null on a miss, by design. */
  points: number | null;
  /** The server's lesson-word bonus. Never recomputed here. */
  lessonBonus: number | null;
}

interface StudentMascotCueOptions {
  /** The round has ended; the last word no longer decides the face. */
  roundOver: boolean;
}

export function selectStudentMascotCue(
  feedback: WordFeedback | null | undefined,
  { roundOver }: StudentMascotCueOptions,
): StudentMascotCue {
  if (roundOver) {
    return {
      mood: 'roundEnd',
      variant: STUDENT_MASCOT_VARIANTS.roundEnd,
      messageKey: 'education.student.feel.roundOver',
      tone: 'ok',
      points: null,
      lessonBonus: null,
    };
  }

  if (!feedback) {
    return {
      mood: 'idle',
      variant: STUDENT_MASCOT_VARIANTS.idle,
      messageKey: null,
      tone: 'info',
      points: null,
      lessonBonus: null,
    };
  }

  if (feedback.type === 'accepted') {
    // A lesson word is the teacher's word. It gets its own line so the student
    // learns which words the class is actually about — the bonus figure comes
    // from the server (`lessonBonus`), and an older server simply sends none.
    const isLessonWord = feedback.fromLesson === true;
    return {
      mood: isLessonWord ? 'lesson' : 'correct',
      variant: isLessonWord
        ? STUDENT_MASCOT_VARIANTS.lesson
        : STUDENT_MASCOT_VARIANTS.correct,
      messageKey: isLessonWord
        ? 'education.student.feel.lessonWord'
        : 'education.student.feel.correct',
      tone: 'ok',
      points: typeof feedback.score === 'number' ? feedback.score : null,
      lessonBonus: typeof feedback.lessonBonus === 'number' ? feedback.lessonBonus : null,
    };
  }

  // 'rejected' | 'duplicate' | 'foundByOther' — three different reasons, one
  // deliberately flat response. Distinguishing them harder here would only give
  // the student more ways to feel caught out mid-round; `WordFormingArea`
  // already explains the specific reason on the word pill itself.
  return {
    mood: 'oops',
    variant: STUDENT_MASCOT_VARIANTS.oops,
    messageKey: 'education.student.feel.tryAgain',
    tone: 'muted',
    points: null,
    lessonBonus: null,
  };
}

export default selectStudentMascotCue;
