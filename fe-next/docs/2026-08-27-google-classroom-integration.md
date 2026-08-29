# Google Classroom integration — spec

**Status:** Phase 1 implemented 2026-08-27. Phase 2 NOT started, and blocked on a decision that is
the product owner's, not an engineer's (see below).

## Why

Measured on 2026-08-27: 41 teacher access requests, all approved, 35 holding the teacher role —
and **2 classrooms in the module's entire history, with 1 student who has ever joined one.**

The create-flow is not the problem. It measures **3 clicks and 1 required field** to a visible join
code; Google Classroom, captured against the real authenticated product, takes **6 clicks**. We are
already twice as short as the benchmark and 33 of 35 teachers still finished nothing.

What a teacher actually stalls on is the step after the code: **getting 28 kids to type it.** Today
the only handoff is "copy this 6-character code and somehow get it to your class." Google Classroom
already holds that class, and every one of those students is already signed in to it.

Two further constraints shape the phasing:

- **A teacher gets one day.** No approved teacher has ever been active on a second day. Anything
  that defers value to "later" is deferring it to never.
- **8 of 35 teachers played our word games after approval and never set up a class.** We compete for
  their attention with our own consumer product, so the handoff has to be short enough to finish in
  the same sitting.

## Phase 1 — Share to Classroom link (SHIPPED)

A plain link to Google's own share dialog:

```
https://classroom.google.com/share?url=<encoded>&title=<encoded>&body=<encoded>&itemtype=announcement
```

Verified against `developers.google.com/classroom/guides/sharebutton`: `url` is the only required
parameter, and **no OAuth, API key or credential of any kind is involved.** Google prompts the
teacher to sign in with their Workspace for Education account inside its own dialog. They pick a
class, we never see it.

The teacher clicks it, picks their class, and the join link lands on that class's Stream — where
every student already looks. No code to read out, no code to mistype.

Deliberately chosen over the API route because it:
- needs **no OAuth scopes**, so it is not gated on Google's verification review (weeks),
- touches **no student PII** — we learn nothing about the roster,
- stores **no tokens**, so it introduces no new trust boundary,
- works for every teacher **today**, not just the first 100 in a testing-mode allowlist.

**Implementation:** `lib/education/googleClassroomShare.ts` (pure, no network, no side effects) plus
one action in `ClassroomManager`. Copy in all six locales.

## Phase 2 — Roster import (NOT BUILT — needs a product decision first)

The obvious next step is `courses.list` + `courses.students.list` so a teacher picks an existing
Google class instead of typing a name, and their students are pre-enrolled.

**This is blocked on a privacy decision, not on engineering.**

`classroom.rosters.readonly` returns student **Google identities** — real names and school email
addresses, for minors. Today LexiClash students join anonymously as guests with a display name and
no account. Importing a roster means either creating real accounts for children, or storing their
school email addresses. That is a COPPA-shaped question, and this project has already made a
deliberate ruling in the adjacent space: the Play Console notes record that under-13 targeting was
**dropped on purpose** in June 2026 to keep offerwall/interstitial monetization, because Families
policy is incompatible with it. Pulling minors' identities back in cuts against that decision.

Do not build Phase 2 until someone with authority answers: *do we store school-issued student
identities, and under which policy?*

If the answer is yes, the engineering constraints are:

- **Verify `provider_token` survives first.** The plan would rest on Supabase's
  `signInWithOAuth({ scopes })` handing back `provider_token` / `provider_refresh_token`. Supabase
  surfaces those **once**, in the session right after the OAuth redirect, and does not persist them
  across refresh. A refresh token only arrives with `access_type=offline` + `prompt=consent`.
  **Confirm empirically that `session.provider_refresh_token` is actually populated before writing
  any UI** — if it is not, Supabase-mediated OAuth cannot back this and we need our own callback
  route holding the client secret, which is a materially different build.
- **Scopes stay read-only:** `classroom.courses.readonly` + `classroom.rosters.readonly`. Do NOT
  request a write scope to post to the Stream — Phase 1 already gets that for free.
- **Tokens are a trust boundary:** encrypted at rest, service-role access only, RLS denying all
  client reads, never reachable from a `NEXT_PUBLIC_*` path.
- **Sensitive-scope verification** with Google is a review process measured in weeks. Testing mode
  covers 100 users, which is enough for the current 35 teachers but is not a public launch.
- `google-auth-library@^10.5.0` is already a dependency; the Classroom REST API needs no extra SDK,
  plain `fetch` with a bearer token is enough.

## Env / config

Phase 1 introduces **no new environment variables** — that is part of why it ships today.
Note for Phase 2: `NEXT_PUBLIC_*` values freeze at build time in this repo. A previously-shipped
Teacher Pro outage came from exactly that (`NEXT_PUBLIC_CHECKOUT_ENABLED` set at runtime but not
baked into the bundle), and "unset" is indistinguishable from "set but not baked" when read from a
browser. Probe the runtime endpoint, not just the rendered HTML.
