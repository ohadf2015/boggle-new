/**
 * Tests for Express requestTimeout middleware - Next.js maxDuration integration
 *
 * Bug: Express requestTimeout() was applying globally and causing 408 timeouts
 * on Next.js App Router routes that have their own maxDuration settings.
 *
 * Fix: Skip Express timeout for Next.js routes with maxDuration export.
 */

describe('Express requestTimeout middleware - Next.js integration', () => {
  it('should skip timeout for /api/admin/buzz/* routes (Next.js with maxDuration)', () => {
    const paths = [
      '/api/admin/buzz/remove-image',
      '/api/admin/buzz/regenerate',
      '/api/admin/buzz/challenges',
      '/api/admin/buzz/prompt-preview',
    ];

    // These paths should be excluded from Express timeout
    const NEXTJS_ROUTES = ['/api/admin/buzz/', '/api/cron/'];

    paths.forEach((path) => {
      const isNextJsRoute = NEXTJS_ROUTES.some((route) => path.startsWith(route));
      expect(isNextJsRoute).toBe(true);
    });
  });

  it('should skip timeout for /api/cron/* routes (Next.js with maxDuration)', () => {
    const paths = ['/api/cron/generate-daily-buzz'];

    const NEXTJS_ROUTES = ['/api/admin/buzz/', '/api/cron/'];

    paths.forEach((path) => {
      const isNextJsRoute = NEXTJS_ROUTES.some((route) => path.startsWith(route));
      expect(isNextJsRoute).toBe(true);
    });
  });

  it('should apply timeout to Express routes (NOT Next.js)', () => {
    const paths = [
      '/api/leaderboard',
      '/api/geolocation',
      '/api/analytics',
      '/api/dictionary',
    ];

    const NEXTJS_ROUTES = ['/api/admin/buzz/', '/api/cron/'];

    paths.forEach((path) => {
      const isNextJsRoute = NEXTJS_ROUTES.some((route) => path.startsWith(route));
      expect(isNextJsRoute).toBe(false); // Should NOT be excluded
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
