import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { act, render } from '@testing-library/react';
import { SCROLL_QUIET_MS, resetScrollSettlesForTests } from '@/lib/perf/runWhenScrollSettles';
import FeedbackDevtoolsWidget, {
    FEEDBACK_WIDGET_SCRIPT_ID,
    FEEDBACK_WIDGET_SRC,
} from '../FeedbackDevtoolsWidget';
import { FEEDBACK_SERVER_ORIGIN } from '@/lib/feedback/feedbackIngest';
import { reportServerError } from '@/lib/feedback/serverErrorReport';

/**
 * t_2579d766: agent dev servers on localhost:3000 / 30xx / 34xx / 39xx must
 * not inject the production FDT widget or post server-error reports.
 * The widget gate is hostname + NEXT_PUBLIC_FDT_ENABLED==='true'. A port
 * cannot open it. serverErrorReport is env-only and fail-closed.
 */

const req = { path: '/en/education/live', method: 'GET' };
const ctx = {
    routerKind: 'App Router',
    routePath: '/[locale]/education/live',
    routeType: 'render',
};

/** Ports that actually wrote LexiClash FDT rows, plus the card's buckets. */
const LOCALHOST_PORTS = [
    '3000',
    '3051',
    '3077',
    '3101',
    '3190',
    '3194',
    '3419',
    '3430',
    '3431',
    '3441',
    '3471',
    '3917',
] as const;

const originalLocation = window.location;
const originalFlag = process.env.NEXT_PUBLIC_FDT_ENABLED;

function stubPage(hostname: string, port = ''): void {
    const protocol = hostname === 'www.lexiclash.live' ? 'https:' : 'http:';
    const host = port ? `${hostname}:${port}` : hostname;
    Object.defineProperty(window, 'location', {
        configurable: true,
        value: {
            ...originalLocation,
            hostname,
            port,
            host,
            protocol,
            href: `${protocol}//${host}/en`,
            origin: `${protocol}//${host}`,
        },
    });
}

function widgetScripts(): HTMLScriptElement[] {
    return Array.from(document.querySelectorAll('script')).filter((node) => {
        const src = node.getAttribute('src') || '';
        return node.id === FEEDBACK_WIDGET_SCRIPT_ID || src.includes('widget.js') || src.includes(FEEDBACK_SERVER_ORIGIN);
    }) as HTMLScriptElement[];
}

async function gesture(): Promise<void> {
    await act(async () => {
        await Promise.resolve();
    });
    await act(async () => {
        window.dispatchEvent(new Event('pointerdown'));
        window.dispatchEvent(new Event('keydown'));
        window.dispatchEvent(new Event('touchstart'));
    });
    await act(async () => {
        vi.advanceTimersByTime(SCROLL_QUIET_MS + 50);
    });
}

const prodEnv = {
    NODE_ENV: 'production',
    RAILWAY_ENVIRONMENT_NAME: 'production',
    NEXT_PUBLIC_FDT_ENABLED: 'true',
} as unknown as NodeJS.ProcessEnv;

const devEnv = {
    NODE_ENV: 'development',
    NEXT_PUBLIC_FDT_ENABLED: 'true',
} as unknown as NodeJS.ProcessEnv;

