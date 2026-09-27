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

## 4b. Localized listing copy (native, not literal; short desc obeys no-price/no-rank rule)

### Hebrew (he-IL) — RTL
- **Name:** `LexiClash: משחק מילים` (≤30)
- **Short (≤80):** `משחק מילים רב-משתתפים בזמן אמת — בנו מילים, התחרו בחברים ונצחו את השעון.`
- **Full:**
```
משחק מילים רב-משתתפים בזמן אמת. בנו מילים, התחרו בחברים ותטפסו בלוחות התוצאות — בלי לחכות לתור.

החליקו על האותיות, בנו מילים והשיגו ניקוד גבוה מכולם — הכול קורה בשידור חי, מול יריבים אמיתיים.

5 שפות, מילונים אמיתיים
שחקו באנגלית, עברית, שוודית, יפנית או ספרדית — לא רק תפריט מתורגם, אלא מילון מלא לכל שפה.

מצבי משחק
• זירת מילים — קרבות מילים חיים מול שחקנים אמיתיים או בוטים.
• אתגר יומי — אותו פאזל לכולם, כל יום.
• הרפתקה — 100+ שלבים בעולמות עם חוקים משתנים.
• Blast — שרשראות קומבו לניקוי משבצות.
• גשר מילים — חידות היגיון של חיבור מילים.
• אימון מוח — חמישה תרגילים קוגניטיביים.
• WordCraft — כיבוש טריטוריה דרך בניית מילים.
• תרגול — מצב יחיד, בלי לחץ זמן.

עיצוב נֵאוֹ-ברוטליסטי: רקע כהה, צבעים עזים, מסגרות עבות. בלי חומות תשלום — כל המשחק פתוח.
```

### Swedish (sv-SE)
- **Name:** `LexiClash: Ordspel`
- **Short (≤80):** `Ordspel för flera spelare i realtid – bygg ord, utmana vänner, slå klockan.`
- **Full:**
```
Ordspel för flera spelare i realtid. Bygg ord, utmana vänner och klättra på topplistorna – utan att vänta på din tur.

Svep över bokstäverna, bygg ord och pressa alla andra – allt händer live, mot riktiga motståndare.

5 SPRÅK, RIKTIGA ORDLISTOR
Spela på engelska, hebreiska, svenska, japanska eller spanska – inte bara översatta menyer, utan en komplett ordlista för varje språk.

SPELLÄGEN
• Ordarena – live ordstrider mot riktiga spelare eller bottar.
• Daglig utmaning – samma pussel för alla, varje dag.
• Äventyr – 100+ nivåer med nya regler i varje värld.
• Blast – snabba kombokedjor som rensar brickor.
• Ordbro – logikpussel där du länkar ord.
• Hjärnträning – fem kognitiva övningar.
• WordCraft – erövra territorium genom att bygga ord.
• Träning – ensam, utan tidspress.

Neo-brutalistisk design: mörkt tema, djärva färger, tjocka kanter. Inga betalväggar – hela spelet är öppet.
```

### Japanese (ja-JP)
- **Name:** `LexiClash: 単語ゲーム`
- **Short (≤80):** `リアルタイム対戦の単語ゲーム。文字をなぞって単語を作り、友達と勝負しよう。`
- **Full:**
```
リアルタイム対戦の単語ゲーム。文字をつないで単語を作り、友達と競い合おう——順番待ちはなし。

文字をなぞって単語を作り、ライバルより高いスコアを狙う。すべてがライブで進行します。

5言語、本格辞書搭載
英語・ヘブライ語・スウェーデン語・日本語・スペイン語でプレイ。メニューだけでなく、各言語に本物の辞書を搭載。

ゲームモード
• ワードアリーナ — リアルタイムの対戦バトル。
• デイリーチャレンジ — 毎日、全員同じパズル。
• アドベンチャー — ルールが変わる100以上のステージ。
• Blast — タイルを消すコンボチェイン。
• ワードブリッジ — 単語をつなぐ論理パズル。
• 脳トレ — 5種類の認知トレーニング。
• WordCraft — 単語で陣地を広げる。
• 練習 — 時間制限なしのソロモード。

ネオブルータリズムのデザイン。ダークテーマ、大胆な色、太い枠線。課金の壁なし——全モードが無料で遊べます。
```

