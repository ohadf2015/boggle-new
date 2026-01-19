/**
 * Test: Daily Buzz Admin Auth Verification
 * Tests that admin authentication uses JWT tokens, not ADMIN_SECRET
 */

describe('Daily Buzz Admin Auth', () => {
  it('should verify admin uses JWT auth not ADMIN_SECRET', async () => {
    // Read the route file
    const fs = require('fs');
    const path = require('path');
    const routePath = path.join(__dirname, '../route.ts');
    const routeContent = fs.readFileSync(routePath, 'utf-8');

    // Should import admin auth utility
    expect(routeContent).toContain('verifyAdminAuth');
    expect(routeContent).toContain('@/lib/auth/adminAuth');

    // Extract POST function
    const postStart = routeContent.indexOf('export async function POST');
    const postEnd = routeContent.indexOf('\nexport async function', postStart + 1);
    const postFunction = postEnd > 0
      ? routeContent.substring(postStart, postEnd)
      : routeContent.substring(postStart);

    // POST should not check ADMIN_SECRET env variable (only GET for external cron should)
    expect(postFunction).not.toContain('process.env.ADMIN_SECRET');
    expect(postFunction).not.toContain('adminSecret = process.env');
    // Should use verifyAdminAuth instead
    expect(postFunction).toContain('verifyAdminAuth');
  });

  it('should verify admin panel passes auth token not secret', async () => {
    // Read admin panel hooks (authorization logic was extracted during simplification)
    const fs = require('fs');
    const path = require('path');

    // Check the main panel file doesn't use ADMIN_SECRET
    const panelPath = path.join(
      process.cwd(),
      'components/admin/DailyBuzzAdminPanel.tsx'
    );
    const panelContent = fs.readFileSync(panelPath, 'utf-8');
    expect(panelContent).not.toContain("prompt('Enter ADMIN_SECRET:");

    // Check the buzz generation hook uses Authorization header
    const hookPath = path.join(
      process.cwd(),
      'components/admin/buzz/hooks/useBuzzGeneration.ts'
    );
    const hookContent = fs.readFileSync(hookPath, 'utf-8');
    expect(hookContent).toContain('Authorization');
  });
});
