import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * The Pro tier card shipped `bg-neo-navy-light` (#16213e) with `text-neo-black` on its
 * heading, its price and every feature row — a contrast ratio of 1.32:1 on the one card
 * whose entire job is selling the upgrade. The Free card beside it used `text-neo-white`
 * on the same ground and read fine, which is what made it survive review: the section
 * looked half-correct.
 *
 * Same shape as the education hero (background flipped dark, foreground tokens left
 * behind) and the same shape as `lib/__tests__/placeholderContrast.test.ts`, where a
 * white placeholder sat on a white field.
 *
 * This computes the real WCAG ratio from the shipped hex values rather than blocklisting
 * token pairs. A blocklist ("never `text-neo-black` next to `bg-neo-navy`") goes vacuous
 * the moment somebody changes the background to a colour the list doesn't name — which is
 * precisely how this bug arrived, and precisely what happened next: the Pro card was
 * recoloured to `bg-neo-lime`, so an earlier version of this file asserting the Pro check
 * marks were `text-neo-lime` "matching the Free card" would now demand lime on lime. That
 * assertion is dropped on purpose, not lost. What it was really protecting is legibility,
 * which the ratio check below enforces without caring which colour either card ends up.
 */
const SECTION = path.resolve(__dirname, '../ProFramingSection.tsx');

/** Shipped values, `app/globals.css` :root (the dark theme — this app is dark-only). */
const TOKENS: Record<string, string> = {
  'neo-navy': '#1a1a2e',
  'neo-navy-light': '#16213e',
  'neo-navy-elevated': '#2a2a4e',
  'neo-cream': '#fffef0',
  'neo-black': '#000000',
  'neo-white': '#ffffff',
  'neo-lime': '#bfff00',
  'neo-cyan': '#00ffff',
  'neo-pink': '#ff1493',
};

function luminance(hex: string): number {
  const channels = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const [r, g, b] = channels.map((c) =>
    c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4,
  );
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(fg: string, bg: string): number {
  const [hi, lo] = [luminance(fg), luminance(bg)].sort((a, b) => b - a);
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * The two cards and the landmark that ends each, keyed on comments already in the file so
 * the test reads the same signposts a person does.
 *
 * Bounded by the NEXT CARD rather than by the next comment of any kind: both cards carry
 * explanatory comments inside them now, and an any-comment bound clips the Pro card off
 * before its first text token — which reads as "no tokens found" rather than as a pass or
 * an honest failure.
 */
const CARDS: Array<[label: string, endsAt: string]> = [
  ['Free Tier', 'Pro Tier'],
  ['Pro Tier', 'Why now'],
];

function cardBlock(src: string, label: string, endsAt: string): string {
  const start = src.indexOf(`{/* ${label} */}`);
  expect(start, `no "${label}" comment in ProFramingSection.tsx`).toBeGreaterThan(-1);
  const rest = src.slice(start + label.length);
  const end = rest.indexOf(`{/* ${endsAt}`);
  expect(end, `no "${endsAt}" landmark after the ${label} card`).toBeGreaterThan(-1);
  return rest.slice(0, end);
}

/** Background token of the first element in the block that declares one. */
function backgroundOf(block: string): string {
  const match = /\bbg-(neo-[a-z-]+?)(?:\/\d+)?[\s"]/.exec(block);
  expect(match, 'card block declares no bg-neo-* background').toBeTruthy();
  return match![1];
}

describe('ProFramingSection contrast', () => {
  const src = fs.readFileSync(SECTION, 'utf8');

  // Both tiers, so neither can regress. The Free card is the control: it was always
  // correct, so a change that breaks it means the test itself has drifted.
  for (const [label, endsAt] of CARDS) {
    it(`keeps the ${label} card readable against its own background`, () => {
      const block = cardBlock(src, label, endsAt);
      const bgToken = backgroundOf(block);
      const bg = TOKENS[bgToken];
      expect(bg, `unknown background token bg-${bgToken} — add it to TOKENS`).toBeTruthy();

      // Each element is checked against ITS OWN ground: an element that declares a
      // background sits on that, everything else inherits the card's. Attributing every
      // token in the block to the card background reports the Pro CTA — which declares its
      // own fill and is perfectly legible — as a 1.07:1 failure.
      //
      // Opacity suffixes are dropped deliberately: a dimmed foreground is strictly worse
      // than its solid form, so checking the solid form is the lenient case and anything
      // failing here fails harder in the browser.
      const failures: string[] = [];
      let sawText = false;

      for (const [, className] of block.matchAll(/className="([^"]*)"/g)) {
        const ownBg = /\bbg-(neo-[a-z-]+?)(?:\/\d+)?(?:\s|$)/.exec(className)?.[1];
        const groundToken = ownBg ?? bgToken;
        const ground = TOKENS[groundToken];
        if (!ground) continue;

        for (const [, fgToken] of className.matchAll(/\btext-(neo-[a-z-]+?)(?:\/\d+)?(?:\s|$)/g)) {
          const fg = TOKENS[fgToken];
          if (!fg) continue;
          sawText = true;
          const ratio = contrast(fg, ground);
          if (ratio < 4.5) {
            failures.push(`text-${fgToken} on bg-${groundToken} = ${ratio.toFixed(2)}:1`);
          }
        }

        // Same bug, quieter, and it shipped alongside the text one: the rule under the
        // price was `border-neo-black/20` over navy — 1.07:1 even at full opacity — so the
        // divider was simply absent. WCAG 1.4.11 puts non-text UI at 3:1.
        // `border-neo-thick` and friends fall out here: they resolve to no hex in TOKENS.
        for (const [, edgeToken] of className.matchAll(/\bborder-(neo-[a-z-]+?)(?:\/\d+)?(?:\s|$)/g)) {
          const edge = TOKENS[edgeToken];
          if (!edge) continue;
          const ratio = contrast(edge, ground);
          if (ratio < 3) {
            failures.push(`border-${edgeToken} on bg-${groundToken} = ${ratio.toFixed(2)}:1`);
          }
        }
      }

      expect(sawText, `no text-neo-* tokens found in the ${label} card`).toBe(true);
      expect(
        [...new Set(failures)],
        'WCAG AA: 4.5:1 for body copy, 3:1 for borders and other non-text UI',
      ).toEqual([]);
    });
  }

  it('imports no motion helper it never renders', () => {
    // `import { m } from 'framer-motion'` rode in with the section and is unused. framer-motion
    // is not tree-shaken out of the client bundle by an unused named import in every setup,
    // and this page is the teacher acquisition path.
    if (!/from ['"]framer-motion['"]/.test(src)) return;
    const imported = /import\s*\{([^}]*)\}\s*from\s*['"]framer-motion['"]/.exec(src)?.[1] ?? '';
    for (const name of imported.split(',').map((s) => s.trim()).filter(Boolean)) {
      const uses = [...src.matchAll(new RegExp(`\\b${name}\\.[A-Za-z]`, 'g'))].length
        + [...src.matchAll(new RegExp(`<${name}\\b`, 'g'))].length;
      expect(uses, `'${name}' is imported from framer-motion but never used`).toBeGreaterThan(0);
    }
  });
});
