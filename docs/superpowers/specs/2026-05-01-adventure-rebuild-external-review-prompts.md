# Adventure Rebuild — External LLM Review Prompts

Five copy-paste prompts to ask other LLMs (GPT-5, Gemini 2.5 Pro, Grok, DeepSeek, etc.) to stress-test, enhance, or break the design before we commit to a plan.

Each is self-contained — paste into a fresh chat with no prior context.

---

## Shared context block (paste at the top of every prompt)

```
You are reviewing an early-stage design for rebuilding the "Adventure" mode of LexiClash, a multilingual word-game app (web + Capacitor mobile + CrazyGames embed; locales: en, he-RTL, sv, ja, es).

Current state: the team has shipped Adventure as a grid-based word-hunt with bolt-on systems (special tiles, mutators, mechanics, daily quests, weekly challenges, story beats, bosses on the same grid). It accreted complexity for months without ever feeling fun. Daily audit fixes have not produced escape velocity. The team is nuking it and rebuilding.

Pieces being preserved: the WorldMap component (looks great), the Hub screen, the Shop, Achievements, and Runes (as concept). Skill tree concept is preserved but must actually affect gameplay this time.

Vision: roguelike-RPG. "Slay the Spire" structure. A run = ~10–14 rooms on a branching node graph (combat, treasure, event, shop, camp, elite, boss). 3 chapters in v1. Per-room uniqueness. Death ends the run; meta progression persists.

Combat: turn-based-lite. Hero on a Pixi battlefield. The "attack action" opens a word-grid panel — you spell a word from a limited tile pool. Word strength (length × rarity × skill multipliers) = damage. Enemy telegraphs incoming attacks; player can defend, dodge (skill check), or use active skills.

Bosses: multi-phase, scripted. Each boss has a bespoke gimmick — e.g., "vowel-only damage", "letters wither each turn", "must spell a themed word ≥ 6 letters", with cinematic phase changes.

Non-combat rooms: dialogue events with branching choices, treasure mini-games, shrine upgrades, traps (skill check), shops. Some rooms have *zero* word interaction — pure RPG choice.

Visual ambition: spectacular. Per-chapter unique theme (forest / clockwork / aetherglass placeholders). Per-level unique background (AI-generated via fal-ai flux), unique shader preset, unique enemy roster. Bosses get fully bespoke arenas + shader filters.

Tech stack already in repo:
- Next.js 16 (App Router) + TypeScript
- Pixi.js 8.17, GSAP 3.14, Howler 2.2, matter-js 0.20 (already installed)
- Tailwind for non-canvas UI
- Supabase (Postgres + RLS) + Redis
- Express + Socket.IO server (multiplayer parts unrelated to Adventure)
- Vitest + Jest + Playwright
- 5 locales with RTL Hebrew

Architecture intent: Pixi canvas renders the battlefield (hero, enemies, particles, filters, GSAP-driven cinematics). React/DOM renders the word-input panel, HUD, and modals on top of the canvas with `pointer-events: none` on the canvas. Howler handles audio buses (music, SFX, ambience). matter-js for occasional physics (debris, falling letter tiles). Run state in Zustand or React context; persisted to Supabase + localStorage; resume on reload.

Out of scope for v1: endless mode, boss-rush, weekly challenges, daily quests, story beats, mastery, ascension, flash challenges, mechanics, mutators, themed-word system, special tiles. (All being deleted.)
```

---

## Prompt 1 — Game Design / Gameplay Reviewer

