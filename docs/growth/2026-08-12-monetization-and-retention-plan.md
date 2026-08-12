# Monetization + Retention Plan — 2026-08-12

Measured, not assumed. All numbers from PostHog (project 151059) and Supabase prod on 2026-08-12.

## 1. The number that prunes the plan

| Metric (30d) | Value |
|---|---|
| Unique web visitors (`$pageview`) | **1,009** |
| Pageviews | 4,776 |
| Started a game | 468 (46% of visitors) |
| Completed a game | 189 (40% of starters, **19% of visitors**) |
| Signed up | 86 (8.5% of visitors) |

At a generous $5 RPM, 4,776 pageviews is **~$24/month**. AdSense approval is worth
approximately nothing at this traffic. Same for the ayeT offerwall (38 offered / 9 watched
in 90d) and rewarded video (9 watchers in 90d).

**Deliberate skip: no further investment in web ad-network plumbing this cycle.** Not
because it's unfixable — because the ceiling is $24/mo and the effort is high (AdSense
re-review, GameDistribution standalone ZIP build, ayeT account activation that has been
pending since 2026-06-05). Revisit when web traffic clears ~50k pageviews/mo.

## 2. Retention: signup is not the fix

Distinct days on which a person started a game:

Both rows on the same 60-day window:

| Population (60d) | 1 day only | 2+ days |
|---|---|---|
| Everyone (n=698) | 661 (**94.7%**) | 37 (5.3%) |
| **Signed-up users only** (n=89) | 77 (**86.5%**) | 12 (13.5%) |

Signing up lifts return rate ~2.5× (5.3% → 13.5%) but 86% of registered users still never
come back. So the retention problem is **activation quality**, not account creation.

The channel to reach them exists and is **simply never invoked**:

- Push: 84 prompts shown / **3 grants** in 90d. Dead channel, ignore it.
- Email opt-in lives on `profiles.daily_email_subscribed` — **351 of 363 are subscribed.**
  (The separate `email_subscribers` table has 0 rows but nothing reads it; it is not the gate.)
- `/api/email/send-reengagement` + `lib/reengagementEmail.ts` are complete and correct.
  Gating is genuinely conservative: opt-in, must have played a daily in the last 90d, must be
  inactive 14d across *all* modes, 30d anti-spam interval, 7–9 AM local send window.
- **Measured today: 27 profiles are eligible right now.**
- **There is no cron job for it.** `cron.job` holds 11 entries; none call this endpoint, and
  nothing in the repo schedules it. Last send of any kind: **2026-07-09** (41 profiles ever).

So the single cheapest retention win on the whole list is one `cron.schedule` entry, mirroring
jobid 19 (`daily-challenge-push-reminder`), which already POSTs to a `/api/cron/...` endpoint
hourly. Hourly is required — the 7–9 AM local-time window means a daily job would only ever
catch one timezone.

Not scheduled yet: this sends real mail to 27 real people and needs an explicit go-ahead.

## 3. Where the money actually is: teachers

Real, growing, international demand — hitting a funnel that physically cannot take money.

| Stage | Count | Source |
|---|---|---|
| Teacher access requests | **15** (7 in last 30d) | `teacher_access_requests` |
| Approved | 14 | ditto |
| Countries | AU, PH, SA×2, MX, BD, EC, IL, US, PE, SK | ditto |
| **Classrooms ever created** | **1** | `classrooms` |
| Classroom memberships (students) | 1 | `classroom_memberships` |
| School leads captured | **0** | `school_leads` |
| Subscriptions | **0** | `subscriptions` |
| Teacher upsell impressions (90d) | 33 people | `growth:education_upsell_impression` |
| School lead form views (90d) | **2 people** | `growth:school_lead_form_viewed` |

The teacher product is **fully built** — classrooms, lessons, assignments, spaced
repetition, analytics with heatmaps, achievements, admin approval queue, Polar checkout,
$9/mo Pro tier, district lead capture. It is not a prototype.

### Three defects convert that demand to $0

**D1 — Checkout is switched off.** `NEXT_PUBLIC_CHECKOUT_ENABLED=false` and
`POLAR_ACCESS_TOKEN=` is empty. `app/api/subscription/checkout/route.ts:20` returns early.
Even a teacher who wants to pay cannot. **Owner action, not code.**

**D2 — Trial expiry is silent.** `trial_expires_at` is written on approval
(`app/api/admin/teacher-access/[id]/approve/route.ts:28`) and rendered in a banner. No cron,
no job, no email ever references it. **6 of 14 teachers' trials have already expired with
zero contact.** This is Class 4 (silent failure) from `.claude/rules/60-recurring-pitfalls.md`.

**D3 — Approved teachers were locked out of the teacher dashboard. FIXED 2026-08-12.**

