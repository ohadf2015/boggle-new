/**
 * Google Classroom GRADE PASSBACK (Teacher Pro) — pure policy.
 *
 * ── Research findings (2026-09-25, read from the code, not guessed) ──────────
 * - The Classroom add-on (`app/[locale]/education/classroom-addon/`,
 *   `lib/education/googleClassroomAddon.ts`) never authenticates against Google.
 *   It only reads the iframe query (`courseId`, `itemId`, `addOnToken`,
 *   `login_hint`) and builds share-dialog URLs. `missGapGradePassback.ts` /
 *   `unpluggedReteachGradePassback.ts` only BUILD patch bodies; nothing calls
 *   the Classroom API.
 * - The only Google OAuth in the app is Supabase `signInWithOAuth` for login.
 *   It requests no Classroom scope, and Supabase exposes `provider_token` once
 *   after the redirect without persisting it — nothing in the repo reads it.
 * - No Google token store exists (no table, no column). `google-auth-library`
 *   is NOT a dependency (the 08-27 doc is stale), `googleapis` is not either —
 *   so the Classroom REST API is called with plain `fetch`.
 * - Scopes requested today: none beyond Supabase's default `openid email profile`.
 *
 * ── Decisions ────────────────────────────────────────────────────────────────
 * - Own OAuth start/callback (PKCE S256 + state bound to the Supabase user),
 *   incremental auth (`include_granted_scopes=true`), `access_type=online`.
 * - Token storage: persisting a refresh token would need a migration (no secure
 *   store exists), so the access token lives ONLY in an httpOnly, AES-256-GCM
 *   encrypted cookie (jose `EncryptJWT`, `dir`) bound to the teacher's user id,
 *   expiring with the token (~1h). Nothing Google-side is written to the DB.
 * - `classroom.profile.emails` is added to the scopes the task listed:
 *   `students.list` only fills `profile.emailAddress` with that scope
 *   (developers.google.com/workspace/classroom/reference/rest/v1/userProfiles).
 * - `studentSubmissions.patch` "must be made by the Developer Console project of
 *   the OAuth client ID used to create the corresponding course work item"
 *   (…/courses.courseWork.studentSubmissions/patch). Grades can therefore only
 *   land on courseWork WE created (`associatedWithDeveloper: true`), so the UI
 *   offers "create a Classroom assignment for this lesson" and disables others.
 * - Roster data (Google ids + emails) is held in memory for one request and
 *   never stored or returned; the response names come from LexiClash only.
 *
 * Pure: no network, no side effects.
 */

export const GC_GRADE_PASSBACK_SCOPES = [
  'https://www.googleapis.com/auth/classroom.coursework.students',
  'https://www.googleapis.com/auth/classroom.courses.readonly',
  'https://www.googleapis.com/auth/classroom.rosters.readonly',
  'https://www.googleapis.com/auth/classroom.profile.emails',
] as const;

/** Server gate — every route 404s unless exactly 'true'. Default OFF. */
export function isGradePassbackServerEnabled(): boolean {
  return process.env.GC_GRADE_PASSBACK_ENABLED === 'true';
}

/** UI gate — baked at build time (NEXT_PUBLIC_*). Default OFF. */
export function isGradePassbackUiEnabled(): boolean {
  return process.env.NEXT_PUBLIC_GC_GRADE_PASSBACK === 'true';
}

export interface ProgressRowLike {
  completed_at?: string | null;
  words_attempted?: Record<string, unknown> | null;
  words_mastered?: string[] | null;
}

function finiteNonNeg(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : null;
}

/**
 * Percent (0–100) for one student's lesson progress, or null = nothing to grade.
 * `student_lesson_progress` has no score/accuracy column, so the source is:
 *   1. words_attempted  → Σcorrect / Σattempts (the live-game + practice record)
 *   2. completed_at set → completion credit 100
 *   3. otherwise        → null (skipped; never pushed as a 0)
 */
export function gradePercentFromProgress(row: ProgressRowLike | null | undefined): number | null {
  if (!row) return null;
  const attemptsMap = row.words_attempted;
  if (attemptsMap && typeof attemptsMap === 'object' && !Array.isArray(attemptsMap)) {
    let attempts = 0;
    let correct = 0;
    for (const entry of Object.values(attemptsMap)) {
      if (!entry || typeof entry !== 'object') continue;
      const a = finiteNonNeg((entry as { attempts?: unknown }).attempts);
      const c = finiteNonNeg((entry as { correct?: unknown }).correct);
      if (a == null || c == null || a === 0) continue;
      attempts += a;
      correct += Math.min(c, a);
    }
    if (attempts > 0) return Math.round((correct / attempts) * 10000) / 100;
  }
  if (row.completed_at) return 100;
  return null;
}

/** Scale a 0–100 percent onto courseWork.maxPoints (2 decimals). */
export function scaleToMaxPoints(percent: number, maxPoints: number): number {
  if (typeof maxPoints !== 'number' || !Number.isFinite(maxPoints) || maxPoints <= 0) {
    throw new Error('courseWork is ungraded (maxPoints missing or 0)');
  }
  const clamped = Math.max(0, Math.min(100, percent));
  return Math.round((clamped / 100) * maxPoints * 100) / 100;
}

export interface LexiStudent {
  studentId: string;
  name: string;
  email: string | null | undefined;
}

export interface GoogleRosterStudent {
  userId: string;
  profile?: { emailAddress?: string | null } | null;
}

export type UnmatchedReason = 'no_email' | 'not_in_course' | 'duplicate_email';

export interface MatchResult {
  matched: Array<{ studentId: string; name: string; googleUserId: string }>;
  unmatched: Array<{ studentId: string; name: string; reason: UnmatchedReason }>;
}

const normEmail = (e: string | null | undefined): string => (e || '').trim().toLowerCase();

/** Exact (case-insensitive) email match only — a student without one is never guessed. */
export function matchStudentsByEmail(students: LexiStudent[], roster: GoogleRosterStudent[]): MatchResult {
  const byEmail = new Map<string, string>();
  for (const r of roster) {
    const e = normEmail(r.profile?.emailAddress);
    if (e && r.userId) byEmail.set(e, r.userId);
  }
  const used = new Set<string>();
  const out: MatchResult = { matched: [], unmatched: [] };
  for (const s of students) {
    const e = normEmail(s.email);
    if (!e) {
      out.unmatched.push({ studentId: s.studentId, name: s.name, reason: 'no_email' });
      continue;
    }
    const gid = byEmail.get(e);
    if (!gid) {
      out.unmatched.push({ studentId: s.studentId, name: s.name, reason: 'not_in_course' });
      continue;
    }
    if (used.has(gid)) {
      out.unmatched.push({ studentId: s.studentId, name: s.name, reason: 'duplicate_email' });
      continue;
    }
    used.add(gid);
    out.matched.push({ studentId: s.studentId, name: s.name, googleUserId: gid });
  }
  return out;
}
