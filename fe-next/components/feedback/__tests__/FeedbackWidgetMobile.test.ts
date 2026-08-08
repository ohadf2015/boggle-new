import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';

/**
 * Guard the shipped feedback launcher's mobile behavior.
 *
 * public/widget.js is a rebuilt third-party bundle (feedback-devtools). These
 * assertions pin the LexiClash-specific mobile requirement so a future rebuild
 * can't silently regress it: on phones the launcher must drop its text label
 * and collapse to a compact icon-only chip.
 *
 * Breakpoint is 600px, not 480px — many 1080px-wide Android phones render at
 * DPR 2 (540 CSS px), which slipped past a 480px query and kept the oversized
 * labelled pill on mobile.
 *
 * This requirement now lives UPSTREAM (feedback-devtools packages/widget/src/
 * styles.ts). It used to be hand-patched into this vendored copy, so every
 * re-fetch of the bundle silently reverted it and failed these assertions —
 * which is exactly what happened when the bundle was refreshed for the preview
 * bridge. Upstream also pairs the width gate with `(pointer: coarse)`, so a
 * phone in landscape (wider than 600px) still gets the dot; the query is
 * matched loosely below to allow that extra clause, and asserted separately.
 */
describe('feedback launcher mobile styling (public/widget.js)', () => {
    const widget = readFileSync(
        join(__dirname, '..', '..', '..', 'public', 'widget.js'),
        'utf8',
    );

    it('collapses to an icon-only chip at the 600px phone breakpoint', () => {
        const block = widget.match(/@media \(max-width: 600px\)[^{]*\{[\s\S]*?\n\}/);
        expect(block, 'expected a `@media (max-width: 600px)` launcher block').not.toBeNull();

        const css = block![0];
        // Label hidden on mobile — icon only.
        expect(css).toMatch(/\.fdw-launcher \.fdw-label \{ display: none; \}/);
        // Square, padding-free tap target rather than the full-size labelled
        // pill. Combined with the always-on border-radius below this is a
        // circle; assert the shape where it is actually declared rather than
        // requiring the mobile block to redeclare it.
        expect(css).toContain('.fdw-launcher {');
        const size = css.match(/width:\s*(\d+)px;\s*height:\s*(\d+)px/);
        expect(size, 'expected an explicit square launcher size').not.toBeNull();
        expect(size![1]).toBe(size![2]);
        expect(Number(size![1])).toBeGreaterThanOrEqual(40); // thumb target floor
        expect(css).toMatch(/padding:\s*0;/);
    });

    it('keeps the launcher fully rounded, so the square mobile size reads as a circle', () => {
        const base = widget.match(/\.fdw-launcher \{[\s\S]*?\n\}/);
        expect(base, 'expected a base .fdw-launcher rule').not.toBeNull();
        expect(base![0]).toContain('border-radius: 999px');
    });

    it('does not gate the icon-only launcher behind the stale 480px query', () => {
        // 480 may still appear in the explanatory comment, but never as a
        // launcher media query that leaves 481–600px CSS-px phones labelled.
        expect(widget).not.toMatch(/@media \(max-width: 480px\)/);
    });

    it('also collapses on any coarse pointer, so landscape phones are covered', () => {
        // The width gate alone still misses a phone held in landscape. Losing
        // this clause would silently reintroduce the labelled pill there.
        expect(widget).toMatch(/@media \(max-width: 600px\), \(pointer: coarse\)/);
    });
});
