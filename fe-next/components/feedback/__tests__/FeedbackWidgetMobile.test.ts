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
 */
describe('feedback launcher mobile styling (public/widget.js)', () => {
    const widget = readFileSync(
        join(__dirname, '..', '..', '..', 'public', 'widget.js'),
        'utf8',
    );

    it('collapses to an icon-only chip at the 600px phone breakpoint', () => {
        const block = widget.match(/@media \(max-width: 600px\) \{[\s\S]*?\n\}/);
        expect(block, 'expected a `@media (max-width: 600px)` launcher block').not.toBeNull();

        const css = block![0];
        // Label hidden on mobile — icon only.
        expect(css).toMatch(/\.fdw-launcher \.fdw-label \{ display: none; \}/);
        // Compact round tap target rather than the full-size labelled pill.
        expect(css).toContain('.fdw-launcher {');
        expect(css).toContain('border-radius: 999px');
    });

    it('does not gate the icon-only launcher behind the stale 480px query', () => {
        // 480 may still appear in the explanatory comment, but never as a
        // launcher media query that leaves 481–600px CSS-px phones labelled.
        expect(widget).not.toMatch(/@media \(max-width: 480px\)/);
    });
});
