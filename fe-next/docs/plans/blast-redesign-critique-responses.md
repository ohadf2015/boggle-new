# Blast Mode Redesign — LLM Critique Responses

Prompt source: [blast-redesign-critique-prompt.md](./blast-redesign-critique-prompt.md)
Collected: 2026-04-29

---

## Response 1 — Perplexity (cited / web-research style)

> You're on the right track: the redesign clearly attacks the real pain points,
> but you're still carrying some subtle "designer cleverness" that will feel
> rigged or stressful to players. Treat this as a solid v1 spec that still needs
> a round of brutal simplification and some A/B validation.

### Overall verdict
Cutting tiles 20→5 and persistent goal banner = objectively right (matches Royal Match
cognitive-load research). Biggest risks: (a) "Find The Word" becoming stressful
railroading, (b) Color Power and cascade protection feeling like the game cheats.

### Goals & variety
3 archetypes is fine if each has 5–10 *parameterized variants* (varied N, word-length
floors, color-pair requirements, partial goals like "find any 3 of 5"). Without
variants, samey by wave 10. **3 = floor not ceiling.**

### Find The Word — stress risk
Reframe from hard gate to **high-value optional**:
- Hitting it = massive bonus / extra moves / unlock special wave.
- Primary win condition stays score / general progress.
- If cascade clears it → **auto-credit + celebrate** ("Nice! Cascades found CRYSTAL for you").

### Color Power — luck risk
- Pre-seed enough pink for ≥2 valid words at wave start.
- Add tile that paints neighbors pink (player agency).
- Consider "any of N power colors" not single hue.
- Favor streak goals ("3 words in a row using pink") over raw counts.

### Special tiles 20→5 = correct
But your 5 skew toward "bigger clear / more score." Missing: state-manipulation
tools (controllable shuffle, paint converter). Ideal range: **5–7**.

### Tutorial pauses
Will frustrate competitive/TV players. Better: pre-wave "what's new this wave"
banner + permanent in-HUD "?" icon for tooltips + subtle highlight overlay (not
stop-the-world modal).

### Anti-frustration gaps missed
- Hint cost = 1 move feels punitive when player already stuck.
- Score opacity (why did this word score what it did?).
- Hidden DDA still mentioned as problem but not removed in redesign.
- Pre-fail warning ("2 moves left, you still need 1 pink word").

### Cascades — kill the pause
Invisible game-side intervention reads as rigging. Better:
- Auto-credit + positive message, OR
- Visibly mark target letters as "anchored" (icon).

### Lessons
- **Royal Match**: scripted boards ensure goals reachable; transparent on what.
- **Wordscapes**: single clear success condition, generous hints, no punishment for using them.
- **SpellTower**: modular *modes* extend replayability w/o overcomplicating any single mode.

### Riskiest assumptions to A/B
1. Find The Word as primary vs optional side objective
2. Color Power as skill vs random
3. Hint economy & cost (does it spike churn?)

### Ship order
**Sprint 1 = clarity & cuts only.** Don't change goals + UX simultaneously, you'll
lose attribution. Sprint 2 = onboarding & hints. Sprint 3 = new goal archetypes.

### Top 3 changes
1. Reframe Find The Word → premium side goal, auto-credit cascade hits.
2. Make Color Power controllable + less color-locked (guarantee density, add converter, allow any "power" color).
3. Replace stop-the-world tutorial cards with layered, replayable teaching (pre-wave brief + persistent help button).

### Top 3 kills
1. **"Cascade can't auto-clear target word" rule** — brittle, invisible, awkward.
2. **"Second hint costs 1 move"** — charging core failure resource for hints = salt.
3. **In-wave micro-achievement toasts entirely** — even 3 = screen spam in busy mode. Move to end-of-wave / subtle in-HUD badges.

---

## Response 2 — ChatGPT / Grok-style (terse, "70% there")

> Strong corrective surgery on original mess. You correctly diagnosed core sins:
> information overload, invisible state, tutorial debt, "find-any-word" aimlessness.
> Clarity-first philosophy is exactly right for a hybrid with high cognitive load.
> But you've over-corrected in places, under-corrected in others. Risk: trading
> "confusing depth" for "clear shallowness."

