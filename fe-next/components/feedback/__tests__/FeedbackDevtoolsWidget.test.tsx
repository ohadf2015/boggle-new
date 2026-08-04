import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';

/**
 * The feedback launcher is delivered by public/widget.js. Returning users had
 * that file frozen in-browser by a stale `immutable, max-age=1yr` header, so
 * the neo-brutalist restyle + mobile icon-only collapse never reached them —
 * they kept seeing the oversized default-themed, text-labelled pill.
 *
 * The middleware now serves widget.js with must-revalidate, but an already
 * cached immutable copy is NEVER revalidated. The only reliable escape is a
 * fresh URL, so the <script src> must carry a version query the frozen cache
 * entry does not cover. This guard pins that so the busting param can't be
 * dropped in a future edit.
 */
vi.mock('next/script', () => ({
    __esModule: true,
    default: ({ children, ...p }: any) => <script {...p}>{children}</script>,
}));

import FeedbackDevtoolsWidget from '../FeedbackDevtoolsWidget';

describe('<FeedbackDevtoolsWidget>', () => {
    it('loads widget.js with a cache-busting version query so returning users escape the frozen immutable copy', () => {
        const { container } = render(<FeedbackDevtoolsWidget />);
        const script = container.querySelector('script[src]');
        expect(script).not.toBeNull();

        const src = script!.getAttribute('src') || '';
        // Same-origin widget.js…
        expect(src.startsWith('/widget.js')).toBe(true);
        // …but with a version query so the browser treats it as a new URL.
        expect(src).toMatch(/\/widget\.js\?v=/);
    });
});
