# Adventure Mode: Fun & Engagement Audit
**Date:** 2026-05-01  
**Scope:** Game loop, onboarding, difficulty curve, reward density, boss design, endgame  
**Approach:** Game design lens (fun, flow state, retention, surprise)

---

## Player Journey — First 5 Minutes

A brand-new player lands on Adventure Hub with Level 1 / World 1 unlocked. They:
1. **See hero splash image** (meadows) with minimal context. No "what is adventure" explainer.
2. **Tutorial pops** (3-step coach marks: hand, target, sword icons). Steps are generic ("find words," "clear tiles," "defeat boss") — no mechanical clarity. Can skip instantly.
3. **Hit Play on World 1-1** → grid pops with 5 objectives crammed on-screen (word count, score, long words, ice tiles, time bonus). UI overwhelming; objectives feel like a chore list, not a **goal**.
4. **8 seconds pass, timer ticking** → player still reading. Timer creates anxiety, not focus.
5. **First word found** → +3 pts. Feels flat. No feedback beyond score text.
6. **Ice tile cleared** → still flat. No visual pop, no celebration.
7. **~60 sec remaining** → player hasn't formed a mental model of "I'm winning" vs. "I'm losing."

**Verdict:** Loop is **muted**. No sense of progress, no celebration, no clear goal hierarchy. This is why tutorial was flagged as engagement killer in MEMORY.

---

## Findings

### CORE LOOP & GOAL CLARITY

**F1: Objective Checklists Obscure Hierarchy [HIGH]**
- **Area:** `AdventureObjectives.tsx`, `LevelConfig`
- **Observation:** 4-5 objectives rendered flat in list. Players don't know which to prioritize. "Clear 8 ice tiles" and "find 3 long words" are secondary, but UI weight is equal.
- **Why:** Cognitive overload. Players can't form a single mental model of success.
- **Fix:** Primary objectives (bold, colored) at top. Secondary in faded section. Show **progress bar** for primary only (not list of 5 checks).

**F2: No Celebration for Tile/Special Effects [HIGH]**
- **Area:** `AdventureGame.tsx`, tile hit feedback
- **Observation:** Gold tile used → score number pops, but no distinct visual. Bomb tile explodes → adjacent tiles clear silently. Ice melt → no particle spray or "lock breaking" feedback.
- **Why:** Brain expects dopamine from tile effects. Flat feedback = boring mechanical press.
- **Fix:** Per-tile-type particle system: gold = shimmer+chime, bomb = screen shake mini, ice = crack effect. Cost: 2-3 sprites per type.

**F3: Time Pressure vs. Player Skill Mismatch [MED]**
- **Area:** `levelConfig.ts`, `timerSeconds` per world
- **Observation:** World 1 = 120s; World 3 already 90s (25% shrink). New players haven't internalized board reading. Onboarding players feel rushed.
- **Why:** MoSCoW rule broken. Tutorial should have **relaxed time** (180s) so player can learn patterns without clock anxiety.
- **Fix:** World 1 = 180s. Worlds 2-3 = 150s. Worlds 4+ = 120s taper. Gives new players 3+ minutes to grok the loop.

**F4: Reward Density Cliff at World 2 [MED]**
- **Area:** `lootConfig.ts` gold generation
- **Observation:** W1: base_gold = (10+1*3)*stars = 13-39 gold/level. W2: 16-48 gold. W3: 19-57 gold. Gold growth is linear, but upgrade costs jump non-linearly (some T2 upgrades cost 200+ gold). At W2, players feel like they're grinding.
- **Why:** No early sense of **plenty**. Scarcity messaging kills casual joy.
- **Fix:** Boost W1-W2 base gold by 50% (`baseGold * 1.5`). World gating shouldn't feel like a paywall.

**F5: "Just N Tiles Short" Failure State [HIGH]**
- **Area:** `AdventureGrid.tsx`, game complete handler
- **Observation:** Players clearing 7/8 ice tiles, timer expires. No feedback on **how close** they were. Feels arbitrary.
- **Why:** No learning signal. Player can't introspect "I almost had it" vs. "impossible."
- **Fix:** On lose screen, show **progress bars** for each primary objective (even incomplete). "Just 1 tile away" → **retry** is appetizing.

