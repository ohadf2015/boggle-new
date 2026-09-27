/**
 * A student's round-end card has to be reachable on a phone.
 *
 * Measured live at 390×844 (room XPQYVT, 2026-09-12 00:06): the classroom
 * results card ran from y=458 to y=2023, the document was 3600px tall inside an
 * 844px window, `body` had `overflow-y: hidden`, and NO ancestor of the card
 * was a scroll container. Everything below the placing hero — the podium, the
 * momentum chips, the coverage meter — was simply unreachable.
 *
 * The cause is one link of the flex-height chain in the multiplayer shell:
 *
 *   <div className={quizOwnsScreen ? 'flex-1 flex flex-col min-h-0' : undefined}>
 *
 * With no class the wrapper is a flex item with `min-height: auto`, so it grows
 * to its content, the results page's own `flex-1 min-h-0 overflow-y-auto`
 * region is never height-constrained, and the overflow escapes to a document
 * the shell has locked. Verified in the live page: setting that class on the
 * wrapper collapsed the document back to 844px and handed the scroll to the
 * inner region, with no other layout change.
 *
 * The rule this pins is the shell contract, not the quiz's: every view under
 * this root gets a constrained parent, so exactly one inner region scrolls.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const source = readFileSync(
  join(__dirname, '../../../../app/[locale]/multiplayer/PageClient.tsx'),
  'utf8'
);

describe('the multiplayer view wrapper', () => {
  it('never hands a view an unconstrained parent', () => {
    // No branch of the wrapper's className may resolve to nothing.
    expect(source).not.toMatch(/className=\{quizOwnsScreen \? '[^']*' : undefined\}/);
  });

  it('constrains the height for every view, not only the quiz', () => {
    expect(source).toMatch(/className="flex-1 flex flex-col min-h-0"[^>]*style=\{classroomAccessibility/);
  });
});
