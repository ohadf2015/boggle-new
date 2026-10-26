/**
 * Google Classroom roster import, pure half. A roster entry keeps the given name, the
 * family initial and a sha256 of the email; the raw email and surname never leave
 * this module. Server-only (node crypto via hashEmail).
 */

import { hashEmail } from '@/lib/auth/externalIdentity';
import type { GcStudent } from './googleClassroomApi';

export function isRosterImportServerEnabled(): boolean {
  return process.env.GC_ROSTER_IMPORT_ENABLED === 'true';
}

export function rosterDisplayName(given: string | null | undefined, family: string | null | undefined): string {
  const g = (given ?? '').trim();
  const initial = [...(family ?? '').trim()][0];
  const f = initial ? `${initial.toLocaleUpperCase()}.` : '';
  return [g, f].filter(Boolean).join(' ');
}

export interface RosterEntry {
  googleUserId: string;
  displayName: string;
  emailHash: string | null;
}

export function toRosterEntries(students: GcStudent[]): RosterEntry[] {
  return students
    .filter((s) => typeof s.userId === 'string' && s.userId)
    .map((s) => ({
      googleUserId: s.userId,
      displayName: rosterDisplayName(s.profile?.name?.givenName, s.profile?.name?.familyName),
      emailHash: hashEmail(s.profile?.emailAddress),
    }));
}

export interface MemberKeys {
  studentId: string;
  linkedGoogleId: string | null;
  emailHashes: string[];
}

export interface RosterMatch {
  studentId: string;
  googleUserId: string;
  emailHash: string | null;
  via: 'external_id' | 'email_hash';
}

export function matchRoster(roster: RosterEntry[], members: MemberKeys[]): { matched: RosterMatch[]; unmatched: RosterEntry[] } {
  const byGoogleId = new Map(roster.map((r) => [r.googleUserId, r]));
  const takenEntries = new Set<string>();
  const takenMembers = new Set<string>();
  const matched: RosterMatch[] = [];

  for (const m of members) {
    const entry = m.linkedGoogleId ? byGoogleId.get(m.linkedGoogleId) : undefined;
    if (!entry || takenEntries.has(entry.googleUserId)) continue;
    takenEntries.add(entry.googleUserId);
    takenMembers.add(m.studentId);
    matched.push({ studentId: m.studentId, googleUserId: entry.googleUserId, emailHash: entry.emailHash, via: 'external_id' });
  }

  for (const m of members) {
    if (takenMembers.has(m.studentId)) continue;
    const entry = roster.find((r) => r.emailHash && !takenEntries.has(r.googleUserId) && m.emailHashes.includes(r.emailHash));
    if (!entry) continue;
    takenEntries.add(entry.googleUserId);
    takenMembers.add(m.studentId);
    matched.push({ studentId: m.studentId, googleUserId: entry.googleUserId, emailHash: entry.emailHash, via: 'email_hash' });
  }

  return { matched, unmatched: roster.filter((r) => !takenEntries.has(r.googleUserId)) };
}
