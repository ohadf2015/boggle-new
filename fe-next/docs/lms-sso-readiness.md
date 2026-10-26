# LMS / SSO readiness

## Owner steps (do these first)

1. **Microsoft sign-in**
   - In Azure Portal > Microsoft Entra ID > App registrations, create a **multi-tenant** app ("Accounts in any organizational directory", plus personal accounts if wanted).
   - Redirect URI (Web): `https://hdtmpkicuxvtmvrmtybx.supabase.co/auth/v1/callback`.
   - Create a client secret and note its expiry date (Azure secrets expire; set a reminder).
   - Complete publisher verification, or school tenants show an "unverified" warning and some block consent.
   - In Supabase > Authentication > Providers > Azure, enable the provider, paste the client ID and secret, and leave the tenant URL at `https://login.microsoftonline.com/common`.
   - Set `NEXT_PUBLIC_MICROSOFT_SSO_ENABLED=true` on Railway and **rebuild**, since `NEXT_PUBLIC_*` values are baked in at build time.
2. **Google Classroom (roster import and grade passback)**
   - Resubmit OAuth verification in Google Cloud Console for `classroom.rosters.readonly`, `classroom.profile.emails`, `classroom.coursework.students` and `classroom.courses.readonly`. Use the package in `docs/2026-09-27-google-classroom-verification-rebuttal.md`: a readable consent screen, a max-extent video and test credentials.
   - Until it is approved, the app stays in Testing mode, which has a 100-user cap.
3. **Clever**: apply at the Clever partner portal (district SSO + Secure Sync). Nothing is built until a sandbox district and credentials exist.
4. **ClassLink**: apply to the ClassLink partner program (LaunchPad SSO + OneRoster). Same gate.
5. **Canvas (LTI 1.3)**: get a Canvas instance (a free-for-teacher account, or a district test instance) and create an LTI developer key. Nothing is built until a key and issuer exist.

## Status by integration

| Integration | Built | Flag(s), all default OFF | Still needed |
|---|---|---|---|
| Identity linking | `external_identities` table (sha256 email hash only, own-row read RLS, service-role writes); Google/Microsoft identities recorded on every sign-in path that emits `SIGNED_IN` | `NEXT_PUBLIC_EXTERNAL_IDENTITY_LINKING_ENABLED` | none |
| Google roster import | Class card "Import from Google Classroom": lists the course roster (given name + family initial + email hash), matches it to class members by linked Google id, then email hash. It shows unmatched students and the ones who need consent, and links matched students only when consent is on file. It never creates accounts. | `GC_ROSTER_IMPORT_ENABLED` (API), `NEXT_PUBLIC_GC_ROSTER_IMPORT_ENABLED` (UI) | Google verification (step 2) |
| Google grade passback | Existing feature; now matches a linked Google id first, then email (so linked guests get grades) | `GC_GRADE_PASSBACK_ENABLED` | Google verification (step 2) |
| Microsoft sign-in | Outlined "Sign in with Microsoft" button for teachers on web (Supabase `azure`, email scope); hidden for players and in the native app | `NEXT_PUBLIC_MICROSOFT_SSO_ENABLED` | Step 1. Teams/Graph roster is not built. |
| Clever | Not built | none | Step 3 |
| ClassLink | Not built | none | Step 4 |
| Canvas LTI 1.3 | Not built | none | Step 5 |

## Env vars

- `NEXT_PUBLIC_EXTERNAL_IDENTITY_LINKING_ENABLED=true`: records links and lets roster import and grade passback use them.
- `NEXT_PUBLIC_MICROSOFT_SSO_ENABLED=true`: shows the Microsoft button (needs a rebuild).
- `GC_ROSTER_IMPORT_ENABLED=true` and `NEXT_PUBLIC_GC_ROSTER_IMPORT_ENABLED=true`: roster import API and UI.
- Roster import reuses the grade-passback Google connection, so it also needs `GC_GRADE_PASSBACK_ENABLED=true`, `GOOGLE_CLASSROOM_CLIENT_ID`, `GOOGLE_CLASSROOM_CLIENT_SECRET`, `GOOGLE_CLASSROOM_REDIRECT_URI`, `GC_TOKEN_COOKIE_SECRET` (32+ chars) and `SUPABASE_SERVICE_ROLE_KEY`. The teacher must have Teacher Pro, as for grade passback.

## Student data rules (minors)

- Raw school emails are never stored. Only `sha256(lowercase(trim(email)))` is kept, and it is used only for matching.
- The roster API returns the given name, the family initial and the email hash. It never returns surnames, emails or Google ids.
- Unmatched roster entries are shown to the teacher and never stored.
- A matched student is linked only when `classroom_consent_status` reports consent on file. Otherwise the teacher sees "Consent needed".
- If the consent status cannot be read, every student is treated as needing consent.
- Deleting an auth user cascades to their links.
- An unsalted sha256 of an email can be reversed by anyone who holds the table and guesses addresses. Switch to an HMAC with a server secret if a district DPA asks for it.
