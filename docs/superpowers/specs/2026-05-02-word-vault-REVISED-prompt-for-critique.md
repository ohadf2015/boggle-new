# Word Vault — Revised Plan (Round 2) for External Critique

> **For the user:** copy this entire file into ChatGPT-5 / Gemini-2.5-Pro / Grok / DeepSeek for a SECOND ROUND of critique. This round validates whether the cuts we made are right — not initial review. Self-contained.

---

## CRITIQUE PROMPT (paste at top — sets LLM role)

You are a senior game-design + game-engineering reviewer. This is **round 2** of critique on the **Word Vault** project.

**Round 1** (4 reviewers) converged on these cuts:
- Cut Hebrew launch (English-only v1)
- Cut from 8 riddle types to 3-4
- Cut audio + lateral + pattern riddles entirely
- Cut Books 2-5 from launch (Book 1 + Hub only)
- Cut multiple consumables to single Hint Token
- Cut Pixi+React DOM hybrid for puzzle rooms (DOM-only puzzles, Pixi only for Hub + cinematics)
- Cut 30-second debounce persistence (write-through on every room-solve)
- Cut content-as-TypeScript (move to Supabase JSONB, hot-reloadable)
- Cut Rive state machines for non-Melo characters (Lottie everywhere else)
- Stretched timeline from 10 weeks to ~12 weeks for Book 1 demo only

**Your task NOW:** validate the revised plan. Specifically:

1. **Did we cut too much?** What survives could be too thin — does Book 1 alone justify a launch? Did we lose what makes the game *special* (e.g., did dropping Hebrew lose the differentiation against Wordlike/Spellatro)?
2. **Did we cut too little?** Is 12 weeks for Book 1 + 4 riddle engines + Supabase content pipeline still ambitious? What else should go?
3. **Are the new architecture decisions sound?** DOM-only puzzles vs Pixi, JSONB content layer, write-through persistence, Lottie-mostly with Rive only for Melo.
4. **Did we add the right tech/services?** See section 5. Are there better tools? Missing ones?
5. **Is the new wall sentence right?** "Every room must teach a mechanic AND reveal a piece of a broken heart. If it does neither, it is the corruption — cut it."
6. **Anything STILL missing for 'feel alive and well'?** Round 1 reviewers flagged: failure-as-lore, environmental persistence post-redemption, NPC observational reactivity, "just exist" moments, dynamic audio. We added all of these. What's left?

Format: same as round 1 — top 5 things still wrong, top 3 architecture risks, top 5 missing alive details, top 3 STILL-cut-more candidates, separate story + riddle critiques, 1-sentence wall.

---

# 1. THE BACKGROUND (1 paragraph)

Word Vault is a story-driven puzzle-adventure web game. Player is **Melo**, a sticker-illustrated marshmallow-cube mascot, journeying chamber-by-chamber through a corrupted Vault to redeem his four sibling-cousins (Cinder/Frost-Mute/Forgotten/Ciphermaster) by understanding who they were before corruption — solving puzzle rooms, collecting items, advancing story. No combat, no permadeath. Tone: eerie fairytale (Inscryption-meets-Layton). Built on existing LexiClash codebase (~30k LoC: Next.js 16, Pixi.js 8, Hebrew dictionary, RTL infrastructure, mascot library, Supabase).

# 2. THE REVISED SCOPE — BOOK 1 ONLY DEMO

**One book. Eight rooms. English-only. ~12 weeks.**

