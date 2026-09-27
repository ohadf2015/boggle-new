/**
 * Admin assign/revoke validation + row builders for curator assignments (pure).
 * Used by /api/admin/curators. Keeps the route thin and the rules testable.
 */
import { SUPPORTED_LANGUAGES, MAX_CURATOR_TIER } from './curatorScope';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface AssignmentInput {
  userId: string;
  language: string;
  trustTier?: number;
}

export interface ValidationResult {
  ok: boolean;
  error?: string;
}

/** Validate an assign request before it touches the DB. */
export function validateAssignmentInput(input: AssignmentInput): ValidationResult {
  if (typeof input.userId !== 'string' || !UUID_RE.test(input.userId)) {
    return { ok: false, error: 'invalid_user' };
  }
  if (!SUPPORTED_LANGUAGES.includes(input.language as never)) {
    return { ok: false, error: 'invalid_language' };
  }
  const tier = input.trustTier ?? 1;
  if (!Number.isInteger(tier) || tier < 1 || tier > MAX_CURATOR_TIER) {
    return { ok: false, error: 'invalid_tier' };
  }
  return { ok: true };
}

export interface AssignmentUpsertRow {
  curator_id: string;
  language: string;
  trust_tier: number;
  active: true;
  assigned_by: string;
  revoked_at: null;
  revoked_by: null;
  revoked_reason: null;
}

/**
 * Build the upsert row (PK = curator_id+language). On a re-grant of a previously
 * revoked assignment this re-activates it and clears the revocation fields.
 */
export function buildAssignmentUpsert(input: AssignmentInput, assignedBy: string): AssignmentUpsertRow {
  return {
    curator_id: input.userId,
    language: input.language,
    trust_tier: input.trustTier ?? 1,
    active: true,
    assigned_by: assignedBy,
    revoked_at: null,
    revoked_by: null,
    revoked_reason: null,
  };
}

export interface RevokePatch {
  active: false;
  revoked_by: string;
  revoked_reason: string | null;
  revoked_at: string;
}

/** Build the update patch that revokes (deactivates) an assignment. */
export function buildRevokePatch(revokedBy: string, reason: string | null, nowIso: string): RevokePatch {
  return { active: false, revoked_by: revokedBy, revoked_reason: reason ?? null, revoked_at: nowIso };
}
