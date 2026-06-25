import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

/**
 * GUARD: popups must not gate visible content behind a JS-driven framer-motion
 * entrance.
 *
 * RECURRING BUG (≥3 incidents, "Hebrew mobile popup = black screen"):
 * framer-motion entrance animations render the element at its invisible
 * `initial` state (opacity:0 / scale:0) and only animate it to visible via a
 * main-thread rAF loop. When that loop is starved — e.g. while the large Hebrew
 * translation bundle parses on a mobile device — the loop never advances and the
 * content stays pinned invisible. The popup's dark surface (a `fixed inset-0`
 * backdrop, or a Radix DialogContent panel) still paints via CSS, so the user
 * sees a black screen with no popup content.
 *
 * FIX / STANDARD: popups animate their entrance with CSS (`animate-in ...` via
 * tailwindcss-animate, or the `Reveal` primitive). CSS animations run off the
 * main thread and always settle to the visible resting state. See
 * components/ui/Reveal.tsx for the full rationale.
 *
 * This guard is the enforced check that stops the next instance. It flags a
 * hidden framer entrance only when the element carrying it is itself either:
 *   - a BACKDROP   — its className has `fixed inset-0` (a full-screen overlay), or
 *   - a CONTENT PANEL — width marker (`max-w-`/`w-full`) + card marker
 *     (`rounded`/`border`/`shadow`): the popup card with the readable content.
 *
 * CEILING (ponytail): purely decorative leaf pops (a ripple `scale:0` on an
 * `absolute rounded-full` blob, a single icon/emoji) are intentionally NOT
 * flagged — they don't gate whole-popup visibility, and the prior fix left such
 * loop/decorative animations on framer on purpose. Continuous/loop animations,
 * whileHover, whileTap and drag carry no hidden `initial` and never match.
 */

const ROOT = join(__dirname, '..');
const SCAN_DIRS = ['components', 'host', 'player', 'app'];
const SKIP = new Set(['node_modules', '.next', '__tests__', '__mocks__', 'dist', 'build']);

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (SKIP.has(name)) continue;
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, out);
    else if (full.endsWith('.tsx') && !full.includes('.test.')) out.push(full);
  }
  return out;
}

/** Strip block + line + JSX comments so doc examples don't false-trigger. */
function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
}

// A hidden framer entrance inside an `initial={{ ... }}`. Three signatures pin
// content invisible while a starved rAF loop never advances:
//   - opacity:0          → fully transparent
//   - scale:0            → collapsed to a point (`0.9`/`0.95`/`0.5` are NOT hidden:
//                          negative lookahead on a following dot/digit)
//   - x/y: '±NN%'        → translated fully off-screen (bottom sheet `y:'100%'`,
//                          side drawer `x:'-100%'`). A quoted percentage of 50%+
//                          parks the panel outside the viewport until JS runs.
const HIDDEN_INITIAL = /initial=\{\{[^}]*?(?:opacity:\s*0(?![.\d])|scale:\s*0(?![.\d])|[xy]:\s*['"`]-?(?:[5-9]\d|\d{3,})%['"`])[^}]*\}\}/g;

// A modal/popup backdrop DIMS the screen: full-screen + a dark bg + interactive
// (effect layers are `pointer-events-none` and/or transparent — excluded).
const DARK_BG = /(bg-black|bg-neo-black|bg-neo-navy)/;
function isBackdrop(window: string): boolean {
  return (
    /fixed inset-0/.test(window) &&
    DARK_BG.test(window) &&
    !/pointer-events-none/.test(window)
  );
}
// A content panel/card: a sized box with a card treatment — the readable popup.
function isPanel(window: string): boolean {
  return /(max-w-|w-full)/.test(window) && /(rounded|border|shadow)/.test(window);
}

const IMPORTS_DIALOG = /from\s+['"](?:@\/components\/ui\/dialog|@radix-ui\/react-dialog)['"]/;

/** A file is a modal/popup file if it dims the screen or uses the Dialog primitive. */
function isModalFile(src: string): boolean {
  if (IMPORTS_DIALOG.test(src)) return true;
  const classNames = src.match(/className=(?:"[^"]*"|'[^']*'|\{`[^`]*`\})/g) ?? [];
  return classNames.some(isBackdrop);
}

/**
 * Return the JSX opening tag (`<... >`) enclosing position `i`. Scans back to
 * the tag's `<` and forward to its closing `>` (tracking `{}`/`""` so `>` inside
 * an expression or string doesn't end the tag early). Binds className to THIS
 * element only.
 */
function enclosingTag(src: string, i: number): string {
  const start = src.lastIndexOf('<', i);
  if (start < 0) return '';
  let depth = 0;
  let quote = '';
  for (let j = start + 1; j < src.length && j < start + 2000; j++) {
    const c = src[j];
    if (quote) {
      if (c === quote) quote = '';
      continue;
    }
    if (c === '"' || c === "'" || c === '`') quote = c;
    else if (c === '{') depth++;
    else if (c === '}') depth--;
    else if (c === '>' && depth === 0) return src.slice(start, j + 1);
  }
  return src.slice(start, start + 2000);
}

interface Offender {
  file: string;
  kind: 'backdrop' | 'panel';
  snippet: string;
}

function findOffenders(): Offender[] {
  const offenders: Offender[] = [];
  for (const dir of SCAN_DIRS) {
    let files: string[];
    try {
      files = walk(join(ROOT, dir));
    } catch {
      continue;
    }
    for (const file of files) {
      const src = stripComments(readFileSync(file, 'utf8'));
      if (!isModalFile(src)) continue; // skip pages & decorative effect layers
      const rel = file.slice(ROOT.length + 1);
      for (const m of src.matchAll(HIDDEN_INITIAL)) {
        // Inspect the element's OWN opening tag (so className binds to THIS
        // element, not a neighbouring card — avoids false positives on deep
        // decorative children sitting inside an already-CSS-visible panel).
        const tag = enclosingTag(src, m.index ?? 0);
        const kind = isBackdrop(tag) ? 'backdrop' : isPanel(tag) ? 'panel' : null;
        if (kind) {
          offenders.push({ file: rel, kind, snippet: m[0].slice(0, 60) });
          break; // one finding per file is enough to flag it for migration
        }
      }
    }
  }
  return offenders;
}

describe('popup reveal guard', () => {
  it('no popup gates content behind a JS-driven framer-motion entrance', () => {
    const offenders = findOffenders();
    const report = offenders
      .map((o) => `  [${o.kind}] ${o.file}  ->  ${o.snippet}`)
      .join('\n');
    expect(
      offenders,
      `Popups must use CSS entrances (Reveal / animate-in), not framer-motion ` +
        `hidden initials. These render as a black screen on mobile Hebrew when the ` +
        `rAF loop is starved. Migrate (see components/ui/Reveal.tsx):\n${report}\n`
    ).toEqual([]);
  });
});
