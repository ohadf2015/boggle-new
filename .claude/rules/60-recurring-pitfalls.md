# Recurring Pitfalls — Pre-Flight Checklists

> Distilled from ~50 incident memos. The same **4 bug classes** keep generating new symptoms.
> Each new bug is usually a *fresh instance* of an old class — not the literal old bug.
> Run the matching checklist BEFORE writing code that smells like one of these.

---

## Class 1 — Dual source of truth + async resolution

**Smell:** a value lives in two places (localStorage + DB, code-default + PostHog flag, guest-flag + authed-column) and one resolves *later* than the other. The late resolution overrides the early render → flash, re-pop, or wrong state.

**Incidents (≥6):** style-popup re-show ×4 (localStorage vs `player_style_modal_shown_at` vs auth-state), cubes flag flash (code default `cubes` vs PostHog `landing-modes-cubes-v1` served `control`), guest→login style carry-over.

**Pre-flight:**
- [ ] List EVERY source of this value (local, DB column, feature-flag, server prop). >1 = danger.
- [ ] Which resolves last? Render the **pessimistic** state until ALL sources resolve — never render an optimistic default that a later source can flip.
- [ ] Guest→auth transition: short-circuit on the local/guest flag BEFORE the auth branch (`if (getStored...() != null) return`). Auth `isAuthenticated` starts `false` then flips → transient guest-branch fire.
- [ ] Persistent marker must be written at **show-time**, not dismiss-time (reload-without-dismiss = no persist = re-pop).
- [ ] Feature-flag + code-default: gate the UI on flag-*resolved*, or accept the code default is authoritative and ignore the flag for first paint.

---

## Class 2 — Stale mutable state across rounds + split reset paths

**Smell:** a long-lived mutable object (bot, room, score map) is reused across rounds/games, and the reset logic has **mode-specific branches** — one branch forgets to reset.

**Incidents (≥5):** blast bots frozen at 0 (classic-only reset path never ran for blast; `bot.score` stale from round N-1), reused score in fresh round (`resetGameForNewRound` zeroed players but not bots).

**Pre-flight:**
- [ ] Any object that survives a round boundary? It needs an explicit per-round reset.
- [ ] Is the reset behind a mode `if`? Every mode that reuses the object must hit a reset — prefer ONE shared `resetXForNewRound()` called unconditionally over per-mode branches.
- [ ] New mode added? Grep every `resetScoresForNewRound` / `resetBotsForNewRound` sibling and confirm the new mode routes through all of them.
- [ ] Case/format mismatch on lookups: `findAllWords` returns lowercase — compare `word.toLowerCase()`, never `.toUpperCase()` against a lowercase set.

---

## Class 3 — Asymmetric paths (two routes that should behave identically, don't)

**Smell:** two entry points reach the same outcome but emit different payloads / run different setup. One path is the "happy" one everyone tests; the sibling silently diverges.

**Incidents (≥4):** reconnect — `join` emitted `startGame`+`updateLeaderboard`, but `requestGameState` fallback emitted `startGame` only → score froze at 0; nightly gate — `next build` path vs `tsc --noEmit` path (18× slower, wedges); server-vs-client score (client shows combo *multiplier*, server credits additive bonus — still OPEN).

**Pre-flight:**
- [ ] Two code paths to the same state? Diff their payloads field-by-field. Carry shared data (e.g. `leaderboard[]`) INSIDE the common payload so both paths restore it atomically.
- [ ] Reconnect/rehydrate: server in-memory socket→game maps are wiped on restart. Client must re-emit `join` (rebuilds the map), not a lighter `requestX` that gates on `getGameBySocketId` → null no-op.
- [ ] Client and server computing the "same" number independently → they WILL drift. One side is the source of truth; the other displays it.

---

## Class 4 — Silent failure (no-op that emits nothing)

**Smell:** a failure path returns/aborts with zero output — no log, no alert, no thrown error. Looks identical to "nothing to do." This is the #1 nightly time-sink.

**Incidents (≥10, mostly nightly):** off-master preflight hard-abort (silent for days), Supabase PAT 30-day expiry (silent), MCP hang/empty-sidecar, `next build` idle-hang killed at 900s → rc=124 treated as pass/inconclusive, CLI glyph `✓`→`✔` broke a hardcoded grep, reengagement emails sent ZERO for 7 weeks (queried empty legacy table).

**Pre-flight:**
- [ ] Every early-`return`/abort on an error condition: does it ALERT (Telegram/log) or just vanish? Silent no-op on error = forbidden in nightly/cron paths.
- [ ] Time-based guards (timeouts, watchdogs): distinguish "killed/timed-out" (rc 124) from "passed cleanly". Never treat an inconclusive kill as success.
- [ ] String-matching external tool output (glyphs, status words): match ASCII substrings (`Connected`), not Unicode glyphs that the tool may change.
- [ ] Querying a table for a job's input: assert the row count is plausible. Zero rows for a job that should always have work = alert, not silent success.
- [ ] **Supabase PAT:** always mint with **Expires = Never**. Default `sbp_` tokens expire in 30 days and die silently mid-nightly. See `nightly-supabase-mcp-token-expiry`.

---

## Class 5 (visual) — Mobile-web flash from native-only gates & entrance opacity tweens

**Smell:** an effect gated on `isNativeApp()` runs unguarded on mobile **web**; or an entrance `opacity 0→1` tween promotes a GPU layer that flashes on the Chromium mobile renderer; or a lazy-mounted fullscreen surface uses `bg-neo-cream dark:bg-neo-navy` and the dark class resolves late (cream FOUC).

**Incidents (≥4):** MP results white-flash, fanfare cream FOUC, MP music 3-phase flash, exit black-backdrop (dead `z-101` class).

**Pre-flight:**
- [ ] Gating a heavy/animated effect on `isNativeApp()`? Mobile web needs the same gate — use `!isNativeApp() && !isMobileViewport()` or `prefersStaticFullscreenOverlay()`.
- [ ] **Dark-only** surfaces (game overlays, fanfare, fullscreen results) → hardcode `bg-neo-navy`. Do NOT use `bg-neo-cream dark:bg-neo-navy` there — that pair is correct ONLY for genuinely theme-responsive surfaces (it flashes cream before the dark class resolves on lazy mounts).
- [ ] Entrance opacity tweens on large/fullscreen layers on mobile: prefer a static appear (no `opacity-0` start) over a tween, or keep the tween bounded to a small element.

---

## Evidence map

| Class | Incidents | Status |
|---|---|---|
| 1 Dual source of truth | 6+ | guarded per-instance; pattern still generative |
| 2 Stale mutable state | 5 | reset helpers wired; new modes must opt in |
| 3 Asymmetric paths | 4 | reconnect guarded; client/server score divergence OPEN (design call) |
| 4 Silent failure | 10+ | nightly mostly guarded reactively; PAT 30d expiry = manual mint Never |
| 5 Mobile-web flash | 4 | gated per-component; cream-FOUC pair latent in theme-responsive surfaces (correct there) |

Related infra-level guardrail (the model for "incident → enforced check"): `.claude/rules/50-supabase-perf.md` (Realtime WAL → pg_cron audit + auto-remediation).
