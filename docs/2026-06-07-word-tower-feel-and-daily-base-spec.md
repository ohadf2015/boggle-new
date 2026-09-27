# Word Tower — feel pass + daily-integration base (2026-06-07)

Founder report (Nth "not fun" on Word Tower):
1. Physics + crane feel weird; building shaking feels bad.
2. "Bomb other buildings" buttons don't work well + hide part of screen.
3. Vision: fold Word Tower into the **daily challenge** flow — same letters for everyone
   each day, tower continues building day-to-day. **Keep admin-only for now; just build
   the base of the integration for the future.**

Prior re-tunes of the physics constants were rejected (`towerSway.ts`/`craneSweep.ts`/
`fallProfile.ts` headers narrate the failed attempts). Don't re-tune blind. Advisor:
split into 3 isolated workstreams, smallest-risk first, physics last + look-informed.

---

## Workstream 1 — Cut the fake bomb/sabotage from solo  (DONE FIRST, high confidence)

**Why it can't "work well":** In the solo `/word-tower` path the "rivals" are leaderboard
ghost records. A wrecking-ball hit only shrinks a **local decorative** rail number
(`SABOTAGE_M_PER_FLOOR = 8`, no backend). Tokens are perfect-streak gated so the chip is
disabled-grey most of the run = dead clutter at `bottom-[230px]`. The 💥 flight animation
sweeps `40vw → 80vw` at `scale 2.2` = "hides part of the screen". Repositioning is a
non-answer; the mechanic is fake. The real async-versus home for it (`WordTowerVersus.tsx`)
is dead code (zero imports). Competitive comparison belongs in the shared async daily, not
a fake real-time bomb.

**Change:** Remove `WordTowerSabotageBay` + `useSabotageIntegration` + the sabotage reward-ad
wiring from `WordTowerPlay`. Rival rail uses raw `rivals` (no sabotage shrink). Keep the pure
`sabotage.ts` logic file + `WordTowerVersus.tsx` on disk (future async-versus), but unwired.

**Tests:** WordTowerPlay no longer renders the sabotage chip; rival rail unaffected.

## Workstream 2 — Daily-integration base  (admin-gated foundation only)

**Already present:** same-letters-for-all (`dailySeed.ts`, `DAILY_PLAYER_ID`), per-run daily
persistence (`/api/word-tower/progress`), daily hub `/daily` (Word Hunt + Word Wheel cards,
hardcoded), streak system (`utils/dailyChallenge/streaks.ts`).

**Base to build (foundation, not the full feature):**
- A single source registry of daily-eligible modes (`lib/dailyModes.ts`) so the hub stops
  hardcoding modes and word-tower can be slotted in for the future.
- Surface a **Word Tower** card in `DailyChallengeLanding`, **gated by `isAdmin`** (admins
  only today), linking to the existing daily run `/word-tower?daily=1`.
- Carry the daily-challenge **date/streak seam** to word-tower daily entry (the future
  "continue the tower each day" hook) — wire the existing word-tower daily streak callbacks
  into the shared streak util behind the same admin gate. Minimal; no cross-day carryover
  of the actual tower yet (explicitly future work, noted in code).

**Tests:** registry lists word-tower as admin-only; hub renders the card only for admins.

## Workstream 3 — Physics / crane / shake  (LAST, isolated commit, look-informed)

Run dev + watch before changing. Hypothesis to confirm visually: the **continuous ambient
instability sway** (whole Pixi tower rotates ±5° + DOM target swings) reads as "the screen
wobbling for no reason" in solo. Decision after looking:
- Likely: drop ambient sway in solo (keep event-only shake: land / error / topple), so the
  tower is steady and only *reacts* to real events. Reconcile crane→tower spatial handoff if
  the beam visibly falls in DOM while the floor appears elsewhere in Pixi.
- Tune crash/landing shake amplitudes only if the look demands it.

Isolated phase + commit so a physics regression can't block shipping WS1 + WS2.

**Acceptance = visual.** The 37 test files guard logic, none guard feel; browser verification
is the only test that maps to the complaint.

