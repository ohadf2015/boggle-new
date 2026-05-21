# Word Tower — Game Mode Spec

> **Version:** 0.1 (design) · **Date:** 2026-05-21 · **Status:** Draft for implementation
> **Mode id:** `word-tower` · **Display name:** Word Tower (working) · alt names: Skystack / Lexitower

---

## 0. One-line pitch + viral hook

**Stack words to build an endless tower into the sky, space, and the galaxy — each word must begin with the last letter of the one below it, built from a limited tray of letters. Race three rivals' towers in real time, and when you climb far enough ahead, drop a bomb on their tower.**

**Viral hook:** No other word game lets you *send an attack*. The share artifact is a silhouette of *your* tower with its height, top word, and the biome you reached ("I hit the Nebula at 612 m — beat my tower"). Social proof is built into the lobby: you see every rival's tower height before the match starts.

It sits at the intersection of four proven loops:
- **Shiritori** word-chain tension (dead-end letters create drama)
- **Tower Bloxx** altitude-as-difficulty + satisfying stacking
- **Tetris 99** scaling "garbage-send" attacks (comeback risk)
- **Doodle Jump / Jetpack Joyride** single-metric altitude race with rival ghosts

---

## 1. Design principles (LexiClash fit)

- Neo-brutalist: dark navy, hard pixel shadows, solid borders, electric mode color (Word Tower mode color = **electric cyan→purple altitude gradient**).
- Phone AND TV/party screen. Tower is vertical → ideal for portrait phones and tall TV overlays.
- Works across **5 languages** (Hebrew RTL, English, Swedish, Japanese, Spanish). No mechanic may assume a Latin alphabet.
- No pay-to-win. Monetization = cosmetic tower skins / word-pop effects, never letters or bombs.
- Every word makes a sound and a spark. Kill the "silent word game" feel.

---

## 2. Modes — resolve persistence vs fairness

The prompt asks for **both** "continue from your last tower" (endless persistence) **and** real-time competitive races. These contradict: if a versus match inherits a veteran's accumulated height, a new player can never catch up. Resolution — two distinct modes:

### 2.1 Solo Endless (`word-tower:solo`)
- **Persistent.** Your tower height carries across sessions. You resume building from where you stopped.
- This is the meta-progression / habit loop. Drives the Solo leaderboard and biome unlocks.
- Optional **Daily Climb**: a daily seeded tray bag (same letters for everyone that day) for a fair daily leaderboard — reuses the seed-per-day pattern already used by Daily challenges.

### 2.2 Versus 1v3 (`word-tower:versus`)
- **Every match starts at 0 m for everyone.** Fresh tray. Pure skill/luck on the day.
- 2–4 players. Time-boxed (default **180 s**) OR first-to-target-height; highest tower at time-up wins.
- **Lobby flyby** ("see all the towers being built and their height"): before/at start, the camera pans across each player's *all-time PB tower silhouette* as social proof, then everyone drops to ground (0 m) and the race begins. PB towers stay as faint background ghosts.
- Empty slots are filled by **ghost towers** — recorded replays of real prior runs (Doodle-Jump style) — so the field is never empty and there's always someone to chase.

> **Load-bearing decision:** persistence lives in Solo, fairness lives in Versus. Versus never inherits height. Write this assumption into every downstream component.

---

## 3. Core loop

```
draw tray ─▶ find a word that (a) starts with the chain letter
            and (b) is buildable from tray tiles
        ─▶ submit ─▶ valid? ─▶ +1 floor, +meters, combo++, juice
                              │                          │
                          invalid/stuck            5+ letters? ─▶ celebration + bonus + bomb charge
                              │
                       scramble tray (costs 1 scramble)  or  place wildcard floor (costs altitude, breaks combo)
```

