import { test, expect, type APIRequestContext } from '@playwright/test';
import { SignJWT } from 'jose';

const today = new Date().toISOString().split('T')[0];

async function forgedToken(sub = '00000000-0000-4000-8000-000000000000'): Promise<string> {
  return new SignJWT({ sub, role: 'authenticated', email: 'forged@lexiclash.test' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(new TextEncoder().encode('not-the-project-secret-but-32-chars-long'));
}

/** The session cookie name the browser client writes, from the page's Supabase preconnect. */
async function sessionCookieName(request: APIRequestContext): Promise<string> {
  const html = await (await request.get('/en')).text();
  const ref = html.match(/https:\/\/([a-z0-9]+)\.supabase\.co/)?.[1];
  expect(ref, 'Supabase project ref in the page preconnect').toBeTruthy();
  return `sb-${ref}-auth-token`;
}

async function forgedSessionCookie(request: APIRequestContext): Promise<string> {
  const session = JSON.stringify({ access_token: await forgedToken(), refresh_token: 'forged' });
  return `${await sessionCookieName(request)}=base64-${Buffer.from(session).toString('base64url')}`;
}

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

  test('streak, blast result and word collection stay 401 for a guest', async ({ request }) => {
    for (const path of ['/api/streak', '/api/blast/result', '/api/quick-play/word-collection']) {
      const res = await request.get(path);
      expect([401, 429]).toContain(res.status());
    }
  });

  test('landing mode stats load through the shared public client', async ({ request }) => {
    const res = await request.get('/api/game-mode-stats');
    expect([200, 429]).toContain(res.status());
    if (res.status() === 200) {
      expect(res.headers()['content-type']).toContain('application/json');
    }
  });
});

test.describe('word checks (shared anon client)', () => {
  test('a dictionary word is valid', async ({ request }) => {
    const res = await request.post('/api/validate-word', { data: { word: 'house', language: 'en' } });
    expect(res.status()).toBe(200);
    expect(await res.json()).toMatchObject({ isValid: true });
  });

  test('an unknown word reaches the community check and comes back pending', async ({ request }) => {
    const res = await request.post('/api/validate-word', { data: { word: 'qzxjvw', language: 'en' } });
    expect(res.status()).toBe(200);
    expect(await res.json()).toMatchObject({ isValid: false, source: 'pending' });
  });

  test('a vote without a session id is rejected before any write', async ({ request }) => {
    const res = await request.post('/api/single-player/vote', { data: { word: 'qzxjvw', language: 'en' } });
    expect([400, 429]).toContain(res.status());
  });
});

test.describe('forged sessions are rejected', () => {
  test('a forged session cookie does not unlock a signed-in GET', async ({ request }) => {
    const res = await request.get('/api/streak', { headers: { cookie: await forgedSessionCookie(request) } });
    expect([401, 429]).toContain(res.status());
  });

  test('a forged session cookie does not unlock the word collection', async ({ request }) => {
    const res = await request.get('/api/quick-play/word-collection', {
      headers: { cookie: await forgedSessionCookie(request) },
    });
    expect([401, 429]).toContain(res.status());
  });

  test('a forged bearer token cannot bulk-approve invalid words', async ({ request }) => {
    const res = await request.post('/api/admin/invalid-words/bulk-approve', {
      headers: { authorization: `Bearer ${await forgedToken()}` },
      data: { wordIds: ['00000000-0000-4000-8000-000000000000'] },
    });
    expect([401, 403, 429]).toContain(res.status());
  });

  test('a forged session cookie still gets the public daily board', async ({ request }) => {
    const res = await request.get(`/api/daily/leaderboard?date=${today}&lang=all&limit=3`, {
      headers: { cookie: await forgedSessionCookie(request) },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.data)).toBe(true);
  });

  test('a forged bearer token is refused by clubs, admin and curator routes', async ({ request }) => {
    const headers = { authorization: `Bearer ${await forgedToken()}` };
    const clubs = await request.post('/api/growth/word-clubs/join', { headers, data: { inviteCode: 'ABCDEF' } });
    expect([401, 429]).toContain(clubs.status());
    const admin = await request.get('/api/admin/insights', { headers });
    expect([401, 429]).toContain(admin.status());
    const curator = await request.get('/api/curator/invalid-words?lang=en', { headers });
    expect([401, 429]).toContain(curator.status());
  });
});

test.describe('signed-out writes are refused before touching the database', () => {
  test('coin and avatar spends need a session', async ({ request }) => {
    const purchase = await request.post('/api/avatar/purchase-part', { data: { category: 'hat', partId: 'crown' } });
    expect([401, 429]).toContain(purchase.status());
    const claimStatus = await request.get('/api/avatar/claim-daily-part');
    expect([401, 429]).toContain(claimStatus.status());
    const claim = await request.post('/api/avatar/claim-daily-part', { data: {} });
    expect([401, 429]).toContain(claim.status());
  });

  test('ranked, score sync and clubs need a session', async ({ request }) => {
    const ranked = await request.post('/api/ranked/match', { data: {} });
    expect([401, 429, 503], 'ranked match needs the server secret').toContain(ranked.status());
    for (const path of ['/api/scores/sync', '/api/growth/word-clubs', '/api/feedback/notify']) {
      const res = await request.post(path, { data: {} });
      expect([401, 429], path).toContain(res.status());
    }
    const clubs = await request.get('/api/growth/word-clubs');
    expect([401, 429]).toContain(clubs.status());
  });

  test('GETs that write keep the remote session check', async ({ request }) => {
    const cookie = await forgedSessionCookie(request);
    for (const path of ['/api/engagement/calendar', '/api/word-mastery', '/api/word-tower/wreck']) {
      const guest = await request.get(path);
      expect([401, 429], path).toContain(guest.status());
      const forged = await request.get(path, { headers: { cookie } });
      expect([401, 429], path).toContain(forged.status());
    }
  });

  test('email preferences need a session or a signed token', async ({ request }) => {
    const res = await request.get('/api/email/preferences');
    expect([401, 429]).toContain(res.status());
  });

  test('public forms validate input before writing', async ({ request }) => {
    const cases: Array<[string, Record<string, unknown>]> = [
      ['/api/contact', {}],
      ['/api/subscribe-email', { email: 'not-an-email' }],
      ['/api/feedback', { message: 'short' }],
      ['/api/appeal-word', {}],
      ['/api/invalid-word/record', {}],
    ];
    for (const [path, data] of cases) {
      const res = await request.post(path, { data });
      expect([400, 429], path).toContain(res.status());
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

test('home page renders for a guest', async ({ page }) => {
  const res = await page.goto('/en');
  expect(res?.status()).toBe(200);
  await expect(page.locator('body')).not.toBeEmpty();
});
