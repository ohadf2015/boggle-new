/**
 * App toasts on the MP entry must clear the entry header on a phone.
 *
 * The global <Toaster> is top-center at top:20px. On a 390px entry the header
 * row is full — [home][LEXICLASH] … [lang][sound][?] — so any top toast lands
 * on the wordmark (the gauntlet capture caught "חזרנו!" clipping the "L" of
 * LEXICLASH on /he/ phone). On wider screens the header's empty centre track
 * takes a toast as-is, so only the phone range moves.
 *
 * react-hot-toast renders its container with `data-rht-toaster` (2.6.0) and an
 * inline `top`, hence `!important`. The rule is keyed to the entry's SSR marker,
 * so it never restyles toasts on any other page or on the in-room screens.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ENTRY_CHROME_ATTR } from '../entryChrome';

const ENTRY_DIR = join(__dirname, '..');
const FE_ROOT = join(ENTRY_DIR, '..', '..', '..');
const css = readFileSync(join(ENTRY_DIR, 'entryToasts.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');

/** [media prelude | null, selector list, declarations] for every style rule. */
function rules(): Array<{ media: string | null; selectors: string[]; body: string }> {
  const out: Array<{ media: string | null; selectors: string[]; body: string }> = [];
  const push = (media: string | null, block: string) => {
    for (const m of block.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      out.push({ media, selectors: m[1].split(',').map((s) => s.replace(/\s+/g, ' ').trim()).filter(Boolean), body: m[2] });
    }
  };
  let rest = css;
  for (const m of css.matchAll(/@media([^{]+)\{((?:[^{}]*\{[^{}]*\})*[^{}]*)\}/g)) {
    push(m[1].trim(), m[2]);
    rest = rest.replace(m[0], '');
  }
  push(null, rest);
  return out;
}

describe('entry toast lane (entryToasts.css)', () => {
  it('moves the toaster container below the 56px phone header, safe area included', () => {
    const phone = rules().filter((r) => r.selectors.some((s) => s.endsWith('[data-rht-toaster]')));
    expect(phone.length).toBeGreaterThan(0);
    for (const rule of phone) {
      expect(rule.media).toMatch(/max-width:\s*767\.98px/);
      const top = rule.body.match(/top:\s*([^;]+?)\s*!important/)?.[1] ?? '';
      expect(top).toMatch(/env\(safe-area-inset-top/);
      // The header clearance outside the safe-area term (its own `0px` fallback aside).
      const clearance = Math.max(0, ...Array.from(top.replace(/env\([^)]*\)/g, '').matchAll(/(\d+)px/g), (m) => Number(m[1])));
      expect(clearance).toBeGreaterThanOrEqual(56 + 4);
    }
  });

  it('keys every rule to the entry SSR marker — no other page or MP screen is touched', () => {
    const all = rules().flatMap((r) => r.selectors);
    expect(all.length).toBeGreaterThan(0);
    for (const sel of all) expect(sel.startsWith(`body:has([${ENTRY_CHROME_ATTR}='off']) `)).toBe(true);
  });

  it('is loaded by the entry screen', () => {
    const src = readFileSync(join(ENTRY_DIR, 'EntryScreen.tsx'), 'utf8');
    expect(src).toMatch(/import '\.\/entryToasts\.css';/);
  });

  it('targets the container react-hot-toast actually renders', () => {
    const lib = readFileSync(join(FE_ROOT, 'node_modules', 'react-hot-toast', 'dist', 'index.mjs'), 'utf8');
    expect(lib).toContain('"data-rht-toaster"');
  });
});
