# Japanese Multiplayer Gameplay — Audit, Research & Recommendations

**Date:** 2026-05-21
**Scope:** Multiplayer (MP) gameplay correctness for the Japanese (`ja`) locale across Classic, WheelRush, WordHunt, and Blast modes.
**Verdict:** Japanese MP is **linguistically broken** in two core modes and has **near-zero adoption**. The right-sized response is a focused correctness fix plus this document; heavy investment (a real dictionary, a JA-native mode, IME input handling) is deferred with rationale below.

---

## 1. TL;DR

| Finding | Severity | Evidence |
|---|---|---|
| Classic MP uses a **kanji** grid; ~3 words findable per board, drawn from a **hardcoded 48-item list** (not the 128K dictionary). | 🔴 Game-breaking | `backend/utils/gameUtils.ts:540` (`generateJapaneseTable`), `:75-83` (`kanjiCompounds`) |
| WheelRush builds a **kanji anagram** wheel from kanji-mixed seeds (`新しい世界`). Anagramming kanji is meaningless in Japanese. | 🔴 Game-breaking | `backend/modules/wheelRushManager.ts:33` |
| Validation dictionary for Classic MP is **128K kanji compounds**; almost none are reachable on the grid. | 🔴 Mismatch | `backend/dictionaryLoaders.ts:135` |
| A **9,467-word clean-hiragana dictionary already ships in the repo (`japanese_words.txt`) but is loaded by *nobody*** — validation reads the kanji file instead. Wiring it is the single highest-leverage fix. | 🟠 Foundational | `grep -c` pure-hiragana in `backend/japanese_words.txt` = 9,467 / 9,629; zero readers in `backend/`/`server/`/`lib/` |
| Hiragana tile pool is **base-46 only** — no dakuten (が), handakuten (ぱ), small kana (っゃゅょ), or long vowel (ー). Cannot spell がっこう, きゅう, ちょう, コーヒー. | 🟠 Vocab loss | `lib/word-craft/tileBags/ja.ts` |
| No normalization, no IME composition handling, no romaji input. | 🟡 Input ergonomics | `shared/utils/wordNormalization.ts:161` |
| **JA adoption is effectively zero**: 3 game starts in the last 30 days (1 user each), vs Hebrew word-wheel 74 / survival 72 / blast 46. | 📊 Context | PostHog `game_started`, 30-day window |

---

## 2. Why kanji-based Japanese Boggle is linguistically broken

A Boggle/word-trace mechanic assumes a **small phonetic alphabet** where words are sequences of adjacent letters you can *discover* by tracing paths. That assumption holds for English (26 letters), Hebrew, Swedish, Spanish — and for Japanese **hiragana** (46-syllable phonetic syllabary: ねこ = ne+ko).

It does **not** hold for **kanji**:

- Kanji are **logographic** — 2,000+ in common use, each a whole morpheme. They are not a small alphabet you rearrange.
- Valid 2-kanji compounds are a sparse, near-arbitrary subset of all kanji×kanji pairs. The probability that two *randomly placed adjacent* kanji form a real compound is astronomically low.
- Consequence in code: `generateJapaneseTable` doesn't rely on discovery at all — it **plants** `floor(cells/5)` compounds from a **hardcoded 48-entry list** (`kanjiCompounds`), then random-fills the rest from 100 single kanji. On a 4×4 board that is **~3 pre-planted findable words, ever**, all from those 48. Players can't express vocabulary; they reverse-engineer what the generator hid. That is not a word game.
- WheelRush is worse: it takes a seed like `新しい世界`, extracts unique characters (`新 し い 世 界` — kanji *and* stray hiragana mixed), and asks the player to **anagram** them. Japanese has no anagram tradition precisely because kanji aren't rearrangeable phonetic units. The wheel is incoherent.

**The correct primitive for a Japanese word-trace/anagram game is hiragana.** This is what real Japanese grid/word games do (see §3). The codebase already proves it knows this — Blast V2 and WordCraft (`lib/word-craft/tileBags/ja.ts`, `lib/blast/v2/locales/ja.ts`) use a **hiragana** tile bag with Scrabble-style point values and a frequency distribution. The MP backend modes simply never adopted it; they are split-brained.

---

## 3. Research: how Japanese word games actually work

