/**
 * Curator proposal validation + ratification reward math (pure).
 *
 * Every curator content action is a proposal row, never a direct master write.
 * Validation runs on both client and server (defence in depth); reward math is
 * applied by the ratify path so a curator earns prestige points + one-time coin
 * milestones only when an admin confirms the action.
 */
import {
  SUPPORTED_LANGUAGES,
  CURATOR_POINTS,
  pointsForRatifiedProposal,
  coinBonusForCrossing,
  type CuratorProposalKind,
} from './curatorScope';

const KINDS = Object.keys(CURATOR_POINTS) as CuratorProposalKind[];
const PUZZLE_VERDICTS = ['good', 'bad', 'unsure'] as const;

export interface ProposalInput {
  kind: CuratorProposalKind;
  language: string;
  targetRef: string;
  payload?: Record<string, unknown>;
}

export interface ValidationResult {
  ok: boolean;
  error?: string;
}

/** Validate a proposal before it is persisted. */
export function validateProposalInput(input: ProposalInput): ValidationResult {
  if (!KINDS.includes(input.kind)) {
    return { ok: false, error: 'invalid_kind' };
  }
  if (!SUPPORTED_LANGUAGES.includes(input.language as never)) {
    return { ok: false, error: 'invalid_language' };
  }
  if (typeof input.targetRef !== 'string' || input.targetRef.trim().length === 0) {
    return { ok: false, error: 'empty_target' };
  }
  if (input.kind === 'puzzle_verdict') {
    const verdict = input.payload?.verdict;
    if (typeof verdict !== 'string' || !PUZZLE_VERDICTS.includes(verdict as never)) {
      return { ok: false, error: 'invalid_verdict' };
    }
  }
  return { ok: true };
}

export interface ProposalRow {
  curator_id: string;
  language: string;
  kind: CuratorProposalKind;
  target_ref: string;
  payload: Record<string, unknown>;
  status: 'proposed';
}

/**
 * Build the DB insert row. status is ALWAYS 'proposed' — a curator can never
 * self-ratify, regardless of what they put in the payload.
 */
export function buildProposalRow(input: ProposalInput, curatorId: string): ProposalRow {
  return {
    curator_id: curatorId,
    language: input.language,
    kind: input.kind,
    target_ref: input.targetRef.trim(),
    payload: input.payload ?? {},
    status: 'proposed',
  };
}

export interface RatifyReward {
  /** Prestige points awarded for this ratification. */
  points: number;
  /** Curator's new lifetime points total for the language. */
  newPoints: number;
  /** One-time coin bonus for any milestone crossed by this ratification. */
  coinBonus: number;
}

/**
 * Compute the reward for ratifying a proposal of `kind` when the curator
 * currently holds `currentPoints`. Idempotent w.r.t. coin milestones — only
 * milestones newly crossed pay out.
 */
export function computeRatifyReward(
  kind: CuratorProposalKind,
  currentPoints: number
): RatifyReward {
  const points = pointsForRatifiedProposal(kind);
  const newPoints = currentPoints + points;
  return { points, newPoints, coinBonus: coinBonusForCrossing(currentPoints, newPoints) };
}
