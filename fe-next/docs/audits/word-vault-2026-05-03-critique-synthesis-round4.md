# Word Vault Round-4 Critique Synthesis (2026-05-03)

Source: 4 external LLM critiques of `word-vault-2026-05-03-external-critique-brief-round4.md` (A/B/C/D below).

---

## Headline

**3 of 4 critics: Book 1 is ship-ready.** Critic B dissents on quality grounds ("decision-making weight"), not on a structural blocker. The majority lands the brief at "polish-not-structural — ship with two narrow tweaks, then start Book 2 with hook extraction first."

---

## Ship-readiness vote

| Critic | Vote | Reasoning |
|---|---|---|
| A | **YES** | "Resolved the previous stapled feel; mid-book bridge to climax works" |
| B | **NO** | "Core interactions still lack decision-making weight; player rarely asks 'what if I'm wrong?'" |
| C | **YES** | "No single blocker remains; ship as-is, ice/frost will remix beautifully" |
| D | **YES** | "Polish, not structural; remaining issues are watch-in-telemetry, not block" |

3/4 ship. Critic B's dissent is a quality bar, not a release gate.

## Per-G-item scores

| Mechanic | A | B | C | D | Avg | Verdict |
|---|---|---|---|---|---|---|
| G1 1.5 fragment puzzle | 4 | 3.5 | 3.5 | 4 | **3.75** | works; tactile/decision weight low |
| G2 Uri foreshadowing | 5 | 3 | 4 | 3.5 | **3.9** | mixed; B+D want one more echo |
| G3 verb-taxonomy headers | 3 | 2.5 | 2.5 | 3 | **2.75** | unanimously insufficient — extract hooks |

## Unanimous fixes (4/4)

| # | Action | Why |
|---|---|---|
| **U1** | **Extract shared verb hooks (`useReveal`, `useSequence`, `useCompose`) BEFORE Book 2 starts** | All 4: JSDoc-only contract will erode under production pressure; Book 2 will silently mutate into "REVEAL-but-special-this-time" |
| **U2** | **G1: gate the "אורי" signature reveal to puzzle COMPLETION, not center-fragment placement** | Currently the dramatic beat fires only if center is composed last. Three critics (B/C/D) flagged the same ordering bug. |

## Strong majority (3/4)

| # | Action | Dissent |
|---|---|---|
| **M1** | **Add wrong-placement feedback / micro-constraint in G1** (so it's not pure execution) | A doesn't address; B/C/D explicit |
| **M2** | **Add one ultra-light echo of אורי between 1.5 and 1.6** (line or ghost outline at altar reveal) | A/C: not needed; B/D: needed |

## Splits — needs user call

| # | Question | Camp 1 | Camp 2 |
|---|---|---|---|
| **S1** | Drop the "exactly 2 verbs per room" hard rule for Book 2? | A/B: cut it (some rooms should focus on 1 verb deeper) | C/D: keep contract, ice will remix beautifully |
| **S2** | Should items break the "silent perk" rule in Book 2? | D: loosen — give 1-2 items richer narrative surfaces | A/B/C: silent stays |

---

## What each critic ranked as "ship next"

**A:** (1) `useReveal()` hook for ice-clearing. (2) Linguistic complexity — Shoresh roots. (3) Responsive Bento-Grid for mementos.

**B:** (1) Failure states without punishment. (2) Make the Word systemic not ceremonial. (3) Enforce verbs in code not comments.

**C:** (1) Extract 3 verb hooks. (2) Prototype one ice-themed room. (3) Expert-mode toggle (disable 8s idle hints).

**D:** (1) Lock Book 1 + tiny 1.5/1.6 narrative pass only. (2) Architectural spike — migrate one Book-1 room per verb to shared hooks. (3) Design Book-2 around per-room "word moments," not just final seal.

**Convergence #1:** all 4 say "extract hooks before/at start of Book 2." (D's #2; C's #1; A's #1; B's #3)
**Convergence #2:** 3 say "fix G1 narrative timing." (D's #1; B's #2 implicit; C's G1 tweak)

---

## Recommended action scopes (pick one)

### Scope H1 — "Lock & ship" (~30 min)
Just the 2 unanimous tweaks. Defer architecture.
- U2: G1 — fire "אורי" signature ONLY when all 5 fragments composed (regardless of order). [15 min]
- M2: 1.6 entry whisper — "אחיך… אורי" when altar first appears, between 1.5 exit and 1.6 ritual. [15 min]

**What you get:** Book 1 ships clean. G3 hook extraction becomes Book 2's task #1.

### Scope H2 — "Lock & ship + architectural spike" (~2-3 hr)
H1 + extract ONE verb hook + migrate ONE room to validate.
- All of H1
- U1 partial: write `useReveal()` hook with standard thresholds + hint surfaces. Migrate 1.3 SootedWall to it. [2 hr]

**What you get:** Hook abstraction validated against existing room before Book 2 designs into it. Critic D's recommended spike.

### Scope H3 — "Full hook extraction" (~half day)
H2 + extract all 3 hooks + migrate one Book-1 room per verb.
- All of H2
- U1 full: extract `useSequence()` (migrate 1.4) + `useCompose()` (migrate 1.6 spelling seal). [3 hr]

**What you get:** Book 2 inherits real primitives, not just JSDoc. All 3 verb patterns proven against existing code. Highest cost / highest leverage.

### Skip → Book 2 design now
Accept ship-as-is majority. Treat all H-scope as Book 2's task #1.
**What you get:** Faster start on Book 2 design. Risk: hooks designed without an existing-room validation reference.

### Splits to resolve regardless
- **S1 (2-verbs hard rule):** D's defense ("contract is template") vs A+B's flexibility argument. My read: keep the contract for Book 2; can relax in Book 3+ if data shows constraint hurts.
- **S2 (silent items):** D's flex point. My read: keep silent rule; loosen only if a specific item demands voice.

---

## Files touched per scope

**Scope H1:**
- `components/word-vault/scenes/OldKitchenScene.tsx` — change `showSignature` trigger from "center composed" to "5/5 composed"
- `components/word-vault/scenes/LastRecipeScene.tsx` — add 1.6-entry whisper "אחיך… אורי" via useEffect on mount
- 0 new files, ~15 lines changed

**Scope H2 adds:**
- New `lib/word-vault/hooks/useReveal.ts` — abstracts wipe-style reveal (threshold per item, perk modifiers)
- `components/word-vault/scenes/SootedWallScene.tsx` — migrate to `useReveal`
- ~150 lines changed/added

**Scope H3 adds:**
- `lib/word-vault/hooks/useSequence.ts` + `useCompose.ts`
- ColdStoveScene + LastRecipeScene migrated
- ~350 lines changed/added; meaningful tests for the hooks
