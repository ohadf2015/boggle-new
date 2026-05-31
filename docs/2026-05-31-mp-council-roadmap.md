# LexiClash MP Council — Flow / Results / Modes Roadmap

> Date: 2026-05-31. Source: `/claude-council` (Gemini-3-flash + Grok-4.20) **+** 4 in-house expert seats
> (competitive game-feel, party/TV UX, results/retention/virality, per-mode systems design).
> Council outputs cached: `.claude/council-cache/council-1780257291.md`.

## How to read this
Every item is tagged **[QW]** quick win (hours–days, few files, low risk), **[SB]** solid bet (1–2 wk),
or **[BB]** big bet (multi-week, core-loop change). "Consensus N/6" = how many independent seats raised it.

---

## 1. Cross-seat consensus (the signal)

| Idea | Consensus | Tag | Area |
|---|---|---|---|
| **Between-rounds micro-countdown + next-mode tease** (next mode icon+color+1-word hook) | 3/6 | QW | Flow |
| **One-tap "Revenge / Rematch" snap** (close game → recreate same crew+mode, skip lobby) | 3/6 | QW | Results |
| **Superlative awards for everyone incl. losers** ("RTL Wizard", "Longest Word", "Sprinter") | 4/6 | QW | Results |
| **Turning-point / near-miss micro-story** ("18 pts from 2nd — this word would've flipped it") | 2/6 | QW | Results |
| **Comeback / catch-up** (runaway leader → bottom-25% multiplier OR force leader's worst mode) | 3/6 | SB/BB | Flow |
| **Mode color-identity + per-mode tension meter on TV/HUD** | 3/6 | QW/SB | Flow+TV |
| **First-Blood + Lead-change toast** (punctuation moments in every mode) | 2/6 | QW | Flow |
| **Mode-branded "signature moment" share card** (Blast tile-burst, Wheel pangram slice) | 2/6 | QW/SB | Results |
| **Steal mechanics** (Wheel Rush steal-cost; Blast gold-tile steals from leader) | 3/6 | SB/BB | Modes |
| **Connections → MP competitive race** (per-category first-solve, shared mistake budget) | 1/6 | BB | Modes |

---

## 2. Prioritized backlog (impact × effort)

### Tier 0 — Ship now (QW, self-contained, phone+TV, 5-lang)
1. Session superlative awards · 2. First-Blood + Lead-change toast · 3. Between-rounds next-mode tease.

### Tier 1 — Next (QW/SB)
4. One-tap Revenge Match · 5. Turning-point card · 6. Mode-branded share card · 7. Per-mode tension meter.

### Tier 2 — Bets (SB/BB)
8. Comeback weighting (A/B) · 9. Wheel-Rush steal-cost + Blast chain/gold-tile · 10. Connections MP race +
Shiritori Rush · 11. Spectator emotes + spectator→player promotion UI · 12. Ghost-rival / spectator replay.

---

## 3. Distinctness audit (anti-sameness)

| Mode | Core fantasy (post-fix) |
|---|---|
| Classic | Spot + **steal** points (first-finder decay, golden words) |
| Blast | Persistent **multiplier snowball**, cascade spectacle |
| Word Hunt | **Continuous discovery** (secondary targets, visible pressure meter) |
| Wheel Rush | **Steal-cost bluff poker** + pangram streak |
| Shiritori | Real-time **letter-chain dexterity** (unblock non-JA) |
| Word Craft | **Simultaneous tile duel** (kill axis friction) |
| Connections | **Speed-categorize** with shared-life tension |

---

## 4. Code-verified correction (do not skip)
A wiring audit (verified by reading source; two sub-agent hallucinations corrected) found **most results-page
council "quick wins" are ALREADY BUILT**:
- Per-player superlatives for losers → `utils/sessionStatsCalculator.ts` `getPersonalInsight`. **Don't rebuild.**
- 14 word-level awards → `host/components/tv-results/TvResultsAwards.tsx`. **Don't rebuild.**
- One-tap revenge → `components/results/ResultsRevengeSection.tsx` (wired, `ResultsMainContent.tsx:355`).
- The player results screen is a **deliberately curated "YOU-FIRST" arc** — a loser-feedback card was
  *intentionally removed* (`ResultsMainContent.tsx:272`). **Do NOT wire orphan cards wholesale** (SessionStatsCard,
  NearMissCard, MvpAwards, PlayerArchetypeBadge, TurningPointCard exist but were pulled). Each is a design call.

So the real confirmed-missing additive wins are in **FLOW**, not results.

---

## 5. Build log

### Shipped this session (TDD): between-rounds next-mode tease (the #1-consensus flow win)
- `lib/multiplayer/modePresentation.ts` — pure registry mode → `{ labelKey, hookKey, color, icon }`. Extends the
  label-only `lib/tvBroadcast/modeLabel.ts`. 4 rotation modes get 4 distinct electric colours (classic=lime,
  blast=pink, word-hunt=cyan, wheel-rush=purple). Tests: `lib/multiplayer/__tests__/modePresentation.test.ts`.
- `components/multiplayer/NextModeTease.tsx` — neo-brutalist "NEXT UP" banner (icon chip + label + 1-word hook in
  mode colour). RTL-safe, reduced-motion aware, null when no mode known.
  Tests: `components/multiplayer/__tests__/NextModeTease.test.tsx`.
- i18n `results.modeTease.{nextUp,label.*,hook.*}` added to all 5 languages (en/he/sv/es/ja).

Enabler: the next mode is **already broadcast** — `backend/services/gameLifecycle/gameReset.ts` emits `gameReset`
with `gameMode: nextMode`. Going live is pure presentation, **no server change**.

### Remaining wiring to make the tease LIVE
1. **Render `<NextModeTease mode={nextGameMode} t={t} />`** in the between-rounds view. Player side: feed the
   `gameReset` payload's `gameMode` into `components/results/StickyReadyBar.tsx` (the between-rounds ready bar) or
   its parent `ResultsPage`. TV side: add to the `host/components/tv-results/TvResultsView.tsx` intermission panel
   (it already knows current mode via the game-mode store; pass the upcoming mode through).
2. Optionally retire the unused `components/results/AutoPlayCountdown.tsx` or theme it via the same registry.

### Next council items to build (confirmed-missing FLOW wins, priority order)
Lead-change toast (#10) · First-Blood callout (#9) · per-mode tension meter (#11). All touch the live socket/HUD
path → TDD the derived-state pure functions first.
