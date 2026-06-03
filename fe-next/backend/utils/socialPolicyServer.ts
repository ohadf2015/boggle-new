/**
 * Server-side resolution + enforcement of the Families Policy social tier.
 *
 * Wraps the pure policy in lib/families/socialPolicy.ts with the IO needed to
 * read a user's age signal:
 *  - authenticated users  → profiles.birth_year + social_features_override (DB)
 *  - guests               → self-declared handshake.auth.declaredBirthYear
 *
 * Identity is the VERIFIED socket id (socket.data.verifiedUserId) — never a
 * client-supplied user id. The resolved context is memoised on the socket; the
 * client reconnects after setting its age, which yields a fresh socket.
 *
 * See docs/2026-06-03-families-policy-social-compliance.md
 */

import type { Socket } from 'socket.io';
import { getSupabase } from '../modules/supabaseServer';
import {
  computeSocialTier,
  resolveSocialCapabilities,
  type SocialCapabilities,
  type SocialTier,
} from '../../lib/families/socialPolicy';
import { getAuthUserId } from './socialHelpers';

export interface SocketSocialContext {
  tier: SocialTier;
  caps: SocialCapabilities;
}

const CACHE_KEY = 'socialContext';

function currentYear(): number {
  return new Date().getUTCFullYear();
}

function readDeclaredBirthYear(socket: Socket): number | null {
  const raw = (socket.handshake?.auth as Record<string, unknown> | undefined)?.declaredBirthYear;
  const n = typeof raw === 'string' ? Number(raw) : (raw as number | undefined);
  return Number.isInteger(n) ? (n as number) : null;
}

/**
 * Resolve (and memoise) the social context for a socket.
 * Guests never hit the database — their age is self-declared in the handshake.
 */
export async function resolveSocketSocialContext(socket: Socket): Promise<SocketSocialContext> {
  const cached = (socket.data as Record<string, unknown>)?.[CACHE_KEY] as
    | SocketSocialContext
    | undefined;
  if (cached) return cached;

  let birthYear: number | null = null;
  let override: Partial<SocialCapabilities> | null = null;

  const authUserId = getAuthUserId(socket);
  if (authUserId) {
    try {
      const supabase = getSupabase();
      if (supabase) {
        const { data } = await supabase
          .from('profiles')
          .select('birth_year, social_features_override')
          .eq('id', authUserId)
          .single();
        birthYear = (data?.birth_year as number | null) ?? null;
        override = (data?.social_features_override as Partial<SocialCapabilities> | null) ?? null;
      }
    } catch {
      // On any read failure, fall through to unknown tier (restricted) — fail safe.
      birthYear = null;
      override = null;
    }
  } else {
    birthYear = readDeclaredBirthYear(socket);
  }

  const tier = computeSocialTier(birthYear, currentYear());
  const caps = resolveSocialCapabilities(tier, override);
  const ctx: SocketSocialContext = { tier, caps };
  (socket.data as Record<string, unknown>)[CACHE_KEY] = ctx;
  return ctx;
}

/** Effective capabilities for a socket. */
export async function getSocialCapabilities(socket: Socket): Promise<SocialCapabilities> {
  return (await resolveSocketSocialContext(socket)).caps;
}

/** True if the socket's user may use the given social capability. */
export async function ensureSocialCapability(
  socket: Socket,
  key: keyof SocialCapabilities,
): Promise<boolean> {
  const caps = await getSocialCapabilities(socket);
  return caps[key];
}

/** Drop the memoised context (e.g. after an age change within the session). */
export function clearSocketSocialContextCache(socket: Socket): void {
  if (socket.data && typeof socket.data === 'object') {
    delete (socket.data as Record<string, unknown>)[CACHE_KEY];
  }
}
