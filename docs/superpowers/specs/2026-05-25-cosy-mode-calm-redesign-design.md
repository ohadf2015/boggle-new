# Cosy Mode → Calm "Parchment-on-Dusk" Redesign

**Date:** 2026-05-25
**Status:** Design (autonomy directive: proceed to plan + implementation without approval gate)
**Owner:** Ohad
**Related:** memory `cosy-calm-mode-2026-05-24` (original cosy ship `f7b404906`); `.claude/rules` design context; `.impeccable.md`

## Problem

The current cosy mode "looks off." Investigation confirms why: it is a **half-measure**. Today `html[data-cosy='true']` (globals.css ~3794–3824) *only desaturates the four accent hues* (lime/pink/cyan/purple) while keeping everything that makes the UI loud:

- Dark cold navy background (`--neo-navy #1a1a2e`)
- Hard pixel shadows (`Npx Npx 0px black`, zero blur — the "stamped" brutalist look)
- Thick solid **black** borders (`--neo-black: 0 0 0`)
- Halftone dot overlay + retro grid on `body`
- Dense, element-heavy layout

Result: a washed-out version of the same loud UI — not a different vibe.

**User intent:** "change the colors not just reduce hue, make it less noisy and calm, maybe even light mode, cleaner UI, more spacy, fewer elements. A different vibe totally."

## Non-Goal: True Light-Background Mode (deferred, with reason)

Evaluated flipping the page background to white/light. **Blocked, HIGH risk, out of scope for this pass:**

- Light theme is **vestigial dead code**: `ThemeContext` hard-codes `theme: 'dark'`, actively strips `.light` and forces `.dark` on mount, and there is no toggle UI.
- **~4,778 hardcoded light-text usages** assume a dark background. Critically, **1,279 are literal `text-white`** (not token-backed → a CSS-variable override cannot reach them), and ~322 are `text-neo-white`/`text-neo-cream` directly on `bg-neo-navy`.
- The tokens are **overloaded**: `--neo-cream` is both light *text* and card *background*; `--neo-white` is both light *text* and `bg-neo-white/10` *overlays*. Neither can be flipped cleanly.

Safe light mode therefore requires a tree-wide component refactor (token-ize text colors, split overloaded tokens), not a token swap. **This redesign delivers the calm/clean/spacious/light *feeling* via the levers below without flipping the page bg. If the result still reads too dark, the light-mode refactor is the explicit next effort.**

## Approach: token-level theme rewrite (cascades app-wide, ~0 component edits)

The neo-brutalist look funnels through a tiny set of CSS variables, all consumed by Tailwind `neo-*` utilities and named `.shadow-hard*`/`.border-neo*`/`.card-neo` classes. Overriding tokens under `html[data-cosy='true']` recolors the whole app — matching the existing cosy architecture (OR-mask + CSS cascade, fully reversible by removing the attribute).

### The levers

1. **Softened, warmed background (stays dark — contrast floor enforced).**
   Lift and warm the navy/abyss family from cold near-black to a calm "dusk" slate:
   - `--neo-navy: hsl(222 13% 23%)`, `--neo-navy-light: hsl(222 12% 27%)`, `--neo-abyss*` → proportionally darker dusk tones.
   - **Contrast floor (hard rule):** white text on the new background must clear **4.5:1 (WCAG AA)**, verified against the `text-neo-white/70` opacity variant (lower contrast than full white, and common). Pick the lightest dusk that still clears the floor.