### Q1 — 3 goals too few?
Yes. Repetitive after 12–15 waves. Royal Match rotates 8–10 goal categories.
Wordscapes has explicit word lists per level. **Add at least 1 more (e.g. "Clear the Board" in X moves)** + meaningful sub-variations per type. 4–5 minimum.

### Q2 — Find The Word: satisfying or stressful?
Stressful for non-trivial % especially non-native Hebrew/RTL or weaker vocab.
"Cascade saved it for next wave" will feel patronizing after 3rd time. Players
want to feel clever, not rescued.

### Q3 — Color Power = luck-check
Reduces to "wait for RNG" unless heavily tuned spawn density + agency over
color manipulation (Rainbow/Prism converts adjacent tiles). Pink wave = lucky wave perception.

### Q4 — 5 specials = right call
Maximum healthy number. Spelltower succeeds w/ 3–4. Royal Match creates power-ups
**from matches** rather than pre-placing rare tiles → feels earned. Depth from
**interactions between the 5**, not quantity.

### Q5 — Tutorial pauses
Break flow. Mobile/TV players hate pauses more than you think.
- Non-pausing dimmed-board overlay + 1.5s mascot voiceover.
- "First-use demo" — tile appears, MUST use it next word, effect plays w/ subtle label.
- Pause only on absolute first encounter ever (account-level).

### Q6 — Missed anti-frustration sources
- Move counter visibility + "moves until forced cascade"
- 6×6 board readability on TV (color-blind mode, high-contrast outlines)
- RTL path-drawing feedback (Hebrew muscle memory fights LTR)
- No explanation when fail-soft guard *prevents* a cascade
- No "undo last move" 3-second window
- Hidden DDA still exists, won't catch "felt unfair" emotion

### Q7 — Fail-soft cascade pause = yes, reintroduces hidden state
Kill it. Let cascades happen, post-facto "Target word survived—nice!" toast.

### Q8 — Royal Match / Wordscapes / Spelltower
- **Royal Match**: persistent goal bar + live progress, **power-ups created by player** (match 4+ = rocket), zero invisible state.
- **Wordscapes**: explicit word list upfront, bonus words for dopamine, unlimited attempts, daily/seasonal meta.
- **Spelltower**: pure board-management, very few specials, no target-word stress.

### Q9 — Riskiest assumption
That simplification alone drives long-term retention past wave 20. Clarity prevents
churn from confusion but does NOT create the "one more wave" hook. A/B test
retention curves old vs new after 15 waves.

### Q10 — Ship order
**Clarity guards first (Sprint 1), new goals second.** Players need to trust the
game again. Landing flashy new goals into old messy container = more noise.

### Top 3 changes
1. Add 1–2 more goal archetypes + procedural variations inside existing ones.
2. Make ≥2 specials player-creatable (match 4+ same color → temp Rainbow/Gold).
3. Replace pause tutorials with contextual first-use demos + permanent "Tile Codex" menu.

### Top 3 kills
1. **Fail-soft cascade pause** — hidden state.
2. **Color Power as currently described** — too luck-dependent.
3. **Micro-achievement toasts entirely** (even reduced 3) — mascot already reacts; toasts = visual spam.

---

## Response 3 — Gemini Deep Research (long-form, scholarly)

> Mechanics-First overhaul correctly identifying legacy failures as Friction
> Failures. To reach elite status (Wordscapes / Royal Match tier), must move
> from "Simplified" to "Deep."

### Cognitive load — taxonomy of special tiles
20→5 tiles correctly hits the "Goldilocks Zone." But spatial impact on a 6×6 (36 tiles):

| Tile | Coverage | Concern |
|------|---------:|---------|
| Bomb | 25% | Resets 1/4 board on single trigger |
| Prism | 30.5% | Can clear strategically placed Q+U |
| Lightning | 16.6% | OK |
| Rainbow | 2.7% | Critical for path connection |
| Gold | 2.7% | "Phantom core" — pure numerical multiplier, low tactile reward |

### Goal scaling
3 types insufficient for hundreds of levels. Use **Goal Stacking**: e.g. wave 25
= "Find the Word using 4+ pink tiles." Multi-purpose component strategy creates
elegance without clutter.

