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

/** Parse `hsl(H S% L%)` → { h, s, l }, or null if not an hsl() value. */
function parseHsl(value: string): { h: number; s: number; l: number } | null {
  const m = value.match(/hsl\(\s*([\d.]+)\s+([\d.]+)%\s+([\d.]+)%/);
  return m ? { h: +m[1], s: +m[2], l: +m[3] } : null;
}

/** A hue counts as "warm/earthy" (amber→clay→plum, no cold blue/teal). */
function isWarmHue(h: number): boolean {
  // warm arc: reds/oranges/golds (0–55), warm yellow-greens up to sage (55–95),
  // and the autumnal plum/wine wrap (300–360). Cold blue/teal/lavender (160–300) excluded.
  return h <= 95 || h >= 300;
}

/** Split the full stylesheet into cosy-scoped rules (selector starts with html[data-cosy]). */
function cosyRules(css: string): string[] {
  return css.match(/html\[data-cosy=['"]true['"]\][^{}]*\{[^}]*\}/g) ?? [];
}

const AA = 4.5;

/* The cosy "paper & oak" theme is a LIGHT, warm, low-noise inversion of the loud
   dark default — sand backdrop, cream pills, charcoal text, gold/clay accents.
   jsdom can't evaluate the CSS cascade, so this contract reads globals.css as
   text, extracts the cosy token values, and runs pure WCAG + hue math on them. */
describe('cosy paper-palette contract (globals.css)', () => {
  let block: string;
  beforeAll(() => {
    block = cosyBlock(readFileSync(CSS_PATH, 'utf8'));
  });

  it('paints a LIGHT warm "paper" backdrop (sand, not the dark default)', () => {
    const navyRaw = tokenValue(block, '--neo-navy');
    const navy = parseHsl(navyRaw ?? '');
    expect(navy, '--neo-navy must be an hsl() value').toBeTruthy();
    expect(navy!.l, 'cosy bg must be LIGHT (paper), not dark').toBeGreaterThanOrEqual(70);
    expect(isWarmHue(navy!.h), `bg hue ${navy!.h} must be warm sand`).toBe(true);
    // charcoal ink is the page text colour now — it must clear AA on the sand bg
    const ink = tokenValue(block, '--neo-black');
    expect(contrastRatio(ink!, navyRaw!), 'charcoal text on sand bg').toBeGreaterThanOrEqual(AA);
  });

  it('floats cream pills lighter than the sand backdrop (so they pop)', () => {
    const cream = parseHsl(tokenValue(block, '--neo-cream') ?? '');
    const navy = parseHsl(tokenValue(block, '--neo-navy') ?? '');
    expect(cream, '--neo-cream must be hsl()').toBeTruthy();
    expect(isWarmHue(cream!.h), 'cream must stay warm').toBe(true);
    expect(cream!.l, 'cream pills must be lighter than the bg').toBeGreaterThan(navy!.l);
  });

  it('keeps --neo-white a WHITE surface but flips --foreground text to charcoal', () => {
    // --neo-white is overloaded — 283 `bg-neo-white` surfaces depend on it, so it
    // must NOT be darkened (that would turn every white surface charcoal).
    const white = tokenValue(block, '--neo-white');
    if (white !== null) expect(white, '--neo-white must stay a white surface').toBe('255 255 255');
    // The TEXT side flips instead: token foreground must point at the charcoal ink.
    const fg = tokenValue(block, '--foreground');
    expect(fg, 'cosy must override --foreground to ink (default points at white)').toBeTruthy();
    expect(fg!, '--foreground must resolve to the charcoal ink').toMatch(/neo-black/);
  });

  it('warms the structural ink to charcoal-brown (R≥B, not bluish)', () => {
    const ink = tokenValue(block, '--neo-black');
    const [r, , b] = ink!.split(/\s+/).map(Number);
    expect(r, `ink "${ink}" must be warm: red >= blue`).toBeGreaterThanOrEqual(b);
    // legible on the cream pill surface
    expect(contrastRatio(ink!, tokenValue(block, '--neo-cream')!)).toBeGreaterThanOrEqual(AA);
  });

  it('makes all four accents LIGHT warm tints, legible with CHARCOAL text', () => {
    const ink = tokenValue(block, '--neo-black')!;
    for (const name of [
      '--neo-lime',
      '--neo-cyan',
      '--neo-pink',
      '--neo-purple',
      '--neo-yellow',
      '--neo-orange',
    ]) {
      const v = tokenValue(block, name);
      expect(v, `cosy must define ${name}`).toBeTruthy();
      expect(contrastRatio(ink, v!), `${name} vs charcoal`).toBeGreaterThanOrEqual(AA);
      const hsl = parseHsl(v!);
      if (hsl) expect(isWarmHue(hsl.h), `${name} hue ${hsl.h} must be warm/earthy`).toBe(true);
    }
  });

  it('warms muted secondary text (not the default bluish gray) AND clears WCAG AA on sand', () => {
    const muted = tokenValue(block, '--muted-foreground');
    expect(muted, 'cosy must override --muted-foreground (hardcoded bluish in :root)').toBeTruthy();
    const hsl = parseHsl(muted!);
    if (hsl) expect(isWarmHue(hsl.h), `muted-foreground hue ${hsl.h} must be warm`).toBe(true);
    // Secondary text legibility is critical for this mode's elder audience: it
    // must pass AA on the sand backdrop, not just look warm. (Regression guard
    // for the L44 = 3.17:1 fail.)
    const sand = tokenValue(block, '--neo-navy')!;
    expect(contrastRatio(muted!, sand), 'muted text on sand backdrop').toBeGreaterThanOrEqual(AA);
  });

  it('defines a functional edge strong enough for control borders + focus (>=3:1)', () => {
    const AA_UI = 3; // WCAG 1.4.11 non-text contrast
    const edge = tokenValue(block, '--cosy-edge-strong');
    expect(edge, 'cosy must define --cosy-edge-strong for input borders / focus rings').toBeTruthy();
    const sand = tokenValue(block, '--neo-navy')!;
    const cream = tokenValue(block, '--neo-cream')!;
    expect(contrastRatio(edge!, sand), 'functional edge on sand').toBeGreaterThanOrEqual(AA_UI);
    expect(contrastRatio(edge!, cream), 'functional edge on cream').toBeGreaterThanOrEqual(AA_UI);
    // The keyboard-focus indicator must use it (default sage ring is too light).
    const ring = tokenValue(block, '--ring');
    expect(ring, 'cosy must point --ring at the strong edge').toMatch(/cosy-edge-strong/);
  });

  it('re-enables a subtle paper grain, but no neon retro grid (calm, not noisy)', () => {
    expect(tokenValue(block, '--halftone-pattern'), 'paper grain must be present').not.toBe('none');
    expect(tokenValue(block, '--retro-grid-pattern'), 'no neon grid in calm mode').toBe('none');
  });

  it('softens shadows to diffuse (blur present, no hard 0px stamp)', () => {
    const md = tokenValue(block, '--shadow-md');
    expect(md, 'cosy must override --shadow-md').toBeTruthy();
    expect(md).not.toMatch(/0px\s+rgb/); // not the "Npx Npx 0px" hard stamp
  });

  it('keeps error red hot (does NOT calm safety semantics)', () => {
    // --neo-red must NOT be overridden inside the cosy block
    expect(tokenValue(block, '--neo-red')).toBeNull();
  });
});

describe('cosy structural softening + light-theme circuit-breakers (globals.css)', () => {
  const css = readFileSync(CSS_PATH, 'utf8');

  it('softens the Tailwind shadow-hard utilities under cosy', () => {
    const rule = css.match(
      /html\[data-cosy=['"]true['"]\][^{]*\.shadow-hard[^{]*\{[^}]*box-shadow:[^}]*\}/,
    );
    expect(rule, 'cosy must override .shadow-hard box-shadow').toBeTruthy();
    expect(rule![0]).not.toMatch(/0px\s+rgb/); // diffuse, not hard stamp
  });

  it('suppresses the loud halftone/comic texture overlays under cosy', () => {
    expect(
      /html\[data-cosy=['"]true['"]\][^{]*\.texture-halftone[^{]*\{[^}]*display:\s*none/.test(css),
    ).toBe(true);
  });

  it('flips hardcoded .text-white to charcoal ink (the 1279-literal circuit-breaker)', () => {
    const flip = cosyRules(css).find(
      (r) =>
        /\.text-white/.test(r) &&
        !/bg-neo-red|destructive|alert/.test(r) &&
        /color\s*:/.test(r),
    );
    expect(flip, 'cosy must override .text-white color so it survives the light bg').toBeTruthy();
    expect(flip!).not.toMatch(/color\s*:\s*(255\s+255\s+255|#fff|#ffffff|white)/i);
  });

  it('keeps white text WHITE on destructive/red surfaces (safety contrast)', () => {
    const guard = cosyRules(css).find((r) => /bg-neo-red/.test(r) && /text-white/.test(r));
    expect(guard, 'cosy must re-whiten .text-white on .bg-neo-red (charcoal on red fails AA)').toBeTruthy();
    expect(guard!).toMatch(/(255\s+255\s+255|#fff|#ffffff|white)/i);
  });
});

/* Contrast circuit-breakers from the 2026-06-05 cosy audit. The cosy palette
   flips backdrops to cream but leaves accent TEXT, neo-navy ink, `dark:`-gated
   light text, and literal slate/gray panel surfaces untouched — all of which
   fail on the light surface (measured: home 15, how-to-play 17 low-contrast
   hits → 0 after these rules). Guard them so a future palette edit can't
   silently regress the readability. */
describe('cosy contrast circuit-breakers — accent text, ink, dark:, panels (audit 2026-06-05)', () => {
  const css = readFileSync(CSS_PATH, 'utf8');
  const block = cosyBlock(css);
  const sand = tokenValue(block, '--neo-navy')!; // page backdrop
  const ink = tokenValue(block, '--neo-black')!; // charcoal

  /** Find the cosy rule whose selector matches `needle` and pull its color value. */
  function ruleColor(needle: RegExp): string | null {
    const rule = cosyRules(css).find((r) => needle.test(r) && /color\s*:/.test(r));
    if (!rule) return null;
    const m = rule.match(/[^-]color\s*:\s*([^;!]+)/); // skip background-color / border-color
    return m ? m[1].trim() : null;
  }

  it('darkens every accent-family TEXT utility to clear AA on the cream backdrop', () => {
    // The fill use of these tokens stays a light tint; only the .text-neo-* CLASS
    // colour is overridden, so accent text (wordmark, scores, headings) is legible.
    for (const family of ['lime', 'cyan', 'pink', 'purple', 'yellow', 'orange']) {
      const color = ruleColor(new RegExp(`\\[class\\*=['"]text-neo-${family}['"]\\]`));
      expect(color, `cosy must override text-neo-${family} colour`).toBeTruthy();
      expect(
        contrastRatio(color!, sand),
        `text-neo-${family} (${color}) on cream must clear AA`,
      ).toBeGreaterThanOrEqual(AA);
    }
  });

  it('flips neo-navy INK (dark text on colored fills) to charcoal', () => {
    const color = ruleColor(/\[class\*=['"]text-neo-navy['"]\]/);
    expect(color, 'cosy must override text-neo-navy (the navy var became light sand)').toBeTruthy();
    expect(color!, 'text-neo-navy must resolve to charcoal ink').toMatch(/neo-black/);
  });

  it('flips the always-on dark:text-white / dark:text-neo-white utilities to ink', () => {
    // `.dark` is force-applied app-wide, so dark:text-* stays active on the light
    // cosy surface. The class is literally `dark:text-white` — needs an escaped `\:`.
    const rule = cosyRules(css).find((r) => /\.dark\\?:text-white/.test(r) && /color\s*:/.test(r));
    expect(rule, 'cosy must override dark:text-white (escaped selector)').toBeTruthy();
    expect(rule!).toMatch(/neo-black/);
  });

  it('flips literal slate/gray PANEL surfaces to cream but spares full-screen scrims', () => {
    const panel = cosyRules(css).find(
      (r) => /\[class\*=['"]bg-slate-8['"]\]/.test(r) && /background-color\s*:/.test(r),
    );
    expect(panel, 'cosy must flip bg-slate-* panels (literal palette, no --neo var)').toBeTruthy();
    // Must NOT flip modal backdrops / scrims (they dim the page behind a dialog).
    expect(panel!, 'panel flip must exclude .fixed / .inset-0 scrims').toMatch(
      /:not\(\.fixed\)|:not\(\.inset-0\)/,
    );
    // Flips toward a LIGHT surface, not another dark value.
    expect(panel!).toMatch(/neo-navy-elevated|neo-cream|neo-navy-light/);
  });

  it('overrides the season-hero twist label (inline bright accent) to legible ink', () => {
    const rule = ruleColor(/\.season-twist-label/);
    expect(rule, 'cosy must override .season-twist-label inline accent colour').toBeTruthy();
    expect(rule!).toMatch(/neo-black/);
  });
});
