/**
 * Test: Verify remove-image route has proper maxDuration configuration
 *
 * Bug: The remove-image route was timing out after 10s (default Next.js timeout)
 * because it lacked `export const maxDuration` configuration.
 *
 * This test ensures the route is configured with adequate timeout for
 * database operations.
 */

import fs from 'fs';
import path from 'path';

describe('Remove Image API Route - Timeout Configuration', () => {
  it('should have maxDuration export to prevent default 10s timeout', () => {
    const routePath = path.join(__dirname, '../remove-image/route.ts');
    const routeContent = fs.readFileSync(routePath, 'utf-8');

    // Check that the file exports maxDuration
    expect(routeContent).toContain('export const maxDuration');

    // Extract the value
    const maxDurationMatch = routeContent.match(/export const maxDuration\s*=\s*(\d+)/);
    expect(maxDurationMatch).toBeTruthy();

    const maxDuration = parseInt(maxDurationMatch![1], 10);

    // Should be at least 30 seconds for database operations
    // (Supabase operations can take 5-15s on slow connections)
    expect(maxDuration).toBeGreaterThanOrEqual(30);
  });

  it('should have reasonable maxDuration less than 300s', () => {
    const routePath = path.join(__dirname, '../remove-image/route.ts');
    const routeContent = fs.readFileSync(routePath, 'utf-8');

    const maxDurationMatch = routeContent.match(/export const maxDuration\s*=\s*(\d+)/);
    expect(maxDurationMatch).toBeTruthy();

    const maxDuration = parseInt(maxDurationMatch![1], 10);

    // Should not be excessively long
    expect(maxDuration).toBeLessThanOrEqual(300);
  });

  it('should have similar maxDuration to regenerate route for consistency', () => {
    const removeImagePath = path.join(__dirname, '../remove-image/route.ts');
    const regeneratePath = path.join(__dirname, '../regenerate/route.ts');

    const removeImageContent = fs.readFileSync(removeImagePath, 'utf-8');
    const regenerateContent = fs.readFileSync(regeneratePath, 'utf-8');

    const removeMaxMatch = removeImageContent.match(/export const maxDuration\s*=\s*(\d+)/);
    const regenMaxMatch = regenerateContent.match(/export const maxDuration\s*=\s*(\d+)/);

    expect(removeMaxMatch).toBeTruthy();
    expect(regenMaxMatch).toBeTruthy();

    const removeMax = parseInt(removeMaxMatch![1], 10);
    const regenMax = parseInt(regenMaxMatch![1], 10);

    // Remove-image is a simpler operation than regenerate (no AI call)
    // So it should have same or lower maxDuration
    expect(removeMax).toBeLessThanOrEqual(regenMax);
  });

  it('should have explanatory comment about why maxDuration is needed', () => {
    const routePath = path.join(__dirname, '../remove-image/route.ts');
    const routeContent = fs.readFileSync(routePath, 'utf-8');

    // Should have a comment explaining the timeout configuration
    const hasComment =
      routeContent.includes('timeout') ||
      routeContent.includes('database') ||
      routeContent.includes('Supabase');

    expect(hasComment).toBe(true);
  });
});