### Color Power = luck-check unless conversion mechanic
"Wait for pink to drop" = slot machine. Solution: Rainbow becomes **brush** —
when used in word, all letters in that word turn pink. Player creates conditions
for own success.

### Fail-soft cascade pause = system opacity
Better: treat target-word letters as **"Heavy" / "Sticky"** — resist clearing by
adjacent matches unless explicitly included in a word path. Preserves cascade
satisfaction, silently protects objective. **Visible rule, not hidden intervention.**

### Tutorial — kill the hard pause
Pausing an action-puzzle hybrid = symptom of bad design. Replace with **Bullet Time**:
when new tile appears, game slows to 25%, non-blocking tooltip slides in. Player
keeps scanning for words while absorbing mechanic. (Spelltower / Zach Gage pattern.)

### Hebrew RTL specific risks
- `dir="auto"` or `unicode-bidi: plaintext` required on goal banner so mixed content ("Find the word תורה") doesn't scramble.
- Underlying path index must accept right-to-left draws for words like תורה — common LTR-assumption bug.
- Scanning pattern shifts top-right → bottom-left, affects board-design symmetry.

### TV D-pad ergonomics
6×6 + diagonal pathing = D-pad fatigue (Up + Right for diagonal).
**Sticky Cursor / Radial Snap**: after first letter, cursor snaps to valid adjacent
neighbors only, halving D-pad clicks per word.

### Sugar-crush math
End-of-wave finale = succession of exponential gains, $G = \sum (V \times M^i)$.
Auto-trigger remaining specials = relief phase of anxiety-compulsion-relief loop.

### Telemetry expansion
4 events too few. Add:
- `path_abandoned { word_length, time_s }` — is grid too small?
- `hint_used_on_word { word, goal_distance }` — is target-word logic obscure?
- `tile_wasted_in_cascade { tile_type, goal_relevant }` — is fail-soft working?
- `input_latency_tv { ms_between_clicks }` — D-pad pain?

### Riskiest assumption
That Find-the-Word is skill-based. If players perceive it as luck (waiting for
letters to drop), they'll treat it as such. **First A/B test:** Score-Target only
group vs Find-the-Word only group, measure retention.

### Ship order
Clarity Guards (Sprint 1) first. Confirmed. Introducing Find-the-Word into
20-tile chaos = contaminated data.

### Top 3 changes
1. **Sticky Move** target word protection (replace pause w/ logic-based heavy letters).
2. **Tile Conversion** for Color Power (Rainbow as brush).
3. **Adaptive hint cadence** — trigger by Moves-Per-Minute, not 30s static timer.

### Top 3 kills
1. **2-second tutorial pause** — bullet time / overlay glow instead.
2. **Gold tile** (3× multiplier) — least depth of the 5; replace w/ Shuffle/Tornado that helps when stuck.
3. **Cascade Momentum hidden state** — kill any invisible boost. Pure geometry + gravity. Transparency = trust.

---

## Synthesis

### Convergent Critiques (3/3 agree)

| Issue | All 3 say |
|-------|-----------|
| **Fail-soft cascade pause** | KILL. Reintroduces exact hidden-state problem. |
| **Hint costs 1 move** | KILL. Punishes already-stuck players. |
| **Hard-pause tutorial cards** | KILL. Breaks flow, especially TV/competitive. |
| **Color Power = luck without agency** | Add conversion mechanic (Rainbow paints neighbors). |
| **Find The Word as hard gate** | Reframe as bonus / auto-credit cascade clears. |
| **3 goal types insufficient long-term** | Add variety (variants, stacking, or 4th archetype). |
| **Specials should be player-creatable** | Royal Match pattern: match-N → temp special. |
| **Micro-achievement toasts** | Move to end-of-wave card. Even reduced 3 = noise. |
| **Ship order** | Clarity sprint FIRST, then new goals. |

### Divergent Recommendations