### WS3 status (2026-06-07): BLOCKED on live motion review — deferred, NOT edited.

Ran the local dev build and watched `/word-tower` in a browser. Confirmed:
- `reducedMotion = false` in-session, so animations are live.
- **At rest (floor 0) the tower is static + upright** — `instability = swayInstability(0,0) = 0`
  and `swayAmplitudeDeg` is gated to 0 below 0.3, so there is NO ambient wobble at rest.
  The advisor's (and my) first guess — "drop the ambient sway, it wobbles for no reason" —
  is **disproven**: sway only appears once the tower is genuinely unstable, which is arguably
  correct. Do NOT remove sway blind.
- **Real candidate culprits (from code + the floor-0 look), all still unverified in motion:**
  1. The whole Pixi tower container rotates continuously: `angle = leanDeg + swayAngleAt(...)`
     (`WordTowerScene.tsx:343`). The persistent **lean** (accrues from drop error, separate
     from sway) tilts the entire abstract tile-stack — likely "the way the building is shaking."
  2. A **stack of shakes**: error `shakeX` + topple crash shake + celebration shakes.
  3. **Layout disconnect:** the crane is a fixed DOM overlay at `top-[10%]`; the beam falls
     ~80px in DOM then a verdict pops centre-screen, while the actual floor lands in Pixi
     elsewhere. At floor 0 the "tower" is a lone anchor tile mid-screen — it reads as abstract
     tiles floating against a sky, not a building. (Advisor flagged this may close at height;
     could not verify — see below.)

**Why deferred:** to adjudicate a *motion* complaint I must watch the unstable state (lean
accrued, sway active, a topple crash) — reachable only by building several real floors. The
local dev env was too unstable to get there: recurring Turbopack cache corruption
(`ENOENT … build-manifest.json`, SST/compaction errors) kept serving the app's 404 page, and
`?sim_sabotage=1` (the one-tap topple trigger) was removed in WS1. Per the documented
anti-pattern (prior Word Tower "feel" passes shipped blind and were rejected), a blind
physics edit is the wrong move. WS3 needs a session where the unstable state can be watched
in motion (record video; drive ≥5 bad-timed drops). WS1 + WS2 ship independently.

### WS3 partial fix SHIPPED (2026-06-07): building no longer shakes on word-reject

`fix(word-tower): stop shaking the building when a word is rejected` (HEAD 177efeeb5).
The scene rattled the **whole Pixi tower** (`shakeX`) on every rejected word (`errorKey`) —
which fires constantly while experimenting with letters — semantically wrong (a typo isn't
tower damage) and the most *frequent* "building shakes for no reason" event. The error is
already shown where the mistake is (HUD word-builder: red shake + message + haptic + sound),
so the tower now stays solid; only real structural events (topple/hazard, landing impacts)
move it. Justified without motion review because it removes inappropriate, redundant feedback.

**Remaining WS3 (still needs motion review):** the crane↔tower vertical disconnect; whether
the persistent lean + ambient sway amplitudes feel right; framing more of the built tower.
These are motion/iteration-dependent — left for a session with observable playback.

**NEW finding (2026-06-07, from a dev-debug seam attempt):** I added a temporary dev-only
`?wtdebug=floors,lean,inst` seam to render a tall/unstable tower instantly, then reverted it
because the Pixi **camera always follows the TOP of the tower** — it frames the newest floor
against open sky, so synthetic floors render *below* the viewport and a base-pivoted lean
rotates an off-screen stack (invisible in a still). That camera behavior is itself a likely
root of the "feels weird / not a building" complaint: **the player never sees the whole
tower** — only the topmost floor or two floating against empty sky, which reads as abstract
tiles, not a building you've built. A real WS3 fix should consider (a) framing more of the
built tower (zoom-to-fit or a persistent mini-tower), and (b) whether the base-pivot lean is
even legible when the base is off-screen. A redone debug seam must also force the camera to
the base (or zoom out) to be useful for visual testing.
