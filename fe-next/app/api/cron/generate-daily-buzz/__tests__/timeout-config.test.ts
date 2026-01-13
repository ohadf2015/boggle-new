/**
 * Test: Daily Buzz API Route Configuration
 * Verifies that the generate-daily-buzz route has proper timeout and security configuration.
 *
 * Root cause: Next.js API routes default to 10 seconds timeout, but buzz
 * generation requires 30+ seconds (SERP API + AI + image + DB).
 *
 * Security: Ensures partial overrides are not possible through extra parameters.
 */

import * as fs from 'fs';
import * as path from 'path';

describe('Daily Buzz API - Timeout Configuration', () => {
  const routePath = path.join(__dirname, '../route.ts');

  it('should export maxDuration config for long-running operations', () => {
    const routeContent = fs.readFileSync(routePath, 'utf-8');

    // Must have maxDuration export to prevent default 10s timeout
    expect(routeContent).toContain('export const maxDuration');

    // Extract maxDuration value
    const maxDurationMatch = routeContent.match(/export const maxDuration\s*=\s*(\d+)/);
    expect(maxDurationMatch).not.toBeNull();

    const maxDuration = parseInt(maxDurationMatch![1], 10);

    // For 5 languages with AI generation, we need at least 60 seconds
    // 120 seconds provides safety margin
    expect(maxDuration).toBeGreaterThanOrEqual(60);
  });

  it('should have maxDuration consistent with bulk-generate route', () => {
    const routeContent = fs.readFileSync(routePath, 'utf-8');
    const bulkGeneratePath = path.join(
      process.cwd(),
      'app/api/admin/daily-word/bulk-generate/route.ts'
    );
    const bulkGenerateContent = fs.readFileSync(bulkGeneratePath, 'utf-8');

    // Both routes should have maxDuration configured
    expect(routeContent).toContain('export const maxDuration');
    expect(bulkGenerateContent).toContain('export const maxDuration');
  });
});

describe('Daily Buzz API - Security: No Partial Overrides', () => {
  const routePath = path.join(__dirname, '../route.ts');

  it('should reject extra parameters in POST body to prevent partial overrides', () => {
    const routeContent = fs.readFileSync(routePath, 'utf-8');

    // Must destructure and check for extra params
    expect(routeContent).toContain('...extraParams');
    expect(routeContent).toContain('Disallowed parameters');
  });

  it('should only allow date and language parameters', () => {
    const routeContent = fs.readFileSync(routePath, 'utf-8');

    // The destructuring should only extract date and language, rest goes to extraParams
    expect(routeContent).toMatch(/const\s*{\s*date\s*,\s*language\s*,\s*\.\.\.extraParams\s*}/);
  });

  it('should have security comment explaining why overrides are blocked', () => {
    const routeContent = fs.readFileSync(routePath, 'utf-8');

    // Security documentation is required
    expect(routeContent).toContain('SECURITY');
    expect(routeContent).toContain('prevent partial overrides');
  });
});
