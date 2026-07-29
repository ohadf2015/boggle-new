/**
 * Tests for admin assign/revoke validation + row builders (pure).
 * TDD: written BEFORE implementation.
 */
import { describe, it, expect } from 'vitest';
import {
  validateAssignmentInput,
  buildAssignmentUpsert,
  buildRevokePatch,
  type AssignmentInput,
} from '../curatorAdmin';

const uid = '537a9da1-baee-4a94-b302-dbc97c9a16c2';
const base: AssignmentInput = { userId: uid, language: 'he', trustTier: 1 };

describe('validateAssignmentInput', () => {
  it('accepts a valid assignment', () => {
    expect(validateAssignmentInput(base).ok).toBe(true);
  });

  it('defaults trustTier to 1 when omitted', () => {
    expect(validateAssignmentInput({ userId: uid, language: 'en' }).ok).toBe(true);
  });

  it('rejects a missing / malformed userId', () => {
    expect(validateAssignmentInput({ ...base, userId: '' }).ok).toBe(false);
    expect(validateAssignmentInput({ ...base, userId: 'not-a-uuid' }).ok).toBe(false);
  });

  it('rejects an unsupported language', () => {
    expect(validateAssignmentInput({ ...base, language: 'fr' }).ok).toBe(false);
  });

  it('rejects a trustTier outside 1..3', () => {
    expect(validateAssignmentInput({ ...base, trustTier: 0 }).ok).toBe(false);
    expect(validateAssignmentInput({ ...base, trustTier: 4 }).ok).toBe(false);
    expect(validateAssignmentInput({ ...base, trustTier: 2.5 }).ok).toBe(false);
  });
});

describe('buildAssignmentUpsert', () => {
  it('builds an active row attributed to the granting admin, re-activating on re-grant', () => {
    const row = buildAssignmentUpsert({ userId: uid, language: 'he', trustTier: 2 }, 'admin-1');
    expect(row.curator_id).toBe(uid);
    expect(row.language).toBe('he');
    expect(row.trust_tier).toBe(2);
    expect(row.active).toBe(true);
    expect(row.assigned_by).toBe('admin-1');
    // re-grant clears any prior revocation
    expect(row.revoked_at).toBeNull();
    expect(row.revoked_by).toBeNull();
    expect(row.revoked_reason).toBeNull();
  });

  it('defaults trust_tier to 1', () => {
    const row = buildAssignmentUpsert({ userId: uid, language: 'en' }, 'admin-1');
    expect(row.trust_tier).toBe(1);
  });
});

describe('buildRevokePatch', () => {
  it('deactivates and records who/when/why', () => {
    const patch = buildRevokePatch('admin-1', 'spam', '2026-06-05T00:00:00.000Z');
    expect(patch.active).toBe(false);
    expect(patch.revoked_by).toBe('admin-1');
    expect(patch.revoked_reason).toBe('spam');
    expect(patch.revoked_at).toBe('2026-06-05T00:00:00.000Z');
  });

  it('allows a null reason', () => {
    const patch = buildRevokePatch('admin-1', null, '2026-06-05T00:00:00.000Z');
    expect(patch.revoked_reason).toBeNull();
  });
});