This was not a UX problem. It was a silent RLS no-op.

- `profiles` UPDATE policy is `(SELECT auth.uid()) = id` with **no admin bypass policy**.
- `approve/route.ts:35` promoted the teacher with `sb` — the *request-scoped* client,
  authenticated as the admin. Updating **another user's** row matches zero rows and returns
  **no error**. The route returned `{ok:true}` and sent the "you're approved" email.
- Measured result: `SELECT count(*) FROM profiles WHERE user_role='teacher'` → **0**, across
  363 profiles. All 8 approved teachers with accounts were still on the column default,
  `'student'`.
- `teacher/PageClient.tsx:24-41` gates on `profile.user_role === 'teacher'` and
  `router.push('/'+language)` otherwise. So every approved teacher clicked the CTA in their
  approval email and was **silently bounced to the homepage**. Every time.

That is the whole 14-approved → 1-classroom cliff. The 1 classroom is an admin account.

Class 4 (silent failure) from `.claude/rules/60-recurring-pitfalls.md`, and the specific
sub-case the rules call out: an early return / no-op on an error condition that emits nothing.

**Fix shipped:** promotion now goes through `createAdminClient()` (service role) and requires
`.select('id')` to return a row; a zero-row promotion returns 500 and **suppresses the
approval email**, so an approval that did not actually grant the role can never again report
success. 3 regression tests added (`admin.test.ts`), 17/17 green, lint 0, tsc clean.

**State repaired:** 7 stranded teachers back-filled to `user_role='teacher'` in prod. They
can now reach the dashboard. Verified: the same grep across every other server-side
`profiles` update found no sibling instances — `lib/education/allowlist.ts` updates the
caller's own row (RLS-legal) and the Express backend uses the service-role client.

**Still open (owner decision, outward-facing):** those 7 were emailed weeks ago and hit a
wall. They need a re-invite. Not sent — outward-facing mail to real people needs a go-ahead,
and it should not go out until Phase 0 makes the upgrade path real.

**D3b — Discovery.** The only sitewide entry to the teacher product is a footer link
(`components/Footer.tsx:79-94`). 2 people saw the school lead form in 90 days.

**D4 — Discovery.** The only sitewide entry to the teacher product is a footer link
(`components/Footer.tsx:79-94`). 2 people saw the school lead form in 90 days.

## 4. Player drop-off spots, ranked by measured volume

**#1 — Multiplayer entry.** 247 of 328 abandoners (30d) are on `/multiplayer`:

| URL | People abandoning |
|---|---|
| `/en/multiplayer` | 85 |
| `/es/multiplayer` | 78 |
| `/en/multiplayer?quickPlay=true` | 45 |
| `/es/multiplayer?quickPlay=true` | 39 |

Corroborating: `mp_solo_prompt_shown` reached 357 people (76% of everyone who started a
game) and only 31 accepted the bots offer. That is a lobby that does not fill, not rage-quit.

Caveat recorded: `mp_player_dropped` (617 people > 468 `game_started`) is **not** a
per-player quit counter — `backend/utils/mpDropTelemetry.ts` emits one per human at
grace-period expiry including `source=host_left` collateral. Do not read it as 617 quitters.

**#2 — Spanish is half the audience.** `es` abandonment ≈ `en` (78 vs 85, 39 vs 45). Any
copy/tutorial work must ship in `es` to count.

**#3 — Game completion.** 40% of starters finish. 1,244 `growth:game_abandoned` events.

**#4 — Android install promo.** 410 shown / 339 dismissed (83%) / 45 install clicks (90d).
The `exp-install-promo-after-first-game-v1` experiment is already live on this. Not touching
it until it resolves — per prior finding, the variant risks becoming a silent never-show.

## 5. Plan

Ordered by expected revenue per unit of effort.

### Phase 0 — Owner actions (blocking, no code)
- Mint Polar access token; set `POLAR_ACCESS_TOKEN` and `NEXT_PUBLIC_CHECKOUT_ENABLED=true`
  in Railway prod. **Nothing below earns a cent until this is done.**
- Verify `RESEND_API_KEY` is set in prod (the approval emails depend on it).

### Phase 1 — Teacher revenue (highest ceiling)
1. ~~Unlock approved teachers from the dashboard.~~ **DONE 2026-08-12** — see D3.
2. Trial lifecycle emails: T-3 warning + expiry email. Fixes D2. **Gate the send on
   `NEXT_PUBLIC_CHECKOUT_ENABLED`** — until Phase 0 lands, the CTA must be a reply-to-owner,
   not an upgrade button that 500s. Ship forward-only; no backfill send to the already-expired
   without an explicit go-ahead.
3. Teacher first-run: now that teachers can actually reach the dashboard, re-measure before
   designing a nudge. The previous "activation cliff" was entirely D3.
