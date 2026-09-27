/**
 * The dev-only TanStack Query devtools launcher (`.tsqd-open-btn-container`,
 * a fixed 48px button docked bottom-end) sits exactly where every MpScreen
 * pins its footer CTA — QUICK START/CREATE on the entry, START BATTLE/READY
 * in the lobbies (r4 review captures showed it covering CREATE at 390px).
 *
 * The rule must live in plain CSS (globals.css), NOT a component-rendered
 * <style>: React 19 hydration removes a non-precedence <style> that SSR
 * shipped, so the old component guard never applied in the live dev browser.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';

describe('MP dev-chrome rule (globals.css)', () => {
  const css = readFileSync(join(__dirname, '../../../../app/globals.css'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '');

  it('hides the TanStack devtools launcher under any MpScreen', () => {
    expect(css).toMatch(
      /body:has\(\[data-mp-screen\]\)\s+\.tsqd-open-btn-container[^{]*\{\s*display:\s*none\s*!important/,
    );
  });

  it('also hides it on the TV projector lobby (renders outside MpScreen)', () => {
    expect(css).toMatch(
      /body:has\(\[data-testid="tv-lobby-view"\]\)\s+\.tsqd-open-btn-container[^{]*\{/,
    );
  });
});
