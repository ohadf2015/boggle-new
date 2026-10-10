import { test, expect } from '@playwright/test';

const QA_ROUTES = ['/en/avatar-test', '/en/comeback-test', '/en/ai-fanfare-demo'];
const AGAINST_PROD_BUILD = process.env.E2E_PROD === '1' || (!!process.env.E2E_BASE_URL && process.env.E2E_DEV !== '1');

test.describe('QA and demo routes are hidden in production', () => {
  test.skip(!AGAINST_PROD_BUILD, 'Needs a production build (E2E_BASE_URL or E2E_PROD=1)');

  for (const route of QA_ROUTES) {
    test(`${route} returns 404`, async ({ request }) => {
      const res = await request.get(route);
      expect(res.status()).toBe(404);
    });
  }

  test('a real page next to them still renders', async ({ request }) => {
    const res = await request.get('/en');
    expect(res.status()).toBe(200);
  });
});

test.describe('QA and demo routes render outside production', () => {
  test.skip(AGAINST_PROD_BUILD, 'Dev-server only');

  for (const route of QA_ROUTES) {
    test(`${route} renders`, async ({ request }) => {
      const res = await request.get(route);
      expect(res.status()).toBe(200);
    });
  }
});
