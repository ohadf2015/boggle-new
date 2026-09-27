import { http, HttpResponse } from 'msw';

/**
 * Default MSW request handlers for tests.
 * Add shared API mocks here; per-test overrides use server.use(...) in individual tests.
 */
export const handlers = [
  // Dictionary check — used across many game components
  http.post('*/api/dictionary/check', () => {
    return HttpResponse.json({ isValid: true, source: 'dictionary' });
  }),

  // Fallback for any unhandled API call — returns empty 200
  // Remove this if you want unhandled requests to pass through or error
  http.get('*/api/*', () => {
    return HttpResponse.json({});
  }),

  http.post('*/api/*', () => {
    return HttpResponse.json({});
  }),
];
