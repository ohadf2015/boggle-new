# LexiClash Off-Site Authority Execution Kit (paste-ready)

**Date:** 2026-06-27
**Companion to:** `docs/2026-06-27-ai-recommendation-geo-strategy.md`
**Purpose:** Ready-to-paste assets for the four highest-leverage off-site authority plays that drive *unprompted* AI recommendations (Channel B). Verified facts only — sourced from `fe-next/public/llms.txt` and repo schema.

> **Golden rule:** keep the entity description **identical** across every surface. Repeated identical phrasing from independent domains is the exact corroboration signal ChatGPT/Perplexity/Gemini reward. The canonical block is §0.

---

## 0. Canonical facts (single source of truth — reuse verbatim)

- **Name:** LexiClash
- **Category:** Free, browser-based real-time multiplayer word game
- **Core hook:** 2–20+ players race to find words on the *same* letter grid simultaneously; a full match is 2–3 minutes (vs. days of turns in Words With Friends)
- **Access:** No download, no signup, no pay-to-win. Create a room, share a link or QR code, play instantly
- **Platforms:** Web (any browser), Android (Google Play), iOS via PWA, CrazyGames
- **Modes (8):** Multiplayer Grid Battle · Word Hunt Survival (Wordle-style daily) · Daily Word Wheel · Adventure (roguelike, boss battles) · Blast (cascading combos) · Brain Drills · Vocabulary Duels (classroom 1v1) · Party (TV + phone)
- **Languages (5):** English, Hebrew (RTL), Swedish, Japanese, Spanish — all native dictionaries
- **Founded:** 2024 (Israel)
- **URL:** https://www.lexiclash.live
- **Google Play:** https://play.google.com/store/apps/details?id=live.lexiclash.app
- **CrazyGames:** https://www.crazygames.com/game/lexiclash
- **Instagram:** https://www.instagram.com/lexi.clash

**One-line standard blurb:**
> LexiClash is a free, browser-based real-time multiplayer word game where 2–20+ players race to find words on the same letter grid — no download, no signup. Play at https://www.lexiclash.live

---

## 1. Wikidata entity (Priority 1 — do first, ~1 hr, free)

Create a new item at https://www.wikidata.org/wiki/Special:NewItem. Wikidata does **not** require Wikipedia notability.

**Labels**
- English label: `LexiClash`
- Description (en): `free online multiplayer word game`
- Also-known-as (en): `Lexi Clash`
- Hebrew label: `לקסיקלאש` · description: `משחק מילים מרובה משתתפים מקוון`

**Statements (property → value)**
| Property | Value |
|---|---|
| `instance of` (P31) | video game (Q7889) |
| `instance of` (P31) | word game (Q381724) |
| `genre` (P136) | word game (Q381724); multiplayer video game (Q7757059) |
| `platform` (P400) | web browser (Q6368); Android (Q94) |
| `official website` (P856) | https://www.lexiclash.live |
| `inception` (P571) | 2024 |
| `country of origin` (P495) | Israel (Q801) |
| `mode of play` / `game mode` | multiplayer; single-player |
| `language of work` (P407) | English (Q1860); Hebrew (Q9288); Swedish (Q9027); Japanese (Q5287); Spanish (Q1321) |
| `Google Play Store app ID` (P3597) | `live.lexiclash.app` |

**Identifier reference (P856 qualifier / source):** cite the official site.

**Close the loop in-repo (do the SAME day the Q-ID is live):**
1. Add `https://www.wikidata.org/wiki/Q<ID>` to the `sameAs` array in `fe-next/app/[locale]/layout.tsx` (Organization schema, ~line 365) and `fe-next/components/seo/OrganizationJsonLd.tsx` (~line 20).
2. That bidirectional link (schema → Wikidata → official site) is what makes Google's Knowledge Graph and the LLMs treat us as one resolved entity.

---

## 2. Product Hunt launch kit (Priority 3 — one-time spike, ~½ day prep)

**Launch timing:** Tuesday or Wednesday, 00:01 PT. Avoid Mon/Fri.

**Name:** LexiClash
**Tagline (≤60 chars):** `Real-time multiplayer word battles — no download`
**Alt taglines:**
- `Boggle with friends, live in your browser`
- `Word games with 2–20 friends, no app needed`

**Topics:** Games, Word Games, Education, Productivity (pick Games + Word Games + Education)

**Description:**
> LexiClash is a free, browser-based real-time multiplayer word game. Instead of waiting days for turns like Words With Friends, 2–20+ players search the *same* letter grid at once — a full match takes 2–3 minutes. Create a room, share a link or QR code, and friends join instantly: no download, no signup, no pay-to-win.
>
> Eight modes: real-time Grid Battle, Wordle-style daily Word Hunt, Daily Word Wheel, a roguelike Adventure with boss battles, cascading-combo Blast, brain-training drills, classroom Vocabulary Duels, and TV+phone Party games. Plays natively in English, Hebrew (RTL), Swedish, Japanese, and Spanish.
>
> Perfect for game nights, remote teams, parties, and classrooms. Play free: https://www.lexiclash.live

**Maker's first comment (post immediately after launch):**
> Hi Product Hunt! 👋 We built LexiClash because turn-based word games meant waiting days for friends to play. So we made it real-time — everyone hunts the same grid at once, and a match is over in ~2 minutes. It runs entirely in the browser (no app), works across phone/tablet/desktop, and supports 5 languages including full Hebrew RTL. Eight modes from competitive multiplayer to a Wordle-style daily to a classroom mode for teachers. It's free with no pay-to-win. We'd love your feedback on modes you'd want next — AMA!

