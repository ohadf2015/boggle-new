import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Module-wide guard: a card border must be VISIBLE against its own fill.
 *
 * The education module shipped 123 elements carrying `border-neo-black` on a
 * `bg-neo-navy*` ground. Black on navy measures 1.23:1 — the border is not a
 * subtle border, it is no border at all, and the neo-brutalist shell depends
 * entirely on that edge. It survived review because the same token pair is
 * CORRECT on cream (black on cream is ~20:1), so the class string reads right.
 *
 * Follows `ProFramingSection.contrast.test.ts`: compute the real WCAG ratio
 * from the shipped hex values rather than blocklisting token pairs, so the
 * check keeps working when somebody introduces a new background colour.
 *
 * Gate: 3:1 (WCAG 1.4.11 non-text contrast — UI component boundaries).
 */

/** Shipped values, `app/globals.css` :root (dark-only app). */
const TOKENS: Record<string, string> = {
  'neo-navy': '#1a1a2e',
  'neo-navy-light': '#16213e',
  'neo-navy-elevated': '#2a2a4e',
  'neo-navy-radial': '#1e1e3f',
  'neo-black': '#000000',
  'neo-white': '#ffffff',
  'neo-cream': '#fffef0',
  'neo-lime': '#bfff00',
  'neo-cyan': '#00ffff',
  'neo-pink': '#ff1493',
  'neo-red': '#ff3366',
  'neo-yellow': '#ffe135',
  'neo-purple': '#8b5cf6',
  'neo-orange': '#ff6b35',
};

type RGB = [number, number, number];

function toRgb(hex: string): RGB {
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as RGB;
}

function luminance([r, g, b]: RGB): number {
  const [lr, lg, lb] = [r, g, b].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * lr + 0.7152 * lg + 0.0722 * lb;
}

function ratio(a: RGB, b: RGB): number {
  const [la, lb] = [luminance(a), luminance(b)];
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** Composite a translucent colour over an opaque one (what the browser paints). */
function over(fg: RGB, bg: RGB, alpha: number): RGB {
  return fg.map((c, i) => Math.round(c * alpha + bg[i] * (1 - alpha))) as RGB;
}

/** `neo-cream/40` → { hex, alpha }; unknown tokens → null. */
function resolve(token: string): { rgb: RGB; alpha: number } | null {
  const [name, pct] = token.split('/');
  const hex = TOKENS[name];
  if (!hex) return null;
  return { rgb: toRgb(hex), alpha: pct ? Number(pct) / 100 : 1 };
}

// Arbitrary pixel widths (`border-[2px]`) are border utilities too — without
// them a `border-[2px] border-neo-black bg-neo-navy` card (1.23:1) scanned
// green while the identical `border-2` spelling failed.
// Side-specific widths (`border-b-2`, `border-t-neo`) draw the same edge: a
// table header's `border-b-2 border-black` on navy is exactly as invisible.
const HAS_BORDER_WIDTH = /^border(-[xytrblse])?(-[0-9]|-\[\d+px\]|-neo|-neo-thick)?$/;

// `@utility border-neo` (app/globals.css) paints `solid rgb(var(--neo-black))`,
// so a bare `border-neo` with no colour token IS a black border.
const BLACK_BY_DEFAULT = /^border(-[xytrblse])?-neo(-thick)?$/;

const ROOTS = [
  'components/education',
  'components/teacher',
  'components/student',
  'app/[locale]/education',
  'app/[locale]/student',
  'app/[locale]/teacher',
  // Education surfaces living outside the education folders.
  'components/ui/EducationSkeletons.tsx',
  'components/multiplayer/ClassroomJoinNamePrompt.tsx',
  'components/adventure',
  'components/wordTowerV2',
  'app/[locale]/adventure',
  'app/[locale]/word-tower-v2',
];
const REPO = path.resolve(__dirname, '../../..');

function sourceFiles(): string[] {
  const out: string[] = [];
  const walk = (dir: string) => {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (e.name !== '__tests__' && e.name !== 'node_modules') walk(full);
      } else if (e.name.endsWith('.tsx') && !e.name.includes('.test.')) {
        out.push(full);
      }
    }
  };
  ROOTS.forEach((r) => (r.endsWith('.tsx') ? out.push(path.join(REPO, r)) : walk(path.join(REPO, r))));
  return out;
}