| Question | Perplexity | ChatGPT/Grok | Gemini |
|----------|-----------|--------------|--------|
| Goal variety | 3 archetypes × 5–10 variants | Add 4th archetype ("Clear Board") | Goal stacking (combine 2 in one wave) |
| Tutorial replacement | Pre-wave "what's new" + ?-icon | Contextual force-use demo | Bullet-time slow-mo |
| Gold tile | Keep (numeric familiarity) | Keep | KILL — replace w/ Shuffle |
| Cascade fix | Auto-credit clears | Auto-credit clears | "Sticky" target letters (visible rule) |

### Unique Contributions

- **Perplexity** — pre-fail warning UX; score-opacity callout; score parameterization (word-length floors, partial goals).
- **ChatGPT/Grok** — player-created specials via match-4; persistent "Tile Codex" menu; "trust simplification = retention" is the riskiest assumption.
- **Gemini** — 6×6 board math (Bomb=25%, Prism=30.5%); RTL bidi technical fix (`dir="auto"`); TV D-pad sticky-cursor; adaptive hint cadence by MPM not static seconds; sugar-crush exponential gain formula.

---

## Action Items (Refined Plan)

### Sprint 1 — Clarity Guards (unchanged, ship first)
1. Persistent goal banner (icon + sentence + live progress)
2. "Why did I lose" fail card with specific reason
3. Tile retirement: 20 → 5 in WAVE_TABLE
4. Hidden DDA / cascade-momentum boosts → make visible OR remove
5. Cut micro-achievement toasts → move to end-of-wave summary card

### Sprint 2 — Onboarding & Hints (was Sprint 3 polish, promoted)
1. Replace hard-pause tutorial → **bullet-time slow-mo overlay** (Gemini) OR contextual force-use demo (ChatGPT)
2. Persistent "Tile Codex" in pause menu — replayable reference
3. Hint UX: free first hint, second = ad-watch / soft currency, **NOT 1 move**
4. Adaptive hint cadence triggered by MPM (moves per minute), not static 30s

### Sprint 3 — New Goals (with critique fixes baked in)
1. **`target_word`**: reframe as bonus, auto-credit cascade clears w/ positive message ("Cascade found CRYSTAL — nice!"). Optionally use "Sticky letters" (visible icon, resists adjacent-clear).
2. **`color_power`**: Rainbow tile becomes **brush** — converts word's letters to goal color. Pre-seed ≥2 valid color-words at wave start. Maybe allow "any of N power colors."
3. **Player-created specials**: match-N same-color tiles in single word → spawn temp Rainbow/Gold. Royal Match pattern.
4. **Add 4th goal type**: "Clear the Board" in X moves (Spelltower DNA, suits competitive crowd) OR per-wave goal stacking.

### Sprint 4 — Platform & Lang Polish
1. RTL audit: `dir="auto"` on banner, path index accepts right-to-left draws for Hebrew, scan-pattern asymmetry tested.
2. TV D-pad: sticky-cursor / radial snap to valid neighbors after first letter selected.
3. High-contrast outlines + color-blind mode for Color Power tiles.
4. Pre-fail warning ("2 moves left, still need 1 pink word") on last move.

### A/B Tests (riskiest assumptions)
1. **Find The Word as gate vs bonus** — retention + frustration metrics.
2. **Cascade pause vs sticky-tile vs auto-credit** — which feels least patronizing?
3. **Color Power with vs without Rainbow-brush** — luck perception score.
4. **Hint costs ad-watch vs free vs move-cost** — churn at fail screens.

### Telemetry Expansion (was 4 events → 8)
- `goal_seen { goal_type, wave }`
- `goal_completed { goal_type, time_s, used_hint }`
- `wave_failed_reason { reason, was_close }`
- `tutorial_card_shown { tile_type, dismissed_in_s }`
- `path_abandoned { word_length, time_s }` (NEW)
- `hint_used_on_word { word, goal_distance_to_target }` (NEW)
- `tile_wasted_in_cascade { tile_type, goal_relevant }` (NEW)
- `input_latency_tv { ms_between_clicks }` (NEW — TV only)

### Open Decisions (need product call)
- Keep Gold tile or replace with Shuffle/Tornado? (1/3 vote kill)
- Goal-stacking vs 4th archetype vs parameterized variants?
- Tutorial style: bullet-time vs force-use vs pre-wave brief?
