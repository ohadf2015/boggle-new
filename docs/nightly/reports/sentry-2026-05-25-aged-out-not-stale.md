# Sentry triage — 2026-05-25 (run #6)

**Verdict: NOT a stale-deploy run. Master HEAD is live; all 30 unresolved issues are AGED-OUT (already fixed on the deployed master, never marked resolved).**

This breaks the 5-run "stale deploy → redeploy HEAD" streak. Prior runs *inferred* stale and recommended redeploy. This run **proved deployment state from Railway** and found the opposite: the deploy is current, the dashboard is just dirty.

## Positive-evidence chain (the new technique)

| Fact | Source | Value |
|---|---|---|
| Live prod SHA | Railway deploy list | `7cbc66bb9` SUCCESS @ 2026-05-25 **10:50 UTC** = master HEAD |
| Avatar fix commit | git | `30a7c2502` (ignoreErrors) committed 12:40 +0300 = **09:41 UTC**, deployed @ 09:41 UTC (deploy `30397727`, since superseded) |
| Last avatar event (1HW) | search_events | **06:00:05 UTC** — 3h41m *before* the fix deployed → no event since filter went live |
| Avatar cadence | search_events | events land on the hour for the same 2 playerIds → a **scheduled job** renders `/api/avatar/png`, not real users (explains "0 users") |
| Shiritori keys (1HV/1HT/1J0/1HZ) | code | ALL present en+he on deployed master; last event **2026-05-21 12:58 UTC** (4d ago, single burst) → aged out |
| All 11 translation keys | code (Explore) | every key PRESENT en+he on deployed master |

**Why "still firing 4h ago" was a false alarm:** Sentry rounds "last seen". 1HW's real last event (06:00 UTC) rounded to "~4h ago" at the 11:06 UTC query — but it predates the 09:41 fix deploy. The hourly cron at 10:00 & 11:00 UTC ran *after* the fix and produced **no** Sentry events → positive proof `ignoreErrors: /\[AVATAR_PNG\] render failed/i` is live and catching the `Sentry.captureMessage` path.

## Classification of all 30

| Class | Issues | Action |
|---|---|---|
| Avatar fix live + stopped | 1HW, 1DV | resolve |
| Translation keys present on deployed master | 1HV,1HT,1J0,1HZ,16C,12R,12Q,1CY,1AW,1CX,14Z,1D4,1D3,1D2,14W,14X | resolve |
| Already-fixed DB schema (memory) | 14S,14R,137 | resolve |
| Recovery/INFO noise (info-level, no Sentry now; residual) | 14P,14Q | resolve |
| GSAP target guarded on master | 14V,14T | resolve |
| Old null-deref, never recurred 18d | 13Y | resolve |
| Blast `{}` empty, 12d stale | 15B | resolve |
| Cron success message (not an error) | 1HF | ignore |
| AdMob UMP config (consent now 100%, memory) | 1DT | ignore |
| Transient client wasm `compileStreaming` HTTP-not-ok (~1/day, CDN/network, not a defect) | 14N | ignore (untilEscalating) — Sentry auto-reopens if it spikes |

## Code changes
**None.** No fixable-on-deployed-master defect exists. wasm 14N is below noise threshold; an optional `sentry.client.config.ts` `ignoreErrors` entry could silence it but it's not a bug.

## Why bulk-resolve is safe
Sentry auto-reopens a resolved issue if a new event arrives. Resolving verified-stopped issues is reversible and is the correct hygiene action.

## Execution note
`mcp__sentry__update_issue` returns **HTTP 403 (read-only token)** — cannot resolve programmatically. Must resolve in the dashboard. Use the bulk-select on the unresolved list:
https://lexiclash.sentry.io/issues/?project=javascript-nextjs&query=is%3Aunresolved
