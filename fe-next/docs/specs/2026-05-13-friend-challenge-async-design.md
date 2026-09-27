# Friend Challenge — Async-First Unification (with Live Opt-In)

**Date**: 2026-05-13
**Owner**: Ohad
**Status**: Spec — pending implementation plan
**Driver**: User report — current "challenge a friend" flow is incoherent. Want challenger to play first so the friend sees a target score before playing. Push notifications where supported. End-to-end flow must work.

---

## 1. Problem

Three independent friend-challenge systems exist with overlapping intent:

1. **Live MP** — `friends:sendChallenge` socket → `friend_challenges` table → both players join the same room and race.
2. **Async board challenge** — `useAsyncChallenge` hook → `async_board_challenges` table → turn-based, challenger-plays-first. Schema exists but UI entry is broken; the API route queries the wrong table name (`async_challenges` vs `async_board_challenges`) so PUT is non-functional at runtime.
3. **Score challenge** — `utils/challenges.ts` → `score_challenges` table → shareable URL with grid seed baked in. Wired only to SP results.

Users hitting "Challenge friend" from `/friends` land on path (1) — sync MP — which doesn't match the "set a target, friend beats it later" mental model the user expects. Push notifications fire on live `accept/decline` but no push fires for the async path. The async API is silently broken.

## 2. Goal

A single dialog where the user picks the challenge style explicitly:

- **🎯 Beat my score (async, default)** — challenger plays solo first → score locks → push to friend → friend plays the same board → result push both ways.
- **🏟 Play together (live)** — current real-time race, unchanged.

Push notifications fire on every async transition that affects the other player. Async API and table contract are fixed. Live path stays intact.

## 3. Non-Goals

- Not unifying `score_challenges` URL share (out of scope; keeps guest/anon path).
- Not building a new schema. Reuses `async_board_challenges` as-is plus one enum extension.
- Not changing live-MP behavior beyond moving the entry point under a pill.
- Not changing push delivery infrastructure (FCM, web push) — only adds two new trigger helpers.

## 4. Design

### 4.1 `ChallengeInviteDialog` UX

Add a segmented control at the top of the dialog with two pills. Async pill selected by default.

```
┌──────────────────────────────────────┐
│ Challenge {Friend}                   │
│                                      │
│ [🎯 Beat my score] [🏟 Play together]│  ← new segmented control
│                                      │
│ "You play first. Friend gets pushed  │  ← sub-copy, mode-aware
│  your score to beat."                │
│                                      │
│ Language: [English ▾]                │
│ Timer: [90s ▾]                       │
│ Mode: [Classic ▾]                    │
│ Message (optional): [_____________]  │
│                                      │
│ [ Play & Send ] / [ Send Live Challenge ]
└──────────────────────────────────────┘
```

CTA label binds to selected pill:
- Async → `t('friends.challenges.cta.async')` — "Play & Send"
- Live → `t('friends.challenges.cta.live')` — "Send Live Challenge"

### 4.2 Async flow — state machine

```
[challenger creates draft]   draft
        │ challenger plays + submits score
        ▼
      pending  ──── push #1 to friend
        │ friend opens deep-link, accepts
        ▼
      accepted
        │ friend plays + submits score
        ▼
     completed ──── push #2 to BOTH (result)

Side states:
  draft     → expired_draft       (1h idle, cron sweep)
  pending   → declined            (friend tap decline)
  pending   → expired             (7d no-accept, cron sweep)
  accepted  → expired_unfinished  (24h post-accept, no submit, cron sweep)
```

Result rules:
- Winner = `argmax(score)`.
- Tie (equal scores) = `winner_user_id = NULL`.
- Rows immutable post-`completed`.

### 4.3 User journey (async, happy path)