2. **Cream cards become the dominant, airy surface ("parchment").**
   Most of what the user sees is `.card-neo`/`.neo-card`/`.neo-panel` cream surface, not navy chrome. Make cards read as predominantly light:
   - `--neo-cream: hsl(40 30% 97%)` (warm near-white, slightly warmer than today's `#fffef0`).
   - Bigger padding, softer diffuse shadow, thinner border on cosy cards → page reads as light cream with calm chrome around it.

3. **Soft diffuse shadows (kill the pixel stamp).**
   - Override `--shadow-sm/md/lg/xl/pressed` to blurred, low-alpha shadows (e.g. `--shadow-md: 0 2px 6px rgba(20,20,35,0.10)`) — catches `.shadow-hard*` globals classes, `.btn-neo`, `.card-neo`.
   - Add explicit cosy overrides for the **Tailwind** `shadow-hard*` utilities (these are defined in tailwind.config.js as literal `Npx Npx 0px rgb(var(--neo-black))` and do *not* read `--shadow-*`):
     `html[data-cosy] .shadow-hard, …-sm, …-lg, …-xl { box-shadow: <soft diffuse>; }`
   - Remaining inline arbitrary `shadow-[2px_2px_0px_…]` usages are recolored (not de-blurred) by lever 4 → gray-offset, acceptably calmer.

4. **Soft borders + softened structural ink.**
   - `--neo-black: 0 0 0` → warm charcoal triplet (e.g. `48 50 64`). This recolors **every** border (`border-neo*`, `border-neo-black`, hard shadow color), text stroke, and focus ring from harsh black to soft charcoal globally. `--neo-black` is *not* used for backgrounds, so this is safe; charcoal-on-cream text stays ≥10:1.
   - `--border-neo: 2px → 1px`, `--border-neo-thick: 3px → 1.5px` (token-based borders thin; literal `border-3/4` keep thickness but soften to charcoal — color matters more than width for calm).

5. **De-noise (remove decorative overlays).**
   - `--halftone-pattern: none;` and `--retro-grid-pattern: none;` (consumed on `body`) → kills the dot + grid texture.
   - Suppress `.texture-halftone`, `.texture-halftone-lg`, `.texture-halftone-comic`, `.texture-halftone-comic-light` pseudo-element overlays under cosy.

6. **New cohesive-but-discriminating calm palette (the user's "change colors, not reduce hue").**
   Retune the four families to a *different* harmonized character — sage / dusty-rose / calm-teal / muted-lavender — kept at mid-light lightness so the dominant **black(charcoal)-text-on-accent** pattern stays legible. **Mode color-coding is structural and must remain distinguishable** (lime=primary, pink=MP, cyan=SP, purple=brain), so the four stay four *distinct hues*, not unified into one tone:

   | Role (mode)        | Today (loud) | New calm anchor        |
   |--------------------|--------------|------------------------|
   | lime (primary)     | `#bfff00`    | sage `hsl(100 25% 58%)` |
   | pink (multiplayer) | `#ff1493`    | dusty rose `hsl(348 42% 68%)` |
   | cyan (single)      | `#00ffff`    | calm teal `hsl(185 30% 56%)` |
   | purple (brain)     | `#8b5cf6`    | muted lavender `hsl(262 30% 66%)` |

   Each gets `-light/-muted/-dark` tints in the same family. `--neo-yellow`/`--neo-orange` (celebration) softened modestly.
   - **Safety semantics preserved:** `--neo-red` (error/destructive) stays hot — *not* calmed.
   - Known minor tension: the ~292 `text-neo-white`-on-colored-accent cases get slightly lower contrast on mid-light accents. Not worsened materially vs today's cosy (same lightness band). The contrast probe (below) flags any specific high-traffic offender for targeted fix; we do not darken the whole palette (that would break the dominant black-text-on-accent pattern).

7. **More space + softer type (airy, calm).**
   - Cosy spacing layer: increase padding/gap on a small set of key layout containers (main content gutters, card interiors, stack gaps) via cosy CSS — bounded, not a global multiplier (avoids layout breakage).
   - Soften heading weight / lift line-height + letter-spacing slightly under cosy for breathing room. (Heavy text-shadow/stroke already softens via lever 4.)

8. **Fewer elements (concrete suppression list — no vagueness).**
   Removed/hidden under cosy:
   - Decorative overlays: halftone (token), retro grid (token), `.texture-halftone*` classes (levers 5).
   - Component opt-outs via `useCosyMode()` in the highest-traffic surfaces (final list confirmed during implementation; target set):
     1. Home/landing: decorative mode "feature badges"/chrome chips that don't drive navigation.
     2. Game-complete screens: collapse secondary stat tiles to essentials (score / words / next).
     3. HUD: hide non-essential ambient indicators (e.g. combo flair) when not actionable.
     4. Background ambient FX layers (sparkles/confetti ambient) already reduced via existing `celebrationIntensity:'gentle'` + `shouldReduceMotion` — confirm none re-introduce noise.
   - Each opt-out is additive and reversible (`cosyMode ? null : <decoration/>`), no change to loud mode.

### QA affordance

- Add a `?cosy=1` / `?cosy=0` URL force-toggle (read once on mount in AccessibilityContext, applies for the session) so QA can verify cosy without flipping admin state. Does not change the admin gate or persistence.

### Admin gate — unchanged

Stays admin-only soft launch (`isAdmin &&` at the settings row + onboarding `calmMode` splice). Ungate later by removing `isAdmin &&`. No change here.

## Components / files touched

- **`app/globals.css`** — rewrite the `html[data-cosy='true']` block: bg/cream/black tokens, shadow tokens, border tokens, halftone/grid → none, new palette, Tailwind `shadow-hard*` + `.texture-halftone*` cosy overrides, cosy card/spacing/type rules. (Primary surface.)
- **`contexts/AccessibilityContext.tsx`** — add `?cosy=` URL force-toggle read on mount. (Small.)
- **2–4 high-traffic components** — `useCosyMode()` opt-outs per the suppression list. (Surgical, additive.)
- **No changes** to `lib/cosy/cosyPreferences.ts` logic, the OR-mask, timer clamp, confetti chokepoint, or the admin gate — all already correct.

## Testing strategy

- **Token assertions (Vitest/jsdom):** with `data-cosy='true'` set on `documentElement`, assert key tokens differ from default (`--neo-navy`, `--neo-black`, `--halftone-pattern: none`, a sample accent). Guards against silent CSS regressions.
- **`?cosy=` toggle (unit):** mounting with `?cosy=1` enables cosy; `?cosy=0` disables; absent → falls back to stored/admin behavior.
- **Component opt-out tests:** each gated component renders the decoration when cosy off, omits it when cosy on.
- **Contrast probe (Playwright, the gate):** on 2–3 representative surfaces (a navy-bg page, a cream card, a mode button) with cosy on, assert computed text/bg contrast ≥ 4.5:1 for primary text, including a `text-neo-white/70` sample. Visual-regression is overkill for this pass; contrast is the gate.
- Existing cosy tests (`lib/cosy/__tests__/*`, `AccessibilityContext.cosy.test.tsx`) must stay green.

## Reversibility & risk

- Toggle off = remove `data-cosy` attribute → instant full revert. Loud mode untouched (all cosy styling is scoped under the attribute).
- Main risk = contrast on the lifted background and on mid-light accents; mitigated by the explicit floor + Playwright probe gate. If the probe fails on a surface, darken that surface's bg token or fix the specific text usage — do not abandon the approach.
- i18n: no new user-facing strings expected beyond what already exists; if any added, he/sv/ja/es native review pending (note in commit).

## Out of scope

- True light-background mode (see Non-Goal — separate refactor).
- Removing the admin gate / public rollout.
- Pixi/canvas in-game scene recoloring beyond existing motion/celebration reductions (founder live-verify territory; not CSS-reachable).