4. ~~Discovery beyond the footer.~~ **DONE 2026-08-12.** The header menu now carries a
   role-aware Teachers entry: an approved teacher gets "My classroom" → `/teacher`, everyone
   else gets "For teachers" → `/education`. Before this, **an approved teacher's only route
   back to their dashboard was the original approval email** — closing the tab stranded them.
   The three duplicated copies of the teacher-role check (dashboard, `useTeacherAccess`, nav)
   are now one predicate, `isTeacherProfile()` — drift in that gate is what caused D3.

### Phase 1b — A gamer-facing paid product
There is currently **nothing a player can buy** — no coin pack, no cosmetics purchase, no
ad-free/supporter tier. Unlike ads, this does not need traffic scale to be nonzero, and
Polar is already wired: a second product ID on the existing
`/api/subscription/checkout` route. Worth doing *after* Phase 0 proves the checkout works
with real money on the teacher product — not before, because a broken checkout burns the
first buyer.

### Phase 2 — Player re-engagement channel
**Ready to switch on; needs a go-ahead** (real mail, 27 people). One pg_cron entry:

```sql
SELECT cron.schedule('reengagement-email-hourly', '0 * * * *', $$
  SELECT net.http_post(
    url := 'https://www.lexiclash.live/api/email/send-reengagement',
    headers := json_build_object('Content-Type','application/json','x-cron-secret',
      (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'cron_secret'))::jsonb
  );
$$);
```
Confirm the vault secret name matches what `isAuthorizedCronRequest` expects before running.

### Phase 3 — Multiplayer entry dropout. **DONE 2026-08-12.**
Largest player-side hole: 247/328 abandoners, and `mp_solo_prompt_shown` reached 76% of
everyone who started a game while only 8.7% took the bots offer.

Root cause was not the prompt copy. A player taps Quick Play, **silently becomes the host** of
an empty room, and the lobby fills with bots — then waits for a Start button they have no idea
is theirs. Quick Play was already fixed to auto-start (2026-08-07); **public rooms were not**,
and 35% of lobbies that reached bot-fill never started anything.

Fix: `shouldAutoStartAfterBotFill()` in `lib/multiplayer/soloHostPrompt.ts` — a bot-filled
PUBLIC lobby now starts itself after a further `PUBLIC_ROOM_BOT_START_GRACE_SECONDS` (20s),
giving ~55s of total silence before it fires. Cancelled the moment a human joins, and on
unmount. Private invite/classroom rooms keep the old behaviour — that host is waiting on
specific humans. 6 tests; 525 host+multiplayer tests green.

### Phase 4 — In-game tutorial. **DONE 2026-08-12.**
Measured, 30d — the stuck-player coach fires correctly and is mostly ignored:

| Stage | Shown | Helped | Ignored |
|---|---|---|---|
| idle-nudge | 125 | 18 (14%) | 88 (70%) |
| validity-hint | 35 | 8 (23%) | 19 |
| tap-hint | 8 | 2 | 4 |
| **Total** | **168** | **28 (17%)** | **111 (66%)** |

125 people played 60+ seconds of a round **without finding a single word**. The detection
logic (`lib/ftue/mpStuckCoach.ts`) is sound; the payload was the problem — the card showed
abstract copy ("Drag across letters to spell a word") and a generic diagram, and never
referenced the player's actual board. Someone who cannot find a word does not need the
gesture explained; they need to be shown *which* letters.

Fix: the card now names a real word from their grid — "Try: CAT". `pickCoachExampleWord()`
takes the easiest 3–5 letter word from the existing `/api/solve-grid` solver;
`useCoachExampleWord` fetches at most once per mount, and failure falls back silently to the
old generic copy. `submit-hint` is deliberately excluded — that player already built a valid
path, so naming a different word would talk past their actual problem. 8 tests; copy in all
6 locales.

### Phase 5 — Still open
- **A gamer-facing paid product.** Nothing a player can buy exists. Polar is already wired, so
  this is a second product ID on `/api/subscription/checkout` — but not before Phase 0 proves
  the checkout takes real money, because a broken checkout burns the first buyer.
- **Android conversion.** 410 promo impressions / 339 dismissals (83%) / 45 install clicks in
  90d. Deliberately untouched: `exp-install-promo-after-first-game-v1` is mid-flight and
  changing the surface now would void it.
- **Teacher trial-expiry emails** (Phase 1.2) and the **re-engagement cron** (Phase 2) — both
  send real mail and are waiting on a go-ahead.

## 6. Explicitly not doing
- Web ad networks (AdSense / H5 / GameDistribution / ayeT) — $24/mo ceiling, see §1.
- Android install promo changes — live experiment in flight.
- District self-serve portal — 0 school leads; build demand before the portal.
