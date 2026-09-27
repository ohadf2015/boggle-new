/**
 * Compact, URL-safe codec for a WordCraft duel opponent's avatar.
 *
 * A duel link is the entire transport (no backend), so the challenger's avatar
 * must travel inside a query param. We serialize the full `CustomAvatarConfig`
 * as base64url(JSON) — storing *values* (not array indices), so the token keeps
 * decoding correctly even if the `AVATAR_*` enums are later reordered. On the
 * way back in we run `customAvatarSchema.safeParse`, so anything malformed,
 * truncated, or schema-incompatible decodes to `null` and the UI falls back to
 * a seeded avatar. Avatar configs are pure ASCII (enum strings + hex colors),
 * so plain base64 is safe.
 */
import {
  customAvatarSchema,
  type CustomAvatarConfig,
} from '@/shared/types/customAvatar';

/** Upper bound on token length — a real avatar token is ~300 chars; reject abuse. */
const MAX_AVATAR_TOKEN_LEN = 2048;

function toBase64Url(input: string): string {
  const b64 =
    typeof btoa !== 'undefined'
      ? btoa(input)
      : Buffer.from(input, 'binary').toString('base64');
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(token: string): string {
  const b64 = token.replace(/-/g, '+').replace(/_/g, '/');
  return typeof atob !== 'undefined'
    ? atob(b64)
    : Buffer.from(b64, 'base64').toString('binary');
}

/** Encode an avatar config into a compact, URL-safe token. */
export function encodeAvatar(config: CustomAvatarConfig): string {
  return toBase64Url(JSON.stringify(config));
}

/**
 * Decode a duel avatar token back into a validated config. Returns `null` for
 * missing, oversized, non-base64, non-JSON, or schema-invalid input — never throws.
 */
export function decodeAvatar(token: string | null | undefined): CustomAvatarConfig | null {
  if (!token || token.length > MAX_AVATAR_TOKEN_LEN) return null;
  try {
    const json = fromBase64Url(token);
    const parsed = JSON.parse(json);
    const result = customAvatarSchema.safeParse(parsed);
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}
