# Play Store Visibility / ASO — LexiClash (`live.lexiclash.app`)

Date: 2026-05-30 · Author: ASO audit (Claude) · Source: live Play Console + public listing inspection via Playwriter

## TL;DR — honest framing

At **10+ installs**, listing copy is *table-stakes, not the lever*. Play Store ranking is driven by **ratings volume/recency, install velocity, and retention** — which come from external traffic and from the in-app review prompt, not from prettier copy. Copy fixes below remove active penalties and improve conversion, but they will not "fix visibility" alone. The real growth engine is: ratings prompt (wired below) + web→install funnel + localized listings to rank in low-competition non-English stores.

## Live state captured (2026-05-30)

| Field | Current value | Issue |
|---|---|---|
| Developer name | ~~ohad fisher~~ → **FishGameStudio** | ✅ FIXED live this session (account-level; propagates to public listing in hours) |
| App name | `LexiClash: Word Party Game` (26/30) | OK. "Word" + "party game" keywords present |
| Short description | `Word battles with friends, live. 4 languages. Zero waiting. Free.` (65/80) | ❌ **"Free." trips Google "price/promotion keyword" rule → app blocked from Play promotion/featuring.** Also "4 languages" stale (now 5) |
| Full description | Stale (says "4 LANGUAGES", lists only 4 modes), 2279/4000 | Missing 4 current public modes + ~1700 chars of keyword headroom unused |
| Listing languages | **en-GB only** | ❌ No localized listings for he/sv/ja/es despite shipping real dictionaries — ranks nowhere in those stores |
| Rating | none displayed | Too few ratings. In-app review prompt NOT wired in code |
| Installs | 10+ | Near-zero discovery |
| Web→install funnel | `/download-word-game-android`, `PlayStoreCTA`, 12s promo modal | OK; no smart app banner |

## Public game modes (for copy — gated modes EXCLUDED)

Include ONLY these 8 (verified non-gated on master): **Word Arena (multiplayer)**, **Daily Challenge**, **Adventure** (100+ levels), **Blast** (tile-clear combos), **Connections / Word Bridge**, **Brain Training** (5 drills), **WordCraft Territory**, **Practice** (solo).

EXCLUDE (admin/flag/dev-gated): Word Tower, Word Forge, Word Vault, Shiritori, Sealed Bid, Word Alchemy, Party Games, WordCraft Cards/Gems, Blast V2.

---

## 1. Short description (FIX — unblocks Play promotion). ≤80 chars, no price/promo words

> **Live multiplayer word games: swipe letters, build words, battle friends fast.** (77) — APPLIED LIVE, saved as draft 2026-05-30

Keywords captured: *live multiplayer word games, swipe letters, build words, battle friends*. No price/promo terms AND no "shop performance/ranking" terms → **promotion warning cleared** (verified `promoWarning: false` after reload).

⚠️ Google flags BOTH categories in the short description: (1) price/promotion words ("free", "sale", "discount"); (2) shop performance/ranking words ("top", "best", "#1", "leaderboard", "ranking"). First rewrite used "top leaderboards" and tripped category 2 — avoid both.

## 2. App name — keep, or A/B

Keep `LexiClash: Word Party Game`. Optional A/B to capture plural high-volume "word games": `LexiClash: Word Games Battle` (27). Title is the heaviest keyword field; change only via store-listing experiment.

## 3. Full description (EN) — current modes, 5 languages, keyword front-loaded

```
Real-time multiplayer word games. Build words, battle friends live, and climb global leaderboards — no waiting for turns.

You know that feeling when you spot a word nobody else saw? That rush is what LexiClash is built on. Swipe letters, build words, outscore everyone — all happening live. Real opponents, real pressure, real satisfaction when you drop a 7-letter bomb while everyone else is stuck on CAT.

WHY IT'S DIFFERENT
Most word games are slow — play a word, put the phone down, wait for grandma to respond next Tuesday. LexiClash runs in real time. Everyone plays the same board, same clock, same panic. Think Jackbox meets Boggle.

5 LANGUAGES, REAL DICTIONARIES
Play in English, Hebrew, Swedish, Japanese, or Spanish — not just translated menus, but full word dictionaries for each language. Switch mid-session whenever you want.

GAME MODES
• Word Arena — live multiplayer word battles. Quick Start finds an opponent in seconds, or make a private room for people you know.
• Daily Challenge — same puzzle for everyone, every day. Compare your score against the whole player base.
• Adventure — 100+ levels across themed worlds with new rules each world: gravity, locked tiles, and other curveballs.
• Blast — fast tile-clearing combo chains. Chain words, trigger cascades, beat the board.
• Word Bridge — chain-building logic puzzles that connect words into a path.
• Brain Training — five cognitive drills (memory, pattern, combo, rare words, lightning round) to sharpen your game.
• WordCraft — claim territory by building words across the board, tile by tile.
• Practice — solo, no timer. Warm up or just pretend you're being productive.

YOUR PROGRESS
Global leaderboards with tier rankings (Bronze to Diamond). Track best words, longest streaks, highest scores. Compete for #1 or just beat your roommate.

THE DESIGN
Dark theme, bold colors, thick borders, zero gradients. Neo-brutalist — call it whatever you want, it doesn't look like every other word game.

NO PAYWALLS
Play the full game without spending. Optional cosmetics if you want to look fancy; the game works without them.

Download, find a word, talk trash to your friends.
```

(Note: "ACTUALLY FREE" → "NO PAYWALLS" to avoid the same price/promo flag in the full description.)

## 4. Localized listings — he / sv / ja / es (highest pure-ASO lever)

Create one localized store listing per language in Play Console → Store presence → custom/translated listings. Each ranks independently in that language's store (far less competition than English). Native copy (NOT literal translation) lives in `docs/store-listing-{hebrew,swedish,japanese}.md` (extend with Spanish). Per-locale short descriptions must also avoid price/promo words.

---

## Action plan by leverage (highest first)

1. ✅ **Dev name → FishGameStudio** — DONE live.
2. **Short description fix** — removes promotion block. Apply live.
3. **In-app review prompt** — wire `@capacitor-community/in-app-review`, trigger on positive moments (win / daily streak), capped + cooldown. Drives ratings = #1 ranking+conversion signal. (See code in this PR.)
4. **Full description rewrite** — apply live (same review pass as short desc).
5. **Localized listings** he/sv/ja/es — biggest untapped reach.
6. **Smart web→install** — add localized install CTAs; consider deferred-deep-link attribution.

## ⚠️ Listing changes saved but NOT sent for review (blocked on in-flight review)

The short + full description edits are **saved as draft** in Play Console. Attempting "Send 2 changes for review" surfaced: *"You've had a review in progress since 29 May. Sending this now will cancel and restart this review, which adds to your waiting time."* — i.e. the **Production 0.1.0 release review is already in flight**. Sending the listing edits now would restart that review clock (no data loss, release not cancelled — just delayed). Left the decision to the owner:
- **Option A (recommended):** wait for the current review to finish + publish, then send the listing edits (they ride the next review, no disruption).
- **Option B:** restart now to get the promotion-block fix live sooner, accepting added wait on the production review.

Managed publishing is ON → after approval, changes must be published manually.

## What needs Play Console (cannot be done from code)
- Apply short + full description (review ~hours–days).
- Create 4 localized listings.
- Developer name already changed.
- In-app review requires a native rebuild + new release to take effect.
