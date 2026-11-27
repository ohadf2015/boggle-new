// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { holidayApi } from '../holidayApi';

const fetchMock = vi.fn(async () => new Response('{}', { status: 200 }));

afterEach(() => {
  vi.unstubAllGlobals();
  document.documentElement.lang = '';
});

describe('holidayApi', () => {
  it('Given a Spanish page, When table, rescue and community calls go out, Then each carries the page locale', async () => {
    vi.stubGlobal('fetch', fetchMock);
    document.documentElement.lang = 'es';
    await holidayApi.table('christmas');
    await holidayApi.rescueState('christmas');
    await holidayApi.community('christmas');
    await holidayApi.tableAction('create', { holiday: 'christmas' });
    await holidayApi.rescue('NOA123', 'christmas');
    const calls = fetchMock.mock.calls as unknown as Array<[string, RequestInit | undefined]>;
    for (const [url] of calls.slice(0, 3)) expect(url).toContain('locale=es');
    for (const [, init] of calls.slice(3)) expect(JSON.parse(String(init?.body))).toMatchObject({ locale: 'es' });
  });
});
