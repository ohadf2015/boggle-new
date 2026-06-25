# Spec: MP Results "Brag Card" — screenshot-first virality

## Problem
MP results share = a TEXT blob with a Wordle emoji grid (`🟩⬛`). Meaningless for head-to-head; nobody screenshots it. We want explicit, player-decided sharing of a beautiful, brag-worthy artifact.

## Decision (user-directed)
**No Share button / no `navigator.share`.** Players screenshot themselves — it's the share gesture they trust and control. So the deliverable is a **screenshot-optimized brag card** rendered in the results DOM, self-contained so the screenshot carries everything (incl. the link).

Consequence: the rematch/play link rides in **pixels, not share-text** → the URL + code (+QR) must be **printed on the card**.

## Scope
**In:**
- A screenshot-optimized brag card on the MP results screen (`ResultsMainContent`).
- Card content (max 4 blocks): rivalry header (avatars + headline), ONE hero stat, mode badge + mascot, printed link block (`lexiclash.live` + short code + small QR).
- Copy matrix (MP is often >2 players):
  - `winner-2P`  → "I CRUSHED {name} {a}–{b}"
  - `winner-NP`  → "WON — beat {n} players · {score}"
  - `non-winner` → "{score} pts · #{rank} — beat me?"
- Subtle hint: **"📸 Screenshot to share"** (replaces Share button). Keep a tiny "Copy link" as zero-cost extra.
- Remove emoji grid for **multiplayer ONLY**. Keep daily/singleplayer/adventure grids intact (defensible there).
- i18n ×5 incl Hebrew RTL. Brag copy via `fe-next:ux-writer` (not literal translation).

**Out (follow-up, not this pass):**
- Stateful per-challenge DB records, `/r/[code]` lobby, guest-join, rate limits. Printed link = a plain deep link reusing the existing join/play flow (TBD from recon).
- Canvas PNG renderer, Web Share files API, server OG ImageResponse for the *share file* (OG link-preview can come later).

## Card design (neo-brutalist)
- Dark navy bg, hard pixel shadows, solid borders, electric accent keyed to mode (lime/pink/cyan/purple).
- Fredoka headline + Rubik body. Kawaii mascot (winning vs consoling pose by outcome).
- Aspect ~4:5 portrait, generous bleed so a sloppy crop still looks intentional.
- Hero stat = single most impressive variant-aware number:
  - classic: `{score} PTS · {words} WORDS`
  - blast: `{maxCombo}× COMBO`
  - word-hunt: `{longestWord} ({len})`
  - wheel-rush: `{score} PTS`
- Printed link block: `lexiclash.live` big + short code + small QR (right/inline).

## Data
Reuse existing `shareParams` (ResultsMainContent ~L239): `score, wordsFound, longestWord, maxCombo, won, opponentScore`. Add: `rank`, opponent `{name, avatar}`, current `{name, avatar}`, `playerCount`, `gameCode`/deep-link.

## TDD (strict — mandatory)
Pure logic, test-first (Vitest):
- `deriveBragCardData(results)` → ShareCardData
- hero-stat selection per mode
- copy-matrix case selection (winner-2P / winner-NP / non-winner)
- RTL detection / locale routing
Pixels not unit-tested → verified by generating a sample card and **looking** (Read PNG back, iterate).

## Verification
- Build/lint/test green.
- Render sample card with realistic data → screenshot → Read image → iterate until brag-worthy.
- Hebrew RTL pass.

## Resolved (recon)
- **Deep-link join exists:** `multiplayer?room=<gameCode>` auto-joins via `useMultiplayerJoin`, rooms persist 24h. No backend needed. BUT no real "play again" yet → printing `?room=CODE` risks a stale room. **v1 prints brand `lexiclash.live`** (always valid); room-deep-link = follow-up when play-again ships.
- **Avatars are SVG** (`AvatarRenderer`), not image URLs → render natively in DOM card, no CORS/canvas concerns.
- **Emoji grid:** MP `shareParams` (L239) passes no `words` → grid never built for MP today. Real complaint = MP share is flat/boring text. Gate `generateEmojiGrid` MP-safe defensively anyway; keep daily/solo grids.
- **QR:** no QR lib in repo (html2canvas present but unused here). v1 = printed URL text only, no QR. Add later.
- **Fonts:** moot (DOM card, fonts already loaded via CSS vars).

## Implementation order
1. RED: Vitest for `deriveBragCardData` + hero-stat + copy-matrix (winner-2P / winner-NP / non-winner) + RTL routing.
2. GREEN: pure helper `bragCard.ts`.
3. Build `MpBragCard.tsx` (neo-brutalist, AvatarRenderer ×2, headline, hero stat, mascot, printed link, "📸 Screenshot to share" hint).
4. Wire into `ResultsMainContent` (MP only); replace boring ShareButton text path; keep Copy-link (link-centric text, no emoji).
5. i18n keys ×5 via `fe-next:ux-writer`. RTL pass.
6. Verify: render sample → screenshot → Read → iterate to brag-worthy. Build/lint/test green.