### 3.1 Letter tray + scrambles
- Tray = **12 tiles**, drawn from a **language-weighted bag** (reuse `NINE_LETTER_SOURCES` in `backend/modules/wheelRushManager.ts` and the per-locale frequency configs in `fe-next/lib/blast/v2/locales/{en,he,sv,ja,es}.ts`). No uniform random.
- The **chain letter is always available**: the required starting letter is shown as a fixed "anchor tile" prepended to the tray, so the player is never hard-blocked on the first letter.
- Submitting a word **consumes** its tiles (each tile once); consumed tiles are replaced by fresh weighted draws. A word may reuse the anchor letter only if the tray also contains it.
- **Scrambles**: discard the whole tray and redraw 12. Start with **3**; earn **+1 every 25 m climbed** (≈ every 5 floors), capped at **5 banked** (prevents hoarding).
- This is the literal mechanic the user asked for: "limited letters … can scramble them multiple times … gains more scrambles by achieving distance from the ground."

### 3.2 Altitude + scoring
- Each valid word = **+1 floor**. Floor height in meters = `BASE_FLOOR_M (2.0) + lengthBonusM(wordLen) * comboMult`.
- `lengthBonusM`: 3→0, 4→0.5, 5→1.5, 6→3, 7→5, 8+→8 meters.
- **Combo** = consecutive valid chain words with no scramble and no wildcard. `comboMult = 1 + min(combo, 10) * 0.1` (cap 2.0×). Resets on scramble or wildcard or invalid submit.
- Score (for leaderboard) tracks **best height (m)** primarily; floors and longest combo are secondary stats.

### 3.3 Getting unstuck (no instant-death)
Shiritori's brutal "play a dead-end letter → you lose" does **not** fit a casual-friendly endless mode. Instead:
- If no buildable chain word exists, the player **scrambles** (if scrambles remain), or
- Plays a **wildcard floor**: places a neutral block that resets the chain letter to a fresh high-frequency vowel, **breaks the combo, and costs altitude** (−1 floor of progress, never below current ground). This keeps the tower alive and keeps the loop moving.
- Dead-end letters are surfaced *before* commitment (see §4) so the choice is strategic, not a gotcha.

### 3.4 Celebrations + game-changing dynamics (the "5-letter word = something" ask)
| Trigger | Reward | FX |
|---|---|---|
| 3–4 letter word | base floor | letter "pop" + spark |
| **5-letter word ("High Rise")** | +1.5 m, **+1 scramble**, +bomb charge tick | cyan confetti burst, screen glow |
| 6-letter word | +3 m, +2 bomb charge | bigger burst + chime |
| **7+ letter ("Skyscraper")** | +5–8 m, full bomb charge, **freeze the wobble for 2 s** | gold star shower, screen shake, fanfare |
| Combo milestone (every 5) | +meters, sound escalation tier-up | tower glow intensifies (Stack-Ball style) |
| Biome crossing (§6) | banner + share prompt | full-screen biome transition |
| New personal best height | crown + "NEW PB" stamp | rainbow burst |

Audio escalates with combo length (pitch/bass rise per tier) so silence never sets in.

---

## 4. Per-language chain rules (the part competitor research missed)

The chain rule is **"next word's first letter == previous word's last letter,"** but "letter" must be defined per language. **Chain comparison always uses the normalized boundary letter; display re-applies native form.** Reuse `fe-next/shared/utils/wordNormalization.ts`.

| Lang | Chain key derivation | Dead-end handling | Notes |
|---|---|---|---|
| **EN** | last char, lowercased | letters with few starting words (q, x) flagged | trivial |
| **SV** | last char, lowercased; å/ä/ö are first-class | flag q, c, z, å/ä/ö as low-start | keep diacritics distinct |
| **ES** | `normalizeSpanishWord` strips accents (á→a …); chain on resulting char | flag k, w, x | digraphs ch/ll/rr are stored as char sequences → chain on the single last/first Unicode char (accept the simplification) |
| **HE (RTL)** | `normalizeHebrewLetter` collapses sofit ך/ם/ן/ף/ץ → regular כ/מ/נ/פ/צ. Word ending ם chains to word starting מ. Display keeps sofit via `REGULAR_TO_SOFIT` at render only | dead-end set computed from suffix frequency (below) | already battle-tested in WheelRush; RTL tower grows the same, layout mirrors |
| **JA** | shiritori on last **kana of the reading**. Small kana (ょ/ゃ/ゅ) → base kana; long mark ー → preceding vowel; **ん is the classic dead-end** | ん placement = combo break + forced wildcard (not instant loss) | **OPEN:** confirm `backend/dictionary.ts` exposes per-entry *readings* for kanji compounds. If readings are unavailable, restrict JA Word Tower to the **kana-entry dictionary subset** for v1 and defer kanji compounds. See §13. |

