/**
 * E2E Test: Static SEO Files Accessibility
 *
 * Tests that ads.txt, app-ads.txt, robots.txt, and other SEO-critical files
 * are accessible via HTTP GET requests.
 *
 * These files MUST be served at the root level with proper content-type headers
 * for search engines and ad networks to discover them.
 */

import { test, expect } from '@playwright/test';

const BASE_URL = process.env.TEST_URL || 'http://localhost:3001';

test.describe('Static SEO Files', () => {
  test.describe('ads.txt - AdSense/AdMob Authorization', () => {
    test('should be accessible at /ads.txt', async ({ request }) => {
      const response = await request.get(`${BASE_URL}/ads.txt`);

      expect(response.status()).toBe(200);

      const contentType = response.headers()['content-type'];
      expect(contentType).toContain('text/plain');
    });

    test('should contain valid Google AdSense publisher ID', async ({ request }) => {
      const response = await request.get(`${BASE_URL}/ads.txt`);
      const text = await response.text();

      // Verify format: domain, publisher-id, relationship, certification-authority-id
      expect(text).toContain('google.com');
      expect(text).toContain('pub-');
      expect(text).toMatch(/google\.com,\s*pub-\d+,\s*DIRECT/);
    });

    test('should have correct MIME type for ad network crawlers', async ({ request }) => {
      const response = await request.get(`${BASE_URL}/ads.txt`);

      const contentType = response.headers()['content-type'];
      // Must be text/plain for IAB Tech Lab standard compliance
      expect(contentType).toMatch(/text\/plain/);
    });
  });

  test.describe('app-ads.txt - Mobile App Authorization', () => {
    test('should be accessible at /app-ads.txt', async ({ request }) => {
      const response = await request.get(`${BASE_URL}/app-ads.txt`);

      expect(response.status()).toBe(200);

      const contentType = response.headers()['content-type'];
      expect(contentType).toContain('text/plain');
    });
  });

  test.describe('robots.txt - Search Engine Directives', () => {
    test('should be accessible at /robots.txt', async ({ request }) => {
      const response = await request.get(`${BASE_URL}/robots.txt`);

      expect(response.status()).toBe(200);

      const contentType = response.headers()['content-type'];
      expect(contentType).toContain('text/plain');
    });
  });

  test.describe('llms.txt - AI Training Directives', () => {
    test('should be accessible at /llms.txt', async ({ request }) => {
      const response = await request.get(`${BASE_URL}/llms.txt`);

      expect(response.status()).toBe(200);

      const contentType = response.headers()['content-type'];
      expect(contentType).toContain('text/plain');
    });
  });
});