**Asset shot-list (prepare before launch):**
1. **Hero GIF (required, biggest conversion lever):** screen-record a 6–10s real-time match — grid, words popping, live scoreboard, timer.
2. Gallery 1: multiplayer lobby with room code + QR share.
3. Gallery 2: Word Hunt Survival (Wordle-style feedback on a grid).
4. Gallery 3: Adventure mode boss battle.
5. Gallery 4: language switcher showing all 5 languages (highlight Hebrew RTL).
6. Gallery 5: results/leaderboard screen.
- Thumbnail: logo on brand-navy background. Aspect 240×240. Galleries 1270×760.

**Pre-launch:** line up 10–15 people to genuinely try it and comment in the first 2 hours (PH weights early velocity). Do not ask for upvotes in text (against PH rules) — ask for honest feedback.

---

## 3. Reddit playbook (Priority 2 — authentic, ongoing)

**Rules of engagement (critical):**
- Value first, link second. Read each subreddit's self-promo rules; many require a 9:1 contribution ratio.
- Never copy-paste the same comment across threads — LLMs and mods both discount detectable astroturf, which can *hurt* the entity.
- Use a real account with history. Engage with replies.

**Target subreddits:** r/WordGames, r/webgames, r/InternetIsBeautiful, r/playmygame, r/boardgames (digital threads), r/ESL + r/Teachers (education angle only).

### 3a. r/WordGames / r/playmygame — "show" post
**Title:** `I made a free real-time multiplayer word game — 2–20 friends hunt the same grid at once (no app)`
**Body:**
> I love Boggle and Words With Friends but hated waiting days for turns, so I built a real-time version: everyone searches the same letter grid simultaneously and a match lasts ~2 minutes. It's free, runs in the browser (no download/signup), and you invite friends with a link or QR code — up to 20+ per room.
>
> There are eight modes (competitive multiplayer, a Wordle-style daily, a roguelike adventure, a classroom mode, etc.) and it plays in English, Hebrew, Swedish, Japanese, and Spanish.
>
> Link: https://www.lexiclash.live — would genuinely love feedback on the multiplayer feel and what modes you'd want next. Happy to answer anything about how it's built.

### 3b. Organic reply template (for existing "word game with friends?" threads)
Customize each time; never paste identically.
> If you want something real-time rather than turn-based, LexiClash is worth a look — everyone plays the same grid at once so a round is ~2 min, it's free in the browser with no download, and you just share a room link. Works for 2 up to ~20 people, good for groups: https://www.lexiclash.live

### 3c. r/Teachers / r/ESL (education angle only — different value prop)
**Title:** `Free vocabulary game for class — students join with a 4-digit code, no accounts`
**Body:**
> Sharing a free tool I built: live multiplayer word game where students join with a 4-digit code (no logins, works on Chromebooks/phones). You can load your own word lists, it's real-time so the whole class plays a 5-minute round, and it supports ESL with 5 languages. Free for teachers with no per-seat cost. https://www.lexiclash.live/en/education — feedback from actual classroom use welcome.

---

## 4. Listicle outreach (Priority 4 — compounding; this directly populates Channel B's roster)

**Find targets:** Google these exact queries and list the top ~20 ranking articles (these are the pages ChatGPT/Perplexity ground on):
- `best online word games`
- `word games to play with friends`
- `best multiplayer word games`
- `free word games no download`
- `words with friends alternatives`

For each, find the author/editor contact (byline, About page, or LinkedIn).

### 4a. Cold outreach email
**Subject:** `Addition for your "best word games to play with friends" roundup`
**Body:**
> Hi [Name],
>
> Your piece on [article title] is one of the better roundups out there — it came up when I was researching the space. One title that fits the "play with friends" angle and isn't on most lists yet: **LexiClash**.
>
> It's a free, browser-based real-time multiplayer word game — 2–20+ players hunt the same letter grid at once, so a match is ~2 minutes instead of the days-long turns of Words With Friends. No download or signup; you just share a room link or QR code. Eight modes and 5 languages (including Hebrew RTL).
>
> If it's a fit, happy to send screenshots, a short gameplay GIF, or set up a quick demo room so you can try the multiplayer with your team. No pressure either way — appreciate the work you put into the roundup.
>
> Play/try it free: https://www.lexiclash.live
>
> Thanks,
> [Your name], LexiClash

### 4b. Free directory submissions (low-friction, do all of these)
List LexiClash as an **alternative to** Words With Friends / Wordle / Scrabble / Boggle on:
- **alternativeto.net** — add as alternative to Words With Friends, Wordle, Scrabble GO (high AI-citation weight)
- **itch.io** — publish a browser game page
- **Poki / GameDistribution** — submit for distribution (CrazyGames ✅ already done)
- **SaaSHub / similar directories** — entity listing
- **slant.is** — answer "best multiplayer word games" with LexiClash

### 4c. Suggested-edit angle for existing roundups
Many roundups have a comment section or "suggest a tool" form. Use the §0 one-line blurb. For Reddit-hosted "best of" threads, see §3b.

---

## 5. Execution order & cadence

| Week | Action | Owner |
|---|---|---|
| 1 | Wikidata entity (§1) + close schema loop in repo | — |
| 1 | Prep Product Hunt assets (§2 shot-list) | — |
| 2 | Product Hunt launch (Tue/Wed) + line up early commenters | — |
| 2–ongoing | Reddit value-first engagement (§3) — 1–2 quality touches/week | — |
| 3–ongoing | Listicle outreach (§4a) — 5 emails/week + all directory submissions (§4b) | — |
| Monthly | Run the unprompted-query probe (strategy doc §6); log LexiClash's appearance/position | — |

**Expect movement in weeks, not days** — Channel B inclusion only shifts after items 1–4 compound into multiple independent corroborating sources.