The launch is **Book 1: The Hearth Halls** (Cinder's redemption arc). Books 2-5 = roadmap, added later based on Book 1 demo retention/conversion analytics.

## 8 rooms of Book 1

1. **Threshold** — Word Constraint (tutorial, F-I-R-E spell)
2. **Recipe Wall** — Logic/Sequence + Word Constraint (order recipes + spell ingredients)
3. **Burnt Diary** — Lateral text-riddle ("What rises when kneaded, falls when sliced?")
4. **Cipher Pantry** — Cipher (anagram unscramble: jars labeled with scrambled ingredients)
5. **Smouldering Vault** — Logic/Sequence (lever order from rhyme; rewards Cael's Recipe Book)
6. **Fire-Pit Match** — Word + Spatial hybrid (drag a path through tiles whose first letters spell F-E-A-S-T)
7. **Cael's Old Kitchen** — Story-only "just exist" room (no puzzle; click 5 objects for memories)
8. **Last Recipe (Redemption)** — Hybrid memory + word + emotional choice (cook 3 ingredients in Cael's order; 3rd correct word redeems Cinder)

## 4 riddle engine types (down from 8)

- **A. Word Constraint** (LexiClash dictionary trie, drag-adjacent input, locale-aware)
- **B. Cipher** (substitution + anagram unscramble)
- **C. Logic/Sequence** (lever order, button press order)
- **D. Memory** (flash-then-recall)

Cut entirely: ❌ Spatial (folded into Word+Spatial hybrid in room 1.6 only) · ❌ Audio · ❌ Lateral as standalone (folded into Burnt Diary as text-only) · ❌ Pattern recognition

## Inventory simplified

- 1 currency: **Memory Coins** (no Word Fragments, no Letter Tokens until Book 2)
- 1 consumable: **Hint Token** (replaces Hint Lantern + Rewind Hourglass + Wick Spark)
- Permanent items earned in Book 1: Melo's Lantern, Cael's Recipe Book, Cinder Charm
- No charm-equip system (charms passive auto-effect for v1)

# 3. STORY ESSENTIALS

- **Melo's internal arc** — added doubt: "Why did I sleep through the corruption?" Echoes through 8 rooms.
- **Cael's specific recurring motifs** — humming melody (heard in 4 rooms), the apron (seen in 3), his signature dish ingredients (referenced from room 1.2 onward, payoff in 1.8)
- **Cinder reacts to wrong answers with character** — "Cael wouldn't have…" — failure delivers lore
- **Hub visibly changes after Cinder redemption** — fireplace warms, ash settles
- **Twin Voice still teased but not present in Book 1** — single ominous note in Cael's diary hints at the larger arc

# 4. NEW ARCHITECTURE (round-2 locked)

| Concern | Decision (round 2) | Rationale |
|---|---|---|
| Puzzle-room rendering | **DOM + CSS + framer-motion**, not Pixi | Round 1 said Pixi+DOM hybrid was "worst of both" for mobile touch. DOM gives native input, easier accessibility. |
| Hub + cinematics | **Pixi.js 8 + GSAP** | Reserve Pixi for ambient/atmospheric scenes only |
| Mascot animation | **Rive (.riv) for Melo only**; Lottie (.json) for everyone else | Rive's state-machine power only worth the runtime cost for the central character |
| State management | **Zustand** (single store this time, not split) + **XState** for the 4 riddle engines | Round 1 questioned XState; decision: keep XState for engines (4 of them), drop runtime/game store split |
| Persistence | **Supabase write-through** on every room-solve event + localStorage as offline buffer | Round 1 flagged the 30s debounce as save-loss risk |
| Content (riddles + dialogue + flow) | **Supabase JSONB tables** with TypeScript schema validation, hot-reloadable | Round 1 flagged hardcoded TS as iteration bottleneck |
| i18n | **EN-only v1**; existing `next-intl` infra ready for HE in v1.5 | Round 1 unanimously said RTL launch too risky |
| Audio | **Howler 2.2** with 3 buses (music + sfx + ambient), simple ducking | Down from 5 buses |
| Routing | **Next.js 16 App Router** at `app/[locale]/word-vault/` | Already in repo |
| Testing | **Vitest** unit + **Playwright** e2e on solve/fail flows | Existing |
| Telemetry | **Sentry** + **PostHog** events on every room enter / solve / fail / hint | Existing |

# 5. ALL TECHNOLOGIES + SERVICES (with rationale)

## Runtime libraries

| Library | Version | Role | Why |
|---|---|---|---|
| **Next.js** | 16 (App Router) | App framework | Already in repo |
| **TypeScript** | 5.9 | Lang | Already in repo |
| **Pixi.js** | 8.17 | Hub + cinematics rendering | High-perf 2D where it matters |
| **GSAP** | 3.14 | Tweens + timelines | Best-in-class easing |
| **framer-motion** | latest | DOM-side puzzle-room animations | Replaces Pixi for puzzle rooms |
| **Howler.js** | 2.2 | Audio | Mature, sprite-friendly |
| **Zustand** | latest | Global state | Lightweight, persistable |
| **XState** | 5.x | Riddle engine FSMs | Per-riddle state machines |
| **Rive (@rive-app/canvas)** | latest | Mascot reactive states | State-machine driven Melo |
| **dotLottie / lottie-web** | latest | Cinematic moments + NPC anims | Lighter than Rive for one-offs |
| **Tailwind CSS** | 3.4 | Styling | Already in repo |
| **next-intl** | latest | i18n (English v1, prepared for Hebrew v1.5) | Already in repo |
| **Zod** | latest | Schema validation for JSONB content | Type-safe content |
| **react-hot-toast** | latest | Inline notifications (item earned) | Already in repo |

## Backend / data

| Service | Role | Notes |
|---|---|---|
| **Supabase** | Postgres + Auth + Realtime + Storage | Already wired in LexiClash |
| **Supabase JSONB tables** | Content (riddles, dialogue, room configs) | Round-2 addition: hot-reloadable content |
| **Supabase Edge Functions** | Riddle solution validation + anti-cheat | For future cloud-validated solves |
| **Redis (Upstash via Railway)** | Session-scoped temporary state | Already in stack; not heavily used here |
| **Railway** | Hosting + CI/CD | Already deployed |

## AI + content generation

| Service | Role | Notes |
|---|---|---|
| **fal-ai** (Flux 2 Pro/Max + image-to-image) | Sprites, backgrounds, item icons, NPC variants | User has account; image-to-image with `celebration.webp` as anchor for brand consistency |
| **Suno** | Music (5 chapter themes + hub + redemption stinger) | User-generated; user has Suno |
| **CassetteAI** (via fal-ai) | Sound effects (~30 clips, ≤30s each) | Cheap SFX gen |
| **ElevenLabs API** | Voice narration + cousin barks (optional v1) | Multilingual; user has API access |
| **Claude / GPT-5** | Story dialogue drafts + riddle authoring assistant | Already using |
| **DeepL API** | Hebrew translation polish (v1.5) | Pro tier ~$25/mo |

## Animation + asset pipeline

| Tool | Role |
|---|---|
| **Rive Editor** | Author Melo's state-machine `.riv` file ($14/mo Studio) |
| **LottieFiles / After Effects** | Author cinematic Lottie animations (free / per-seat AE) |
| **Figma** | UI mocks + asset specs |
| **TexturePacker** | Sprite atlas optimization |
| **ffmpeg + ffprobe** | Audio sprite generation, conversion |
| **rembg** | Background removal for fal-ai sprite outputs (already used for mascot pipeline) |

## Telemetry + ops

| Service | Role |
|---|---|
| **Sentry** | Error monitoring + RUM perf | Already wired |
| **PostHog** | Event tracking (room solved, hints used, abandonment, time-per-room) | Already wired |
| **Crashlytics** (via Capacitor wrap) | Native Android crash reporting | Already wired |
| **Vercel Analytics** | Web vitals (or Railway-native equivalent) | Optional |

## Dev tooling

| Tool | Role |
|---|---|
| **Vitest** | Unit tests (engine logic, riddle solvers) |
| **Jest + RTL** | React component tests |
| **Playwright** | E2E flow tests |
| **husky** + **lint-staged** | Pre-commit lint/test |
| **storybook** (optional) | Riddle-engine component sandbox for designer iteration |
| **Decap CMS** OR **Sanity** OR **direct Supabase admin UI** (consideration) | Headless CMS for non-dev riddle authoring |
| **GitHub Actions** | CI |
| **Capacitor 6** | Android wrap | Already deployed to Play Store |

## Open considerations (asking critic LLMs to weigh in)

- **Should we add a real CMS** (Decap free, Sanity ~$99/mo, Strapi self-host) or hand-roll an admin UI in Next.js for riddle authoring?
- **Should we use ContentLayer or MDX** for narrative authoring instead of JSONB?
- **Is framer-motion the right DOM animation lib**, or should we use Motion (formerly framer-motion) v11+ specifically, or another?
- **Should Rive go away entirely v1** and use only Lottie for everything?
- **Should we add Tone.js** for the dynamic audio behaviors (lowpass on menu open, music intensity rises near solution) — or is Howler enough?
- **Should we use Vercel Edge Config or Cloudflare KV** to cache the JSONB content for hot reads?

# 6. NEW ALIVENESS SYSTEMS (added per round 1)

- ✅ Cousin reacts to wrong answers with character voice
- ✅ Hub visibly changes after each cousin redemption (Book 1 only redeems Cinder)
- ✅ NPC observational reactivity (Librarian comments based on solve speed / hints used)
- ✅ "Just exist" room per book (Cael's Old Kitchen, room 1.7)
- ✅ Dynamic audio (lowpass on menu, music brightens near solution)
- ✅ Thematic particle trails on tile drag (embers in Hearth, snow in Lullaby Vault future)
- ✅ Memory Theatre folded into inventory (no separate UI)
- ✅ Quiet ambient breathing in idle (mascot, NPCs)

# 7. NEW TIMELINE (12 weeks for Book 1 demo)

| Phase | Weeks | What |
|---|---|---|
| A. Foundation | 1-2 | Module skeleton, types, Zustand, XState shells, Hub UI in Pixi, riddle-room shell in DOM |
| B. 4 riddle engines | 3-4 | Word Constraint, Cipher, Logic, Memory — DOM/framer-motion |
| C. Content pipeline (Supabase JSONB) | 5 | Schema, hot-reload, admin UI for authoring |
| D. Book 1 content (8 rooms) | 6-8 | Authored riddles, Cael dialogue, Cinder redemption cinematic, Memo's internal arc |
| E. Polish + Suno music + ElevenLabs SFX + Rive Melo | 9-10 | Audio mixing, Rive state machine for Melo, Lottie for Cael cinematic |
| F. Internal playtest | 11 | 5 testers, refine solve rates, fix friction |
| G. Public Book 1 demo (English) | 12 | Launch, gather PostHog analytics |

**Books 2-5 = post-launch roadmap**, ~6 weeks each. Total game cycle ~18 months for full 5-book release.

# 8. THE WALL SENTENCE (round-2 locked)

> **"Every room must teach a mechanic AND reveal a piece of a broken heart. If it does neither, it is the corruption — cut it."**

# 9. SPECIFIC ROUND-2 CRITIQUE QUESTIONS

## On the cuts

1. By cutting Hebrew, did we lose our biggest market differentiator (vs. EN-only Wordlike/Spellatro)? Should HE actually ship in v1 if we accept tighter scope elsewhere?
2. Cutting from 8 riddle types to 4 — do the 4 we kept (Word Constraint, Cipher, Logic, Memory) carry enough variety for an 8-room demo? Should we swap any?
3. Cutting Books 2-5 from launch — is "Book 1 + Hub" actually a satisfying demo, or will players feel they only got a teaser?
4. Cutting Pixi for puzzle rooms in favor of DOM+framer-motion — will this lose visual richness, or is it net-positive for input fidelity?
5. Cutting Rive for everyone except Melo — will Lottie-rest deliver the "alive and well" feel, or is the inconsistency a flaw?

## On the architecture

6. Supabase JSONB for riddle content vs. a real CMS (Decap / Sanity / Strapi) vs. ContentLayer/MDX — which is right for ~50 riddles × 5 locales by full launch?
7. Single Zustand store vs. round 1's two-store split — is one store actually simpler or just delaying inevitable refactor?
8. XState for 4 riddle engines — still overkill, or right-sized once we have multiple instances per type?
9. Write-through persistence on every room-solve — too chatty for Supabase free tier, or fine?
10. Supabase Edge Functions for riddle validation — needed v1, or trust client until v2?

## On the tech/service list (Section 5)

11. Did we miss any critical service? (Specifically asking about: real-time multiplayer / co-op puzzle solving, AI-powered hint generation, social/share moments, push notifications via FCM, leaderboard service)
12. Is our AI stack (fal-ai + Suno + CassetteAI + ElevenLabs + Claude) the right combination, or should we consolidate?
13. Should we add a dedicated **animation timeline editor** (e.g., Theatre.js) for cinematic moments?
14. Should we add a **Tone.js** layer for the dynamic audio behaviors, or is Howler enough?
15. Should we add **Cloudflare KV / Vercel Edge Config** to cache JSONB content reads at the edge?
16. Is **Rive's $14/mo Studio** justified for one character (Melo), or should we do everything in Lottie?

## On story + tone

17. Melo's "Why did I sleep through it?" arc — is one line of inner doubt enough, or does Melo need actual choice moments?
18. The Twin Voice teased only by a single diary note in Book 1 — adequate setup, or under-foreshadowed?
19. Cael's redemption riddle (cook 3 ingredients in correct order) — is it earned and emotional, or mechanical?

## On the wall sentence

20. Is "teach a mechanic AND reveal a piece of a broken heart" the right kill criterion? Or should it be looser ("OR" instead of "AND") to allow some pure-mechanic rooms?

## On scope vs ambition

21. 12 weeks for Book 1 demo is the new estimate. Realistic for solo + AI tools, or still fantasy?
22. Should we cut even more — e.g., 6 rooms instead of 8, or 3 riddle types instead of 4?
23. Should we ship a **5-room "vertical slice"** (~6 weeks) before committing to all 8?

# 10. WHAT I WANT FROM YOU

- **Validate or reject the cuts.** Did round-1 critique steer us right, or are we now under-scoping?
- **Pressure-test the architecture decisions.** Especially DOM-only puzzles + JSONB content + write-through persistence.
- **Identify NEW risks** introduced by the cuts (e.g., "shipping Book 1 alone with no Books 2-5 visible roadmap = no compelling reason to play it").
- **Critique the tech stack list.** Anything missing? Anything redundant?
- **Suggest the 1 new sentence I should print on the wall** if the current one is wrong.

End of round-2 plan. Tear it apart.
