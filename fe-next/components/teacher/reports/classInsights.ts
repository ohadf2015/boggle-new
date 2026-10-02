import type { ClassMastery, WordTrajectory } from '@/lib/education/wordMasteryTrend';

export const CLASS_GOAL = 80;
const TREND_STEP = 15;
const MISSED_WORDS_SHOWN = 3;

export type StudentTrend = 'up' | 'down' | 'steady' | 'new';
export type WordState = 'mastered' | 'improving' | 'stuck' | 'new';

export interface StudentInsight {
  studentId: string;
  attempts: number;
  accuracy: number;
  belowGoal: boolean;
  trend: StudentTrend;
  /** Display forms, most-missed first. */
  missedWords: string[];
  masteredCount: number;
  stuckCount: number;
}

export interface WordInsight {
  word: string;
  display: string;
  state: WordState;
  studentsStuck: number;
  studentsMastered: number;
  studentsWithEvidence: number;
}

export interface ClassInsights {
  goal: number;
  students: StudentInsight[];
  words: Record<string, WordInsight>;
  belowGoalCount: number;
  masteredWords: number;
  stuckWords: number;
}

const pct = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 100) : 0);

function trendOf(words: WordTrajectory[]): StudentTrend {
  const repeated = words.filter((w) => w.outcomes.length >= 2);
  if (repeated.length === 0) return 'new';
  let earlier = 0;
  let earlierCorrect = 0;
  let recentCorrect = 0;
  for (const w of repeated) {
    const before = w.outcomes.slice(0, -1);
    earlier += before.length;
    earlierCorrect += before.filter(Boolean).length;
    if (w.outcomes[w.outcomes.length - 1]) recentCorrect += 1;
  }
  const delta = pct(recentCorrect, repeated.length) - pct(earlierCorrect, earlier);
  if (delta >= TREND_STEP) return 'up';
  if (delta <= -TREND_STEP) return 'down';
  return 'steady';
}

function stateOf(stuck: number, mastered: number, withEvidence: number): WordState {
  if (withEvidence === 0) return 'new';
  if (stuck > 0 && stuck * 2 >= withEvidence) return 'stuck';
  if (mastered === withEvidence) return 'mastered';
  return 'improving';
}

export function buildClassInsights(mastery: ClassMastery, goal = CLASS_GOAL): ClassInsights {
  const tallies = new Map<string, { display: string; stuck: number; mastered: number; withEvidence: number }>();

  const students: StudentInsight[] = mastery.students.map((student) => {
    let attempts = 0;
    let correct = 0;
    for (const w of student.words) {
      attempts += w.attempts;
      correct += w.correct;
      const tally = tallies.get(w.word) ?? { display: w.display, stuck: 0, mastered: 0, withEvidence: 0 };
      if (w.trend !== 'insufficient') tally.withEvidence += 1;
      if (w.trend === 'stuck') tally.stuck += 1;
      if (w.trend === 'mastered') tally.mastered += 1;
      tallies.set(w.word, tally);
    }
    const accuracy = pct(correct, attempts);
    const missedWords = student.words
      .filter((w) => w.correct < w.attempts)
      .sort((a, b) => b.attempts - b.correct - (a.attempts - a.correct) || Number(a.lastCorrect) - Number(b.lastCorrect) || a.word.localeCompare(b.word))
      .slice(0, MISSED_WORDS_SHOWN)
      .map((w) => w.display);
    return {
      studentId: student.studentId,
      attempts,
      accuracy,
      belowGoal: accuracy < goal,
      trend: trendOf(student.words),
      missedWords,
      masteredCount: student.masteredCount,
      stuckCount: student.stuckWords.length,
    };
  });

  students.sort((a, b) => a.accuracy - b.accuracy || a.studentId.localeCompare(b.studentId));

  const words: Record<string, WordInsight> = {};
  let masteredWords = 0;
  let stuckWords = 0;
  for (const [word, t] of tallies) {
    const state = stateOf(t.stuck, t.mastered, t.withEvidence);
    if (state === 'mastered') masteredWords += 1;
    if (state === 'stuck') stuckWords += 1;
    words[word] = {
      word,
      display: t.display,
      state,
      studentsStuck: t.stuck,
      studentsMastered: t.mastered,
      studentsWithEvidence: t.withEvidence,
    };
  }

  return {
    goal,
    students,
    words,
    belowGoalCount: students.filter((s) => s.belowGoal).length,
    masteredWords,
    stuckWords,
  };
}
