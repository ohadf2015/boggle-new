/**
 * Programmatic handle for the feedback.devtools widget loaded by
 * FeedbackDevtoolsWidget (public/widget.js). The widget exposes
 * window.FeedbackDevtools once its async script has executed.
 *
 * Used by entry points that open the feedback modal directly (e.g. the
 * header menu's "Report a Bug" action) instead of clicking the launcher FAB.
 */

interface FeedbackDevtoolsApi {
    init(options?: Record<string, unknown>): boolean;
    open(): void;
    destroy(): void;
    readonly active: boolean;
}

declare global {
    interface Window {
        FeedbackDevtools?: FeedbackDevtoolsApi;
    }
}

/**
 * Open the feedback modal. Returns false when the widget script has not
 * finished loading (rare: afterInteractive fires right after hydration) —
 * callers should fail silently; the launcher FAB remains available.
 */
export function openFeedbackWidget(): boolean {
    if (typeof window === 'undefined') return false;
    const api = window.FeedbackDevtools;
    if (!api || !api.active) return false;
    api.open();
    return true;
}
