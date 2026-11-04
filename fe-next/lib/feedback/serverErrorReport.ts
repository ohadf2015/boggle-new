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
 * timeout, never throws. Fail closed: no fetch unless NODE_ENV is
 * production, NEXT_PUBLIC_FDT_ENABLED is exactly "true", and the ingest
 * origin is the hard-coded production origin. A dev/preview origin, a
 * missing flag, or FEEDBACK_SERVER_ERRORS=1 outside that check does nothing.
 */

import { sentryRelease } from '@/lib/sentry/release';
import {
    FEEDBACK_SERVER_ORIGIN,
    FEEDBACK_WIDGET_TOKEN,
    isProductionFdtOrigin,
} from '@/lib/feedback/feedbackIngest';

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

/**
 * Fail closed. Server code has no window.location, so the gate is env-only.
 * Reads `env` once. Missing, empty, and unexpected values are off — including
 * NEXT_PUBLIC_FDT_ENABLED of "1" / "TRUE" / "yes", a non-production Railway
 * environment (preview deploys still set NODE_ENV=production), and any ingest
 * URL whose origin is not the hard-coded production origin.
 * FEEDBACK_SERVER_ERRORS=1 cannot open this. "0" / "false" still kills it.
 */
export function isProductionFeedbackEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
    const nodeEnv = env.NODE_ENV;
    const flag = env.NEXT_PUBLIC_FDT_ENABLED?.trim() ?? '';
    const kill = env.FEEDBACK_SERVER_ERRORS?.trim() ?? '';
    const railwayEnv = env.RAILWAY_ENVIRONMENT_NAME?.trim() ?? '';
    const ingestOverride = env.FEEDBACK_INGEST_URL?.trim() ?? '';

    if (nodeEnv !== 'production') return false;
    if (flag !== 'true') return false;
    if (kill === '0' || kill === 'false') return false;
    if (railwayEnv && railwayEnv !== 'production') return false;
    if (!isProductionFdtOrigin(FEEDBACK_SERVER_ORIGIN)) return false;
    if (!ingestOverride) return true;
    try {
        return isProductionFdtOrigin(new URL(ingestOverride).origin);
    } catch {
        return false;
    }
}

/** Same gate. Kept so existing imports stay fail-closed. */
export function serverErrorReportingEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
    return isProductionFeedbackEnabled(env);
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
    if (!isProductionFeedbackEnabled(env)) return;
    // Canonical prod path only. The gate already rejected a non-prod origin,
    // so an env override cannot retarget this fetch.
    const ingest = `${FEEDBACK_SERVER_ORIGIN}/api/v1/feedback`;
    const token = env.FEEDBACK_SDK_TOKEN?.trim() || FEEDBACK_WIDGET_TOKEN;
    if (!token) return;
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
