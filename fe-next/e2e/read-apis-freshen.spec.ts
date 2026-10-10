import { test, expect } from '@playwright/test';

const today = new Date().toISOString().split('T')[0];

test.describe('service-role read APIs (shared admin client)', () => {
  test('activity feed returns an events array', async ({ request }) => {
    const res = await request.get('/api/activity/recent');
    expect([200, 429]).toContain(res.status());
    if (res.status() === 200) {
      const body = await res.json();
      expect(Array.isArray(body.events)).toBe(true);
    }
  });

  test('public ranked board responds with JSON', async ({ request }) => {
    const res = await request.get('/api/ranked');
    expect([200, 429]).toContain(res.status());
    if (res.status() === 200) {
      expect(res.headers()['content-type']).toContain('application/json');
    }
  });

  test('daily leaderboard serves a guest the public board', async ({ request }) => {
    const res = await request.get(`/api/daily/leaderboard?date=${today}&lang=all&limit=3`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.data)).toBe(true);
  });

  test('streak and blast result stay 401 for a guest', async ({ request }) => {
    for (const path of ['/api/streak', '/api/blast/result']) {
      const res = await request.get(path);
      expect([401, 429]).toContain(res.status());
    }
  });
});

test('daily hub loads the leaderboard teaser from the API', async ({ page }) => {
  const leaderboard = page.waitForResponse(
    (res) => res.url().includes('/api/daily/leaderboard') && res.request().method() === 'GET',
    { timeout: 30_000 },
  );
  await page.goto('/en/daily');
  const res = await leaderboard;
  expect(res.status()).toBe(200);
});