1. Alice opens `/friends`, taps Challenge on Bob. Dialog appears, async pill default.
2. Alice picks Language=English, Timer=90s, Mode=Classic, taps **Play & Send**.
3. Client POSTs `/api/growth/async-challenge` with `{ friendUserId, gameMode, language, durationSeconds }`. Server inserts row with `status='draft'`, returns `{ challengeId, gridSeed }`.
4. Client `router.push('/{locale}/challenge/{challengeId}/play')`. Page is server-rendered: loads the row by id, validates `auth.uid() === challenger_id`, passes `seed`, `mode`, `language`, `duration` to a client component that wraps the existing SP game client.
5. Alice plays. On game-end, results screen calls `PUT /api/growth/async-challenge?id=X&phase=challenger` with `{ score, words, bestWord }`. Server validates score against board, flips `draft → pending`, calls `notifyAsyncChallengeReceived(bob, alice, X, score, mode)`.
6. Bob receives push: "Alice challenged you — beat **184**". Tap → `/{locale}/challenge/X`.
7. Page shows challenge meta (Alice's score, mode, duration, decline button, **Accept & Play** CTA).
8. Bob taps Accept → `PUT /api/growth/async-challenge?id=X&phase=accept` flips `pending → accepted`. Client routes to `/{locale}/challenge/X/play`. Plays same seed.
9. On game-end, `PUT ...?phase=challenged` with score. Server flips `accepted → completed`, computes winner, calls `notifyAsyncChallengeResult` for both Alice and Bob.
10. Both see push: "You won/lost/tied — 184 vs 197".
11. AsyncChallengeCard on landing shows completed history row with result chip.

### 4.4 Data model

**Single canonical table**: `async_board_challenges` (already exists; defined in `supabase/migrations/20260322700000_growth_retention_features.sql`).

Migration:
```sql
-- Add status values + duration column
ALTER TABLE public.async_board_challenges
  DROP CONSTRAINT IF EXISTS async_board_challenges_status_check;

ALTER TABLE public.async_board_challenges
  ADD CONSTRAINT async_board_challenges_status_check
  CHECK (status IN (
    'draft', 'pending', 'accepted', 'completed', 'declined',
    'expired_draft', 'expired', 'expired_unfinished'
  ));

ALTER TABLE public.async_board_challenges
  ADD COLUMN IF NOT EXISTS duration_seconds INT NOT NULL DEFAULT 90;

CREATE INDEX IF NOT EXISTS idx_abc_status_expires
  ON public.async_board_challenges (status, expires_at);
```

RLS unchanged — row visible to `challenger_id` or `challenged_id`; service-role writes from `/api/growth/async-challenge`.

`friend_challenges` table left alone — repurposed for live-MP room registry only.
`score_challenges` left alone — URL-share for guests/SP results.

### 4.5 API

`app/api/growth/async-challenge/route.ts` (fix table-name bug + add phases):

| Method | Path | Body | Effect | Push |
|---|---|---|---|---|
| POST | `/api/growth/async-challenge` | `{ friendUserId, gameMode, language, durationSeconds, message? }` | Insert `status='draft'`. Returns `{ challengeId, gridSeed, expires_at }`. | none |
| PUT | `?id=X&phase=challenger` | `{ score, words, bestWord }` | Validate score, set `challenger_score/words/best_word`, flip `draft → pending`. | `notifyAsyncChallengeReceived(challenged_id)` |
| PUT | `?id=X&phase=accept` | `{}` | Flip `pending → accepted`. | none |
| PUT | `?id=X&phase=decline` | `{}` | Flip `pending → declined`. | `notifyChallengeDeclined(challenger_id)` (existing helper) |
| PUT | `?id=X&phase=challenged` | `{ score, words, bestWord }` | Validate, set `challenged_*`, compute winner, flip `accepted → completed`. | `notifyAsyncChallengeResult(both)` |
| GET | `/api/growth/async-challenge` | — | List sent + received for `auth.uid()`. **Filter**: drafts visible only to their creator (`challenger_id = auth.uid()`); friend sees rows where `status IN ('pending','accepted','completed','declined','expired','expired_unfinished')`. `expired_draft` hidden from both. | none |

Auth: required for all (read JWT, no `auth.getUser()` round-trip — use local verifier per repo perf rule).
Rate limit: 10 POST/min/user, 30 PUT/min/user (express middleware).
Score validation: server runs the existing board solver (`lib/boggle/solver` or `backend/modules/scoringEngine`) on `gridFromSeed(seed, language)` to derive `max_possible_score` given `duration_seconds`, rejects if `score > max_possible * 1.1` (anti-cheat soft gate). Words array length must also satisfy `<= max_possible_words`.

### 4.6 Push notification triggers

New helpers in `backend/modules/pushNotificationTriggers.ts`:

```ts
notifyAsyncChallengeReceived(toUserId, fromUsername, challengeId, targetScore, gameMode)
  // title:  t('friends.challenges.push.received.title', { name })
  // body:   t('friends.challenges.push.received.body', { score, mode })
  // deep-link: /{locale}/challenge/{challengeId}

notifyAsyncChallengeResult(toUserId, opponentUsername, challengeId, didWin, myScore, theirScore)
  // title:  t('friends.challenges.push.result.title', { outcome })
  // body:   t('friends.challenges.push.result.body', { name, mine, theirs })
  // deep-link: /{locale}/challenge/{challengeId}
```

Existing helpers reused unchanged: `notifyChallengeDeclined`, `notifyGameInvite` (live path).

Push category: existing `friend_challenges` row in `push_category_preferences`. No new opt-in plumbing.

### 4.7 Pages / routing

New routes:
- `/{locale}/challenge/[id]/page.tsx` — landing for friend. Shows meta + Accept/Decline + result if completed. SSR with auth check (must be `challenged_id` or `challenger_id`).
- `/{locale}/challenge/[id]/play/page.tsx` — game surface. Reads seed/mode/duration from row. Thin wrapper over existing SP `PageClient` passing fixed config. Submits via PUT on game-end.

Existing routes touched:
- `/{locale}/friends/PageClient.tsx` — `handleSendChallenge` branches on selected pill: async → REST, live → existing socket `sendChallengeWithAck`.
- `components/friends/ChallengeInviteDialog.tsx` — add pill + sub-copy + dynamic CTA + onSubmit branching.
- `components/growth/AsyncChallengeCard.tsx` — already wired; extend to show completed history rows (currently only pending).

### 4.8 Cron expiry sweep

New pg_cron job `friend-challenge-expiry-sweep`, hourly:
```sql
-- draft → expired_draft  (1h idle)
UPDATE async_board_challenges
SET status = 'expired_draft'
WHERE status = 'draft' AND created_at < now() - interval '1 hour';

-- pending → expired (7d)
UPDATE async_board_challenges
SET status = 'expired'
WHERE status = 'pending' AND expires_at < now();

-- accepted → expired_unfinished (24h post-accept)
UPDATE async_board_challenges
SET status = 'expired_unfinished'
WHERE status = 'accepted' AND played_at < now() - interval '24 hours';
```

Follows existing pg_cron pattern (e.g. `realtime-publication-audit`).

### 4.9 i18n surface

~12 new keys × 5 locales (en/he/sv/ja/es):

- `friends.challenges.modePicker.live`
- `friends.challenges.modePicker.async`
- `friends.challenges.async.subcopy`
- `friends.challenges.live.subcopy`
- `friends.challenges.cta.live`
- `friends.challenges.cta.async`
- `friends.challenges.targetScore` (`{score}`)
- `friends.challenges.result.win` / `.loss` / `.tie` (`{mine}`, `{theirs}`)
- `friends.challenges.push.received.title` / `.body`
- `friends.challenges.push.result.title` / `.body`
- `friends.challenges.draftExpired`

HE + JA flagged for native review (per repo policy on AI-generated translations).

RTL test: dialog pill order, sub-copy alignment, push deep-link locale prefix.

### 4.10 Tests (TDD)

Per `.claude/rules/22-tdd-strict.md`, write first.

| File | Coverage |
|---|---|
| `app/api/growth/async-challenge/route.test.ts` | NEW. 5 phases × happy + 3 error paths each. |
| `hooks/useAsyncChallenge.test.ts` | Extend existing tests: new statuses, completed history. |
| `components/friends/__tests__/ChallengeInviteDialog.test.tsx` | NEW (no file today). Pill toggle, CTA flip, async submit calls REST, live submit calls socket. |
| `backend/modules/__tests__/pushNotificationTriggers.test.ts` | 2 new helpers — title/body/deep-link assertions × 5 locales. |
| `components/growth/__tests__/AsyncChallengeCard.test.tsx` | Extend with status='completed' row rendering, deep-link to result. |
| `app/[locale]/challenge/[id]/__tests__/page.test.tsx` | NEW. Auth guard, accept, decline, completed-result render. |
| `tests/e2e/friend-challenge-async.spec.ts` | NEW Playwright. Two browser sessions, full end-to-end async flow. |

Estimated ~40 new tests.

## 5. Risk + Mitigations

| Risk | Mitigation |
|---|---|
| Score validation false-rejects legitimate high scores | Soft cap `1.1 × theoretical_max` for v1, log rejects to Sentry, refine via data. |
| Push deep-link breaks on cold-launch app | Reuse existing deep-link handler from rival-push (`rival-push-2026-05-10`); proven path. |
| Challenger abandons mid-game leaves orphan rows | `draft → expired_draft` 1h sweep + new `draft` not shown in friend's inbox until promoted to `pending`. |
| Live-path regression while editing dialog | Pill branching is the only change in `ChallengeInviteDialog`. Live path keeps `sendChallengeWithAck` import + handler. Tests cover both branches. |
| Schema enum mismatch with existing rows | Migration is additive — no removed values. Existing pending/accepted/completed rows unaffected. |
| `auth.getUser()` round-trip in new API routes | Use local JWT verify per `auth-getuser-refactor-playbook` memory. |
| HE/JA mistranslation in push copy | Native review gate before commit, per repo i18n policy. |

## 6. Implementation phases (preview for writing-plans)

1. **Phase 0** — Migration: enum extension + duration column + index. Apply via Supabase MCP.
2. **Phase 1** — API fixes: table-name bug + new phase handlers + score validation + auth guard. Tests first.
3. **Phase 2** — Push helpers: `notifyAsyncChallengeReceived` + `notifyAsyncChallengeResult`. Tests first.
4. **Phase 3** — Pages: `/challenge/[id]` + `/challenge/[id]/play`. Tests first.
5. **Phase 4** — Dialog: pill + CTA flip + async submit branch. Tests first.
6. **Phase 5** — AsyncChallengeCard: completed history. Tests first.
7. **Phase 6** — Cron expiry sweep. Apply pg_cron.
8. **Phase 7** — i18n × 5 locales. HE/JA native review.
9. **Phase 8** — E2E Playwright. Two browser sessions.
10. **Phase 9** — Lint + build + full test pass. Commit per PIV phase rules.

## 7. Success criteria

- Async happy path end-to-end works on web + Android (deep-link push tested).
- Push delivery rate parity with rival-push (>90% on opted-in users).
- API table-name bug closed; PUT phases functional.
- Live path regression test green.
- Lint + build + ~17,900 → ~17,940 tests pass.
- 5-locale strings present; HE+JA flagged for native review.
- No new Sentry errors after 48h soak on internal track.