### Spanish (es-ES / es-419)
- **Name:** `LexiClash: Juego de palabras`
- **Short (≤80):** `Juego de palabras multijugador en tiempo real: forma palabras y reta a amigos.`
- **Full:**
```
Juego de palabras multijugador en tiempo real. Forma palabras, reta a tus amigos y escala en las clasificaciones, sin esperar turnos.

Desliza las letras, forma palabras y supera a todos: todo sucede en vivo, contra rivales reales.

5 IDIOMAS, DICCIONARIOS REALES
Juega en inglés, hebreo, sueco, japonés o español: no solo menús traducidos, sino un diccionario completo para cada idioma.

MODOS DE JUEGO
• Arena de palabras — batallas en vivo contra jugadores reales o bots.
• Reto diario — el mismo puzle para todos, cada día.
• Aventura — más de 100 niveles con reglas nuevas en cada mundo.
• Blast — cadenas de combos para limpiar fichas.
• Puente de palabras — puzles de lógica que enlazan palabras.
• Entrenamiento mental — cinco ejercicios cognitivos.
• WordCraft — conquista territorio formando palabras.
• Práctica — modo en solitario, sin presión de tiempo.

Diseño neo-brutalista: tema oscuro, colores intensos, bordes gruesos. Sin muros de pago: el juego completo está abierto.
```

> Per-locale short descriptions intentionally avoid price words ("gratis/free") and rank words ("mejor/#1/topp"). Hebrew short uses "נצחו את השעון" (beat the clock), not leaderboard, to stay clear of the ranking rule.

## Action plan by leverage (highest first)

1. ✅ **Dev name → FishGameStudio** — DONE live.
2. **Short description fix** — removes promotion block. Apply live.
3. **In-app review prompt** — wire `@capacitor-community/in-app-review`, trigger on positive moments (win / daily streak), capped + cooldown. Drives ratings = #1 ranking+conversion signal. (See code in this PR.)
4. **Full description rewrite** — apply live (same review pass as short desc).
5. **Localized listings** he/sv/ja/es — biggest untapped reach.
6. **Smart web→install** — add localized install CTAs; consider deferred-deep-link attribution.

## ✅ SENT FOR REVIEW (2026-05-30)

All listing changes — en-GB short+full description + **5 localized listings** (he-IL/iw-IL, ja-JP, sv-SE, es-419, es-ES) — were sent for review as **11 changes**. This required confirming a "Restart review?" prompt (a review had been in progress since 29 May; restarting added to its wait time — owner authorized). Status: **"Changes in review"**, quick checks running.

**Managed publishing is ON** → after Google approves, the owner must **manually publish** from Publishing overview. The Production 0.1.0 release rollout was left untouched (separate "Start full rollout").

### Localized listings filled (saved + in review)
| Locale | App name | Short desc (chars) |
|---|---|---|
| Hebrew (iw-IL) | LexiClash: משחק מילים | 72 |
| Japanese (ja-JP) | LexiClash: 単語ゲーム | 37 |
| Swedish (sv-SE) | LexiClash: Ordspel | 75 |
| Spanish LatAm (es-419) | LexiClash: Juego de palabras | 78 |
| Spanish Spain (es-ES) | LexiClash: Juego de palabras | 78 |

Graphics (icon, feature graphic, 7/8 phone screenshots) **inherit from the en-GB default** — no per-locale image upload needed. GOTCHA: a newly-added locale shows a stale "Required fields / error" banner even when all text is filled + graphics inherited; it **clears on Save** (no real missing field).

## What needs Play Console (cannot be done from code)
- Apply short + full description (review ~hours–days).
- Create 4 localized listings.
- Developer name already changed.
- In-app review requires a native rebuild + new release to take effect.
