# MP In-Game Lobby: reward revamp + UX polish (2026-06-11)

## Problem
1. The MP lobby **boost** (`BoostButton`/`BoostPicker`, `mode="mp"`) is redundant: it's a
   *competitive* advantage (scoreMultiplier / firstWordBonus / hint) bought with an ad-watch
   in a competitive match (pay-to-win feel) and is **host-only** (guests never see it) — asymmetric.
2. "Improve UI/UX of the MP in-game lobby."

## Decision
Replace the MP-lobby boost with a fair, symmetric, ad-gated **reward cluster** that reuses
existing infra:

- **Coins** (`RewardedAdGoldButton`) — auth-agnostic (grants local coins to anon guests),
  *repeatable* (~10/day). Already in the guest hero. Add to host footer too.
- **Daily avatar part** (`claim-daily-part` route + `DailyPartClaimModal`) — authed-only
  cosmetic, 1/day. Surface in BOTH lobbies. Returns null for anon (server 401s), so coins
  fills the slot → no blank gap for the anon population the boost served.

Net: cosmetic/coins instead of competitive; symmetric host+guest; coins restores the
repeatable ad-impression volume lost by boost (5/day → avatar 1/day).

Boost system stays for `mode="drill"` (brain drills) and `mode="sp"` (SP tutorial) — only the
`mode="mp"` callsites are removed. `firstWordBonus` config goes dead (MP-only) — harmless, left.

## Build
- `hooks/useDailyAvatarPart.ts` — extract status/cooldown/claim from `DailyAvatarPartCard`.
  `shouldRender = hasRealAdProvider && isAuthenticated && !loading && !!status`.
- `components/avatar/LobbyAvatarRewardButton.tsx` — lobby-styled button over the hook +
  `DailyPartClaimModal`; pixi `SharedFxApp.spawnBurst('sparkle-gold', …)` on claim success.
  Full border (NO side-stripe — impeccable ban).
- `components/lobby/LobbyRewardCluster.tsx` — composes coins + avatar reward; self-hides when
  both render null (footer collapses to Start, exactly like boost did on `!canShowAd`).
- Refactor `DailyAvatarPartCard.tsx` to consume the hook; fix its `border-s-4` side-stripe.

## Wire
- `host/components/HostPreGameView.tsx`: drop `BoostButton`/`BoostPicker` import, `isBoostPickerOpen`
  state, 2 boost callsites (637, 692), picker mount (726-733). Insert `LobbyRewardCluster`
  (surface `host_waiting`) where boost was, in both footers.
- `player/components/PlayerWaitingView.tsx`: replace the lone coins button (272) with
  `LobbyRewardCluster` (surface `player_waiting`).

## UX polish (anchored — no structural rewrite)
- Reward cluster = the craftwork centerpiece (clear secondary-chrome hierarchy vs primary Start).
- Drop the looping `animate-pulse` on the whole Start button when waiting (product register:
  no looping decoration on a primary CTA; the wobbling nudge text above already cues attention).

## i18n
Reuse `avatar.dailyPart.*`. Add short lobby CTA label `avatar.dailyPart.lobbyCta` ×5.

## Tests (TDD)
- `useDailyAvatarPart` hook test (status fetch, eligible/cooldown/exhausted, claim updates).
- `LobbyAvatarRewardButton` test (renders eligible, hidden when !shouldRender, opens modal).
- `LobbyRewardCluster` test (renders both, self-hides when empty).
- Host/guest view tests: boost gone, cluster present.
