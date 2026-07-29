/**
 * Pure validation/normalization for the admin blocklist create payload.
 * Kept separate from the route so it can be unit-tested without Next/server deps.
 */

export const BLOCK_TYPES = ['auth_user', 'guest_session', 'ip'] as const;
export type BlockType = (typeof BLOCK_TYPES)[number];

const MAX_VALUE_LEN = 255;
const MAX_REASON_LEN = 500;

export interface ParsedBlock {
  block_type: BlockType;
  value: string;
  reason: string | null;
  /** ISO string, or null for a permanent block. */
  expires_at: string | null;
}

export type ParseResult =
  | { ok: true; data: ParsedBlock }
  | { ok: false; error: string };

interface RawBlockPayload {
  blockType?: unknown;
  value?: unknown;
  reason?: unknown;
  /** ISO string for an explicit expiry. */
  expiresAt?: unknown;
  /** Relative duration in ms (alternative to expiresAt). */
  durationMs?: unknown;
}

function isBlockType(v: unknown): v is BlockType {
  return typeof v === 'string' && (BLOCK_TYPES as readonly string[]).includes(v);
}

export function parseBlockPayload(body: RawBlockPayload): ParseResult {
  if (!isBlockType(body.blockType)) {
    return { ok: false, error: `blockType must be one of: ${BLOCK_TYPES.join(', ')}` };
  }

  const value = typeof body.value === 'string' ? body.value.trim() : '';
  if (!value) {
    return { ok: false, error: 'value is required' };
  }
  if (value.length > MAX_VALUE_LEN) {
    return { ok: false, error: `value must be at most ${MAX_VALUE_LEN} characters` };
  }

  let reason: string | null = null;
  if (typeof body.reason === 'string') {
    const trimmed = body.reason.trim().slice(0, MAX_REASON_LEN);
    reason = trimmed.length ? trimmed : null;
  }

  let expires_at: string | null = null;
  if (body.expiresAt != null && body.expiresAt !== '') {
    if (typeof body.expiresAt !== 'string') {
      return { ok: false, error: 'expiresAt must be an ISO date string' };
    }
    const ts = new Date(body.expiresAt).getTime();
    if (Number.isNaN(ts)) {
      return { ok: false, error: 'expiresAt is not a valid date' };
    }
    if (ts <= Date.now()) {
      return { ok: false, error: 'expiresAt must be in the future' };
    }
    expires_at = new Date(ts).toISOString();
  } else if (body.durationMs != null) {
    const ms = Number(body.durationMs);
    if (!Number.isFinite(ms) || ms <= 0) {
      return { ok: false, error: 'durationMs must be a positive number' };
    }
    expires_at = new Date(Date.now() + ms).toISOString();
  }

  return { ok: true, data: { block_type: body.blockType, value, reason, expires_at } };
}
