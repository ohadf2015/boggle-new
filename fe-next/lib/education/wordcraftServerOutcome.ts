export interface WordCraftServerOutcome {
  completed: boolean;
  assignmentCompleted: boolean;
}

export function asServerOutcome(value: unknown): WordCraftServerOutcome | null {
  if (!value || typeof value !== 'object') return null;
  const { completed, assignmentCompleted } = value as Record<string, unknown>;
  if (typeof completed !== 'boolean') return null;
  return { completed, assignmentCompleted: assignmentCompleted === true };
}
