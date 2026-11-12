/**
 * Server-side resolution + enforcement of the Families Policy social tier.
 *
 * Wraps the pure policy in lib/families/socialPolicy.ts with the IO needed to
 * read a user's age signal:
 *  - authenticated users  → profiles.birth_year + social_features_override (DB)
 *  - guests               → self-declared handshake.auth.declaredBirthYear
 *
 * Grandfathering (2026-07-13): existing users are adults; only new users get
 * the age gate. Authed = created_at before the cutoff (server-verified).
 * Guest = handshake.auth.grandfathered === '1' — a self-declared claim with
 * the same trust level as declaredBirthYear (policy permits self-declaration).
 * A DECLARED age always wins; grandfathering only upgrades tier 'unknown'.
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
import { isGrandfatheredCreatedAt } from '../../lib/families/grandfather';
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

interface SocialProfile {
  birthYear: number | null;
  override: Partial<SocialCapabilities> | null;
  grandfathered: boolean;
}

/** Any read failure falls through to the unknown (restricted) tier: fail safe. */
async function readSocialProfile(userId: string): Promise<SocialProfile> {
  try {
    const supabase = getSupabase();
    if (!supabase) return { birthYear: null, override: null, grandfathered: false };
    const { data } = await supabase
      .from('profiles')
      .select('birth_year, social_features_override, created_at')
      .eq('id', userId)
      .single();
    return {
      birthYear: (data?.birth_year as number | null) ?? null,
      override: (data?.social_features_override as Partial<SocialCapabilities> | null) ?? null,
      grandfathered: isGrandfatheredCreatedAt(data?.created_at as string | null | undefined),
    };
  } catch {
    return { birthYear: null, override: null, grandfathered: false };
  }
}

function contextFrom({ birthYear, override, grandfathered }: SocialProfile): SocketSocialContext {
  const computedTier = computeSocialTier(birthYear, currentYear());
  // Grandfather upgrades ONLY the undeclared tier — a declared child stays a child.
  const tier: SocialTier = computedTier === 'unknown' && grandfathered ? 'adult' : computedTier;
  return { tier, caps: resolveSocialCapabilities(tier, override) };
}

/** Capabilities for a signed-in user outside a socket (HTTP routes). */
export async function resolveUserSocialCapabilities(userId: string): Promise<SocialCapabilities> {
  return contextFrom(await readSocialProfile(userId)).caps;
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

  const authUserId = getAuthUserId(socket);
  const profile = authUserId
    ? await readSocialProfile(authUserId)
    : {
        birthYear: readDeclaredBirthYear(socket),
        override: null,
        grandfathered: (socket.handshake?.auth as Record<string, unknown> | undefined)?.grandfathered === '1',
      };
  const ctx = contextFrom(profile);
  // socket.data defaults to {} in real Socket.IO, but guard the memo write so a
  // socket-like object without `.data` (e.g. a lightweight test/mock socket)
  // can never throw "Cannot set properties of undefined" and abort the suite.
  if (!socket.data || typeof socket.data !== 'object') {
    (socket as { data: Record<string, unknown> }).data = {};
  }
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
