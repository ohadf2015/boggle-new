# Nightly 2026-06-13 — recovery, gate fix, baseline repair

**Date:** 2026-06-13
**Trigger:** "make sure the nightly finished well — I saw errors, fix for future jobs" + "push all today's code" + "apply + fix the rest".

## TL;DR

The 06-13 nightly **false-dropped** build-clean lane code to a "docs-only salvage" and never pushed (network died at ship time). Diagnosed the root cause, recovered + shipped the dropped code, fixed the gate so it can't recur, applied the pending DB migration, and turned master's baseline green. Everything is on `origin/master`.

## What was wrong

| Symptom | Reality |
|---|---|
| stderr `DIRTY_COUNT: unbound variable` ×9 | **Stale** append-only log noise; fixed back on 2026-06-03 (`8076f6a8b`). Not this run. |
| `curl: could not resolve api.telegram.org` / `github.com` | **Network down** ~09:55 (Mac lost connectivity). Push + notify failed → nightly commit dangled, never reached origin. |
| docs-only salvage dropped 16 code files | **The real failure** (recurring 06-10/11/12/13). See below. |

### Root cause of the false drop

When the isolated gate fails on a **test** file, the nightly gates a clean HEAD to check whether that test is already red on master (pre-existing → not the nightly's fault → ship). That baseline gate ran the **full 3278-test suite**, and a networked integration test (`wikipediaTimeout.integration.test.ts`) **wedged** it → idle-killed (`rc=3`, inconclusive) → **zero FAIL lines parsed**. `nightly_baseline_ship_decision` then saw "no comparable test baseline" → `fallthrough` → docs-only **drop of build-clean code**.

The whole recurrence class is **"inconclusive → drop"**: every prior docs-only night dropped good code on a signal that couldn't complete, not on proven breakage.

## What was done (all on `origin/master`)

1. **Recovered + shipped the dropped lane code** — `4b51a4d68`
   Restored `salvaged-code-20260613-013000`, re-gated on a real checkout (tsc 0 · lint 0 · `next build` ✓ · new `SchoolLeadForm` 5/5; only reds were the pre-existing blast tests). Contents: education school-leads funnel, word-vault HubFoyer/RoomShell polish, dictionary candidates (en/es/he/ja/sv), security RLS migration. Founder/daemon WIP (adventure reducer, word-craft) correctly excluded.

2. **Fixed the gate** — `a9ab9fe2c`
   The baseline-aware check now scopes the clean-HEAD gate to **only the failing test files**, passed as vitest positional (basename) filters. Those files touch no network → the scoped run can't wedge → a real `rc=1` + FAIL lines → `authored ⊆ baseline` → **ship (proven pre-existing)** instead of `rc=3` → drop. `build:schemas` still runs first (dist bridge); both vitest projects get the filters; the `nightly_gate_has_unattributed_failures` regression guard is unchanged. New pure `nightly_baseline_test_tokens` + 7 tests (**83/83 gate tests green**). Verified end-to-end against the 06-13 log: this fix ships the code that was dropped.

3. **Applied the pending security migration** — live Supabase
   `20260613030000_security_advisor_fixes`: re-revoke `upsert_community_word` from public/anon/authenticated (grant service_role), owner-aware `web_vitals` INSERT policy, deny-all `offerwall_postbacks`. Applied via MCP (`{"success":true}`).

4. **Turned master's baseline green** — `fc1bb598a`
   The 6 red blast handler tests were **stale mocks**: refactor `15175c376` renamed `cascadeBlastWord` → `safeCascadeBlastWord`, but the `blastModeManager` mock in three test files wasn't updated → the unmocked handler called `undefined` → threw → caught → no scoring → every assertion `expected undefined to be defined`. Added the missing mock (real `{ok,board,clearedCount,totalMoves}` shape) — **test fixtures only, no production code**. 26/26 across blastScoring + mergedEmits + blast; full backend suite green.

## Still recommended (backlog)

- **Offline-resilient nightly tests** — the wedge source is a network integration test running at ~01:00 with flaky connectivity. Make `wikipediaTimeout.integration` (and peers) skip/mock when offline.
- **Push resilience** — a failed push (DNS down) currently dangles the nightly commit. Add retry/backoff and ensure a failed push leaves the commit on local `master` so a no-network night still lands code on reconnect.

## Commits

```
fc1bb598a fix(blast): repair stale handler-test mocks — master baseline green
a9ab9fe2c fix(nightly): targeted baseline gate — stop false docs-only drops on a wedged baseline
4b51a4d68 feat(nightly): ship 2026-06-13 lane code — school-leads + word-vault + dict + security RLS
```
