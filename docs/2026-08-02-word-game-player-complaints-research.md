# Word-Game Player Complaints — Primary-Source Research & LexiClash Gap Map

**Date:** 2026-08-02
**Method:** Primary player prose, not journalism. 419 low-star (≤3★) US App Store reviews across Boggle With Friends, Wordscapes, NYT Games; 1,000+ RU App Store reviews across Балда, Эрудит, Словли, Филворды, Слово за слово. Corroborated against our own Sentry (30d) and prior telemetry memos.

**Sources that failed and why (don't retry):** WebSearch returns 2022 tech journalism *about* complaints, not complaint text. Reddit is 403 to both `urllib` and WebFetch. Apple's `itunes.apple.com/{cc}/rss/customerreviews/...json` is the working channel — server-rendered JSON, supports country codes, ~50 reviews/page × 10 pages/app.

---

## 1. What players actually complain about (EN, n=419 low-star)

| Theme | Hits | % | Representative quote |
|---|---:|---:|---|
| **Ads interrupting play** | 132 | 31% | *"They've even gone as far to insert ads INSIDE the rounds."* — Boggle 1★ |
| **Bugs / infinite loading** | 107 | 25% | *"it says 'loading…' for so long that I just give up and close out."* — Boggle 2★ |
| **Monetization resentment** | 68 | 16% | *"you can pay for no ads FOR THIRTY DAYS ONLY"* — Boggle 1★ |
| **UI churn / forced flows** | 48 | 11% | *"it is now choosing/starting games for me rather than just suggesting"* — Boggle 3★ |
| **No difficulty/solo choice** | 35 | 8% | *"Wish there was an option for solo play to practice."* — Boggle 2★ |
| **Bots posing as humans** | 16 | 4% | *"The AI/Bots continue to challenge me daily… I only want to play other humans."* — Boggle 1★ |
| **Motion/flash accessibility** | 6 | 1% | *"I get severe migraines from any flashing/strobing lights"* — Wordscapes 1★ (×4 distinct reviewers) |
| **Valid word rejected** | 3 | <1% | *"many real words are not accepted"* — Wordscapes 2★ |

> The `valid word rejected` count is **misleadingly low in EN** because English apps mostly ship large dictionaries. It is the *dominant* complaint in RU (§2) and in NYT Spelling Bee discourse. Treat the EN number as a floor, not a verdict.

## 2. Russian market — the same complaints, harder (n≈1,000)

Top RU word-game apps by rating count: Words of Wonders (686k), Разбить Слова (109k), **Филворды (79k + 49k)**, Слово за слово (61k), CodyCross (43k), Словли/5 букв (12k).

**Critical signal — the classic Russian games are badly served:**

| App | Rating | Ratings |
|---|---:|---:|
| Балда — игра в слова онлайн | **3.05★** | 639 |
| Эрудит Lite | **2.76★** | 843 |
| Эрудит с друзьями | 4.46★ | 8,002 |

Every other genre leader sits at 4.6–4.9★. Балда and Эрудит are the two highest-intent Russian word-game search terms and both incumbents are rated *below 3.1*. That is an open door.

| Theme (RU) | Hits | Representative quote |
|---|---:|---|
| Реклама | 340 | *"реклама не дает играть… баннер внизу перекрывает игровое поле"* |
| Боты/читеры | 205 | *"в одиночном режиме противник использует какие-то совсем не существующие слова"* |
| **Слова нет в словаре** | **107** | *"обычные слова порой отсутствуют в словаре… добавить слово можно только, если в нем не меньше 6 букв"* |
| Баги/зависания | 95 | *"игра постоянно зависает и приходится выходить с поражением"* |
| Донат | 87 | *"оформила платную подписку, она всё равно вылазит"* |
| Интерфейс | 63 | *"уменьшили размер игрового поля вдвое, стало тесно и мелко"* |
| Нет соперников / долгая регистрация | 25 | *"100 лет нужно потратить чтобы создать аккаунт, 200 лет, чтобы попытаться найти друг друга"* |
| Мало слов / плохой словарь | 10 | *"обыгрываются слова с ошибками… «блатные» слова"* |

**The signature RU rage is an asymmetry, not a dictionary size problem:**
> *"В одиночном режиме противник использует какие-то совсем не существующие слова. При этом обычные слова порой отсутствуют в словаре."*
> (The AI plays words that don't exist, while my ordinary words get rejected.)

Players tolerate a small dictionary. They do **not** tolerate a dictionary that is stricter for them than for the bot, with no way to argue.

---

## 3. Gap map — do we already handle it?

| Complaint | LexiClash today | Verdict |
|---|---|---|
| Ads inside rounds | Interstitials fire on **results** only (`SinglePlayerResults`→`useInterstitialAd`). Gameplay routes are banner-blocked by `GAME_ROUTES` in `lib/admob-routes.ts`. **Caveat:** `/multiplayer` is deliberately *excluded* from that list (lobby and live game share one path), so the anchored native banner can be on screen during an MP round — pinned below the board with clearance, never over it | ⚠️ Differentiator, but the honest claim is "**no ads interrupt the round**", not "no ads at all". RU landing copy says exactly that |
| Infinite loading | Sentry 30d top issue = 10 users (LogRocket replay metadata). No loading-death cluster | ✅ Not our problem |
| No solo practice | Every mode has solo + bots of varied difficulty | ✅ Have it |
| Motion/flash migraines | `prefers-reduced-motion` honored across **494 files**, `AccessibilityContext` exists | ✅ Have it — **market it** |
| Registration friction | Guest play, no signup wall; `getOrCreateStoredUsername` prefill (2026-08-01) | ✅ Have it |
| Bot cheating perception | **Verified:** `botBehavior.prepareBotWords` calls `ensureLanguageLoaded(language)` then `findWordsForBots(grid, language)` — same dictionary as the player. Bots are additionally *handicapped*: `generateWrongWords` seeds deliberate misses into their word pool | ✅ Fair, but **never stated to the player** — now stated on the RU landing page |
| **Valid word rejected — appeal path** | `POST /api/appeal-word` + appeal button exist — **multiplayer results only** | ❌ **GAP** |
| **Seeing which words were rejected** | Daily/solo results hardcode `invalidWordCount: 0` (`WordHuntResultsContent.tsx:534`) | ❌ **GAP** |
| RU dictionary depth | 1.4M words (`backend/russian_words.txt`, 31MB) | ✅ Deep |
| RU Word-Hunt target list | `common_hunt_words_ru.txt` = **177 lines** vs EN `common_hunt_words.txt` = 7,360 | ⚠️ 40× thinner |
| `russian_words_approved.txt` | **0 bytes** | ⚠️ Empty |
| RU translations | ru = 11,942 keys vs en = 11,911 — full parity | ✅ Complete |
| RU landing pages | `/ru/balda-onlayn`, `/erudit-onlayn`, `/igry-v-slova-onlayn`, `/sostav-slova-iz-bukv`, `/slovo-dnya` — all in sitemap, RU-only `robots.index`, hreflang correct | ✅ Shipped |
| **RU: филворды page** | Missing — yet филворды (79k+49k ratings) is *literally our core mechanic* | ❌ **GAP** |

### The headline finding

**Our dictionary-appeal loop is asymmetric.** Multiplayer players can see their rejected words and appeal them into `invalid_word_submissions` → verify → promote → heal. Daily and solo players — the majority of sessions — cannot see rejected words at all, let alone appeal them. This is Recurring-Pitfall **Class 3 (asymmetric paths)** and it sits directly on top of the genre's single most enraging complaint.

### Constraints that kill otherwise-attractive ideas

- **Population.** 62 active users/14d; daily boards hold 2–8 players. Weekly tournaments, ranked ladders, and global percentile framing are unshippable — prior work replaced percentiles with a named closable gap (`ChaseBanner`). Screen every social proposal against N=2–8.
- **6 locales incl. Hebrew RTL.** Any mechanic resting on English letter-play fails 5 of 6 locales.
- **Do not add ads.** Our ad-lightness is the top-cited pain in every competitor. It is an asset.

---

## 4. Prioritized recommendations

| # | Change | Complaint closed | Effort | Status |
|---|---|---|---:|---|
| 1 | Surface rejected words + appeal button in **daily/solo** results (parity with MP) | RU #3 (107), EN valid-word-rejected | S | **implemented 2026-08-02** |
| 2 | RU **филворды** landing page — the one RU query that matches our real mechanic | RU acquisition | S | **implemented 2026-08-02** |
| 3 | State bot fairness explicitly ("боты играют по тому же словарю") | RU #2 (205 hits), EN bots (16) | S | copy — folded into #2 |
| 4 | Grow `common_hunt_words_ru.txt` (177 → ~2k) via existing `dictionary-improvement` skill | RU dictionary thinness | M | backlog |
| 5 | Lead RU/EN store + landing copy with "реклама не прерывает раунд" / "no ads interrupt the round" | EN #1 (31%), RU #1 (340) | S | backlog |
| 6 | `/api/appeal-word` hard-rejects words under 3 chars, but Japanese words start at 2 (`SuggestWordCard.getValidLength`) — ja players can never appeal a valid 2-char word. `RejectedWordAppeal` correctly hides a button that would 400, so behaviour is right; the API floor is the bug | ja dictionary appeals | S | backlog |

Rejected on evidence: tournaments/ladders (population), any ad-supported "skip" mechanic (it *is* the complaint), difficulty selector (we already have bot tiers).

---

## 5. Reproducing the data

```bash
# EN
curl -s "https://itunes.apple.com/us/rss/customerreviews/page=1/id=1197041040/sortby=mostrecent/json"
# RU
curl -s "https://itunes.apple.com/ru/rss/customerreviews/page=1/id=1207194160/sortby=mostrecent/json"
# Discover RU apps
curl -s "https://itunes.apple.com/search?term=%D0%B1%D0%B0%D0%BB%D0%B4%D0%B0&country=ru&entity=software&limit=8"
```