```
[paste shared context above]

ROLE: You are a senior game designer who has shipped roguelike-RPGs (Slay the Spire-likes, Hades-likes) and word-game hybrids (Spelltower, Babble Royale, Knotwords). You play and ship games, not theorize about them.

TASK: Stress-test the gameplay loop. Find the moments players will quit, and the design choices that will silently fail in playtest.

Address specifically:
1. The "spell-a-word-as-attack" core loop — what kills the fantasy? Where does it feel like a chore vs a spell? Is there a better verb framing than "attack"?
2. Word-game-fans-vs-RPG-fans tension: which audience is being underserved? How to widen without diluting?
3. The room-type mix (50% combat / 1 elite / 1-2 treasure / 1-2 event / 1 shop / 1 camp / 1 boss). Realistic? Boring? What's missing?
4. Boss design — multi-phase with bespoke gimmicks. What real boss-design pitfalls does this proposal walk into? Suggest 3 distinct boss archetypes that would land.
5. Skill tree + runes + gear + per-run upgrades — overlap risk? Players won't grok the difference. How to make each layer feel distinct and meaningful?
6. Death + meta-progression curve — what's the right ratio of "lost" vs "kept" on death to keep momentum without trivializing failure?
7. Word-skill ceiling: a strong word player will trivialize fights. How does the design protect against and reward skill?

FORMAT: Punchy, opinionated, specific. Cite real games for comparisons. End with the top 3 changes you'd make today.
```

---

## Prompt 2 — Technical Architecture / Frontend Reviewer

```
[paste shared context above]

ROLE: You are a senior frontend / WebGL engineer who has shipped Pixi.js 8 + React games at production scale (mobile + web + iframe embeds). You understand bundle size, jank, GC pauses, and the cost of every filter pass.

TASK: Review the architecture for hidden traps. Find what will break under real load on a mid-tier Android device or in a CrazyGames iframe.

Address specifically:
1. Pixi 8 + React lifecycle — proposed pattern is canvas under React DOM (`pointer-events: none` on canvas, React HUD on top). Risks? Better patterns? Should the word-panel ever live inside Pixi?
2. State architecture — Zustand vs React context vs reducer-based combat machine (xstate-like). What survives 10k playtests? What handles "phase change interrupts current animation" cleanly?
3. Asset pipeline — AI-generated backgrounds + per-chapter shader presets + Spine/Lottie cinematics. How do we keep mobile bundle / over-the-wire payload sane? Lazy-loading per-chapter is obvious; what's the second-order trap?
4. GSAP + Pixi ticker coordination — running both schedulers risks fighting. Recommended pattern?
5. Howler audio buses with chapter-themed music + combat-state ducking + RTL/locale considerations (none for audio, but mute-on-background is a thing). Watch-outs?
6. matter-js usage scope — when does physics actually pay rent in this game? When is it tech-debt larping as juice?
7. Run state persistence — localStorage + Supabase round-trip on every room transition. Latency, conflict, anti-cheat risk in a single-player mode that grants meta currency. What's the right boundary?
8. Test strategy — unit tests for word/damage formulas are easy. How do we test a Pixi-rendered cinematic without snapshot-test pain? Recommend a layered approach.
9. Performance budget — propose explicit targets: FPS floor, JS heap, draw calls, particle counts, texture memory, time-to-first-room.

FORMAT: Specific code-level recommendations preferred over abstract advice. Name libraries/patterns by name. Flag any architectural choice that will not survive 18 months of feature pressure.
```

---

## Prompt 3 — Visual / Aesthetic Reviewer

```
[paste shared context above]

ROLE: You are a senior art director / technical artist who has shipped 2D games with hand-feel: Cuphead, Hollow Knight, Hades, Inscryption, Tunic. You think in shader passes, palette discipline, and where ornament earns its keep.

The brand context:
- Neo-Brutalist refined: hard pixel shadows, solid borders, electric color-coded modes (lime / pink / cyan / purple), Fredoka + Rubik fonts, kawaii marshmallow-cube mascot.
- Dark navy base. Quirky, electric, party-energy. NOT cute-soft, NOT corporate, NOT glassmorphism.
- Phone + TV/party screen + RTL Hebrew. 5 locales.

TASK: Pressure-test the art and feel direction. The team wants "spectacular" — this often produces noisy, palette-broken, theme-incoherent results.

Address specifically:
1. How do we make 3 chapters feel *meaningfully different* without breaking the brand or fragmenting the visual language? Concrete: what's locked-shared (UI chrome, fonts, mascot), what's chapter-flexible (palette, shaders, motion language)?
2. AI-generated backgrounds (fal-ai flux) — what art direction prompt scaffolding ensures consistency vs the famous "AI slop" pitfall? What's the human-in-the-loop step that's non-negotiable?
3. Pixi shader presets per chapter — recommend 3 distinct shader looks that fit the brand (one per starter chapter). Be specific about effects (CRT? heat-haze? watercolor? halftone? bloom + chromatic aberration?).
4. Combat juice priority list — for one fight, what 5 effects (in order of player impact) absolutely need to land? What 5 are tempting but should be cut?
5. Boss room visual identity — what makes a boss arena feel like a *place* and not a re-skinned combat room? Cite specific games that nail this.
6. RTL Hebrew + word panel + battlefield — any visual traps when the entire UI mirrors but the Pixi battlefield doesn't? How do other RTL games solve this?
7. Mobile vs desktop vs TV (party mode) — same scene, three viewports. How do we author once and serve three? What breaks first?

FORMAT: Specific reference games and films. Name palettes. Reject vague adjectives. End with a 1-page art bible (palettes per chapter, shader stack, motion vocabulary, do/don't).
```

