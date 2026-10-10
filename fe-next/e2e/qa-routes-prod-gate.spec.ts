import { test, expect } from '@playwright/test';

const QA_ROUTES = ['/en/avatar-test', '/en/comeback-test', '/en/ai-fanfare-demo'];

test.describe('QA and demo routes are hidden in production', () => {
  test.skip(process.env.E2E_PROD !== '1', 'Run against a production build with E2E_PROD=1');

  for (const route of QA_ROUTES) {
    test(`${route} returns 404`, async ({ request }) => {
      const res = await request.get(route);
      expect(res.status()).toBe(404);
    });
  }
});

test.describe('QA and demo routes render outside production', () => {
  test.skip(process.env.E2E_PROD === '1', 'Dev-only assertion');

  for (const route of QA_ROUTES) {
    test(`${route} renders`, async ({ request }) => {
      const res = await request.get(route);
      expect(res.status()).toBe(200);
    });
  }
});
