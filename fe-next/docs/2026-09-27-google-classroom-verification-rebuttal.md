# Google Classroom grade-passback — verification rebuttal (2026-09-27)

**Status:** First verification submission REJECTED by Google's Third-Party Data Safety Team.
This doc is the complete response package: console checklist, test-account setup, demo-video
shot list, reviewer navigation instructions, and the reply-email draft.

## Why it was rejected (and the likely root cause)

Google's objections:

1. Demo video did not show the consent screen with **all scopes fully expanded and readable**.
2. Did not demonstrate the **maximum extent** of the features using each scope.
3. No **test credentials** + no navigation instructions.

**Likely scope-mismatch root cause:** the code requests FOUR scopes
(`fe-next/lib/education/googleClassroomGrades.ts:40` → `GC_GRADE_PASSBACK_SCOPES`):

| Scope | Used for |
|---|---|
| `classroom.courses.readonly` | List the teacher's classes in the picker |
| `classroom.rosters.readonly` | List course students for matching |
| `classroom.profile.emails` | Read student emails off roster entries (else matching is blind) |
| `classroom.coursework.students` | Create the assignment, write draftGrade / assignedGrade |

The 08-27 integration plan specified only THREE. `classroom.profile.emails` was added on
09-25 (see the 09-25 doc: *"That scope is added beyond the three originally specified"*).
If the Cloud Console Data access page still lists three, that alone explains
"scopes must exactly match". **Verify first.**

## Part 1 — Cloud Console checklist (Ohad, ~5 min, console.cloud.google.com, project `lexiclash`)

1. **APIs & Services → Google Auth Platform → Data access:** the scope list must be EXACTLY
   the four scopes above — no more, no less. Add `classroom.profile.emails` if missing.
2. **Audience:** set publishing status to **Testing** while unverified. Add test users:
   - the review Google account you will create (Part 2)
   - your own ohadf2015@gmail.com (for recording)
3. Testing mode caps consent at test users only → production traffic cannot burn the
   100-user sensitive-scope cap. The app itself stays reachable at lexiclash.live.
4. Leave the OAuth client (`Web application`) unchanged — redirect URI already exact-matches.

## Part 2 — Test accounts

**Google side (needs Ohad — Google signup requires a human):**
- Create a dedicated teacher Google account, e.g. `lexiclash.review@gmail.com`. No 2FA phone
  prompt, no payment methods — Google reviewers must log in without blockers. Turn 2FA OFF
  (or use a backup code in the handoff); a normal account without 2FA is fine.
- In Classroom (classroom.google.com), create one course, e.g. "LexiClash Verification",
  with 2–3 student members. Students must be real Google accounts — use the same trick
  (create 2 extra accounts, or add family accounts).
- Add the teacher account as a **test user** in the console (Part 1.2).

**LexiClash side (hermes can do once emails exist):**
- Sign up the teacher account on lexiclash.live (password login — supported, `signInWithPassword`),
  grant Teacher Pro (admin teacher-pro grant panel, same as the 41-teacher cohort).
- Create student LexiClash accounts using the SAME emails as the Classroom roster students,
  enroll them in the teacher's class, complete one practice session each so reports have
  gradable data. Without this, every student shows "unmatched" in the demo.

## Part 3 — Enable the feature (proposal, then flag flip)

Flags (see 09-25 doc): `GC_GRADE_PASSBACK_ENABLED=true` (runtime) +
`NEXT_PUBLIC_GC_GRADE_PASSBACK=true` (**build env** + redeploy). Verify routes return 401
(not 404) after deploy: `curl https://www.lexiclash.live/api/education/google-classroom/oauth/start`.

Current prod state (2026-09-27): routes 404 — feature dark everywhere. Safe.

## Part 4 — Demo video shot list (record on the Mac, one continuous take, ~4–6 min)

Record logged in as `lexiclash.review@gmail.com` in Chrome, screen + audio, 1080p, URL bar
always visible. Upload **unlisted to YouTube**.

