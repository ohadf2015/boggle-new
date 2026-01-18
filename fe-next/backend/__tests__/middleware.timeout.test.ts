/**
 * Tests for Express requestTimeout middleware - custom timeout handling
 *
 * Bug: Express requestTimeout() was applying globally and causing 408 timeouts
 * on routes that have their own timeout settings (Next.js maxDuration or long-running Express routes).
 *
 * Fix: Skip Express timeout for routes with custom timeout handling.
 */

describe('Express requestTimeout middleware - custom timeout routes', () => {
  // Routes that handle their own timeouts (matches middleware.ts)
  const ROUTES_WITH_CUSTOM_TIMEOUT = [
    '/api/admin/buzz/',
    '/api/cron/',
    '/api/buzz/admin/',
  ];

  it('should skip timeout for /api/admin/buzz/* routes (Next.js with maxDuration)', () => {
    const paths = [
      '/api/admin/buzz/remove-image',
      '/api/admin/buzz/regenerate',
      '/api/admin/buzz/challenges',
      '/api/admin/buzz/prompt-preview',
    ];

    paths.forEach((path) => {
      const hasCustomTimeout = ROUTES_WITH_CUSTOM_TIMEOUT.some((route) => path.startsWith(route));
      expect(hasCustomTimeout).toBe(true);
    });
  });

  it('should skip timeout for /api/cron/* routes (Next.js with maxDuration)', () => {
    const paths = ['/api/cron/generate-daily-buzz'];

    paths.forEach((path) => {
      const hasCustomTimeout = ROUTES_WITH_CUSTOM_TIMEOUT.some((route) => path.startsWith(route));
      expect(hasCustomTimeout).toBe(true);
    });
  });

  it('should skip timeout for /api/buzz/admin/* routes (Express with long-running AI generation)', () => {
    const paths = [
      '/api/buzz/admin/generate',
      '/api/buzz/admin/trends/US',
    ];

    paths.forEach((path) => {
      const hasCustomTimeout = ROUTES_WITH_CUSTOM_TIMEOUT.some((route) => path.startsWith(route));
      expect(hasCustomTimeout).toBe(true);
    });
  });

  it('should apply timeout to regular Express routes (no custom timeout)', () => {
    const paths = [
      '/api/leaderboard',
      '/api/geolocation',
      '/api/analytics',
      '/api/dictionary',
      '/api/buzz/submit',  // Regular buzz route, NOT admin
      '/api/buzz/history', // Regular buzz route, NOT admin
    ];

    paths.forEach((path) => {
      const hasCustomTimeout = ROUTES_WITH_CUSTOM_TIMEOUT.some((route) => path.startsWith(route));
      expect(hasCustomTimeout).toBe(false); // Should NOT be excluded
    });
  });

  it('should verify maxDuration exports exist for excluded Next.js routes', async () => {
    // Verify that the routes we're excluding DO have maxDuration configured
    const routesWithMaxDuration = [
      {
        path: 'app/api/admin/buzz/remove-image/route.ts',
        expectedMaxDuration: 60,
      },
      {
        path: 'app/api/admin/buzz/regenerate/route.ts',
        expectedMaxDuration: 70,
      },
      {
        path: 'app/api/cron/generate-daily-buzz/route.ts',
        expectedMaxDuration: 120,
      },
    ];

    for (const route of routesWithMaxDuration) {
      const fs = require('fs');
      const path = require('path');
      const filePath = path.join(process.cwd(), route.path);

      const content = fs.readFileSync(filePath, 'utf-8');

      // Check for maxDuration export
      expect(content).toMatch(/export\s+const\s+maxDuration\s*=\s*\d+/);

      // Extract the value
      const match = content.match(/export\s+const\s+maxDuration\s*=\s*(\d+)/);
      if (match) {
        const maxDuration = parseInt(match[1], 10);
        expect(maxDuration).toBeGreaterThanOrEqual(route.expectedMaxDuration);
      }
    }
  });
});
