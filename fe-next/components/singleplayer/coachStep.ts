/**
 * Last coach step to stamp on game_abandoned when sp_mode is challenge.
 * Other modes omit the property.
 */
export function coachStepFor(input: {
  spMode: string;
  shortCoach: boolean;
  hintVisible: boolean;
  lessonActive: boolean;
  stepId: string | null;
  lessonComplete: boolean;
  lessonSkipped: boolean;
}): string | undefined {
  if (input.spMode !== 'challenge') return undefined;
  if (input.shortCoach) return input.hintVisible ? 'inline-hint' : 'playing';
  if (input.lessonComplete) return 'complete';
  if (input.lessonActive && input.stepId) return input.stepId;
  if (input.lessonSkipped) return 'skipped';
  return 'playing';
}
