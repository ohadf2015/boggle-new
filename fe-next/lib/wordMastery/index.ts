export {
  FAST_SOLVE_MS,
  MASTERED_MIN_SCORE,
  classifyWordMastery,
  pickWeakestWords,
  scoreWordMastery,
  buildMasteryLists,
  type WordAttempt,
  type WordMasteryScore,
  type WordMasteryStatus,
  type WeakWordRow,
  type MasteryListRow,
} from './score';

export {
  deriveAttemptsFromSessions,
  toMasteryUpsertRows,
  type GameSessionWordRow,
  type DerivedWordAttempts,
  type MasteryUpsertRow,
} from './deriveFromSessions';

export {
  isWordMasteryEnvEnabled,
  resolveWordMasteryAccess,
  type WordMasteryExperimentVariant,
} from './isEnabled';
