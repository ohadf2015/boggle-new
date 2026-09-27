import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';

/**
 * The vendored public/widget.js copy was DELETED when the launcher switched to
 * the feedback-devtools server's hosted-latest pointer (see
 * FeedbackDevtoolsWidget.tsx and PR #1044). The mobile-styling requirements
 * this file used to pin against the vendored bundle now live UPSTREAM, in
 * feedback-devtools packages/widget/src/styles.ts — guarded by that repo's own
 * widget test suite (152 tests) which runs on every widget build.
 *
 * What remains worth guarding HERE is the anti-re-vendoring invariant: a
 * future "just vendor it again" change must trip this suite, because
 * re-vendoring reintroduces both the frozen-cache failure mode and the
 * silent mobile-styling regressions this file historically caught.
 */
describe('feedback launcher — no vendored bundle', () => {
    it('public/widget.js does not exist (launcher is hosted-latest)', () => {
        const vendored = join(__dirname, '..', '..', '..', 'public', 'widget.js');
        expect(
            existsSync(vendored),
            're-vendoring public/widget.js reintroduces frozen-cache + styling drift — load the hosted pointer instead',
        ).toBe(false);
    });
});
