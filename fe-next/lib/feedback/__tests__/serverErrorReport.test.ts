import { describe, expect, it, vi } from 'vitest';
import {
    FEEDBACK_SERVER_ORIGIN,
    FEEDBACK_WIDGET_TOKEN,
    feedbackAppVersion,
    isProductionFdtOrigin,
} from '@/lib/feedback/feedbackIngest';
import {
    buildServerErrorReport,
    isProductionFeedbackEnabled,
    reportServerError,
    serverErrorReportingEnabled,
} from '@/lib/feedback/serverErrorReport';

const req = { path: '/en/play/ABCD?name=Dana', method: 'GET' };
const ctx = { routerKind: 'App Router', routePath: '/[locale]/play/[code]', routeType: 'render' };
const prod = {
    NODE_ENV: 'production',
    RAILWAY_ENVIRONMENT_NAME: 'production',
    RAILWAY_GIT_COMMIT_SHA: 'abcdef1234567',
    NEXT_PUBLIC_FDT_ENABLED: 'true',
} as unknown as NodeJS.ProcessEnv;

describe('isProductionFdtOrigin', () => {
    it('accepts only the hard-coded production origin', () => {
        expect(FEEDBACK_SERVER_ORIGIN).toBe('https://server-production-14a9.up.railway.app');
        expect(isProductionFdtOrigin(FEEDBACK_SERVER_ORIGIN)).toBe(true);
        expect(isProductionFdtOrigin('http://localhost:3000')).toBe(false);
        expect(isProductionFdtOrigin('https://server-pr-12.up.railway.app')).toBe(false);
        expect(isProductionFdtOrigin('')).toBe(false);
        expect(isProductionFdtOrigin(undefined)).toBe(false);
    });
});

describe('isProductionFeedbackEnabled', () => {
    it('is on only for production, an exact true flag, and the prod origin', () => {
        expect(isProductionFeedbackEnabled(prod)).toBe(true);
        expect(serverErrorReportingEnabled(prod)).toBe(true);
        expect(isProductionFeedbackEnabled({
            NODE_ENV: 'production',
            NEXT_PUBLIC_FDT_ENABLED: 'true',
        } as unknown as NodeJS.ProcessEnv)).toBe(true);
    });

    it('fails closed outside production, including a Railway preview name', () => {
        expect(isProductionFeedbackEnabled({ NODE_ENV: 'development', NEXT_PUBLIC_FDT_ENABLED: 'true' } as unknown as NodeJS.ProcessEnv)).toBe(false);
        expect(isProductionFeedbackEnabled({ NODE_ENV: 'test', NEXT_PUBLIC_FDT_ENABLED: 'true' } as unknown as NodeJS.ProcessEnv)).toBe(false);
        expect(isProductionFeedbackEnabled({
            NODE_ENV: 'production',
            RAILWAY_ENVIRONMENT_NAME: 'staging',
            NEXT_PUBLIC_FDT_ENABLED: 'true',
        } as unknown as NodeJS.ProcessEnv)).toBe(false);
        expect(isProductionFeedbackEnabled({
            NODE_ENV: 'production',
            RAILWAY_ENVIRONMENT_NAME: 'pr-1411',
            NEXT_PUBLIC_FDT_ENABLED: 'true',
        } as unknown as NodeJS.ProcessEnv)).toBe(false);
    });

    it.each([undefined, '', 'false', 'TRUE', '1', 'yes'])('fails closed when the flag is %s', (flag) => {
        const env = { ...prod } as NodeJS.ProcessEnv;
        if (flag === undefined) delete env.NEXT_PUBLIC_FDT_ENABLED;
        else env.NEXT_PUBLIC_FDT_ENABLED = flag;
        expect(isProductionFeedbackEnabled(env)).toBe(false);
    });

    it('fails closed when the ingest origin is not production', () => {
        expect(isProductionFeedbackEnabled({
            ...prod,
            FEEDBACK_INGEST_URL: 'http://localhost:3000/api/v1/feedback',
        })).toBe(false);
        expect(isProductionFeedbackEnabled({
            ...prod,
            FEEDBACK_INGEST_URL: 'https://server-pr-12.up.railway.app/api/v1/feedback',
        })).toBe(false);
        expect(isProductionFeedbackEnabled({
            ...prod,
            FEEDBACK_INGEST_URL: 'not a url',
        })).toBe(false);
        expect(isProductionFeedbackEnabled({
            ...prod,
            FEEDBACK_INGEST_URL: `${FEEDBACK_SERVER_ORIGIN}/api/v1/feedback`,
        })).toBe(true);
    });

    it('does not let FEEDBACK_SERVER_ERRORS open a non-production process', () => {
        expect(isProductionFeedbackEnabled({
            NODE_ENV: 'test',
            FEEDBACK_SERVER_ERRORS: '1',
            NEXT_PUBLIC_FDT_ENABLED: 'true',
        } as unknown as NodeJS.ProcessEnv)).toBe(false);
        expect(isProductionFeedbackEnabled({ ...prod, FEEDBACK_SERVER_ERRORS: '0' })).toBe(false);
        expect(isProductionFeedbackEnabled({ ...prod, FEEDBACK_SERVER_ERRORS: 'false' })).toBe(false);
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
        expect(fetchImpl).toHaveBeenCalledOnce();
    });

    it('uses FEEDBACK_SDK_TOKEN when set and still posts only to the prod origin', async () => {
        const fetchImpl = vi.fn(async () => new Response('{}', { status: 201 }));
        await reportServerError(new Error('x'), req, ctx, {
            ...prod,
            FEEDBACK_SDK_TOKEN: 'fdt_from_env',
            FEEDBACK_INGEST_URL: `${FEEDBACK_SERVER_ORIGIN}/api/v1/other`,
        }, fetchImpl as unknown as typeof fetch);
        const [url] = fetchImpl.mock.calls[0] as unknown as [string];
        expect(url).toBe(`${FEEDBACK_SERVER_ORIGIN}/api/v1/feedback?sdk=${encodeURIComponent('fdt_from_env')}`);
    });

    it('does nothing outside production and swallows a failing tracker', async () => {
        const quiet = vi.fn();
        await reportServerError(new Error('x'), req, ctx, { NODE_ENV: 'test' } as unknown as NodeJS.ProcessEnv, quiet as unknown as typeof fetch);
        expect(quiet).not.toHaveBeenCalled();

        const unsetFlag = { ...prod } as NodeJS.ProcessEnv;
        delete unsetFlag.NEXT_PUBLIC_FDT_ENABLED;
        await reportServerError(new Error('x'), req, ctx, unsetFlag, quiet as unknown as typeof fetch);
        expect(quiet).not.toHaveBeenCalled();

        const preview = vi.fn();
        await reportServerError(
            new Error('x'),
            req,
            ctx,
            { ...prod, FEEDBACK_INGEST_URL: 'http://127.0.0.1:4000/api/v1/feedback' },
            preview as unknown as typeof fetch,
        );
        expect(preview).not.toHaveBeenCalled();

        const down = vi.fn(async () => {
            throw new Error('ECONNREFUSED');
        });
        await expect(reportServerError(new Error('x'), req, ctx, prod, down as unknown as typeof fetch)).resolves.toBeUndefined();
        expect(down).toHaveBeenCalledOnce();
    });
});

describe('feedbackAppVersion', () => {
    it('names the deploy when a release is baked in, else keeps "web"', () => {
        expect(feedbackAppVersion('abcdef1234567')).toBe('web@abcdef1');
        expect(feedbackAppVersion(undefined)).toBe('web');
        expect(feedbackAppVersion('  ')).toBe('web');
    });
});
