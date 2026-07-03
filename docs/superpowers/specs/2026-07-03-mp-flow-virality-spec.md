# MP Flow, Fun & Virality — Research Findings + Spec (2026-07-03)

## Goal
Make MP game modes, results pages and general flow feel smooth (never stuck), raise fun factor, and maximize virality + "one more round with friends".

## Research summary (4 parallel audits: flow map, results/virality audit, external best-practices, PostHog instrumentation)

### What's already STRONG (do not rebuild)
- Rematch loop: StickyReadyBar auto-countdown (35s), revenge/defend-title framing, series (best-of-3), ready-avatars, host hold gate, grid pre-generation. Matches industry best practice already.
- Juice: LeadChangeBanner (overtake drama), OpponentWordFeed, combo feedback, quick reactions (6 emotes, results + in-game), fanfare tiers.
- Lobby invite: MobileShareSection (copy/WhatsApp/native share), desktop InviteCard with QR, TV join bar QR, `getJoinUrl()` deep link (`?room=CODE&host=NAME`) landing invitee in pre-filled join modal.
- Smoothness: reconnect overlay w/ attempt counter, rejoin toast, timer watchdogs, host-left grace modal, throttled roster updates, black-overlay results bug fixed.
- Retention on results: XP/level/streak, coins, daily-challenge invite, global percentile, close-loss "SO CLOSE + REMATCH".

### Verified GAPS (the spec)
1. **Brag card share URL is a dead end** — `ResultsMainContent.tsx:474` hardcodes `shareUrl="https://lexiclash.live"`. The room is still OPEN during results (persists for rematch), and `getJoinUrl(gameCode)` exists. A friend clicking the shared link could land directly in the room for the next round. Today they land on the homepage. This is the single biggest virality miss.
2. **No native share on MP results** — brag card is screenshot-first by design, but on mobile `navigator.share` is 1 tap to WhatsApp with text+link. Lobby has it (MobileShareSection); results does not. The emotional peak (just won / just barely lost) is the best share moment and it has no share affordance beyond copy.
3. ~~Room-gone join error leaves stale card~~ — VERIFIED NON-ISSUE: the gone branch already drops the dead room from the local list synchronously (`setActiveRooms(filter)`) AND re-emits `getActiveRooms`. Audit-agent overcount.
4. Non-goals (verified fine or out of scope): connection banner already mounted during results (`isActive` stays true); MP liquidity/bots = product bet; rubber-band scoring = fairness risk; PostHog agent's "missing game_completed/player_dropped" claims were FALSE (mpGameTracking.ts, mpDropTelemetry.ts exist).

## Implementation plan (TDD, minimal diffs)

### A1 — Brag card copies the live room join link
- `ResultsMainContent.tsx`: `shareUrl` = `getJoinUrl(gameCode, 'brag_card')` when `gameCode` present, else homepage fallback. Client-side useMemo (getJoinUrl reads window).
- Card face still prints `lexiclash.live` (screenshot carrier); the tappable copy action carries the deep link.
- `mp_brag_card_copy_link` growth event gains `hasRoomLink` prop.

### A2 — Native share button on brag card
- `MpBragCard.tsx`: second button next to printed-link footer, rendered only when `navigator.share` exists (mounted-state check, no SSR mismatch). Shares `{ text: t('brag.shareText', {...}), url: shareUrl }`.
- Share text: short boast + scoreline, keys `brag.shareTextWin` / `brag.shareTextLoss` / `brag.shareTextSolo` ×6 locales (native copy via ux-writer, not literal).
- Tracking: `trackShareCompleted('web_share_api', { surface: 'mp_brag_card' })` + growth `mp_brag_card_native_share`.

### B1 — Room-gone refetch
- DROPPED (verified already handled — see gap 3 above).

### Bonus — Russian MP brag copy repair
- ru.js MP brag block carried machine-garbage values (`"cta": "ТОП ХОДИТЬ →"`, `"НУЛЕВЫЕ ВЫЖИВШИЕ"`); rewrote natively while touching the surface. Share texts kept gender-neutral (no gendered past verbs) per the push-copy lesson.

### Verification
- Vitest: MpBragCard share button (supported/unsupported/cancelled), share URL selection, share-text params. Existing brag suites must stay green.
- lint 0 / tsc 0 / results+multiplayer suites green.
