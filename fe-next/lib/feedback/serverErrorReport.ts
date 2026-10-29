/**
 * Server-side errors → the LexiClash feedback-devtools project, as
 * auto-detected bugs, beside the reports players file from the widget.
 *
 * Sentry keeps getting every error (instrumentation.ts calls it first); this
 * is the dogfood copy, so our own tracker sees server crashes too and can
 * route them on (e.g. to an aether routine). Only what Next hands to
 * onRequestError lands here: render, route-handler and middleware errors. The
 * custom socket server (server.ts) stays Sentry-only.
 *
 * The ingest API folds auto_detected reports by detector + page + message, so
 * a crash loop is one row with a rising count. The page is the ROUTE PATTERN
 * (/[locale]/play/[code]), never the concrete URL, so room codes and query
 * strings neither split the fold nor end up in the report. Best-effort: 3s
 * timeout, never throws, production only unless FEEDBACK_SERVER_ERRORS=1.
 */

import { sentryRelease } from '@/lib/sentry/release';
import { FEEDBACK_SERVER_ORIGIN, FEEDBACK_WIDGET_TOKEN } from '@/lib/feedback/feedbackIngest';

const SITE_ORIGIN = 'https://lexiclash.live';
const TIMEOUT_MS = 3000;
const MESSAGE_MAX = 500;
const STACK_LINES = 15;

export interface RequestInfo {
    path: string;
    method: string;
}

export interface ErrorContext {
    routerKind: string;
    routePath: string;
    routeType: string;
    renderSource?: string;
}

function oneLine(text: string, max: number): string {
    const flat = text.replace(/\s+/g, ' ').trim();
    return flat.length > max ? `${flat.slice(0, max - 1)}…` : flat;
}

function errorParts(err: unknown): { name: string; message: string; stack?: string; digest?: string } {
    if (err instanceof Error) {
        const digest = (err as Error & { digest?: unknown }).digest;
        return {
            name: err.name || 'Error',
            message: err.message || '(no message)',
            stack: err.stack,
            digest: typeof digest === 'string' ? digest : undefined,
        };
    }
    return { name: 'NonError', message: typeof err === 'string' ? err : JSON.stringify(err) ?? String(err) };
}

/** On in production (Railway's production environment) by default; FEEDBACK_SERVER_ERRORS=1/0 overrides. */
export function serverErrorReportingEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
    const flag = env.FEEDBACK_SERVER_ERRORS?.trim();
    if (flag === '0' || flag === 'false') return false;
    if (flag === '1' || flag === 'true') return true;
    const railwayEnv = env.RAILWAY_ENVIRONMENT_NAME?.trim();
    return env.NODE_ENV === 'production' && (!railwayEnv || railwayEnv === 'production');
}

export function buildServerErrorReport(
    err: unknown,
    request: RequestInfo,
    context: ErrorContext,
    env: NodeJS.ProcessEnv = process.env,
) {
    const { name, message, stack, digest } = errorParts(err);
    const route = context.routePath || request.path.split('?')[0] || '/';
    const where = `${context.routeType} ${request.method} ${route}`;
    const release = sentryRelease(env)?.slice(0, 7);
    return {
        changeType: 'fix_bug' as const,
        priority: 'high' as const,
        source: 'auto_detected' as const,
        autoDetectedType: 'server_error',
        whatToChange: oneLine(`Server error in ${where}: ${name}: ${message}`, MESSAGE_MAX),
        expectedBehavior: 'The request completes without a server error.',
        pageContext: {
            url: `${SITE_ORIGIN}${route.startsWith('/') ? route : `/${route}`}`,
            ...(release ? { appVersion: `server@${release}` } : {}),
        },
        consoleLogs: [
            {
                level: 'error',
                message: oneLine(`${name}: ${message}`, MESSAGE_MAX),
                stack: stack?.split('\n').slice(0, STACK_LINES).join('\n'),
                digest,
                routerKind: context.routerKind,
                renderSource: context.renderSource,
            },
        ],
    };
}

export async function reportServerError(
    err: unknown,
    request: RequestInfo,
    context: ErrorContext,
    env: NodeJS.ProcessEnv = process.env,
    fetchImpl: typeof fetch = fetch,
): Promise<void> {
    if (!serverErrorReportingEnabled(env)) return;
    const token = env.FEEDBACK_SDK_TOKEN?.trim() || FEEDBACK_WIDGET_TOKEN;
    const ingest = env.FEEDBACK_INGEST_URL?.trim() || `${FEEDBACK_SERVER_ORIGIN}/api/v1/feedback`;
    try {
        await fetchImpl(`${ingest}?sdk=${encodeURIComponent(token)}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(buildServerErrorReport(err, request, context, env)),
            signal: AbortSignal.timeout(TIMEOUT_MS),
        });
    } catch {
        // Best-effort: a down tracker must never turn into a second error.
    }
}