---

## Prompt 4 — Asset Pipeline / Production Reviewer

```
[paste shared context above]

ROLE: You are a 2D-game production lead who has shipped indie roguelikes with a small team and AI tools. You optimize for "ship 3 chapters in 6 weeks at quality without burning the team."

TASK: Cost the production pipeline. Find what eats the schedule.

Address specifically:
1. fal-ai flux for backgrounds — realistic per-chapter asset count? Hours per asset including human curation? Recommended models (flux-pro / flux-realism / flux-schnell)?
2. Enemy + boss sprite production — AI-gen, hand-painted, or hybrid? Skeletal animation (Spine pro is paid; DragonBones / pixi-spine open) vs frame-by-frame vs procedural Pixi (no sprite)?
3. Cinematic moments (intro, boss reveal, victory, death) — Lottie? Bespoke Pixi+GSAP scripts? Pre-rendered video? Tradeoffs?
4. Audio — 3 chapters of music, ~50 SFX, voiced barks? Cost / time / sources (Suno, ElevenLabs, royalty-free)?
5. Localization for cinematic text + boss dialogue — 5 locales × N strings. How to keep the translation pipeline from blocking ship?
6. Recommended team allocation across 6 weeks if 1 dev + 1 designer + AI tools. What is the smallest *good* v1 vs the smallest *acceptable* v1?
7. Hidden costs that ship-blocked similar projects you've seen — list them.

FORMAT: Concrete numbers (hours, costs, asset counts). Schedule risk in green / yellow / red. End with a "scope cut order" — first thing to drop if behind.
```

---

## Prompt 5 — Adversarial / "Find What's Wrong" Reviewer

```
[paste shared context above]

ROLE: You are a brutally honest senior reviewer. Your job is not to be balanced. Your job is to find what's wrong before the team commits.

TASK: Read the design and tear it down. Then rebuild it sharper.

Required output:
1. The 5 hidden assumptions that will sink this project. Be specific.
2. The 3 features that should be deleted from v1 *right now* even though the team thinks they're core.
3. The 1 feature that's missing and should be promoted to v1.
4. The architecture decision most likely to require a painful rewrite within 12 months. Name the rewrite.
5. The audience misread — the design is courting which player and ignoring which? Is the targeted player real?
6. The competition the team is ignoring. Name the games that will eat this product's lunch and explain why. (Word-RPG hybrid space includes: Spelltower, Knotwords, Babble Royale, Word Forward, Bookworm Adventures, Letter Quest. Roguelike space: Slay the Spire, Inscryption, Hades.)
7. The single sentence that, if printed on the team's wall, would prevent the most damage over the project. Write it.

FORMAT: No diplomatic softening. Cite specifics from the design. If a section is good, say so once and move on.
```

---

## Suggested workflow

1. Paste **Prompt 5 (adversarial)** first into 2 different models. Compare what they kill.
2. Paste **Prompt 1 (gameplay)** into your strongest reasoning model. This is the one with the highest leverage — the gameplay loop is the bet.
3. Paste **Prompt 2 (architecture)** into a coding-strong model.
4. Paste **Prompt 3 (visual)** when the team's about to commit to a chapter art direction.
5. Paste **Prompt 4 (production)** before locking the schedule.

Bring the responses back to this Claude Code session — we'll fold the strongest critiques into the design before writing the implementation plan.
