# Google Classroom grade passback (Teacher Pro)

**Status:** Built 2026-09-25. **Flagged OFF.** It needs Google OAuth verification for sensitive
Classroom scopes before production. This is the first LexiClash code that calls the Classroom API.
Everything earlier (Phase 1 to 1.8 in `2026-08-27-google-classroom-integration.md`) used share
links or built payloads without calling Google.

## What it does

On `/{locale}/teacher/reports`, inside `<ProGate feature="reports">`, the teacher gets a
**Send grades to Google Classroom** button. The flow:

1. **Connect Google** (only when there is no valid token). The teacher goes through Google's
   consent screen and comes back to the reports page with `?gc=connected|denied|error`.
2. **Pick** a LexiClash lesson assignment, a Google Classroom class, and a Classroom assignment
   (courseWork). The picker disables courseWork that was created outside LexiClash (see the
   Google constraint below). **Create a new Classroom assignment for this lesson** makes a
   gradeable one: 100 points, `ASSIGNMENT`, `PUBLISHED`.
3. **Confirm.** An optional checkbox, **also return grades**, sets `assignedGrade` and calls
   `:return`. Without it, only `draftGrade` is written, and only the teacher can see it.
4. **Summary** shows students graded, unmatched students with a reason, failed students, and
   skipped students (no practice yet).

### How a grade is computed

`student_lesson_progress` has **no score or accuracy column**. The progress report's score
column is always empty in practice. The grade comes from:

1. `words_attempted`: Σcorrect / Σattempts. This is written by live classroom games and
   practice.
2. Otherwise, `completed_at` set → 100 (completion credit).
3. Otherwise → **skipped**. A student with no practice is never pushed a 0.

The percent is scaled to `courseWork.maxPoints` and rounded to 2 decimals. Ungraded courseWork
(`maxPoints` 0 or missing) returns `422 ungraded`.

### Student matching

- Matching is by exact email only, case-insensitive and trimmed. LexiClash emails come from
  `auth.users` (service role); Classroom emails come from `students.list` →
  `profile.emailAddress`.
- Anonymous guests and students without an email are reported as **unmatched `no_email`** and
  are never guessed.
- Other unmatched reasons are `not_in_course` and `duplicate_email`. Two LexiClash accounts
  never map to one Google student.
- **Privacy:** roster data (Google ids and emails) stays in memory for one request. It is never
  stored and never returned. Response names are LexiClash display names only. This does **not**
  reopen the Phase 2 roster-import question: nothing about minors is persisted.

## Google constraints that shaped the build

- `studentSubmissions.patch` must be made by the Developer Console project of the OAuth client
  that created the courseWork. Otherwise Google returns `PERMISSION_DENIED`. Teachers therefore
  can't grade an assignment they made by hand in Classroom. We show `associatedWithDeveloper`
  and offer to create a new assignment. The route returns `409 not_linkable` for foreign
  courseWork.
- `profile.emailAddress` is only populated with the `classroom.profile.emails` scope. That scope
  is added beyond the three originally specified.

### Scopes requested (incremental, `include_granted_scopes=true`)

| Scope | Why |
|---|---|
| `classroom.coursework.students` | create courseWork, patch or return submissions |
| `classroom.courses.readonly` | list the teacher's active classes |
| `classroom.rosters.readonly` | list students for matching |
| `classroom.profile.emails` | email addresses on roster entries |

## Token storage decision

**Per-session, cookie only. No DB and no refresh token.** No secure Google-token store exists.
Supabase's `provider_token` is not persisted, and nothing reads it. Storing a refresh token would
need a migration, which was out of scope. So:

- Our own start and callback routes use **PKCE S256**. The state is sealed together with the
  verifier, the Supabase user id, and `returnTo`.
- `access_type=online`, so Google issues no refresh token.
- The access token is sealed into the **httpOnly `gc_grade_token` cookie**:
  - jose `EncryptJWT`, `dir` + `A256GCM`, with the key = sha256(`GC_TOKEN_COOKIE_SECRET`).
  - Path `/api/education/google-classroom`, `SameSite=Lax`, `Secure` in production.
  - Expires with the token, about 1 hour.
- The cookie carries the teacher's user id. Every route rejects a cookie minted for a different
  LexiClash user, which protects shared devices. When the token expires, the teacher simply
  reconnects.

Upgrade path: add an encrypted, service-role-only `teacher_google_tokens` table (RLS denies all
client access). Then request `access_type=offline` and refresh on the server.

## Endpoints (all return 404 unless `GC_GRADE_PASSBACK_ENABLED=true`)

| Route | Purpose |
|---|---|
| `GET /api/education/google-classroom/oauth/start?returnTo=` | Pro teacher → Google consent |
| `GET /api/education/google-classroom/oauth/callback` | state, user, and PKCE check → seal token → redirect `?gc=connected\|denied\|scopes\|error` (`scopes` = the teacher unticked a permission). Redirects to the origin of `GOOGLE_CLASSROOM_REDIRECT_URI`, never the proxy's internal host |
| `GET /api/education/google-classroom/courses[?courseId=]` | list classes, or a class's courseWork |
| `POST /api/education/google-classroom/coursework` | create a 100-point LexiClash-owned assignment |
| `POST /api/education/google-classroom/grades` | push grades → `{updated, unmatched[], failed[], skipped[], retryAfter?}` |