- **Shiritori (しりとり)** — *the* iconic Japanese word game. Players chain words where each new word starts with the **last kana** of the previous one (ねこ → こま → まど…). Phonetic by construction, deeply familiar to every Japanese speaker, and naturally multiplayer/turn-based. Mobile implementations exist with 16,500-word dictionaries and difficulty tiers. ([Shiritori — Wikipedia](https://en.wikipedia.org/wiki/Shiritori), [Shiritori Japanese word puzzle — App Store](https://apps.apple.com/us/app/shiritori-japanese-word-puzzle/id1170304145))
- **Kana Quest** — kana-matching puzzle; tiles connect by **shared phonetic sound**, teaching hiragana/katakana through adjacency. Confirms kana, not kanji, is the unit of grid play. ([WaniKani community thread](https://community.wanikani.com/t/any-interesting-japanese-word-games/46259))
- **"Kanji Connect" / Kana Grid (Dr Lingua)** — explicitly Boggle-like: the target reading is cued, and you **spell it out on a kana grid**. The grid is kana; kanji appears only as a *clue/label*, never as grid tiles. ([Dr Lingua — Kana Grid](https://drlingua.com/japanese/games/kana-grid/))
- **Moji Pittan / Kotoba no Puzzle** (console/arcade lineage) — kana tile-laying word games that use an **expanded kana set** including dakuten/handakuten/small kana, because a base-46 set can't express most vocabulary.

**Takeaways for LexiClash:**
1. Grid/anagram modes must be **hiragana**, with kanji relegated to optional *clue* text (furigana-style), never as playable tiles.
2. The tile pool must be **expanded** beyond base-46 to include が-ぱ rows, small kana, and ー — otherwise common words are unspellable.
3. **Shiritori** is the highest-ceiling JA-native mode and a genuine marketing hook, but it is a *new mode*, not a fix to existing ones (see §6).

---

## 4. The dictionary exists — it's just wired to the wrong file

A word game is only as good as its dictionary. The key discovery: **a usable hiragana dictionary already ships in the repo and is loaded by nobody.**

| File | Lines | Reality |
|---|---|---|
| `backend/japanese_words.txt` | 9,629 | **9,467 pure hiragana** — clean, real vocabulary *with* dakuten/small kana/long vowel (きゅうりょう, ちょうり, じょうりゅう, ひがえり). **Loaded by zero code** (grep confirms no readers in `backend/`/`server/`/`lib/`). |
| `kanji_compounds.txt` / `ja_nouns.txt` | 128,004 | Kanji compounds. **Unreachable** from a kana grid. What validation loads today. |
| `japanese_words_approved.txt` | 2,459 | Only **200 pure hiragana**; the rest are kanji or n-gram junk (`あるクロ`, `ある三里`). |
| `backend/dist/common_hunt_words_ja.txt` | 799 | ~**420 pure hiragana** (あおぞら, あさがお); 379 contain kanji. |

**The fix is wiring, not authoring.** Point JA validation at the pure-hiragana subset of `japanese_words.txt` (≈9,400 words) and a hiragana Boggle becomes genuinely playable — not "coherent but sparse." 9.4K is thin next to English's 100K+, but it is two-and-a-half orders of magnitude better than the **3-findable-words** the kanji grid delivers today. WheelRush is additionally robust: the wheel is seeded from a known word, so sub-words are findable **by construction**.

**The depth unlock (deferred, lower priority now):** derive hiragana **readings** from the 128K-entry kanji noun list with a Japanese morphological analyzer (kuromoji.js — pure-JS, no native deps — or MeCab): `日本 → にほん`, `学校 → がっこう`. That would take the dictionary from ~9.4K toward 100K+. Worth doing once JA traffic justifies it; **not** required for the mode to be playable, since `japanese_words.txt` already gets us there. See §6.

---

## 5. Adoption data (why this is right-sized, not gold-plated)

PostHog `game_started`, last 30 days, by language × mode:

- **Japanese total: 3 starts** (word-wheel 1, survival 1, connections 1), 1 distinct user each.
- For scale: Hebrew word-wheel **74**, Hebrew survival **72**, Hebrew blast **46**; `None`-locale (≈ English default) classic **124**, word-hunt **113**.

Japanese is a **ghost mode**. Pouring engineering days into it now is fixing a building nobody is in. But the gameplay being *linguistically incoherent* is plausibly *why* nobody stays — so making it **correct** is justified; making it **deep/feature-rich** is not, yet.

---

## 6. Recommendations

### Ship now (correctness fix — see companion implementation)
1. **Classic MP grid → hiragana.** Replace `generateJapaneseTable`'s kanji grid with a frequency-weighted hiragana fill (mirroring EN/SV/ES random fill + the existing JA distribution).
2. **WheelRush → hiragana.** Swap the kanji-mixed `NINE_LETTER_SOURCES.ja` seeds and the kanji pad pool for hiragana-only seeds drawn from the clean-hiragana word list.
3. **Validation → hiragana.** Wire the JA validation dictionary to the **pure-hiragana subset of `japanese_words.txt`** (≈9,400 words, currently dead) plus the hiragana subset of the approved list; the 128K kanji compounds become intentionally unreachable for validation (kept only for the legacy `kanjiCompounds` seeding consumer). Guard the grid↔validation alignment with an **integration test** (generate JA board, submit a known hiragana word, expect valid).
4. **Expanded kana pool.** Add dakuten/handakuten/small kana/long-vowel to the JA pool so common words are spellable.

### Defer (with rationale)
- **Hiragana dictionary via kuromoji/MeCab reading-derivation (§4).** *The* real unlock, but a build-pipeline investment that's premature at zero traffic. Revisit when JA traffic justifies it. Recipe: tokenize each `ja_nouns.txt` entry → take the `reading` field → convert katakana reading to hiragana → dedupe → write `japanese_hiragana_words.txt`.
- **Shiritori as a new JA-native mode.** Highest ceiling for authentic appeal and marketing, but a *separate spec* — large scope, and the existing Word Tower spec (`docs/2026-05-21-word-tower-game-mode-spec.md`) already references a shiritori chain. Do not fold into a correctness fix.
- **IME composition + romaji input.** Real input-layer ergonomics gap (desktop IME mid-composition can misvalidate), but narrow and only bites once JA has keyboard players. Fix when traffic justifies.
- **Frontend `utils/utils.ts` has a kanji grid duplicate (SP, out of MP scope).** A copy of `generateJapaneseTable` (kanji) lives client-side at `utils/utils.ts:~186` for single-player local boards. MP is server-authoritative (clients render the broadcast board, which is now hiragana), so MP is unaffected; the SP path should be aligned to the backend hiragana model in a follow-up (ideally by de-duplicating onto a shared module).
- **Client `ja.dict.gz` is kanji-built (SP, out of MP scope).** `scripts/build-dict-assets.ts:52-56` builds `public/dicts/ja.dict.gz` from `kanji_compounds.txt` for client-side validation. This is *not* used by MP (server-authoritative; client does length-only checks), so the MP fix is unaffected. But it is misaligned with WordCraft's hiragana tiles (single-player) — same class of bug. One-line fix (point its `collect()` at the hiragana `japanese_words.txt`) + asset rebuild; deferred as SP scope.

### Targeting / positioning (the "target Japanese users" ask — document, don't build)
With zero current adoption, the targeting question is *why would a Japanese player try this?* Correct gameplay is necessary but not sufficient:
- **Lead with a JA-native hook.** Generic Boggle is a hard sell in Japan; **Shiritori** is instantly recognizable and a far stronger acquisition wedge than "kanji word search." Position the JA landing page around it once built.
- **App-store / SEO keywords.** Target しりとり, ことばゲーム, 言葉パズル, 漢字 — not transliterated "Boggle," which has no JA search volume.
- **Furigana-friendly UI.** Show kanji as readable clue text with kana readings; never require kanji *input*.
- **Sequencing:** don't spend acquisition budget on JA until the mechanic is coherent (this fix) and the dictionary is deep (deferred unlock). Marketing a broken game burns the channel.

---

## 7. File reference

| Concern | Location |
|---|---|
| Grid dispatch | `backend/utils/gameUtils.ts:225` (`generateRandomTable`), `:245` (`'ja'` → `generateJapaneseTable`) |
| Kanji grid + hardcoded compounds | `backend/utils/gameUtils.ts:540`, `:61-83` |
| WheelRush kanji seeds | `backend/modules/wheelRushManager.ts:33`, `:62` |
| JA validation dictionary load | `backend/dictionaryLoaders.ts:135` |
| Normalization (none for JA) | `shared/utils/wordNormalization.ts:161` |
| Existing hiragana tile bag (frontend) | `lib/word-craft/tileBags/ja.ts`, `lib/blast/v2/locales/ja.ts` |
| Clean hiragana word source | `dist/common_hunt_words_ja.txt` (filter to pure hiragana) |