1. **0:00–0:30 — Product context.** Log in to `https://www.lexiclash.live/en/teacher/reports`
   with the LexiClash test teacher (email + password — show typing, this doubles as the
   reviewer login proof). Point at a lesson report with student progress.
2. **0:30–1:30 — The consent screen, READABLE.** Click **Send grades to Google Classroom →
   Connect Google**. On accounts.google.com, **zoom the browser (⌘+) so every line of the
   consent screen is legible at 1080p**. Click **"Show all services" / "Continue" to expand
   the full scope list. Slowly scroll through ALL FOUR scopes, each fully readable, while
   saying what each is for (courses.readonly → list classes; rosters.readonly → list students;
   profile.emails → read student emails for matching; coursework.students → create assignment
   and write grades). Keep the URL bar visible — it must show `client_id=...`.
3. **1:30–2:00 — Unverified-app warning.** Testing mode shows "Google hasn't verified this
   app". Click **Advanced → Go to LexiClash (unsafe)** and SAY this warning disappears after
   verification. Land back on the reports page with `?gc=connected`.
4. **2:00–4:00 — Maximum extent of each scope, in order:**
   - courses.readonly: the class picker lists "LexiClash Verification".
   - rosters.readonly + profile.emails: the student list shows matched students by email
     (show one matched, and mention unmatched guests are reported, never guessed).
   - coursework.students: **Create a new Classroom assignment for this lesson** — name it,
     watch it appear as gradeable courseWork.
   - Confirm with **"also return grades"** checked → summary: N graded, 0 failed.
5. **4:00–5:00 — Proof in Classroom.** Switch to the Classroom tab: open the new assignment,
   show the gradebook column with the grades LexiClash pushed (draftGrade visible to teacher;
   with "return grades" they are returned to students). Say roster emails were held in memory
   for the request only and are never stored.
6. **5:00–end — Disconnect note.** Mention: sign-out / cookie expiry revokes access; no
   refresh token is ever stored.

## Part 5 — Reviewer navigation instructions (paste into the email reply)

```
Test environment: production app https://www.lexiclash.live (feature enabled for test users).
Publishing status: Testing (sensitive scopes pending verification; 100-user cap protected).

Reviewer login (Teacher Pro account — password auth, no email confirmation needed):
  URL:      https://www.lexiclash.live/en/login
  Email:    <lexiclash teacher test email>
  Password: <password>

Steps:
 1. Log in → open https://www.lexiclash.live/en/teacher/reports
 2. Click "Send grades to Google Classroom" → "Connect Google"
 3. Sign in with the provided Google test account and accept all four scopes
    (the "unverified app" Advanced → Continue step is expected pre-verification)
 4. Pick a lesson report → pick the "LexiClash Verification" class →
    "Create a new Classroom assignment for this lesson" → confirm (check "also return grades")
 5. Open classroom.google.com → the new assignment → Gradebook: grades pushed by LexiClash
    are visible as returned grades.

Scope justification: teachers push LexiClash vocabulary-lesson scores into their own
Classroom gradebook. Roster emails are read in memory for one request to match students,
never stored; no refresh tokens are kept; unmatched students are reported, never guessed.
```

## Part 6 — Reply email draft

```
Hello,

Thank you for the review. We have prepared the following:

1. New demo video (unlisted YouTube): <URL> — recorded in one continuous take. The OAuth
   consent screen is shown with all four scopes fully expanded and readable ("Show all
   services" clicked), the client_id visible in the URL bar, and each scope's feature
   demonstrated end-to-end (list classes → list roster → create assignment → push and
   return grades → grades visible in the Classroom gradebook).
2. Scope parity: the app requests exactly these four scopes, now matching the Google Cloud
   Console Data access configuration 1:1:
   classroom.courses.readonly, classroom.rosters.readonly, classroom.profile.emails,
   classroom.coursework.students
3. Test credentials + step-by-step navigation (below). The LexiClash teacher account uses
   password login with no confirmation step; the Google account has no 2FA or payment
   blockers. Our app's publishing status remains "Testing" so production users cannot
   consume the unverified-scope quota.

<Part 5 instructions here>

Thank you,
Ohad — LexiClash
```