describe('FDT localhost gate', () => {
    const fetchMock = vi.fn(async () => new Response('{}', { status: 201 }));

    beforeEach(() => {
        vi.useFakeTimers();
        resetScrollSettlesForTests();
        fetchMock.mockClear();
        vi.stubGlobal('fetch', fetchMock);
        process.env.NEXT_PUBLIC_FDT_ENABLED = 'true';
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.unstubAllGlobals();
        document.getElementById(FEEDBACK_WIDGET_SCRIPT_ID)?.remove();
        for (const node of widgetScripts()) node.remove();
        Object.defineProperty(window, 'location', {
            configurable: true,
            value: originalLocation,
        });
        if (originalFlag === undefined) delete process.env.NEXT_PUBLIC_FDT_ENABLED;
        else process.env.NEXT_PUBLIC_FDT_ENABLED = originalFlag;
    });

    it.each(LOCALHOST_PORTS)(
        'http://localhost:%s injects no widget script and makes no FDT fetch, including serverErrorReport',
        async (port) => {
            stubPage('localhost', port);
            render(<FeedbackDevtoolsWidget />);
            await gesture();
            expect(widgetScripts()).toHaveLength(0);
            expect(fetchMock).not.toHaveBeenCalled();

            await reportServerError(new Error('translation missing'), req, ctx, devEnv);
            await reportServerError(new Error('webpackPrefetch'), req, ctx, {
                NODE_ENV: 'development',
                NEXT_PUBLIC_FDT_ENABLED: 'true',
                FEEDBACK_SERVER_ERRORS: '1',
            } as unknown as NodeJS.ProcessEnv);
            expect(fetchMock).not.toHaveBeenCalled();
        },
    );

    it.each([
        ['127.0.0.1', '3000'],
        ['127.0.0.1', '3419'],
        ['[::1]', '3917'],
    ] as const)('loopback %s:%s does not inject or fetch', async (hostname, port) => {
        stubPage(hostname, port);
        render(<FeedbackDevtoolsWidget />);
        await gesture();
        expect(widgetScripts()).toHaveLength(0);
        await reportServerError(new Error('x'), req, ctx, devEnv);
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('injects exactly one widget script on www.lexiclash.live when the flag is true', async () => {
        stubPage('www.lexiclash.live', '443');
        process.env.NEXT_PUBLIC_FDT_ENABLED = 'true';
        render(<FeedbackDevtoolsWidget />);
        await gesture();
        await gesture();
        const scripts = widgetScripts();
        expect(scripts).toHaveLength(1);
        expect(scripts[0].id).toBe(FEEDBACK_WIDGET_SCRIPT_ID);
        expect(scripts[0].getAttribute('src')).toBe(FEEDBACK_WIDGET_SRC);
        expect(document.querySelectorAll(`script[src="${FEEDBACK_WIDGET_SRC}"]`)).toHaveLength(1);
    });

    it('fails closed on the prod host when NEXT_PUBLIC_FDT_ENABLED is unset', async () => {
        stubPage('www.lexiclash.live');
        delete process.env.NEXT_PUBLIC_FDT_ENABLED;
        render(<FeedbackDevtoolsWidget />);
        await gesture();
        expect(widgetScripts()).toHaveLength(0);

        const unset = { ...prodEnv } as NodeJS.ProcessEnv;
        delete unset.NEXT_PUBLIC_FDT_ENABLED;
        await reportServerError(new Error('x'), req, ctx, unset);
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it.each([undefined, '', 'false', 'TRUE', '1', 'yes'] as const)(
        'fails closed when the flag is %s',
        async (flag) => {
            stubPage('www.lexiclash.live');
            if (flag === undefined) delete process.env.NEXT_PUBLIC_FDT_ENABLED;
            else process.env.NEXT_PUBLIC_FDT_ENABLED = flag;
            render(<FeedbackDevtoolsWidget />);
            await gesture();
            expect(widgetScripts()).toHaveLength(0);

            const env = { ...prodEnv } as NodeJS.ProcessEnv;
            if (flag === undefined) delete env.NEXT_PUBLIC_FDT_ENABLED;
            else env.NEXT_PUBLIC_FDT_ENABLED = flag;
            await reportServerError(new Error('x'), req, ctx, env);
            expect(fetchMock).not.toHaveBeenCalled();
        },
    );
});

describe('serverErrorReport prod vs dev', () => {
    const fetchMock = vi.fn(async () => new Response('{}', { status: 201 }));

    beforeEach(() => {
        fetchMock.mockClear();
        vi.stubGlobal('fetch', fetchMock);
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('posts once to the production origin in prod env', async () => {
        await reportServerError(new Error('render crash'), req, ctx, prodEnv);
        expect(fetchMock).toHaveBeenCalledOnce();
        const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
        expect(url.startsWith(`${FEEDBACK_SERVER_ORIGIN}/api/v1/feedback?sdk=`)).toBe(true);
        expect(url).not.toContain('localhost');
        expect(init.method).toBe('POST');
        expect(JSON.parse(String(init.body)).source).toBe('auto_detected');
    });

    it('is a no-op in dev env even when the flag and FEEDBACK_SERVER_ERRORS are set', async () => {
        await reportServerError(new Error('x'), req, ctx, devEnv);
        await reportServerError(new Error('x'), req, ctx, {
            NODE_ENV: 'development',
            NEXT_PUBLIC_FDT_ENABLED: 'true',
            FEEDBACK_SERVER_ERRORS: '1',
            FEEDBACK_INGEST_URL: 'http://localhost:3000/api/v1/feedback',
        } as unknown as NodeJS.ProcessEnv);
        await reportServerError(new Error('x'), req, ctx, {
            NODE_ENV: 'test',
        } as unknown as NodeJS.ProcessEnv);
        expect(fetchMock).not.toHaveBeenCalled();
    });
});
