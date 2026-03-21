# Tile Interaction Effects Redesign

## Problem Summary

Three feedback effects need redesign:

1. **Letter SELECT** — scale(1.05) + glow. Flat, un-satisfying.
2. **Word REJECTION shake** — `neo-shake 0.4s` with only 2 effective keyframes. Feels like a rendering glitch.
3. **Escalation shake** — continuous `translateX` on selected tiles. Indistinguishable from a browser bug.

---

## 1. Letter SELECT Effect

### Design Intent

A selected tile should feel "claimed" — like it snapped into the word. The physics should say "locked in," not "hovered over." The effect must be discrete per-tap, not a sustained state change, so rapid drag-selection reads as a staccato rhythm rather than one long blur.

### Framer Motion Config (replace current spring in GridCell.tsx)

The key change is two-phase motion: an overshoot pop on selection entry, then settle to a held state. Currently there is a single spring with stiffness 200 / damping 15 — that just drifts upward. The new config splits entry from hold.

**Entry (on selection, triggered once via `key` change on `isSelected`):**

```tsx
// On the motion.div animate prop — entry phase
animate={isSelected ? {
  scale: [1, 1.18, 1.08],          // 3-keyframe: start → overshoot → hold
  y: [0, -6, -3],                   // pops up then settles 3px lifted
  rotate: [0, -1.5, 0],            // micro-tilt: left then neutral
} : {
  scale: 1,
  y: 0,
  rotate: 0,
}}

transition={isSelected ? {
  scale: { duration: 0.18, times: [0, 0.45, 1], ease: ['easeOut', 'easeInOut'] },
  y:     { duration: 0.18, times: [0, 0.45, 1], ease: ['easeOut', 'easeInOut'] },
  rotate:{ duration: 0.18, times: [0, 0.45, 1], ease: ['easeOut', 'easeInOut'] },
} : {
  type: 'spring',
  stiffness: 300,
  damping: 22,
}}
```

**Why these numbers:**
- `1.18` overshoot is large enough to read as intentional "pop" but tiles are ~48–72px so at 1.18 they grow ~8–13px — won't overlap a neighbor at 4px gap grids.
- `0.18s` total feels snappy on a phone (under 2 frames at 60fps for the pop, settles by 11 frames).
- `-1.5deg` tilt adds energy without looking broken. Alternating tilt direction per tile (odd columns left, even right) would add more character — see implementation note below.

**Shadow change on selection (CSS inline style, already in GridCell.tsx style prop):**

Replace the current `escalation?.glow` fallback `'0 0 6px rgba(255, 200, 100, 0.3)'` with:

```
box-shadow: 0 0 0 2px rgba(255,225,53,0.9), 0 0 10px rgba(255,200,100,0.5), 2px 3px 0px rgba(0,0,0,0.8)
```

This gives:
- A tight crisp ring (2px, 0 blur) — neo-brutalist, hard-edged
- A secondary soft glow halo beyond it
- A hard drop shadow that shifts DOWN-RIGHT to reinforce the "popped up" feeling (as if the tile physically lifted)

For momentum/hot/fire escalation tiers, the ring color should follow the tier:
- tier 0 (base): ring `rgba(255,225,53,0.9)` (lime-yellow)
- tier 1 (momentum): ring `rgba(255,107,53,0.95)` (orange)
- tier 2 (hot): ring `rgba(255,20,147,0.95)` (pink)
- tier 3 (fire): ring `rgba(0,255,255,0.95)` (cyan)

**Implementation note — alternating tilt:**
Pass `(row + col) % 2 === 0 ? -1.5 : 1.5` as the tilt value. This staggers the visual rhythmically without extra state.

**For rapid drag-selection:** The `key` prop trick is already used elsewhere in this codebase. Adding `key={isSelected ? `sel-${row}-${col}` : `unsel-${row}-${col}`}` to the motion.div forces Framer Motion to re-run the entry animation each time a tile enters selection, even mid-drag. At 0.18s per tile, overlapping animations on 5+ tiles during fast dragging will compound into a ripple feel.

---

## 2. Word REJECTION Shake

### Design Diagnosis

Current `neo-shake` keyframes:
```
0%:   translateX(0)
25%:  translateX(-4px) rotate(-1deg)
75%:  translateX(4px) rotate(1deg)
100%: translateX(0)
```

