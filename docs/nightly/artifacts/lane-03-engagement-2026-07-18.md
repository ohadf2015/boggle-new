---
status: shipped
files_touched:
  - fe-next/lib/experiments.ts
  - fe-next/app/[locale]/multiplayer/useMultiplayerJoin.ts
next_steps: |
  Deactivate zombie flag exp-mp-room-join-loading-v1 in PostHog (0 call sites, active=true).
  Check impact ledger in 7d: rageclick rate on /es/multiplayer should drop (baseline=6/24h).
  If eager-feedback wins: keep setIsJoining+toast path permanently, remove control branch.
  Wire mp_lobby_join_attempted with socketReady=true on happy path for full funnel coverage.
---

Shipped: exp-mp-lobby-connect-feedback-v1 live (PostHog id 230974, 50/50).
Impact check: exp-mp-round-progress-header-v1 improved (1.67 vs 1.5 baseline).
Telemetry: mp_lobby_join_attempted {socketReady:false} now fires on null/disconnected socket paths.
