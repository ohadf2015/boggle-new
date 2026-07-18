# Game Portals + Web Ad Providers — Application Status (2026-07-18)

Goal: apply to Poki + CrazyGames + more web/game ad providers; monetize the web app more.

## TL;DR — the real bottleneck is TRAFFIC, not ad-provider count
Live web traffic is ~27 active users (~₪3.31/mo AdMob). Adding more ad networks on 27 users
yields pennies. **Distribution channels (Poki/CrazyGames) matter far more than another ad SDK.**
The single highest-leverage fix is the CrazyGames thumbnail (see below), which only pays off on relaunch.

Contact used on all forms: **Ohad Fisher / ohadf2015@gmail.com / phone as provided**.

---

## 1. Poki — ✅ APPLIED (developer early-access request submitted)
- URL: https://developers.poki.com/share
- Result: **"Thank you 🤟 We received your request!"**
- This is Poki's *studio vetting* step, not a per-game upload. On approval, the game gets submitted + reviewed.
- Values submitted: name `Ohad Fisher`, email `ohadf2015@gmail.com`, studio `LexiClash`, country `Israel`,
  studio type `Indie Studio`, platform `Web`, goal `Releasing existing titles`,
  genres `Word, Puzzle, Party, Multiplayer`, engines `Next.js/React/TS/PixiJS/Socket.IO`,
  links `https://www.lexiclash.live/en (+ Google Play / iOS)`.
- **Reality check / blocker for acceptance:** Poki *blocks all external requests by default* and forbids
  other ads + purchase UI. Our game requires Supabase + Socket.IO + AdMob + LemonSqueezy — it will NOT run
  in Poki's sandboxed player as-is. Acceptance requires a **standalone offline single-mode build**
  (e.g. solo Quick Play, bundled dict/fonts, no login, Poki SDK). SDK code partially exists
  (`lib/ads/pokiAds.ts`, `hooks/usePokiAds.ts`) but the offline build is a from-scratch project. Deferred (do NOT build speculatively).

## 2. CrazyGames — ⚠️ ALREADY SUBMITTED & REJECTED; relaunch needs product work (NOT a form-fill)
- Dev account exists (Welcome, Ohad). Game: https://developer.crazygames.com/games/8d90afa4-cbe7-4b0c-9ef2-206b62f8ea39
- Submitted 22.04.2026 (Basic Launch, Word), trial ended 11.05.2026 → **REJECTED**.
- Team feedback: *"The game did not reach the performance benchmarks during Basic Launch."*
- Stats: 209 plays, 190 players, **157K impressions, 0.2% CTR**, all **BOTTOM 20%**.
- A Draft build (08/05/2026, `675a399f-...`) exists with a "Submit update" button, BUT it is gated:
  *"You didn't pass QA... content team reviews only after you pass the QA tool and submit."*
- **Do NOT blind-resubmit** — same unimproved build → same performance rejection, wasting the attempt.
- **The two real levers (product work, scoped follow-up):**
  1. **Thumbnail** — submission used `/public/icon-512.png` (plain app icon). 0.2% CTR is a thumbnail problem.
     Commission real game-art cover art (kawaii mascot + letter grid + neo-brutalist style). Upload on the game's **Art** tab.
     Reusable across Poki, app stores, and social. Only helps CrazyGames on relaunch.
  2. **First-session retention** — the CG landing must be instantly fun: no login wall, fast load, jump straight
     into solo Quick Play. Bottom-20% retention/playtime killed the launch.
  - Then: pass QA tool (Preview → validate) → Submit update → content-team re-review.

## 3. ayeT-Studios — ✅ SUBMITTED ("Message Sent!")
- URL: https://www.ayetstudios.com/contact  → **"Monetize"** tab
- Result: **"Message Sent! Thank you for reaching out. We've received your message and will get back to you as soon as possible."**
- Values submitted: Your Name `Ohad Fisher`, Company `LexiClash`, Email `ohadf2015@gmail.com`,
  Message = publisher onboarding request (HTML5 Rewarded Video/GemTastic + Offerwall/Gametastic already integrated,
  need publisher account + web placement IDs; phone incl.).
- **Follow-up questionnaire ✅ submitted** (7-page "ayeT Publisher Onboarding Questionnaire", forms.gle/1SuZSuYSDVmNT9i87):
  *"Thank you for submitting your information! ... our team will review them shortly."*
  Integration types selected: **Web Offerwall (iframe)** + **Rewarded Video (web only)** (matches our wired code).
  ⚠️ ESTIMATED fields (verify/correct with ayeT if asked): year founded `2024`, company size `1`,
  HQ `Tel Aviv, Israel`, LinkedIn `N/A`, MAU `~500`, DAU `~30`, UA spend `~$0`. All honest early-stage guesses — not inflated.