Auth order: flag (404) → Supabase user (401) → classroom owner (403 `not_owner`) → service role
(500, logged) → `resolveProEntitlement` (403 `not_pro`).

Google errors:

| Google response | Our response |
|---|---|
| 401, or 403 for insufficient scope | `401 {reauth:true}` (the UI shows Connect) |
| any other 403 (admin blocked the API, not a course teacher) | `403 google_forbidden` (an error, not a Connect loop) |
| roster returned with no emails (`profile.emails` not granted) | `401 {reauth:true}`, never "not in course" for everyone |
| 403 ProjectPermissionDenied | `409 not_linkable` |
| 404 | `google_not_found` |
| 429 | `429 {retryAfter}` |

A 429 in the middle of the patch loop stops the loop. The remaining students are reported as
`failed: rate_limited`.

Code:

- `lib/education/googleClassroomGrades.ts`: policy and research header
- `googleClassroomApi.ts`: plain-fetch REST client
- `googleClassroomOAuth.ts`: PKCE and sealed cookies
- `googleClassroomServer.ts`: gate and error mapping
- `googleClassroomPush.ts`: the push itself
- `components/teacher/reports/GoogleClassroomGradePassback.tsx`: the UI

## Environment variables

| Var | Where | Value |
|---|---|---|
| `GC_GRADE_PASSBACK_ENABLED` | server runtime | `true` to enable the routes (default off → 404) |
| `NEXT_PUBLIC_GC_GRADE_PASSBACK` | **build time** | `true` to render the button. It is baked into the bundle, so rebuild after changing it |
| `GOOGLE_CLASSROOM_CLIENT_ID` | server | OAuth Web client id |
| `GOOGLE_CLASSROOM_CLIENT_SECRET` | server | OAuth client secret |
| `GOOGLE_CLASSROOM_REDIRECT_URI` | server | `https://www.lexiclash.live/api/education/google-classroom/oauth/callback` (exact match with the console) |
| `GC_TOKEN_COOKIE_SECRET` | server | ≥32 random chars (`openssl rand -base64 48`). Rotating it logs every teacher out of Google |

If the OAuth variables are missing, `/oauth/start` logs an error and returns
`500 oauth_not_configured`. It does not fail silently.

## Google Cloud Console steps

1. **Pick the project.** Use the GCP project that owns the Classroom add-on / Marketplace listing
   (project id `lexiclash`). Submissions can only be graded on courseWork created by this
   project's client, so don't switch projects later.
2. **Enable the API.** Go to *APIs & Services → Library → Google Classroom API → Enable*.
3. **Create the OAuth client.** Go to *APIs & Services → Credentials → Create credentials →
   OAuth client ID → Web application*.
   - Authorized redirect URIs: `https://www.lexiclash.live/api/education/google-classroom/oauth/callback`
     and, for dev, `http://localhost:3000/api/education/google-classroom/oauth/callback`.
   - Copy the ID and secret into the env vars above.
4. **Configure the consent screen / Data access.** Go to *Google Auth Platform → Data access →
   Add or remove scopes* and add the four scopes in the table above. Classroom scopes are
   **sensitive**.
5. **Branding.** Provide the app name, support email, logo, homepage `https://www.lexiclash.live`,
   privacy policy and terms URLs, and authorized domain `lexiclash.live` (verified in Search
   Console).
6. **Testing mode first.** Under *Audience → Test users*, add up to 100 teacher Google accounts.
   These can use the feature before verification, after they click through an "unverified app"
   warning.
7. **Submit for verification.** Go to *Verification Center → Prepare for verification*. You need:
   - A written justification per scope. Suggested wording: *"Teachers push LexiClash vocabulary
     lesson scores to a Classroom assignment's gradebook; roster emails are read in memory only
     to match students, never stored."*
   - A **YouTube demo video** showing the consent screen with the scopes, the scopes being used
     (pick class → create assignment → send grades → the grade visible in Classroom), and the
     OAuth client id in the browser URL.
   - The privacy policy must mention Google user data use and the Limited Use disclosure.

   Expect roughly 2 to 6 weeks.
8. **Optional: Workspace Marketplace.** If this rides the existing add-on listing, update the
   listing's OAuth scopes to match.

## Flipping the flag

1. Set the four OAuth / cookie variables in Railway (server).
2. Set `GC_GRADE_PASSBACK_ENABLED=true` in the runtime environment.
3. Set `NEXT_PUBLIC_GC_GRADE_PASSBACK=true` **in the build environment** and redeploy. A runtime
   `NEXT_PUBLIC_*` value that isn't baked into the bundle has broken Pro checkout before (see
   the 08-27 doc).
4. Verify with a Pro test account (`@lexiclash.test`) plus a Google test user:
   - Connect, create an assignment, send grades.
   - Check the draft grade in Classroom.
   - Check a guest student shows as unmatched.
5. To roll back, set `GC_GRADE_PASSBACK_ENABLED=false`. The routes 404 immediately, and the button
   fails gracefully until the next build removes it.