// `className={cn('…', cond && '…')}` carries its classes in single-quoted
// strings; a brace-limited match + quote extraction reads those too, or the
// same invisible-border bug scans green just for using cn().
const CLASS_ATTR = /className=(?:"([^"]*)"|\{`([^`]*)`\}|\{([^{}]*)\})/gs;

/** Quoted class fragments from a `{…}` expression (cn args, ternaries). */
function quotedFragments(expr: string): string {
  return (expr.match(/'[^']*'/g) ?? []).map((s) => s.slice(1, -1)).join(' ');
}

interface Violation {
  file: string;
  bg: string;
  border: string;
  ratio: number;
}

function scan(): Violation[] {
  const violations: Violation[] = [];
  for (const file of sourceFiles()) {
    const src = fs.readFileSync(file, 'utf8');
    for (const m of src.matchAll(CLASS_ATTR)) {
      const raw = m[1] ?? m[2] ?? quotedFragments(m[3] ?? '');
      // Ternaries inside a backtick template (`${earned ? 'bg-neo-navy/50' : …}`)
      // leave quotes and `${` glued to the class — strip them or the token
      // never matches and the card scans green.
      const tokens = raw
        .replace(/[`'"{}$?:]/g, ' ')
        .replace(/\s+/g, ' ')
        .split(' ')
        .filter(Boolean);
      if (!tokens.some((t) => HAS_BORDER_WIDTH.test(t))) continue;

      // Take the first token that RESOLVES, not the first that matches the
      // prefix: `border-neo-thick` is a width utility, and finding it first
      // would skip the colour token sitting right after it.
      const bgToken = tokens
        .filter((t) => t.startsWith('bg-neo-'))
        .map((t) => t.slice(3))
        .find((t) => resolve(t));
      const border = tokens
        .map((t) =>
          t.startsWith('border-neo-')
            ? t.slice(7)
            : // `border-black` is Tailwind's own black, not a neo token.
              t === 'border-black'
              ? 'neo-black'
              : null,
        )
        .find((t): t is string => t !== null && resolve(t) !== null) ??
        (tokens.some((t) => BLACK_BY_DEFAULT.test(t)) ? 'neo-black' : undefined);
      if (!bgToken || !border) continue;

      const bg = resolve(bgToken);
      const bd = resolve(border);
      if (!bg || !bd) continue;

      // A translucent fill (`bg-neo-pink/10`) sits on whatever is behind it.
      // This app is dark-only and every one of these tiles lives inside a navy
      // card, so composite over navy rather than skipping: skipping is how the
      // note-tile failures (`border-neo-pink/40` on `bg-neo-pink/10` = 1.69:1)
      // hid from an earlier version of this check while it reported green.
      const ground = bg.alpha === 1 ? bg.rgb : over(bg.rgb, toRgb(TOKENS['neo-navy']), bg.alpha);

      const painted = over(bd.rgb, ground, bd.alpha);
      // Border painted identically to its fill = a deliberate solid block, not a
      // failed outline (a black button with a black border, a phone bezel). The
      // edge that matters there is against the PARENT, which this cannot see.
      if (painted.every((c, i) => c === ground[i])) continue;

      const r = ratio(painted, ground);
      if (r < 3) {
        violations.push({
          file: path.relative(REPO, file),
          bg: bgToken,
          border,
          ratio: Number(r.toFixed(2)),
        });
      }
    }
  }
  return violations;
}

const EXTRA_ROOTS = [
  'components/adventure',
  'components/wordTowerV2',
  'app/[locale]/adventure',
  'app/[locale]/word-tower-v2',
];

function isExtra(file: string): boolean {
  return EXTRA_ROOTS.some((p) => file === p || file.startsWith(`${p}/`));
}

/** Pre-existing adventure + v2 pairs. Ratchet: must not grow. Visual rewrite = flip PR. */
const FROZEN_EXTRA = [
  'components/adventure/CollectionPanel.tsx|neo-navy|neo-black',
  'components/adventure/CollectionPanel.tsx|neo-navy-light|neo-black',
  'components/adventure/CollectionPanel.tsx|neo-white/10|neo-white/20',
  'components/adventure/CollectionPanel.tsx|neo-navy-light|neo-white/10',
  'components/adventure/MasteryBadge.tsx|neo-black/30|neo-black',
  'components/adventure/WorldMapNode.tsx|neo-navy-light|neo-black',
  'components/adventure/WorldMapNode.tsx|neo-black/50|neo-black/30',
  'components/adventure/achievements/AchievementCard.tsx|neo-black/30|neo-black',
  'components/adventure/achievements/AchievementCard.tsx|neo-black|neo-white/30',
  'components/adventure/boss/cinematics/CinematicFallback.tsx|neo-navy|neo-black',
  'components/adventure/map/MapNodeButton.tsx|neo-navy-light|neo-black',
  'components/adventure/play/intro/ChapterBeat.tsx|neo-pink/30|neo-black',
  'components/wordTowerV2/StabilityMeter.tsx|neo-navy/90|neo-black',
  'components/wordTowerV2/StabilityMeter.tsx|neo-cream/15|neo-black',
  'components/wordTowerV2/V2Dock.tsx|neo-navy|neo-cream/30',
  'components/wordTowerV2/V2Results.tsx|neo-navy|neo-black',
  'components/wordTowerV2/V2Results.tsx|neo-navy|neo-black',
  'components/wordTowerV2/V2TopBar.tsx|neo-navy|neo-black',
  'components/wordTowerV2/WordTowerV2.tsx|neo-navy|neo-black',
  'components/wordTowerV2/estate/DistrictComplete.tsx|neo-navy|neo-black',
  'components/wordTowerV2/estate/DistrictComplete.tsx|neo-navy|neo-black',
  'components/wordTowerV2/estate/DistrictScreen.tsx|neo-navy|neo-black',
  'components/wordTowerV2/estate/DistrictScreen.tsx|neo-navy-light|neo-black',
  'components/wordTowerV2/estate/DistrictScreen.tsx|neo-navy|neo-black',
  'components/wordTowerV2/estate/PlotPanel.tsx|neo-navy|neo-black',
  'components/wordTowerV2/estate/PlotPanel.tsx|neo-navy-light|neo-black',
  'components/wordTowerV2/rescue/BraceControl.tsx|neo-navy|neo-black',
  'components/wordTowerV2/rewards/ChestReveal.tsx|neo-navy-light|neo-black',
  'components/wordTowerV2/rivals/Payback.tsx|neo-navy|neo-black',
  'components/wordTowerV2/rivals/Payback.tsx|neo-navy|neo-black',
  'components/wordTowerV2/rivals/PayoffPanel.tsx|neo-navy|neo-black',
  'components/wordTowerV2/rivals/RaidResultCard.tsx|neo-navy/90|neo-black',
  'components/wordTowerV2/rivals/RevengeHome.tsx|neo-navy-light|neo-black',
  'components/wordTowerV2/rivals/RivalBoard.tsx|neo-navy|neo-black',
  'components/wordTowerV2/rivals/RivalBoard.tsx|neo-navy-light|neo-black',
  'components/wordTowerV2/rivals/RivalBoard.tsx|neo-navy-light|neo-black',
  'components/wordTowerV2/rivals/RivalBuilding.tsx|neo-navy|neo-black',
  'components/wordTowerV2/rivals/RivalBuilding.tsx|neo-navy-light|neo-black',
];

describe('education + teacher card borders', () => {
  it('every education-root border is visible against its own fill (>= 3:1)', () => {
    const violations = scan().filter((v) => !isExtra(v.file));
    const report = violations
      .map((v) => `  ${v.file}: border-${v.border} on bg-${v.bg} = ${v.ratio}:1`)
      .join('\n');
    expect(violations, `Invisible borders:\n${report}`).toEqual([]);
  });

  it('adventure + wordTowerV2 roots are scanned and do not grow invisible-border debt', () => {
    const extra = scan().filter((v) => isExtra(v.file));
    expect(extra.length).toBeGreaterThan(0);
    expect(extra.map((v) => `${v.file}|${v.bg}|${v.border}`)).toEqual(FROZEN_EXTRA);
  });

  it('scans a non-trivial number of files (guard against a vacuous pass)', () => {
    expect(sourceFiles().length).toBeGreaterThan(100);
  });
});
