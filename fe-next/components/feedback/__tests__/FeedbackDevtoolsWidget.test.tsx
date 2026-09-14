import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';

/**
 * The feedback launcher is loaded from the feedback-devtools SERVER's
 * hosted-latest pointer: /widget.js there 302s (short cache) to the current
 * immutable /widget/v<version>.js build (feedback-devtools #51). That removes
 * the old failure modes at the source:
 *
 * - the vendored public/widget.js was served `immutable, max-age=1yr`, freezing
 *   old bundles in returning users' browsers (needed a hand-bumped ?v= query);
 * - every re-vendor silently reverted LexiClash-specific mobile styling.
 *
 * This guard pins the hosted src + the current project token so a future edit
 * can't silently re-vendor the bundle or regress the token.
 */
vi.mock('next/script', () => ({
    __esModule: true,
    default: ({ children, ...p }: any) => <script {...p}>{children}</script>,
}));

import FeedbackDevtoolsWidget from '../FeedbackDevtoolsWidget';

describe('<FeedbackDevtoolsWidget>', () => {
    it('loads the hosted-latest widget pointer from the feedback-devtools server', () => {
        const { container } = render(<FeedbackDevtoolsWidget />);
        const script = container.querySelector('script[src]');
        expect(script).not.toBeNull();

        const src = script!.getAttribute('src') || '';
        expect(src).toBe('https://server-production-14a9.up.railway.app/widget.js');
        // No local vendored copy: re-vendoring public/widget.js would freeze
        // updates again — the pointer must stay hosted.
        expect(src.startsWith('/')).toBe(false);
        expect(src).not.toContain('?v=');
    });

    it('carries the current LexiClash project ingest token', () => {
        const { container } = render(<FeedbackDevtoolsWidget />);
        const script = container.querySelector('script[data-token]');
        expect(script).not.toBeNull();
        expect(script!.getAttribute('data-token')).toBe(
            'fdt_bd9b22165d84d2f5480f76cdf8c6cdeee434f9df94293fcd',
        );
    });
});
