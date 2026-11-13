import { safeCapture } from './telemetry';

export function trackEduStudyCompleted(args: { words: number; seconds: number }): void {
  safeCapture('edu_study_completed', { words: args.words, seconds: args.seconds });
}

export function trackEduStartedWhileLearning(args: { stillLearning: number; students: number }): void {
  safeCapture('edu_game_started_while_learning', { still_learning: args.stillLearning, students: args.students });
}
