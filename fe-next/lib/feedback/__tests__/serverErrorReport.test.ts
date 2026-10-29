import { describe, expect, it, vi } from 'vitest';
import { FEEDBACK_WIDGET_TOKEN, feedbackAppVersion } from '@/lib/feedback/feedbackIngest';
import {
    buildServerErrorReport,
    reportServerError,
    serverErrorReportingEnabled,
} from '@/lib/feedback/serverErrorReport';

const req = { path: '/en/play/ABCD?name=Dana', method: 'GET' };
const ctx = { routerKind: 'App Router', routePath: '/[locale]/play/[code]', routeType: 'render' };
const prod = {
    NODE_ENV: 'production',
    RAILWAY_ENVIRONMENT_NAME: 'production',
    RAILWAY_GIT_COMMIT_SHA: 'abcdef1234567',
} as unknown as NodeJS.ProcessEnv;

describe('serverErrorReportingEnabled', () => {
    it('is on in Railway production and off elsewhere by default', () => {
        expect(serverErrorReportingEnabled(prod)).toBe(true);
        expect(serverErrorReportingEnabled({ NODE_ENV: 'development' } as unknown as NodeJS.ProcessEnv)).toBe(false);
        expect(
            serverErrorReportingEnabled({ NODE_ENV: 'production', RAILWAY_ENVIRONMENT_NAME: 'staging' } as unknown as NodeJS.ProcessEnv),
        ).toBe(false);
    });

    it('honours the explicit flag both ways', () => {
        expect(serverErrorReportingEnabled({ ...prod, FEEDBACK_SERVER_ERRORS: '0' })).toBe(false);
        expect(serverErrorReportingEnabled({ NODE_ENV: 'test', FEEDBACK_SERVER_ERRORS: '1' } as unknown as NodeJS.ProcessEnv)).toBe(true);
    });
});

describe('buildServerErrorReport', () => {
    it('files an auto-detected bug keyed on the route pattern, never the concrete URL', () => {
        const err = Object.assign(new Error('Cannot read properties of undefined'), { digest: '42' });
        const r = buildServerErrorReport(err, req, ctx, prod);
        expect(r.source).toBe('auto_detected');
        expect(r.autoDetectedType).toBe('server_error');
        expect(r.pageContext.url).toBe('https://lexiclash.live/[locale]/play/[code]');
        expect(r.pageContext.appVersion).toBe('server@abcdef1');
        expect(r.whatToChange).toBe(
            'Server error in render GET /[locale]/play/[code]: Error: Cannot read properties of undefined',
        );
        expect(JSON.stringify(r)).not.toContain('Dana');
        expect(JSON.stringify(r)).not.toContain('ABCD');
        expect(r.consoleLogs[0].digest).toBe('42');
    });

    it('caps the headline and the stack', () => {
        const err = new Error('z'.repeat(2000));
        err.stack = Array.from({ length: 40 }, (_, i) => `at g${i}`).join('\n');
        const r = buildServerErrorReport(err, req, ctx, prod);
        expect(r.whatToChange.length).toBeLessThanOrEqual(500);
        expect(r.consoleLogs[0].stack?.split('\n')).toHaveLength(15);
    });
});

describe('reportServerError', () => {
    it('posts to the ingest API with the public widget token', async () => {
        const fetchImpl = vi.fn(async () => new Response('{}', { status: 201 }));
        await reportServerError(new Error('x'), req, ctx, prod, fetchImpl as unknown as typeof fetch);
        const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
        expect(url).toBe(
            `https://server-production-14a9.up.railway.app/api/v1/feedback?sdk=${encodeURIComponent(FEEDBACK_WIDGET_TOKEN)}`,
        );
        expect(JSON.parse(String(init.body)).changeType).toBe('fix_bug');
    });

    it('does nothing outside production and swallows a failing tracker', async () => {
        const quiet = vi.fn();
        await reportServerError(new Error('x'), req, ctx, { NODE_ENV: 'test' } as unknown as NodeJS.ProcessEnv, quiet as unknown as typeof fetch);
        expect(quiet).not.toHaveBeenCalled();

        const down = vi.fn(async () => {
            throw new Error('ECONNREFUSED');
        });
        await expect(reportServerError(new Error('x'), req, ctx, prod, down as unknown as typeof fetch)).resolves.toBeUndefined();
    });
});

describe('feedbackAppVersion', () => {
    it('names the deploy when a release is baked in, else keeps "web"', () => {
        expect(feedbackAppVersion('abcdef1234567')).toBe('web@abcdef1');
        expect(feedbackAppVersion(undefined)).toBe('web');
        expect(feedbackAppVersion('  ')).toBe('web');
    });
});
