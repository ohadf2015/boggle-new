/**
 * Roster import, server half: reads the Classroom roster with the teacher's token,
 * matches it to this class's members, and (on request) links matched students.
 * No accounts are created; unmatched roster entries are returned, never stored.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import logger from '@/utils/logger';
import { hashEmail, isIdentityLinkingEnabled, linkExternalIdentity, listLinkedIdentities } from '@/lib/auth/externalIdentity';
import { listAllStudents } from './googleClassroomApi';
import { matchRoster, toRosterEntries, type MemberKeys, type RosterEntry } from './googleClassroomRoster';

export class RosterInputError extends Error {
  constructor(public status: number, public code: string) {
    super(code);
  }
}

export async function fetchRoster(token: string, courseId: string): Promise<RosterEntry[]> {
  return toRosterEntries(await listAllStudents(token, courseId));
}

async function loadMembers(admin: SupabaseClient, classroomId: string) {
  const { data, error } = await admin.from('classroom_memberships').select('student_id').eq('classroom_id', classroomId);
  if (error) {
    logger.error('[gc-roster] membership read failed', error);
    throw new RosterInputError(500, 'roster_read_failed');
  }
  const ids = [...new Set(((data as Array<{ student_id: string }>) ?? []).map((m) => m.student_id))];
  if (ids.length === 0) return { ids, names: new Map<string, string | null>(), keys: [] as MemberKeys[] };

  const { data: profiles, error: pErr } = await admin.from('profiles').select('id, display_name, username').in('id', ids);
  if (pErr) logger.warn('[gc-roster] profile read failed', pErr);
  const names = new Map<string, string | null>();
  for (const p of (profiles as Array<{ id: string; display_name?: string | null; username?: string | null }>) ?? []) {
    names.set(p.id, p.display_name?.trim() || p.username?.trim() || null);
  }

  const links = new Map<string, { externalId: string; emailHash: string | null }>();
  if (isIdentityLinkingEnabled()) {
    try {
      for (const l of await listLinkedIdentities(admin, 'google', ids)) links.set(l.userId, l);
    } catch (err) {
      logger.error('[gc-roster] identity links unreadable, matching by email only', err);
    }
  }

  const keys: MemberKeys[] = await Promise.all(
    ids.map(async (id) => {
      const { data: u, error: uErr } = await admin.auth.admin.getUserById(id);
      if (uErr) logger.warn('[gc-roster] getUserById failed', { id, message: uErr.message });
      const user = u?.user as { email?: string | null; is_anonymous?: boolean } | undefined;
      const authHash = user && !user.is_anonymous ? hashEmail(user.email) : null;
      const link = links.get(id);
      const emailHashes = [authHash, link?.emailHash ?? null].filter((h): h is string => !!h);
      return { studentId: id, linkedGoogleId: link?.externalId ?? null, emailHashes };
    }),
  );
  return { ids, names, keys };
}

/** null = status unknown; callers then treat every student as needing consent. */
async function loadConsent(userClient: SupabaseClient, classroomId: string): Promise<Map<string, boolean> | null> {
  const { data, error } = await userClient.rpc('classroom_consent_status', { p_classroom_id: classroomId });
  if (error) {
    logger.error('[gc-roster] consent status unavailable', error);
    return null;
  }
  return new Map(((data as Array<{ student_id: string; has_consent: boolean }>) ?? []).map((r) => [r.student_id, r.has_consent === true]));
}

export interface RosterMatchResult {
  rosterCount: number;
  matchedCount: number;
  unmatchedCount: number;
  matched: Array<{ studentId: string; name: string | null; consentNeeded: boolean }>;
  unmatched: Array<{ displayName: string }>;
  linked: number;
  skippedForConsent: number;
  linkError?: 'linking_disabled';
}

export async function matchRosterToClass(input: {
  admin: SupabaseClient;
  userClient: SupabaseClient;
  token: string;
  classroomId: string;
  courseId: string;
  link: boolean;
}): Promise<RosterMatchResult> {
  const roster = await fetchRoster(input.token, input.courseId);
  const { names, keys } = await loadMembers(input.admin, input.classroomId);
  const { matched, unmatched } = matchRoster(roster, keys);
  const consent = matched.length > 0 ? await loadConsent(input.userClient, input.classroomId) : new Map<string, boolean>();
  const hasConsent = (id: string) => consent?.get(id) === true;

  const result: RosterMatchResult = {
    rosterCount: roster.length,
    matchedCount: matched.length,
    unmatchedCount: unmatched.length,
    matched: matched.map((m) => ({ studentId: m.studentId, name: names.get(m.studentId) ?? null, consentNeeded: !hasConsent(m.studentId) })),
    unmatched: unmatched.map((u) => ({ displayName: u.displayName })),
    linked: 0,
    skippedForConsent: 0,
  };

  if (!input.link) return result;
  if (!isIdentityLinkingEnabled()) return { ...result, linkError: 'linking_disabled' };
  for (const m of matched) {
    if (!hasConsent(m.studentId)) {
      result.skippedForConsent += 1;
      continue;
    }
    const res = await linkExternalIdentity(input.admin, {
      userId: m.studentId,
      provider: 'google',
      externalId: m.googleUserId,
      emailHash: m.emailHash,
    });
    if (res.ok && res.status === 'linked') result.linked += 1;
    else if (!res.ok) logger.warn('[gc-roster] link skipped', { reason: res.reason });
  }
  return result;
}
