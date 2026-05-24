# Cosy Mode → Calm "Parchment-on-Dusk" Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform cosy mode from a hue-desaturation half-measure into a genuinely calm "parchment-on-dusk" theme — softened warm-dusk background, dominant airy cream cards, soft diffuse shadows, soft charcoal borders, no decorative noise, and a new cohesive-but-mode-discriminating palette — all via CSS-token overrides under `html[data-cosy='true']` (≈0 component edits), plus a `?cosy=` QA toggle.

**Architecture:** The neo-brutalist look funnels through a handful of CSS custom properties (`--neo-navy`, `--neo-black`, `--neo-cream`, `--shadow-*`, `--border-neo*`, `--halftone-pattern`, the four accent families) consumed by Tailwind `neo-*` utilities and named `.shadow-hard*`/`.border-neo*`/`.card-neo` classes. Overriding them under `html[data-cosy='true']` cascades app-wide and reverts instantly when the attribute is removed. Palette legibility is locked by a pure WCAG-contrast contract test that parses `globals.css` directly.

**Tech Stack:** Next.js 16, TypeScript, Tailwind (var-backed `neo-*` utilities), CSS custom properties in `app/globals.css`, Vitest (jsdom + node fs), React Testing Library.

**Spec:** `docs/superpowers/specs/2026-05-25-cosy-mode-calm-redesign-design.md`

---

## File Structure

| File | Responsibility | Action |
|------|----------------|--------|
| `fe-next/lib/cosy/colorContrast.ts` | Pure WCAG color parsing + contrast ratio (hex / `hsl(h s% l%)` / `rgb()` / bare `r g b` triplet) | Create |
| `fe-next/lib/cosy/__tests__/colorContrast.test.ts` | Unit tests for the pure module | Create |
| `fe-next/lib/cosy/__tests__/calmPalette.contract.test.ts` | Reads `app/globals.css`, extracts the `html[data-cosy='true']` token values, asserts presence + per-pair contrast floors + de-noise | Create |
| `fe-next/app/globals.css` | Rewrite the `html[data-cosy='true']` block (palette/bg/cream/charcoal/borders/shadow tokens) + add cosy de-noise / Tailwind `shadow-hard*` softening / `.texture-halftone*` suppression / cosy card+spacing+type rules | Modify (~3794–3824 block + new cosy rules) |
| `fe-next/contexts/AccessibilityContext.tsx` | `?cosy=1`/`?cosy=0` session URL override threaded into `effective` | Modify |
| `fe-next/contexts/__tests__/AccessibilityContext.cosyUrl.test.tsx` | Tests the URL override (enable/disable/absent) | Create |

**Out of this plan (deferred, founder live-verify after deploy — see spec "Fewer elements"):** React component element-suppression sweep (hiding decorative badges / collapsing secondary stat tiles via `useCosyMode()`). The CSS de-noise + airy cards already deliver the bulk of "cleaner / fewer / spacier"; the component sweep needs live visual judgment and is tracked separately.

---

## Canonical cosy token values (the design target)

These exact values go into `globals.css` (Tasks 3–4) and are asserted by the contract test (Task 2). The contract test is authoritative for the *floors*; if any assertion fails, nudge the offending value (typically lightness ±a few %) until it passes — do **not** weaken the floor.

**Background (warm dusk, white text ≥ 4.5:1):**
```
--neo-navy:          hsl(222 13% 23%)
--neo-navy-light:    hsl(222 12% 28%)
--neo-navy-elevated: hsl(222 12% 31%)
--neo-navy-radial:   hsl(222 13% 25%)
--neo-abyss:         hsl(222 16% 15%)
--neo-abyss-deep:    hsl(222 18% 11%)
--neo-abyss-mid:     hsl(222 16% 17%)
--neo-abyss-light:   hsl(222 15% 20%)
--neo-gray:          hsl(222 10% 34%)
```

**Surface (dominant cream card) + structural ink (charcoal, not black):**
```
--neo-cream: hsl(40 33% 97%)     /* warm near-white */
--neo-black: 56 58 72            /* warm charcoal triplet — recolors ALL borders/shadows/strokes/rings */
```
(`--neo-white: 255 255 255` stays — white text on dusk bg + on dark accents.)