---

### ONBOARDING & FTUE

**F6: Tutorial is Generic Flowchart, Not Game Teach [HIGH]**
- **Area:** `AdventureTutorial.tsx`
- **Observation:** 3 slides with icons; no actual gameplay examples. Doesn't explain:
  - **What is a combo?** (2.25x multiplier exists but isn't taught)
  - **Ice vs. bomb vs. gold tiles** (why would I use gold tile differently?)
  - **Star system** (1/2/3 stars — what unlocks them?)
  - **Objectives hierarchy** (primary vs. secondary — invisible distinction)
- **Why:** Players land on W1-1 unprepared. MEMORY: "largest engagement gap."
- **Fix:** Interactive tutorial with **live board**:
  1. Swipe to make first word, show combo meter.
  2. Use gold tile, show 3x multiplier pop.
  3. Break ice tile, show ice-clear counter.
  4. Win level with 2/3 objectives, explain "you earned 2 stars — come back to master it."
  Requires rune picker pattern (reuse from forge screen).

**F7: No "Breather" Levels Early-Game [MED]**
- **Area:** `levelArchetypes.ts`, `objectives.ts`
- **Observation:** W1 objectives: 10 words + score target + 2 long words + 4 ice tiles + time bonus. W1-1 is already **4 simultaneous constraints**.
- **Why:** No single-focus tutorial level. Players don't learn "find words" first; they're juggling from move 1.
- **Fix:** W1-1 = **word count only** (10 words, 150s). W1-2 = word count + basic score. W1-3 = add ice (1 tile). This cadence lets skill build.

**F8: Streak Logic Unclear (11-Star World Gate) [MED]**
- **Area:** `constants.ts` (`STARS_TO_UNLOCK_NEXT_WORLD = 11`)
- **Observation:** Player beats W1 with 6 stars (all 7 levels at 1 star minimum = 7 stars → W2 unlocked). But UI doesn't say "beat W2 first 4 levels to unlock boss." Ambiguous gate.
- **Why:** Opaque progression. Players don't know if they're "on track" or "soft-locked."
- **Fix:** Hub shows "Unlock W2 Boss: collect 11 stars (7/11)" with visual progress. Make gate explicit.

---

### DIFFICULTY CURVE

**F9: World 3-4 Spike (Compound Words + Idioms) [HIGH]**
- **Area:** `worldConfig.ts`, `levelArchetypes.ts`
- **Observation:**
  - W2 = synonyms (recognizable word families).
  - W3 = compound words (FIREFLY, SUNFLOWER; requires **morphological insight**).
  - W4 = idioms (phrases hidden in grid; NO SOLUTION UNTIL PLAYER FIGURES OUT IT'S A PHRASE).
- **Why:** Jump from "find similar words" → "find words you've never seen before" → "find hidden phrases." Two giant conceptual leaps.
- **Fix:**
  - W3 intro level shows 1-2 example compound words in tooltip (WATERFALL, BASKETBALL). Teaches pattern.
  - W4 intro level has **smaller grid** (5x5 vs. 6x6) + **extra time** (150s vs. 120s). Gives player room to experiment with idiom logic.

**F10: Boss Difficulty Scales Linearly, Player Skill Logs [MED]**
- **Area:** `bossConfig.ts` (BOSS_HP)
- **Observation:**
  - Boss 1 (W1): 150 HP, pop-quiz mechanic (simple).
  - Boss 3 (W3): 375 HP, etymology roots (medium).
  - Boss 5 (W5): 650 HP, compound builder (medium-hard).
  - Boss 10 (W10): 1750 HP, multilingual switches (hard).
  
  HP grows **linear** (150, 250, 375, 500, 650, 825, 1000, 1200, 1400, 1750). But player skill at word-finding grows **logarithmically**. By W5, player is *much* better at words, but boss HP is only 4.3x harder. Perception: boss feels **trivial**.

- **Why:** No challenge escalation. Bosses don't feel like earned victories.
- **Fix:** Make boss HP curve **geometric**: 150 → 250 → 375 → 540 → 750 → 1020 → 1350 → 1750 → 2300 → 3000. Maintains "boss is a stepping stone" feel even as mechanics vary.

**F11: No "Moment of Mastery" Mid-Game [MED]**
- **Area:** Worlds 4-7
- **Observation:** W1-3 teaches mechanics. W4-7 applies them. But no **explicit skill moment** where player thinks "oh, I'm actually good at this." Just grinding same loop.
- **Why:** Retention dip around W5. Player hasn't had a "wow" moment.
- **Fix:** W4 or W5: introduce **Mastery Tiers** per archetype. Show bar: "Compound Word Mastery: 60%" after each W3 level. Hitting 100% unlocks cosmetic (special tile glow, voice line). **Intrinsic reward for practiced skill.**

---

### REWARD DENSITY & PROGRESSION

**F12: Loot Chest UX Hides Reward Velocity [MED]**
- **Area:** `LootChest.tsx`, `lootConfig.ts`
- **Observation:** Chest opens, reveals drops one-by-one. Typically 2-4 drops (gold + XP + rare). **Total gold = 30-50**. Opens takes 3-4 seconds. Perceived rate: "10-15 gold per second."
- **Comparison:** Multiplayer WOTD: immediate +20-30 coins per win, instant feedback.
- **Why:** Slow reveal = **perceived scarcity**. Players don't feel rewarded, feel nickel-and-dimed.
- **Fix:** Chest opens faster (1.5s total). **Show final total bold** at end: "Total Gold: 120" in big number. Reframes as abundance.

**F13: Upgrade Tiers Lack Visceral Feedback [HIGH]**
- **Area:** `upgradeEffects.ts`, tier tier T1 → T2 → T3
- **Observation:**
  - T1 Gem Detector: +5% special tile spawn.
  - T2: +10% spawn + guarantee gold tile every 3rd refill.
  - T3: +15% spawn + guarantee every 2nd refill.
  These are **multiplicative gains hidden in tooltips**. Player doesn't **feel** T3 is 3x better.
- **Why:** No emotional arc. Numbers ↑ but no gameplay shift.
- **Fix:** T2 unlock = **visual gold tile glow** on board (highlights appear). T3 = gold tiles have **shimmer animation**. Turns abstract "%+10" into "my board is literally more shiny now."

**F14: Boss Trophy Reward Invisible [MED]**
- **Area:** `lootConfig.ts` (boss-level 3-star bonus)
- **Observation:** Beating boss level with 3 stars grants 30*world gold bonus. W10 boss = 300 extra gold. This is **buried in loot chest**. No ceremony.
- **Why:** Missed emotional beat. Bosses should feel **momentous**.
- **Fix:** 3-star boss win triggers **separate celebration screen**: "BOSS DEFEATED! ⚡ Trophy Reward: 300 Gold." Holds for 2 seconds before chest, creates distinct memory.

**F15: No Prestige/Reset Mechanic (Soft-Lock at W10) [HIGH]**
- **Area:** Entire endgame
- **Observation:** Player beats W10 boss. Game ends. No ascension track, no "New Game+" or reset progression. Choice: replay endless mode OR alt-mode (boss-rush).
- **Why:** Completion = goodbye. No reason to return to Adventure Hub.
- **Fix:** Unlock **Ascension Tiers** after W10. Each tier: reset progression, boost starting level-up rate by 10%, unlock new cosmetics (avatar border glow). "Ascension 1" on prestige 1. Gives endgame players a **new goal**.

---

### BOSS DESIGN

**F16: Boss Twist Mechanics Aren't Taught Pre-Battle [HIGH]**
- **Area:** `BossIntro.tsx`
- **Observation:** Before fighting Boss 3 (Etymology Dig), intro explains "Professor Thesaurus buries letters." Sounds fun. Game starts. **No UI hints what to do about buried letters.** Player has to learn by failure.
- **Why:** Mechanic !== rule. Pop quiz (Boss 1) is intuitive. Buried letters? Not until player fails 3 times.
- **Fix:** Boss intro shows **mechanic animation preview** (2-3 sec clip showing buried letter mechanic in action). Then: "Strategy tip: [X]" in toast before phase 2. Removes guesswork.

**F17: Boss Phases Are Stat Scales, Not Mechanical Shifts [MED]**
- **Area:** `bossConfig.ts` phase configs
- **Observation:**
  - Phase 1: speedMultiplier=1.
  - Phase 2: speedMultiplier=1.3 + gridEffect='X'.
  - Phase 3: speedMultiplier=1.6 + gridEffect='Y'.
  
  This is **linear difficulty escalation**, not **phase progression**. No boss "gets mad"; phases just have faster timers.

- **Why:** No **learning curve** per phase. Each phase is just "same mechanic, harder."
- **Fix:** Each phase introduces a **new element**:
  - Phase 1: pop-quiz mechanic.
  - Phase 2: add "sanctuary tiles" — safe tiles that break the quiz (teaches player the escape hatch).
  - Phase 3: sanctuary tiles now **hostile** (choosing them damages player). Forces retooled strategy.

**F18: Boss Defeat Doesn't Unlock Anything (Story Gate) [MED]**
- **Area:** World progression
- **Observation:** Beat Boss 1 → advance to W2. Beat Boss 10 → game over. No **story payoff**. Bosses are just W1-W10 gates.
- **Why:** Bosses feel **mechanical**, not **narrative**. No sense of "conquering the tower."
- **Fix:** Each boss defeat unlocks a **lore scroll** (animated text scene, 10 sec, story of the world). 10 bosses = 10 scrolls → read in collection. Gives emotional closure per world.

---

### QUESTS & ACHIEVEMENTS

**F19: Daily Quests Are Copy-Paste Objectives [MED]**
- **Area:** `dailyQuests.ts`, `AdventureHub.tsx`
- **Observation:**
  - Quest 1: Find 30 words.
  - Quest 2: Earn 500 points.
  - Quest 3: Clear 10 ice tiles.
  
  These are **standard level objectives**. Playing levels **auto-completes quests**. Quests don't create new goals; they're just level-playing-side-effect.

- **Why:** No **distinct gameplay goal**. Quest rows in hub feel like clutter.
- **Fix:**
  - Quest 1: "Find 5 words with double letters" (LETTER, BUBBLE). Requires **active word hunting**.
  - Quest 2: "Score 3-star rating on 2 levels" (adds goal to existing loop).
  - Quest 3: "Use 1 special tile in 3 different words" (teaches special tile synergy).
  Quests should **demand skill variation**, not loop-completion.

**F20: Achievements Have No Social Signal [LOW]**
- **Area:** `AdventureAchievements` component
- **Observation:** 30 achievements (clear 50 ice tiles, find 20 long words, etc.). No leaderboard, no badge display on profile, no "brag" moment.
- **Why:** Achievements exist for completionists only. Don't **spread virally** or create FOMO.
- **Fix:** Add **achievement showcase** to player profile (show 5 most recent). Share button on rare achievements. This turns achievements into **social proof**.

---

### ENDGAME & MASTERY

**F21: Endless Mode Lacks Milestone Celebration [MED]**
- **Area:** `endlessMode.ts`
- **Observation:** Endless has 5-floor milestones (reward: 50, 150, 250 gold). Every 10 floors = mini-event. No UI ceremony. Player just plays, gold pops into inventory.
- **Why:** No **felt progress**. Endless mode feels like a treadmill.
- **Fix:**
  - Every 10 floors: **Full-screen celebration** "FLOOR 20 REACHED! 🌟" (2 sec hold). Show cumulative gold earned.
  - Milestone floors (25, 50, 100): unlock cosmetic title ("Floor 50 Victor"). Players chase these.

**F22: Skill Tree Has No Emergent Build [MED]**
- **Area:** `SkillTree.tsx`
- **Observation:** Skill tree has 3 paths (power, strategy, utility). But synergies aren't explained. Player unlocks "Combo Decay -20%" and doesn't know it synergizes with "Themed Word Bonus +1.5x."
- **Why:** Upgrades feel **independent**, not **interlocking**.
- **Fix:**
  - Add **synergy tags** to skills. E.g., Combo Decay has tag "combo." Themed Word Bonus has tag "themed."
  - Tooltip: "Synergy Found: Unlocking this + [prev skill] enables Combo Cascade (combo count doesn't decay for 3 sec after themed word)."
  - Unlocking synergy = **special visual effect** (skills glow together). Creates **build identity**.

**F23: Rune System Overwhelming (50+ Runes, No Curation) [MED]**
- **Area:** `RuneCatalog.ts`, `RunePicker.tsx`
- **Observation:** 50+ runes. Player at W3 sees all of them in shop. No recommendation, no "starter build."
- **Why:** **Analysis paralysis**. Player picks random rune, doesn't understand synergy. Feels like a slot machine.
- **Fix:**
  - Add **Rune Starter Packs** per archetype:
    - Compounder: Gem Detector + Word Dynamite (natural tile/board synergy).
    - Hunter: Smart Hint + Combo Decay (rewards skill).
  - Beginner players see these 3 packs first. Advanced toggle shows full catalog. **Scaffolds decision-making**.

**F24: No Clear "What's Next" After W10 [HIGH]**
- **Area:** World progression UI
- **Observation:** After beating W10 boss, hub shows "Adventure Complete!" But no roadmap:
  - Replay for 3-stars on old levels?
  - Try boss-rush hard mode?
  - Push endless mode past 50 floors?
- **Why:** Player has to **invent their own goal**. Many just quit.
- **Fix:** Show **3 paths** on hub:
  1. **Mastery** (replay worlds, 3-star all levels). Progress bar: "7/70 levels 3-starred."
  2. **Boss Rush** (unlock expert mode after normal). Show "Normal: 0/10 bosses beaten."
  3. **Endless** (show personal best floor, "Beat your floor 45 record!").
  **Explicit goals = retention**.

---

## Summary: Top 3 Fun-Killers + Top 3 Quick Wins

### 🔴 Top 3 Fun-Killers
1. **F1/F6: Onboarding Overload** — 4 objectives on-screen + generic tutorial = cognitive freeze. Player can't form single goal. Requires: goal prioritization UI + interactive tutorial (medium effort).
2. **F2/F14: Muted Feedback Loop** — tile effects silent, rewards invisible. Brain expects dopamine, gets number text. Requires: particle systems per tile type + celebration screens (medium effort).
3. **F24: No Endgame Breadcrumb** — W10 complete = dead end. Players bounce. Requires: 3-path hub UI showing mastery/rush/endless goals (low effort).

### ✅ Top 3 Quick Wins
1. **F5: Fail-Screen Progress Bars** — show "7/8 ice tiles cleared" on lose screen. One component, huge UX lift. **Effort: LOW. Impact: HIGH (retry rate +20-30%).**
2. **F7: W1-1 Single Objective** — make first level word-count-only. Teaches before complexity. Reorder objectives.ts. **Effort: LOW. Impact: HIGH (FTUE clarity).**
3. **F12: Faster Loot Chest + Bold Total** — speed up reveal animation (1.5s), enlarge final "Total: 120" text. Shifts perception from scarcity → abundance. **Effort: LOW. Impact: MED (reward satisfaction).**

---

## Design Guidance

**Immediate (1 sprint):** F5 (fail screen bars), F7 (W1 order), F3 (W1 timer +60s), F12 (chest speed+bold).  
**Medium (2 sprints):** F1 (objective UI redesign), F6 (interactive tutorial), F2 (particle feedback).  
**High-Priority (next sprint):** F24 (endgame hub paths), F15 (ascension unlock).

---

**Document:** `/Users/ohadfisher/git/boggle-new/fe-next/docs/audits/adventure-mode-2026-05-01-fun.md`