- **Next:** await ayeT reply to ohadf2015@gmail.com with publisher account + placement IDs.
- On reply / placement IDs, flip env vars:
  `NEXT_PUBLIC_AYET_ADS_ENABLED`, `NEXT_PUBLIC_AYET_PLACEMENT_ID`,
  `NEXT_PUBLIC_AYET_OFFERWALL_ENABLED`, `NEXT_PUBLIC_AYET_OFFERWALL_ADSLOT`, `AYET_POSTBACK_SECRET` (server).
- Code already wired: `lib/ads/ayetVideoAds.ts`, `lib/ads/ayetOfferwall.ts`, S2S `/api/offerwall/ayet`.

## 4. GameDistribution — ✅ REGISTERED ("Check your email for further instructions")
- URL: https://gamedistribution.com/ → Login/Register → **Registration** → **"I am a Developer"** ONLY
  (publisher sign-ups PAUSED 15 Jul–1 Aug; developer path is open).
- Values submitted: First `Ohad`, Last `Fisher`, Email `ohadf2015@gmail.com`, Country `Israel`,
  Company `LexiClash`, Website `www.lexiclash.live` (NO `https://` — the field rejects the protocol → 422),
  both Terms accepted.
- Registration succeeded → **account ACTIVATED** (Azerion Connect email verified via Google-link, password set,
  Google login linked). Logged into https://developer.gamedistribution.com as Ohad Fisher.
- **Game registered:** "LexiClash" (dashboard id 74276) → **`GD_GAME_ID = ce3e476106d643b59b962c5a787d067d`** (from Upload tab).
- Azerion login: use **"Log in with Google"** (ohadf2015@gmail.com, already linked). A backstop password was set
  during activation — reset via "Forgot password" if needed (kept out of the repo).
- **DO NOT flip the env vars yet** — end-to-end testing (2026-07-18) proved GD won't serve until the game leaves Draft:
  1. **CSP blocked the SDK** — `lexiclash.live` `script-src` lacked `gamedistribution.com` → `main.min.js` failed (`SCRIPT_ERROR`).
     **FIXED** in `next.config.mjs` (added `html5.api.gamedistribution.com` + `*.gamedistribution.com` to `script-src`,
     `connect-src`, `frame-src` in both CSP branches). Config verified to parse. This is a prerequisite for ANY own-domain ad SDK.
  2. With CSP allowed, the SDK loads + inits with our game ID — but GD returns
     `blocked.html?...&unregistered=true` because the game is **Draft** (Status: Draft, SDK: No). GD domain-locks
     and serves nothing until the game is **uploaded + SDK-implemented + published** (~2-week review) — the same
     self-contained-HTML5-ZIP constraint as Poki. Our Supabase/Socket.IO app isn't a ZIP.
  - **Conclusion:** flipping `NEXT_PUBLIC_GD_ADS_ENABLED=true` now would ship a broken "watch ad" button (SDK →
    blocked.html → reject → no reward). Keep GD env OFF until a standalone build is uploaded and published.
- **`GD_GAME_ID = ce3e476106d643b59b962c5a787d067d`** is correct and reserved; env-flip cheat sheet still applies
  once the game is publishable.
- Code already wired: `lib/ads/gameDistributionAds.ts` (own-domain payout via referrer).

## 5. Others — deferred (justified)
- **AdSense (H5 Games Ads)** — pub `ca-pub-1896836706464880`, rejected ×2 ("low value content": 71% of sitemap is
  thin archive/anagram/WOTD pages). Needs thin-page cull + recrawl before reapply. Env: `NEXT_PUBLIC_H5_GAMES_ENABLED`, `NEXT_PUBLIC_ADSENSE_*`.
- **Mediavine/Journey** — needs ~50k sessions/mo. We have ~27 DAU → do not qualify. Revisit after traffic grows.
- **Torox** — backup offerwall only; skip until ayeT is live.

## Env-flip cheat sheet (once IDs arrive)
| Provider | Env vars | Where |
|---|---|---|
| ayeT rewarded | `NEXT_PUBLIC_AYET_ADS_ENABLED`, `NEXT_PUBLIC_AYET_PLACEMENT_ID` | Vercel + Railway |
| ayeT offerwall | `NEXT_PUBLIC_AYET_OFFERWALL_ENABLED`, `NEXT_PUBLIC_AYET_OFFERWALL_ADSLOT`, `AYET_POSTBACK_SECRET` | Vercel + Railway |
| GameDistribution | `NEXT_PUBLIC_GD_ADS_ENABLED`, `NEXT_PUBLIC_GD_GAME_ID` | Vercel |
| H5/AdSense (after reapproval) | `NEXT_PUBLIC_H5_GAMES_ENABLED`, `NEXT_PUBLIC_H5_GAMES_CLIENT`, `NEXT_PUBLIC_ADSENSE_*` | Vercel |