Problems:
- Only 2 distinct positions — reads as "flicker" not "shake"
- Linear-ish progression means no impact moment
- 4px amplitude is too small at normal tile sizes (tiles are 48–72px; 4px is 6–8% of width)
- Rotation matches translation direction (real objects rotate AGAINST the direction they're hit)
- No color signal — the user doesn't know WHY it shook

### New Keyframes

**Replace `neo-shake` in tailwind.config.js keyframes section:**

```js
"neo-shake": {
  "0%":   { transform: "translateX(0) rotate(0deg)" },
  "8%":   { transform: "translateX(-8px) rotate(1.5deg)" },   // sharp initial hit, counter-rotate
  "18%":  { transform: "translateX(7px) rotate(-1.2deg)" },   // big rebound
  "30%":  { transform: "translateX(-5px) rotate(0.8deg)" },   // decaying
  "42%":  { transform: "translateX(4px) rotate(-0.5deg)" },
  "55%":  { transform: "translateX(-2px) rotate(0.3deg)" },
  "70%":  { transform: "translateX(1px) rotate(-0.1deg)" },
  "100%": { transform: "translateX(0) rotate(0deg)" },
},
```

**Replace `neo-shake` animation timing:**

```js
"neo-shake": "neo-shake 0.5s cubic-bezier(0.36, 0.07, 0.19, 0.97) both",
```

**Why these numbers:**
- `cubic-bezier(0.36, 0.07, 0.19, 0.97)` — high initial velocity, quick deceleration. The "thwack" feeling. Standard physics-based shake easing.
- 8 keyframes with decreasing amplitude create exponential decay (8 → 7 → 5 → 4 → 2 → 1 → 0px)
- Counter-rotation (hit right → rotate left) is physically correct and more readable
- `0.5s` total — long enough to be clearly intentional, short enough not to interfere with next action
- First hit at `8%` (40ms) — within 2–3 frames, which is perceptually "instant impact"

### Color Flash on Rejection

The shake alone reads as "wrong" but not as "NOPE." Adding a red border flash makes the rejection unmistakable. This is applied at the word level (the word display area / word-forming area), not the individual tiles, to avoid confusion with the per-tile escalation colors.

Add this keyframe:

```js
"neo-reject-flash": {
  "0%":   { borderColor: "currentColor", backgroundColor: "transparent" },
  "15%":  { borderColor: "#FF3366", backgroundColor: "rgba(255, 51, 102, 0.15)" },
  "50%":  { borderColor: "#FF3366", backgroundColor: "rgba(255, 51, 102, 0.08)" },
  "100%": { borderColor: "currentColor", backgroundColor: "transparent" },
},
```

```js
"neo-reject-flash": "neo-reject-flash 0.5s ease-out",
```

Apply `animate-neo-reject-flash` to the word display container (wherever the formed word text renders) in parallel with `animate-neo-shake` on the grid tiles.

**The combined signal reads as: tiles physically recoil + word area flashes red. Together: unambiguous, satisfying NOPE.**

---

## 3. Escalation Effect — Replace Continuous Shake

### Design Diagnosis

`escalation-tremble`, `escalation-shake`, `escalation-vibrate` all continuously translate tiles by 0.5–1.5px. The problem is not the amplitude — it is that continuous motion on stationary UI is the browser's universal "something is broken" signal. Users cannot distinguish intentional micro-motion from GPU jank.

### Replacement: Tiered Breathing Glow

Instead of shaking, tiles should visually "charge up" — like energy building. Breathing scale and glow intensity replaces translation. This reads as anticipation, not malfunction.

**New CSS keyframes (add to globals.css):**

```css
/* Tier 1 (3-4 letters): subtle pulse — barely there, awareness only */
@keyframes escalation-charge-1 {
  0%, 100% {
    box-shadow: 0 0 6px rgba(255, 107, 53, 0.35), 0 0 0 1.5px rgba(255, 107, 53, 0.5);
    transform: scale(var(--esc-scale, 1.05));
  }
  50% {
    box-shadow: 0 0 12px rgba(255, 107, 53, 0.6), 0 0 0 2px rgba(255, 107, 53, 0.75);
    transform: scale(calc(var(--esc-scale, 1.05) + 0.015));
  }
}

/* Tier 2 (5-6 letters): hot pink — clearly building */
@keyframes escalation-charge-2 {
  0%, 100% {
    box-shadow: 0 0 8px rgba(255, 20, 147, 0.4), 0 0 18px rgba(255, 107, 53, 0.2), 0 0 0 1.5px rgba(255, 20, 147, 0.6);
    transform: scale(var(--esc-scale, 1.06));
  }
  50% {
    box-shadow: 0 0 14px rgba(255, 20, 147, 0.7), 0 0 26px rgba(255, 107, 53, 0.35), 0 0 0 2.5px rgba(255, 20, 147, 0.85);
    transform: scale(calc(var(--esc-scale, 1.06) + 0.02));
  }
}

/* Tier 3 (7+ letters): cyan/fire — maximum juice, near-overflow */
@keyframes escalation-charge-3 {
  0%, 100% {
    box-shadow: 0 0 10px rgba(0, 255, 255, 0.5), 0 0 22px rgba(255, 51, 102, 0.3), 0 0 0 2px rgba(0, 255, 255, 0.7);
    transform: scale(var(--esc-scale, 1.08));
  }
  33% {
    box-shadow: 0 0 16px rgba(0, 255, 255, 0.75), 0 0 30px rgba(255, 51, 102, 0.45), 0 0 0 3px rgba(0, 255, 255, 0.9);
    transform: scale(calc(var(--esc-scale, 1.08) + 0.025));
  }
  66% {
    box-shadow: 0 0 12px rgba(255, 51, 102, 0.7), 0 0 28px rgba(0, 255, 255, 0.4), 0 0 0 2.5px rgba(255, 51, 102, 0.85);
    transform: scale(calc(var(--esc-scale, 1.08) + 0.015));
  }
}

/* Reduced motion: glow only, no scale pulse */
@media (prefers-reduced-motion: reduce) {
  @keyframes escalation-charge-1 {
    0%, 100% { box-shadow: 0 0 8px rgba(255, 107, 53, 0.5); }
    50%       { box-shadow: 0 0 12px rgba(255, 107, 53, 0.7); }
  }
  @keyframes escalation-charge-2 {
    0%, 100% { box-shadow: 0 0 10px rgba(255, 20, 147, 0.5); }
    50%       { box-shadow: 0 0 16px rgba(255, 20, 147, 0.75); }
  }
  @keyframes escalation-charge-3 {
    0%, 100% { box-shadow: 0 0 12px rgba(0, 255, 255, 0.6); }
    50%       { box-shadow: 0 0 20px rgba(0, 255, 255, 0.85); }
  }
}
```

**Animation timing:**
- tier 1: `escalation-charge-1 1.2s ease-in-out infinite`
- tier 2: `escalation-charge-2 0.9s ease-in-out infinite`
- tier 3: `escalation-charge-3 0.6s ease-in-out infinite` — fast enough to feel urgent

The cycle speed accelerates with tier to communicate increasing urgency without translating the tile.

**CSS custom property `--esc-scale`:** Set this inline on each tile via the existing `style` prop in GridCell.tsx using `escalation.scale`. This lets the keyframe animation breathe around the correct base scale rather than hardcoding it.

**Migration in selectionEscalation.ts:** Update `getEscalationShake` to return new names:

```ts
export function getEscalationShake(totalSelected, comboLevel = 0): string | undefined {
  const esc = getSelectionEscalation(0, totalSelected, comboLevel);
  if (esc.tier <= 0) return undefined;
  if (esc.tier === 1) return 'escalation-charge-1 1.2s ease-in-out infinite';
  if (esc.tier === 2) return 'escalation-charge-2 0.9s ease-in-out infinite';
  return 'escalation-charge-3 0.6s ease-in-out infinite';
}
```

Then in GridCell.tsx where the animation is composed, the return value is now the full shorthand string, so the `.filter(Boolean).join(', ')` pattern already in use will work without changes.

---

## Implementation File Map

| What changes | File | Specific location |
|---|---|---|
| `neo-shake` keyframes | `fe-next/tailwind.config.js` | `keyframes` object |
| `neo-shake` animation timing | `fe-next/tailwind.config.js` | `animation` object |
| `neo-reject-flash` keyframes + animation | `fe-next/tailwind.config.js` | `keyframes` + `animation` |
| `escalation-charge-1/2/3` keyframes | `fe-next/app/globals.css` | After existing `escalation-*` keyframes |
| `getEscalationShake` return values | `fe-next/components/grid/selectionEscalation.ts` | Lines 211–220 |
| SELECT entry animation (scale/y/rotate) | `fe-next/components/grid/GridCell.tsx` | `animate` and `transition` props |
| SELECT box-shadow (hard ring + lift) | `fe-next/components/grid/GridCell.tsx` | `style` prop `boxShadow` |
| `--esc-scale` CSS var injection | `fe-next/components/grid/GridCell.tsx` | `style` prop |
| Rejection flash on word container | Wherever the word display renders | Add `animate-neo-reject-flash` class on rejection |

---

## Reduced Motion Fallbacks

All three effects must degrade gracefully:

- **SELECT**: Remove scale animation entirely. Keep only the box-shadow ring change (instant, no transition). The ring alone communicates "selected" without motion.
- **REJECTION shake**: Replace with a 150ms border-color flash to `#FF3366` + back. No transform. Declare this as a separate `neo-shake-reduced` animation or handle via the existing `prefers-reduced-motion: reduce` block in globals.css.
- **Escalation charge**: The `@media (prefers-reduced-motion)` block in the keyframes above handles this — glow only, no scale change.

The existing `reduceMotion` prop is already threaded through `GridCell.tsx` and `GridCellEffects.tsx`, so all CSS animation injections should be guarded with the same `!reduceMotion` conditional already used on lines 180–185 of GridCell.tsx.

---

## What NOT to Change

- The existing `getEscalationBackground` color logic in `selectionEscalation.ts` is correct. The tier color progression (yellow → orange → pink → cyan/rainbow) is well-calibrated.
- The `GridCellEffects` ripple and burst particles are distinct enough from these feedback animations. Leave them.
- The `escalation.scale` and `escalation.liftY` numbers in `selectionEscalation.ts` are good. The new SELECT animation uses these same values as its settled state.
- `whileTap={{ scale: 0.95 }}` on the motion.div should stay — it provides the physical press-down feel before the selection triggers.
