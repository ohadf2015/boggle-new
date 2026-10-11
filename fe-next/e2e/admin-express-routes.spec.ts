import { test, expect } from '@playwright/test';

const EXPRESS_ADMIN_ROUTES: Array<{ method: 'get' | 'post'; path: string }> = [
  { method: 'get', path: '/api/admin/community-words' },
  { method: 'post', path: '/api/admin/community-words/approve' },
  { method: 'post', path: '/api/admin/community-words/disapprove' },
  { method: 'post', path: '/api/admin/daily-word/generate-retry-link' },
  { method: 'post', path: '/api/admin/send-test-email' },
  { method: 'post', path: '/api/admin/send-reengagement-to-player' },
  { method: 'post', path: '/api/admin/send-test-game-mode-announcement' },
];

test.describe('admin routes are answered by the Express admin router', () => {
  for (const { method, path } of EXPRESS_ADMIN_ROUTES) {
    test(`${method.toUpperCase()} ${path} rejects an anonymous caller with the Express 401`, async ({ request }) => {
      const res = method === 'get' ? await request.get(path) : await request.post(path, { data: {} });
      expect(res.status()).toBe(401);
      const body = await res.json();
      expect(body.error).toBe('Missing authorization header');
      expect(body.requestId).toBeTruthy();
    });
  }
});
