/**
 * feedback.devtools ingest constants, shared by the client widget and the
 * server error reporter. Kept out of FeedbackDevtoolsWidget.tsx because that
 * module is 'use client', and server code importing a value from a client
 * module gets a client reference, not the string.
 *
 * The token is the LexiClash project's PUBLIC ingest SDK token (scope: ingest
 * only, rate-limited upstream) — safe to ship client-side by design.
 */

export const FEEDBACK_SERVER_ORIGIN = 'https://server-production-14a9.up.railway.app';
export const FEEDBACK_WIDGET_SRC = `${FEEDBACK_SERVER_ORIGIN}/widget.js`;
export const FEEDBACK_WIDGET_TOKEN =
    'fdt_bd9b22165d84d2f5480f76cdf8c6cdeee434f9df94293fcd';

/**
 * Short build id for the widget's data-app-version, so every report in the
 * dashboard names the deploy it came from (and lines up with the Sentry
 * release). Falls back to 'web', the value the widget sent before.
 */
export function feedbackAppVersion(
    release: string | undefined = process.env.NEXT_PUBLIC_SENTRY_RELEASE,
): string {
    const sha = release?.trim();
    return sha ? `web@${sha.slice(0, 7)}` : 'web';
}
