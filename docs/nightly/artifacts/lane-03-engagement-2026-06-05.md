---
status: partial
files_touched:
  - fe-next/app/[locale]/party/PartyHubClient.tsx
  - fe-next/components/party/shared/PartyTvLobby.tsx
next_steps: |
  Flag hygiene: query PostHog for decided experiments (wheel-signup-offer-v1, wheel-replay-cta-v1).
  Add multiplayer rage-click experiment (top funnel signal from brief).
  Instrument: party_game_selected, party_lobby_player_joined, party_game_started events.
  Results screen for party host (placeholder "Sprint 4" still shows).
---

Admin party games visual polish (founder directive):

PartyHubClient: game cards now show type tag (Caption/Drawing/Deduction), flow step
emojis, rounds+time hint, admin banner, scale-lift hover, how-to row.

PartyTvLobby: player cards upgraded from plain text to avatar circles with deterministic
color per username (hash over neo-pink/cyan/purple/lime/orange/yellow), 2-char initials,
empty slots show dashed circle with "?" placeholder.

Skipped (time): flag hygiene, new experiment, analytics instrumentation.
