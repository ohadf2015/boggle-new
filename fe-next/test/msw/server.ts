import { setupServer } from 'msw/node';
import { handlers } from './handlers';

/**
 * MSW server instance for Node.js test environments (Vitest/Jest).
 *
 * Usage in vitest.setup.ts:
 *   import { server } from './test/msw/server';
 *   beforeAll(() => server.listen());
 *   afterEach(() => server.resetHandlers());
 *   afterAll(() => server.close());
 *
 * Per-test overrides:
 *   import { http, HttpResponse } from 'msw';
 *   server.use(http.get('/api/foo', () => HttpResponse.json({ bar: 1 })));
 */
export const server = setupServer(...handlers);