**Dead-end letter sets** are precomputed offline per language: letter `L` is a dead-end if `count(words starting with L) < DEAD_END_THRESHOLD`. Stored as a constant per locale. The UI **glows the tray tiles / warns** when a candidate word would *end* on a dead-end letter, so the player decides knowingly.

---

## 5. Competitive layer — bombs (Versus only), with anti-snowball

Symmetric Tetris-99 garbage tuning lets whoever bombs first snowball to victory. Word Tower needs explicit asymmetry and gates.

### 5.1 Charging a bomb
Bomb charge accrues from long words and combos (strictly increasing ladder — fixed from the off-by-one in the research):

| Achievement | Bomb charge |
|---|---|
| 5-letter word | +1 tick |
| 6-letter word | +2 ticks |
| 7+ letter word | full bar |
| Combo of 8 | +1 bar |
| Combo of 12 | +2 bars |

A full bar = 1 bomb. Max **2 bombs banked**.

### 5.2 Sending a bomb (all gates must pass)
1. **Lead gate:** you must be **≥ 15 m ahead** of the target (≈ 6–8 floors, ≈ 30 s of lead at median pace). Bombs are a *pressing-your-advantage* tool, not a coin flip.
2. **Cost:** consumes 1 banked bomb **and** 1 scramble (you sacrifice flexibility to attack).
3. **Cooldown:** 20 s between sends from the same player.
4. **Damage:** removes the **top N floors** of the target deterministically. `N = clamp(floor(leadMeters / 15), 1, 5)` — bigger lead = bigger hit, capped at 5.
5. **Receiver cap:** a single player can lose at most **8 floors per 60 s** to bombs total (anti-grief, anti spawn-camp; mirrors Tetris-99's queue cap).

### 5.3 Anti-snowball (rubber band)
- Players **below the match median height** regenerate scrambles **2× faster** and get a **+0.2 combo-mult** bonus.
- A bombed player gets a **2 s "rebuild shield"** (immune to further bombs) and **+1 scramble** as comeback fuel.

### 5.4 Server arbitration
All bomb logic is **server-authoritative**: gate checks, caps, and floor removal happen on the server, then broadcast. Clients only *request* a send and *animate* the result.

---

## 6. Visual progression — altitude biomes

The background and particle field evolve with height (the user's "sky → space → stars → galaxies" ask). Pixi parallax starfield, particle density and palette scale with altitude.

| Biome | Altitude | Palette | FX |
|---|---|---|---|
| **City / Ground** | 0–50 m | lime + navy | dust, distant buildings, birds |
| **Sky / Clouds** | 50–150 m | electric cyan | drifting clouds, sun flare |
| **Stratosphere / Aurora** | 150–300 m | purple + cyan | aurora ribbons, thinning air shimmer |
| **Orbit / Space** | 300–500 m | deep navy + white stars | star parallax, slow satellite |
| **Nebula** | 500–800 m | pink + violet | nebula clouds, comet streaks |
| **Galaxy / Cosmic** | 800 m+ | electric rainbow cycling | spiral galaxies, palette cycles endlessly |

Transitions are full-screen moments with a banner + optional share prompt (§12). Reduced-motion mode swaps parallax/particles for static gradients (§11).

---

## 7. Tech architecture

### 7.1 Reuse map (verified existing files)
| Need | Reuse | Path |
|---|---|---|
| Socket handler pattern | WheelRush handler | `fe-next/backend/handlers/wheelRushHandler.ts` |
| Pure mode logic + seeded RNG (mulberry32) + letter sources | WheelRush manager | `fe-next/backend/modules/wheelRushManager.ts` |
| In-memory match/room state | Game state manager | `fe-next/backend/modules/gameStateManager.ts` |
| Word validation (5 langs, community fallback) | Dictionary singleton | `fe-next/backend/dictionary.ts` |
| Chain-letter normalization (sofit, accents) | Word normalization | `fe-next/shared/utils/wordNormalization.ts` |
| Letter frequency weighting | Blast locale configs | `fe-next/lib/blast/v2/locales/*.ts` |
| Throttled leaderboard broadcast + signature dedup | Score manager | `fe-next/backend/modules/scoreManager.ts` |
| Season-scoped leaderboard upsert | Supabase leaderboard | `fe-next/backend/modules/supabase/leaderboard.ts` |
| Particle/screen-shake/flash FX (raw Pixi, pool-based) | Game engine | `fe-next/lib/gameEngine/` (see `BlastFxOverlay.tsx` for mount pattern) |
| useReducer game-state hook pattern | Blast v2 hook | `fe-next/lib/blast/v2/useBlastV2.ts` |
| i18n | LanguageContext | `fe-next/contexts/LanguageContext.tsx`, `fe-next/translations/*.js` |

### 7.2 New files
**Backend**
- `backend/handlers/wordTowerHandler.ts` — socket events (register in `handlers/index.ts`).
- `backend/modules/wordTowerManager.ts` — pure logic: weighted tray bag (seeded per `gameCode`+`playerId` via mulberry32), chain validation, scoring, bomb arbitration. No DB writes.
- `shared/constants/wordTowerConstants.ts` — all tunables (tray size 12, scramble caps, bomb gates, length ladder, biome thresholds, dead-end thresholds).
- `shared/schemas/socketSchemas.ts` (extend) — Zod: `SubmitTowerWordSchema`, `ScrambleTraySchema`, `SendBombSchema`.
- `backend/modules/wordTower/deadEndLetters.ts` + a build script that precomputes per-language dead-end sets from the approved dictionaries.

**Client**
- `app/[locale]/word-tower/page.tsx` (Solo entry) + lobby integration for Versus (mirrors how WheelRush launches from the multiplayer lobby).
- `components/wordTower/WordTowerGame.tsx` — orchestrator (< 500 lines; split sub-components).
- `components/wordTower/WordTowerScene.tsx` — Pixi scene (tower render, biome bg, parallax) using `lib/gameEngine`. Follow the Next 16 strict-mode mount guard from `BlastFxOverlay.tsx` (dynamic `import('pixi.js')`, `live` ref gating RAF) — known canvas-race gotcha.
- `components/wordTower/WordTowerHud.tsx` — tray, anchor tile, scramble button, combo/altitude meter, rival rail (heights + bomb button).
- `lib/wordTower/useWordTower.ts` — client store (useReducer like `useBlastV2`); holds optimistic UI state, server reconciles.
- `lib/wordTower/celebrations.ts` — maps events → particle presets (reuse `lib/gameEngine/presets/particles.ts`).

### 7.3 Socket protocol (server-authoritative)
*Client → server:* `submitTowerWord {word}` · `scrambleTray {}` · `sendBomb {targetPlayerId}` · `placeWildcard {}`
*Server → client:* `towerWordResult {word, accepted, error?, floorAdded, meters, combo, bombCharge}` (point-to-point) · `trayUpdate {tiles, anchorLetter, scramblesLeft}` · `towerStateUpdate {leaderboard:[{id, heightM, floors}]}` (volatile, throttled ~300 ms, signature-deduped via `volatileBroadcastToRoom`) · `bombIncoming {fromId, floorsRemoved, heightAfter}` · `updateLeaderboard {leaderboard}`

Validation server-side every submit: (1) word starts with current chain letter (normalized), (2) buildable from tray tiles, (3) in dictionary for the match language, (4) not a duplicate floor letter-trap. Rate limited at the existing **50 msg / 10 s** per socket.

### 7.4 Physics decision — **no physics engine**
Deterministic stacking. Each word = one fixed-height floor appended to an array. **Wobble/sway is animation-only** (GSAP/Pixi), purely cosmetic. Bombs remove top-N floors deterministically. Synced state is just `{heightM, floors[], combo}`. **Do not pull in Matter.js/Box2D** — physics sync across 4 players over Socket.IO is a reconnect/desync nightmare and a bundle cost for zero gameplay gain.

### 7.5 Determinism
Tray bag seeded per `(gameCode, playerId)` with mulberry32 (same util WheelRush uses). Guarantees reproducible trays across reconnect and lets the server re-derive a player's expected tray for anti-cheat.

---

## 8. Data model (Supabase)

### 8.1 New: Solo Endless persistence
```sql
create table public.word_tower_progress (
  player_id uuid primary key references auth.users(id) on delete cascade,
  best_height_m numeric not null default 0,
  best_floors int not null default 0,
  current_height_m numeric not null default 0,   -- resume point for endless
  current_floors int not null default 0,
  total_floors_built bigint not null default 0,
  longest_combo int not null default 0,
  longest_word text,
  highest_biome text,
  updated_at timestamptz not null default now()
);
-- RLS: player can read all (leaderboard), write only own row via RPC.
```

### 8.2 Versus leaderboard
Reuse the existing season-scoped leaderboard machinery (`updateLeaderboardEntry`, `get_leaderboard` RPC, 10% soft-carry season reset). Add a **mode-scoped** Solo/Daily board either as a filtered view or a small dedicated `word_tower_leaderboard` table keyed by `season_id` — keep it separate so we don't perturb the shared `leaderboard` table that other modes depend on.

### 8.3 Realtime publication — explicitly DO NOT add these tables to `supabase_realtime`
Per `.claude/rules/50-supabase-perf.md`: this mode syncs via **Socket.IO**, not `postgres_changes`. No table here gets a Realtime publication entry (no consumer = WAL parser tax). Persistence writes happen on match/floor-milestone end via RPC, not live row streaming.

Apply all migrations via **Supabase MCP** (`apply_migration`), not raw SQL files alone, per project rule.

---

## 9. i18n

- New namespace `wordTower.*` (e.g. `wordTower.hud.scramble`, `wordTower.celebration.highRise`, `wordTower.bomb.incoming`, `wordTower.biome.nebula`, `wordTower.lobby.flyby`).
- Include **he-IL strings from day one** (imperfect Hebrew beats raw-key fallback; flag "needs native review" in the commit) — and sv, ja, es. RTL verified with `?locale=he`.
- Grep existing keys before adding (the `errors.*` namespace already covers generic errors; duplicate-key and string-vs-object collisions are known footguns).

---

## 10. Telemetry (PostHog)

Emit **canonically once** (the double-fire bug class is documented — guard with a fired-once ref). Events:
- `word_tower_match_start {mode, lang, players}`
- `word_tower_word_submitted {len, valid, chainOk, combo}`
- `word_tower_scramble_used {scramblesLeft, heightM}`
- `word_tower_dead_end_hit {lang, letter}` — **per-language dead-end frequency is the key balance signal**
- `word_tower_wildcard_used {heightM}`
- `word_tower_bomb_sent {leadM, floors}` / `word_tower_bomb_received {floors}`
- `word_tower_biome_reached {biome, heightM}`
- `word_tower_match_end {heightM, floors, combo, placement, durationS}`
- `word_tower_share_clicked {biome, heightM}`

Headline metrics: D1 return, median session length, bomb-send rate, **dead-end-hit rate per language** (early imbalance detector), share-click rate.

---

## 11. Accessibility

- Biome cues are **not color-only** (icon + label + altitude number) — colorblind safe.
- `gsap.matchMedia` + `prefers-reduced-motion`: swap parallax/particles for static gradients, keep core feedback.
- Full keyboard input for word entry; tray navigable; bomb send reachable.
- Screen-reader **live region** announces height crossings, combo, incoming bombs.
- Text scaling on HUD; min tap target on tray tiles for phones.

---

## 12. Growth / viral

- **Share card:** server-rendered PNG of *your* tower silhouette + height + top word + biome reached + "beat my tower" CTA. Reuse the avatar PNG route pattern (`fe-next/app/api/avatar/png/[playerId]/route.ts`) for server-side PNG rendering.
- **Challenge link:** "beat my tower" deep link → opponent races your **ghost tower** (recorded run).
- **Ghost towers** fill empty Versus slots and power async challenges (Doodle-Jump ghost model) — the field is never empty.
- **Lobby flyby** of all rival PB towers = built-in social proof + FOMO before every match.
- **Biome-crossing share prompts** at Space and Galaxy (rare, brag-worthy milestones).
- **No fabricated stats** anywhere (no "50K players / 4.7★"). Positive-but-true framing only ("ad-free", "browser-based").

---

## 13. Open questions / deferred

1. **JA kanji readings** — does `backend/dictionary.ts` expose per-entry readings? If not, v1 JA = kana-entry subset; kanji compounds deferred. *Blocking for JA chain correctness — resolve in Phase 1.*
2. **Hebrew dead-end set** needs a native-speaker sanity check (which final letters truly dead-end in practice).
3. **Bomb tuning** (15 m lead gate, 8-floor/min cap, charge ladder) are first-guess numbers — validate with PostHog after Phase 4.
4. **Solo persistence + leaderboard fairness** — should endless height reset seasonally (reuse 10% soft-carry) or be all-time? Recommend seasonal with all-time PB shown.
5. **Spanish digraphs** (ch/ll/rr) — accept single-char chain simplification for v1?
6. Daily Climb seed source + anti-cheat (server-side replay validation).

---

## 14. Phase plan (feeds the implementation plan)

| Phase | Scope | Exit criteria |
|---|---|---|
| **P1 — Solo MVP** | Single-player endless: tray + anchor + chain validation (EN first, then 5-lang), scramble, altitude/scoring, combos, length-ladder celebrations, Pixi scene with biomes. Resolve JA readings question. | Playable solo loop, 5 langs string-complete, biomes render, TDD green |
| **P2 — Persistence + share** | `word_tower_progress` table + RPC, resume-from-last-tower, Solo + Daily leaderboard, share-card PNG + challenge link | Height persists across sessions; share card renders per locale |
| **P3 — Versus real-time** | Socket protocol, 1v3 matches, lobby flyby, live rival heights, ghost towers, server-authoritative state | 4-player race syncs < 300 ms; ghosts fill empty slots |
| **P4 — Bombs** | Charge ladder, lead gate, cost/cooldown/cap, anti-snowball, server arbitration, bomb FX | Bombs gated + capped; trailing players rubber-band; no griefing path |
| **P5 — Polish + balance** | Native HE/SV/JA/ES review, telemetry-driven tuning, reduced-motion + a11y pass, perf budget on Pixi | a11y audit pass; balance numbers tuned from PostHog; perf within budget |

TDD mandatory throughout (RED→GREEN→REFACTOR). Files ≤ 500 lines. One commit per phase (ask before committing).

---

## Appendix A — Tunable constants (first-guess, all in `wordTowerConstants.ts`)

```
TRAY_SIZE = 12
SCRAMBLES_START = 3
SCRAMBLES_MAX_BANKED = 5
SCRAMBLE_EARN_EVERY_M = 25
BASE_FLOOR_M = 2.0
LENGTH_BONUS_M = { 3:0, 4:0.5, 5:1.5, 6:3, 7:5, "8+":8 }
COMBO_MULT = 1 + min(combo,10)*0.1   // cap 2.0
DEAD_END_THRESHOLD = (per-lang, words-starting-with-letter count)
BOMB_LEAD_GATE_M = 15
BOMB_DAMAGE = clamp(floor(leadM/15), 1, 5)
BOMB_COOLDOWN_S = 20
BOMB_RECV_CAP_FLOORS_PER_MIN = 8
BOMB_MAX_BANKED = 2
REBUILD_SHIELD_S = 2
VERSUS_MATCH_S = 180
BIOME_THRESHOLDS_M = [50,150,300,500,800]
STATE_BROADCAST_THROTTLE_MS = 300
```

## Appendix B — Competitor sources
Tower Bloxx (combo multiplier, sway-as-difficulty) · Shiritori (chain rule, dead-end letters) · Stack Ball (combo juice escalation) · Tetris 99 (scaling garbage-send, queue cap) · Doodle Jump / Jetpack Joyride (altitude-as-metric, rival ghosts) · existing "Word Tower" relaxing apps (what to avoid: ad spam, single-solution boards, getting stuck).