**Soft diffuse shadows (kill the pixel stamp):**
```
--shadow-sm:      0 1px 2px rgba(20, 20, 35, 0.10)
--shadow-md:      0 2px 6px rgba(20, 20, 35, 0.10)
--shadow-lg:      0 6px 16px rgba(20, 20, 35, 0.12)
--shadow-xl:      0 12px 28px rgba(20, 20, 35, 0.14)
--shadow-pressed: inset 0 1px 2px rgba(20, 20, 35, 0.12)
```

**Borders (thin; color softens via charcoal `--neo-black`):**
```
--border-neo:       1px
--border-neo-thick: 1.5px
```

**De-noise:**
```
--halftone-pattern:   none
--retro-grid-pattern: none
```

**New calm accent palette — distinct hues, each safe for its dominant text color.**
Bright families (lime/cyan + yellow/orange) carry **black/charcoal** text → keep them light. Dark families (pink/purple) carry **white** text → keep them dark enough.
```
/* lime → sage (black text) */
--neo-lime:        hsl(110 24% 64%)
--neo-lime-light:  hsl(110 22% 74%)
--neo-lime-muted:  hsl(110 18% 56%)
--neo-lime-dark:   hsl(110 22% 46%)

/* cyan → calm teal (black text) */
--neo-cyan:        hsl(185 30% 64%)
--neo-cyan-light:  hsl(185 28% 74%)
--neo-cyan-muted:  hsl(185 24% 56%)
--neo-cyan-dark:   hsl(185 28% 46%)

/* pink → dusty rose (white text) */
--neo-pink:        hsl(345 40% 50%)
--neo-pink-light:  hsl(345 38% 62%)
--neo-pink-muted:  hsl(345 30% 44%)
--neo-pink-dark:   hsl(345 36% 38%)

/* purple → muted lavender (white text) */
--neo-purple:        hsl(262 30% 52%)
--neo-purple-light:  hsl(262 30% 64%)
--neo-purple-muted:  hsl(262 24% 46%)
--neo-purple-dark:   hsl(262 30% 40%)

/* celebration accents — softened, black text */
--neo-yellow:        hsl(45 60% 66%)
--neo-yellow-hover:  hsl(45 56% 60%)
--neo-orange:        hsl(28 55% 64%)
--neo-orange-hover:  hsl(28 52% 58%)
```
**`--neo-red` (#ff3366) is NOT overridden** — error/destructive stays hot (safety semantics).

---

## Task 1: Pure WCAG contrast module

**Files:**
- Create: `fe-next/lib/cosy/colorContrast.ts`
- Test: `fe-next/lib/cosy/__tests__/colorContrast.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// fe-next/lib/cosy/__tests__/colorContrast.test.ts
import { describe, it, expect } from 'vitest';
import { parseColor, relativeLuminance, contrastRatio } from '../colorContrast';

describe('parseColor', () => {
  it('parses #rrggbb hex', () => {
    expect(parseColor('#ffffff')).toEqual({ r: 255, g: 255, b: 255 });
    expect(parseColor('#000000')).toEqual({ r: 0, g: 0, b: 0 });
  });
  it('parses #rgb shorthand', () => {
    expect(parseColor('#fff')).toEqual({ r: 255, g: 255, b: 255 });
  });
  it('parses modern space-separated hsl()', () => {
    const black = parseColor('hsl(0 0% 0%)');
    expect(black).toEqual({ r: 0, g: 0, b: 0 });
    const white = parseColor('hsl(0 0% 100%)');
    expect(white).toEqual({ r: 255, g: 255, b: 255 });
  });
  it('parses comma hsl() and rgb()', () => {
    expect(parseColor('hsl(0, 0%, 100%)')).toEqual({ r: 255, g: 255, b: 255 });
    expect(parseColor('rgb(255 255 255)')).toEqual({ r: 255, g: 255, b: 255 });
  });
  it('parses a bare "r g b" triplet (used by --neo-black/--neo-white)', () => {
    expect(parseColor('56 58 72')).toEqual({ r: 56, g: 58, b: 72 });
  });
});

describe('contrastRatio', () => {
  it('returns 21 for black vs white', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 0);
  });
  it('returns 1 for identical colors', () => {
    expect(contrastRatio('#345678', '#345678')).toBeCloseTo(1, 5);
  });
  it('is order-independent', () => {
    expect(contrastRatio('#111111', '#eeeeee')).toBeCloseTo(
      contrastRatio('#eeeeee', '#111111'),
      5,
    );
  });
  it('relativeLuminance: white=1, black=0', () => {
    expect(relativeLuminance('#ffffff')).toBeCloseTo(1, 3);
    expect(relativeLuminance('#000000')).toBeCloseTo(0, 3);
  });
});
```

- [ ] **Step 2: Run, verify it fails**

Run: `cd fe-next && npx vitest run lib/cosy/__tests__/colorContrast.test.ts`
Expected: FAIL — `Cannot find module '../colorContrast'`.

- [ ] **Step 3: Implement the module**

```typescript
// fe-next/lib/cosy/colorContrast.ts
export interface RGB {
  r: number;
  g: number;
  b: number;
}

function hslToRgb(h: number, s: number, l: number): RGB {
  const sat = s / 100;
  const lig = l / 100;
  const c = (1 - Math.abs(2 * lig - 1)) * sat;
  const hp = (((h % 360) + 360) % 360) / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  let r1 = 0;
  let g1 = 0;
  let b1 = 0;
  if (hp >= 0 && hp < 1) [r1, g1, b1] = [c, x, 0];
  else if (hp < 2) [r1, g1, b1] = [x, c, 0];
  else if (hp < 3) [r1, g1, b1] = [0, c, x];
  else if (hp < 4) [r1, g1, b1] = [0, x, c];
  else if (hp < 5) [r1, g1, b1] = [x, 0, c];
  else [r1, g1, b1] = [c, 0, x];
  const m = lig - c / 2;
  return {
    r: Math.round((r1 + m) * 255),
    g: Math.round((g1 + m) * 255),
    b: Math.round((b1 + m) * 255),
  };
}

/** Parse a CSS color string into 0–255 RGB. Supports #hex, hsl(), rgb(), and a bare "r g b" triplet. */
export function parseColor(input: string): RGB {
  const str = input.trim();

  if (str.startsWith('#')) {
    let hex = str.slice(1);
    if (hex.length === 3) hex = hex.split('').map((c) => c + c).join('');
    const n = parseInt(hex, 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }

  const hsl = str.match(/^hsl\(\s*([\d.]+)[,\s]+([\d.]+)%[,\s]+([\d.]+)%\s*\)$/i);
  if (hsl) return hslToRgb(parseFloat(hsl[1]), parseFloat(hsl[2]), parseFloat(hsl[3]));

  const rgbFn = str.match(/^rgb\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)\s*\)$/i);
  if (rgbFn) return { r: +rgbFn[1], g: +rgbFn[2], b: +rgbFn[3] };

  const triplet = str.match(/^([\d.]+)\s+([\d.]+)\s+([\d.]+)$/);
  if (triplet) return { r: +triplet[1], g: +triplet[2], b: +triplet[3] };

  throw new Error(`Unparseable color: "${input}"`);
}

/** WCAG relative luminance (0–1). Accepts a color string or already-parsed RGB. */
export function relativeLuminance(color: string | RGB): number {
  const { r, g, b } = typeof color === 'string' ? parseColor(color) : color;
  const lin = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/** WCAG contrast ratio (1–21), order-independent. */
export function contrastRatio(a: string | RGB, b: string | RGB): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const [hi, lo] = la >= lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}
```

- [ ] **Step 4: Run, verify it passes**

Run: `cd fe-next && npx vitest run lib/cosy/__tests__/colorContrast.test.ts`
Expected: PASS (all cases).

- [ ] **Step 5: Do NOT commit yet** — commit after the full implementation phase (per `.claude/rules/22-tdd-strict.md`). Continue to Task 2.

---

## Task 2: Calm-palette contract test (RED — drives the CSS)

This test reads the real `app/globals.css`, extracts the `html[data-cosy='true']` block, and asserts the new tokens exist and meet contrast floors. It fails now (current cosy block lacks `--neo-navy`, `--neo-cream`, `--neo-black`, `--halftone-pattern: none`, etc.).

**Files:**
- Create: `fe-next/lib/cosy/__tests__/calmPalette.contract.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// fe-next/lib/cosy/__tests__/calmPalette.contract.test.ts
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { contrastRatio } from '../colorContrast';

const CSS_PATH = resolve(__dirname, '../../../app/globals.css');

/** Extract the body of the first `html[data-cosy='true'] { ... }` rule. */
function cosyBlock(css: string): string {
  const m = css.match(/html\[data-cosy=['"]true['"]\]\s*\{([\s\S]*?)\}/);
  if (!m) throw new Error("No html[data-cosy='true'] block found in globals.css");
  return m[1];
}

/** Read a `--token: value;` declaration's value from a block. */
function tokenValue(block: string, name: string): string | null {
  const m = block.match(new RegExp(`${name}\\s*:\\s*([^;]+);`));
  return m ? m[1].trim() : null;
}

const AA = 4.5;

describe('cosy calm-palette contract (globals.css)', () => {
  let block: string;
  beforeAll(() => {
    block = cosyBlock(readFileSync(CSS_PATH, 'utf8'));
  });

  it('overrides the background to a warm dusk (not the loud default)', () => {
    const navy = tokenValue(block, '--neo-navy');
    expect(navy, 'cosy must override --neo-navy').toBeTruthy();
    // white text on the dusk bg must clear AA, incl. headroom for /70 opacity variants
    expect(contrastRatio('255 255 255', navy!)).toBeGreaterThanOrEqual(6);
  });

  it('keeps cream surface light and charcoal ink legible on it', () => {
    const cream = tokenValue(block, '--neo-cream');
    const ink = tokenValue(block, '--neo-black');
    expect(cream, 'cosy must define --neo-cream').toBeTruthy();
    expect(ink, 'cosy must soften --neo-black to charcoal').toBeTruthy();
    expect(ink).not.toBe('0 0 0'); // softened, not pure black
    expect(contrastRatio(ink!, cream!)).toBeGreaterThanOrEqual(AA);
  });

  it('removes decorative noise', () => {
    expect(tokenValue(block, '--halftone-pattern')).toBe('none');
    expect(tokenValue(block, '--retro-grid-pattern')).toBe('none');
  });

  it('softens shadows to diffuse (blur present, no hard 0px stamp)', () => {
    const md = tokenValue(block, '--shadow-md');
    expect(md, 'cosy must override --shadow-md').toBeTruthy();
    expect(md).not.toMatch(/0px\s+rgb/); // not the "Npx Npx 0px" hard stamp
  });

  it('bright accents (sage/teal/yellow/orange) stay legible with BLACK text', () => {
    const ink = '0 0 0';
    for (const name of ['--neo-lime', '--neo-cyan', '--neo-yellow', '--neo-orange']) {
      const v = tokenValue(block, name);
      expect(v, `cosy must define ${name}`).toBeTruthy();
      expect(contrastRatio(ink, v!), `${name} vs black`).toBeGreaterThanOrEqual(AA);
    }
  });

  it('dark accents (rose/lavender) stay legible with WHITE text', () => {
    const white = '255 255 255';
    for (const name of ['--neo-pink', '--neo-purple']) {
      const v = tokenValue(block, name);
      expect(v, `cosy must define ${name}`).toBeTruthy();
      expect(contrastRatio(white, v!), `${name} vs white`).toBeGreaterThanOrEqual(AA);
    }
  });

  it('keeps error red hot (does NOT calm safety semantics)', () => {
    // --neo-red must NOT be overridden inside the cosy block
    expect(tokenValue(block, '--neo-red')).toBeNull();
  });
});
```

- [ ] **Step 2: Run, verify it fails**

Run: `cd fe-next && npx vitest run lib/cosy/__tests__/calmPalette.contract.test.ts`
Expected: FAIL — tokens like `--neo-navy`, `--neo-cream`, `--neo-black`, `--halftone-pattern`, `--shadow-md` are absent from the current cosy block (returns `null`), so the assertions fail.

- [ ] **Step 3: No implementation in this task** — Tasks 3 & 4 edit `globals.css` to make this green. Leave the test red and proceed.

---

## Task 3: Rewrite the cosy palette/background/ink tokens in `globals.css`

**Files:**
- Modify: `fe-next/app/globals.css` — the existing `html[data-cosy='true']` block (currently ~lines 3794–3824, the desaturation-only override).

- [ ] **Step 1: Replace the entire `html[data-cosy='true']` block** with the calm theme tokens.

Find the existing block (it currently sets only the four desaturated accent families + yellow/orange) and replace its full body with:

```css
html[data-cosy='true'] {
  /* ---- Calm "parchment-on-dusk" theme. Overrides cascade app-wide via
     the var-backed neo-* utilities; removing data-cosy reverts instantly. ---- */

  /* Background — warm dusk (white text stays >= AA; verified by calmPalette.contract) */
  --neo-navy: hsl(222 13% 23%);
  --neo-navy-light: hsl(222 12% 28%);
  --neo-navy-elevated: hsl(222 12% 31%);
  --neo-navy-radial: hsl(222 13% 25%);
  --neo-abyss: hsl(222 16% 15%);
  --neo-abyss-deep: hsl(222 18% 11%);
  --neo-abyss-mid: hsl(222 16% 17%);
  --neo-abyss-light: hsl(222 15% 20%);
  --neo-gray: hsl(222 10% 34%);

  /* Dominant cream card surface + softened structural ink (charcoal, not black).
     --neo-black recolours every border/shadow/text-stroke/focus-ring globally. */
  --neo-cream: hsl(40 33% 97%);
  --neo-black: 56 58 72;

  /* Soft diffuse shadows — kill the hard pixel stamp */
  --shadow-sm: 0 1px 2px rgba(20, 20, 35, 0.1);
  --shadow-md: 0 2px 6px rgba(20, 20, 35, 0.1);
  --shadow-lg: 0 6px 16px rgba(20, 20, 35, 0.12);
  --shadow-xl: 0 12px 28px rgba(20, 20, 35, 0.14);
  --shadow-pressed: inset 0 1px 2px rgba(20, 20, 35, 0.12);

  /* Thinner borders (color softens via charcoal --neo-black above) */
  --border-neo: 1px;
  --border-neo-thick: 1.5px;

  /* De-noise — drop the halftone dots + retro grid on body */
  --halftone-pattern: none;
  --retro-grid-pattern: none;

  /* New calm palette — distinct hues, mode color-coding preserved.
     Bright families carry black text; dark families carry white text. */
  /* LIME -> sage (black text) */
  --neo-lime: hsl(110 24% 64%);
  --neo-lime-light: hsl(110 22% 74%);
  --neo-lime-muted: hsl(110 18% 56%);
  --neo-lime-dark: hsl(110 22% 46%);

  /* CYAN -> calm teal (black text) */
  --neo-cyan: hsl(185 30% 64%);
  --neo-cyan-light: hsl(185 28% 74%);
  --neo-cyan-muted: hsl(185 24% 56%);
  --neo-cyan-dark: hsl(185 28% 46%);

  /* PINK -> dusty rose (white text) */
  --neo-pink: hsl(345 40% 50%);
  --neo-pink-light: hsl(345 38% 62%);
  --neo-pink-muted: hsl(345 30% 44%);
  --neo-pink-dark: hsl(345 36% 38%);

  /* PURPLE -> muted lavender (white text) */
  --neo-purple: hsl(262 30% 52%);
  --neo-purple-light: hsl(262 30% 64%);
  --neo-purple-muted: hsl(262 24% 46%);
  --neo-purple-dark: hsl(262 30% 40%);

  /* Celebration accents — softened, black text. Error red stays hot (not listed). */
  --neo-yellow: hsl(45 60% 66%);
  --neo-yellow-hover: hsl(45 56% 60%);
  --neo-orange: hsl(28 55% 64%);
  --neo-orange-hover: hsl(28 52% 58%);
}
```

- [ ] **Step 2: Run the contract test**

Run: `cd fe-next && npx vitest run lib/cosy/__tests__/calmPalette.contract.test.ts`
Expected: the palette/background/ink/shadow/de-noise assertions now PASS. (If a specific accent contrast fails, nudge its lightness ±2–4% and re-run — the floor is the gate, not the exact value.)

- [ ] **Step 3: No commit yet** — continue to Task 4 (the de-noise CSS that the token `none` values rely on for the Tailwind-utility + texture-class layers).

---

## Task 4: Cosy de-noise, shadow-utility softening, texture suppression, and airy density rules

The token overrides in Task 3 cover var-based consumers. This task adds the cosy rules that catch (a) the **Tailwind** `shadow-hard*` utilities (defined in `tailwind.config.js` as literal `Npx Npx 0px rgb(var(--neo-black))`, which do NOT read `--shadow-*`), (b) the `.texture-halftone*` pseudo-element overlays, and (c) airy spacing + softer type.

**Files:**
- Modify: `fe-next/app/globals.css` — add a new cosy rules block immediately AFTER the `html[data-cosy='true']` token block from Task 3.

- [ ] **Step 1: Add the cosy rules block**

```css
/* ---- Cosy / Calm Mode: structural softening beyond token overrides ---- */

/* Tailwind shadow-hard* utilities are literal hard stamps that don't read
   --shadow-*; soften them to diffuse under cosy. */
html[data-cosy='true'] .shadow-hard,
html[data-cosy='true'] .shadow-hard-sm,
html[data-cosy='true'] .shadow-hard-lg,
html[data-cosy='true'] .shadow-hard-xl {
  box-shadow: 0 4px 12px rgba(20, 20, 35, 0.12) !important;
}
html[data-cosy='true'] .shadow-hard-pressed {
  box-shadow: inset 0 1px 2px rgba(20, 20, 35, 0.12) !important;
}

/* Suppress decorative halftone/comic texture overlays (pseudo-elements). */
html[data-cosy='true'] .texture-halftone::before,
html[data-cosy='true'] .texture-halftone-lg::before,
html[data-cosy='true'] .texture-halftone-comic::before,
html[data-cosy='true'] .texture-halftone-comic-light::before {
  display: none !important;
}

/* Airy cream cards — bigger breathing room + soft chrome (the "parchment" feel). */
html[data-cosy='true'] .card-neo,
html[data-cosy='true'] .neo-card,
html[data-cosy='true'] .neo-panel {
  border-radius: 16px;
  padding: 1.5rem;
}

/* Softer type — lift line-height + letter-spacing, ease heavy weights. */
html[data-cosy='true'] body {
  letter-spacing: 0.01em;
  line-height: 1.65;
}
html[data-cosy='true'] h1,
html[data-cosy='true'] h2,
html[data-cosy='true'] h3 {
  font-weight: 600;
}
```

- [ ] **Step 2: Extend the contract test** to lock the de-noise + shadow-utility softening. Add this `describe` block to `fe-next/lib/cosy/__tests__/calmPalette.contract.test.ts`:

```typescript
describe('cosy structural softening (globals.css)', () => {
  const css = readFileSync(CSS_PATH, 'utf8');

  it('softens the Tailwind shadow-hard utilities under cosy', () => {
    // a cosy-scoped rule must re-declare box-shadow for .shadow-hard
    const rule = css.match(
      /html\[data-cosy=['"]true['"]\][^{]*\.shadow-hard[^{]*\{[^}]*box-shadow:[^;}]*\}/,
    );
    expect(rule, 'cosy must override .shadow-hard box-shadow').toBeTruthy();
    expect(rule![0]).not.toMatch(/0px\s+rgb/); // diffuse, not hard stamp
  });

  it('suppresses the halftone texture overlays under cosy', () => {
    expect(
      /html\[data-cosy=['"]true['"]\][^{]*\.texture-halftone[^{]*\{[^}]*display:\s*none/.test(css),
    ).toBe(true);
  });
});
```

- [ ] **Step 3: Run the full contract + contrast suite**

Run: `cd fe-next && npx vitest run lib/cosy/__tests__/`
Expected: PASS — all contract + colorContrast tests green.

- [ ] **Step 4: No commit yet** — continue to Task 5.

---

## Task 5: `?cosy=1` / `?cosy=0` session URL override

A QA affordance: force cosy on/off via URL for the session, without touching admin state or persistence. Threads the override into `effective` so both the CSS attribute AND the behavioral prefs (timer/celebration) reflect it.

**Files:**
- Modify: `fe-next/contexts/AccessibilityContext.tsx`
- Test: `fe-next/contexts/__tests__/AccessibilityContext.cosyUrl.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// fe-next/contexts/__tests__/AccessibilityContext.cosyUrl.test.tsx
import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AccessibilityProvider, useCosyMode } from '../AccessibilityContext';

function Probe() {
  return <span data-testid="cosy">{useCosyMode() ? 'on' : 'off'}</span>;
}

function setSearch(search: string) {
  Object.defineProperty(window, 'location', {
    value: { ...window.location, search },
    writable: true,
    configurable: true,
  });
}

describe('AccessibilityProvider ?cosy= URL override', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-cosy');
  });
  afterEach(() => setSearch(''));

  it('?cosy=1 forces cosy ON (default is OFF)', () => {
    setSearch('?cosy=1');
    render(
      <AccessibilityProvider>
        <Probe />
      </AccessibilityProvider>,
    );
    expect(screen.getByTestId('cosy').textContent).toBe('on');
    expect(document.documentElement.dataset.cosy).toBe('true');
  });

  it('?cosy=0 forces cosy OFF even if stored ON', () => {
    localStorage.setItem(
      'boggle_accessibility_settings',
      JSON.stringify({ cosyMode: true }),
    );
    setSearch('?cosy=0');
    render(
      <AccessibilityProvider>
        <Probe />
      </AccessibilityProvider>,
    );
    expect(screen.getByTestId('cosy').textContent).toBe('off');
    expect(document.documentElement.dataset.cosy).toBeUndefined();
  });

  it('no ?cosy param falls back to stored setting', () => {
    localStorage.setItem(
      'boggle_accessibility_settings',
      JSON.stringify({ cosyMode: true }),
    );
    setSearch('');
    render(
      <AccessibilityProvider>
        <Probe />
      </AccessibilityProvider>,
    );
    expect(screen.getByTestId('cosy').textContent).toBe('on');
  });
});
```

- [ ] **Step 2: Run, verify it fails**

Run: `cd fe-next && npx vitest run contexts/__tests__/AccessibilityContext.cosyUrl.test.tsx`
Expected: FAIL — `?cosy=1` yields `'off'` (override not implemented yet).

- [ ] **Step 3: Implement the override** in `fe-next/contexts/AccessibilityContext.tsx`.

3a. Add the override state + mount read. Insert immediately after the `systemPrefersReducedMotion` `useEffect` (after line 123):

```typescript
  // QA affordance: `?cosy=1`/`?cosy=0` forces cosy for the session (in-memory,
  // not persisted; bypasses the admin gate — cosy is a calmer view, harmless).
  const [cosyUrlOverride, setCosyUrlOverride] = useState<boolean | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const raw = new URLSearchParams(window.location.search).get('cosy');
    if (raw === '1' || raw === 'true') setCosyUrlOverride(true);
    else if (raw === '0' || raw === 'false') setCosyUrlOverride(false);
  }, []);
```

3b. Thread the override into the `effective` `useMemo` (lines 128–146). Change the `cosyMode` input and add `cosyUrlOverride` to the dependency array:

```typescript
  const effective = useMemo(
    () =>
      resolveCosyPreferences({
        cosyMode: cosyUrlOverride ?? settings.cosyMode,
        reduceMotion: settings.reduceMotion,
        systemPrefersReducedMotion,
        disableFireRoundLights: settings.disableFireRoundLights,
        disableEarthquakeEffects: settings.disableEarthquakeEffects,
        useLargeLetters: settings.useLargeLetters,
      }),
    [
      cosyUrlOverride,
      settings.cosyMode,
      settings.reduceMotion,
      systemPrefersReducedMotion,
      settings.disableFireRoundLights,
      settings.disableEarthquakeEffects,
      settings.useLargeLetters,
    ]
  );
```

(The existing `data-cosy` effect at lines 157–165 already keys off `effective.cosyMode`, so it picks up the override with no further change.)

- [ ] **Step 4: Run, verify it passes**

Run: `cd fe-next && npx vitest run contexts/__tests__/AccessibilityContext.cosyUrl.test.tsx`
Expected: PASS (all three cases).

- [ ] **Step 5: Run existing cosy tests to confirm no regression**

Run: `cd fe-next && npx vitest run lib/cosy/__tests__/ contexts/__tests__/AccessibilityContext.cosy.test.tsx`
Expected: PASS — existing `cosyPreferences`, `timerUrgency`, `celebrationScale`, and `AccessibilityContext.cosy` tests still green.

---

## Task 6: Full verification + commit

- [ ] **Step 1: Lint + typecheck + targeted tests**

Run: `cd fe-next && npm run lint && npx vitest run lib/cosy/ contexts/__tests__/AccessibilityContext`
Expected: lint clean, all cosy + accessibility tests pass.

- [ ] **Step 2: Build**

Run: `cd fe-next && npm run build`
Expected: build succeeds (CSS changes compile; no TS errors from the context edit).

- [ ] **Step 3: Live smoke (founder eyeball — cosy is admin/Pixi-gated, not headless-reliable for FX).**

Start dev (`cd fe-next && npm run dev`, port 3001 per project), open a representative page with `?cosy=1` (e.g. `/?cosy=1`, a game mode, a results screen) and confirm: warm-dusk bg, cream cards dominant + airy, soft shadows, soft charcoal borders, no halftone/grid, distinct calm mode colors, error states still red. Compare `?cosy=0`.

- [ ] **Step 4: Commit (ASK the user first — per `.claude/rules/10-git.md`).**

```bash
cd /Users/ohadfisher/git/boggle-new
git add fe-next/lib/cosy/colorContrast.ts \
        fe-next/lib/cosy/__tests__/colorContrast.test.ts \
        fe-next/lib/cosy/__tests__/calmPalette.contract.test.ts \
        fe-next/app/globals.css \
        fe-next/contexts/AccessibilityContext.tsx \
        fe-next/contexts/__tests__/AccessibilityContext.cosyUrl.test.tsx \
        docs/superpowers/specs/2026-05-25-cosy-mode-calm-redesign-design.md \
        docs/superpowers/plans/2026-05-25-cosy-mode-calm-redesign.md
git commit -m "feat(cosy): calm parchment-on-dusk theme + ?cosy= QA toggle

Rewrites cosy mode from hue-desaturation into a full calm theme via
html[data-cosy] token overrides: warm-dusk bg, dominant airy cream cards,
soft diffuse shadows, soft charcoal borders, de-noised (no halftone/grid),
new mode-discriminating palette (sage/teal/rose/lavender), error red kept
hot. Palette legibility locked by a WCAG contrast contract test that parses
globals.css. Adds ?cosy=1/0 session URL override for QA.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Deferred (separate follow-up, founder live-verify after deploy)

- **React component element-suppression sweep** — once the founder sees cosy live, identify and `useCosyMode()`-gate the highest-value decorative removals (home feature-badge chips, secondary game-complete stat tiles, non-actionable HUD flair). Each is additive (`cosyMode ? null : <deco/>`) with a render-with/without test. Not in this plan because it needs live visual judgment.
- **True light-background mode** — blocked by ~1,279 literal `text-white` usages + overloaded `--neo-cream`/`--neo-white` tokens (see spec Non-Goal). A token swap cannot achieve it; requires a tree-wide text-color token-ization refactor. Separate spec.
- **i18n:** no new user-facing strings in this plan. If the deferred sweep adds any, he/sv/ja/es native review pending.

---

## Self-Review

- **Spec coverage:** background softening (T3), parchment cards (T3+T4), soft shadows (T3 tokens + T4 Tailwind utilities), soft borders (T3), de-noise (T3 tokens + T4 texture classes), new mode-discriminating palette (T3), error red hot (T3 + contract assertion), spacing/type airiness (T4), contrast floor (T1+T2 contract), `?cosy=` toggle (T5), admin gate unchanged (untouched), light-mode non-goal (documented/deferred), fewer-elements component sweep (deferred w/ reason). All mapped.
- **Placeholder scan:** none — every code step shows complete code; CSS values are concrete; the only "identify later" item is explicitly deferred out of scope with rationale.
- **Type/name consistency:** `parseColor`/`relativeLuminance`/`contrastRatio` defined in T1 and used in T2; `cosyUrlOverride`/`setCosyUrlOverride` consistent across T5 steps; token names match between the canonical table, T3 CSS, and T2 assertions.
