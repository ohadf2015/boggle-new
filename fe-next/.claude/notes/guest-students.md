# Guest students — account-less persistent classroom membership

**Status: built, ships DARK.** Works only once Anonymous sign-ins are enabled on
the Supabase project (see Activation). Until then the guest path degrades
gracefully (`signInAnonymously` errors → "couldn't start your session" toast).

## What it does
A logged-out student joins a class by typing a **name** (no email/password).
We mint a Supabase **anonymous** user carrying the name in `raw_user_meta_data`;
the existing `handle_new_user` trigger creates a real `profiles` row
(display_name = name, has_customized_profile = true). The anon user has a valid
`auth.uid()`, so every `student_id`-keyed table + RLS works unchanged, and the
`@supabase/ssr` session persists on-device → the student stays in the class and
keeps XP/progress across visits.

## Key files
- `lib/education/guestStudent.ts` — `signInAsGuestStudent` + `waitForProfile` (race-safe) + `deriveGuestUsername`.
- `hooks/useClassroom.ts` `useJoinClassroom(code, { guestName })` — guest branch.
- `components/student/JoinClassroomForm.tsx` — name field for logged-out students.
- `app/[locale]/student/join/PageClient.tsx` — no longer redirects logged-out → renders the form.
- `app/[locale]/student/PageClient.tsx` — "Not you? Start fresh" escape for `is_anonymous` users (shared devices).

## Persistence caveats (by design)
- **Device-bound**: clearing cookies / a new device / a different browser loses the
  identity and its progress — there is no credential to recover it. Appropriate for
  personal devices (this app's primary surface). NOT recoverable across devices.
- **Shared/lab devices**: the persisted session means the next student would be the
  previous one — mitigated by the "Not you? Start fresh" sign-out on the hub.
- Future: `supabase.auth.updateUser({ email })` upgrades an anon user to a real
  account keeping the same uid + progress ("save my stuff"). Not built.

## ACTIVATION (manual, project-wide) — required before this works
1. Supabase Dashboard → Authentication → **enable Anonymous sign-ins**.
   (No MCP/API tool flips this; it must be done in the dashboard.)
2. **BEFORE enabling, add `is_anonymous` guards** — anonymous auth is global, not
   scoped to `/join`. Once on, anyone can mint unlimited `auth.users` app-wide and
   those identities reach systems hardened for the families/Social-Apps policy.
   Gate `user.is_anonymous` (JWT claim) OUT of:
   - **MP chat / DM send** (moderation regression risk — highest priority).
   - **Coin / economy grants** (offerwall/IAP/remove-ads).
   - **Ranked** (already gated behind games-played, lower urgency).
   These guards are NOT yet built — they are the gate for safely flipping the switch.
3. Consider Supabase's CAPTCHA / rate-limit options for anonymous sign-in to cap abuse.
