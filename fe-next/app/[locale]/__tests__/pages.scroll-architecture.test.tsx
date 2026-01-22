/**
 * @jest-environment jsdom
 */
import { readFileSync, readdirSync, statSync } from 'fs';
import { resolve, join } from 'path';

/**
 * Test for page-level scroll architecture compliance
 *
 * Pages MUST NOT create nested scroll containers because:
 * 1. Body (via layout.tsx) already has `overflow-y: auto` via screen-fit class
 * 2. Adding `overflow-y-auto` at page level creates nested scrolling
 * 3. On iOS, nested scroll + overscroll-behavior-y: contain = broken touch scroll
 *
 * CORRECT PATTERN:
 * - Pages should use `min-h-0` to allow flex shrinking
 * - Content that needs scroll should let it propagate to body
 * - Use `page-content-safe` for bottom safe area padding
 *
 * INCORRECT PATTERN:
 * - `h-full` + `overflow-y-auto` at page root level
 * - Any `overflow-y-auto` on page container divs (creates nested scroll)
 */

// Helper to find all page.tsx files recursively
function findPageFiles(dir: string): string[] {
  const results: string[] = [];
  const items = readdirSync(dir);

  for (const item of items) {
    const fullPath = join(dir, item);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      // Skip __tests__ and node_modules directories
      if (item !== '__tests__' && item !== 'node_modules') {
        results.push(...findPageFiles(fullPath));
      }
    } else if (item === 'page.tsx') {
      results.push(fullPath);
    }
  }

  return results;
}

// Patterns that indicate problematic nested scroll containers
const PROBLEMATIC_PATTERNS = [
  // h-full combined with overflow-y-auto creates scroll trap
  /className="[^"]*h-full[^"]*overflow-y-auto[^"]*"/,
  /className="[^"]*overflow-y-auto[^"]*h-full[^"]*"/,
  // h-full on root container prevents content from expanding naturally
  /className=\{cn\([^)]*'h-full[^']*overflow-y-auto/,
  /className=\{cn\([^)]*overflow-y-auto[^']*h-full/,
];

// Exceptions: Some pages legitimately need their own scroll (e.g., game views with locked viewport)
const SCROLL_EXCEPTIONS = [
  // Party screen has its own viewport management
  'app/party-screen/',
  // Admin pages may have their own scroll needs
  'app/[locale]/admin/',
];

describe('Page Scroll Architecture Compliance', () => {
  const appDir = resolve(process.cwd(), 'app/[locale]');
  const pageFiles = findPageFiles(appDir);

  // Filter out exceptions
  const pagesToTest = pageFiles.filter(
    (file) => !SCROLL_EXCEPTIONS.some((exception) => file.includes(exception))
  );

  describe('pages should not create nested scroll containers', () => {
    pagesToTest.forEach((pageFile) => {
      const relativePath = pageFile.replace(process.cwd() + '/', '');

      it(`${relativePath} should not have h-full + overflow-y-auto combination`, () => {
        const source = readFileSync(pageFile, 'utf-8');

        // Check for the problematic pattern of h-full + overflow-y-auto on root container
        // This is specifically looking for the pattern where a page's main container
        // has both h-full (constraining height) and overflow-y-auto (enabling scroll)
        // which creates a nested scroll container

        // Look for the root return statement and check the first major div
        const rootDivMatch = source.match(
          /return\s*\(\s*(?:<>)?\s*(?:{\/\*[^*]*\*\/})?\s*<div\s+className=(?:{cn\(\s*)?["']([^"']+)["']/
        );

        if (rootDivMatch) {
          const rootClasses = rootDivMatch[1];

          // Should NOT have h-full + overflow-y-auto combination
          const hasHFull = rootClasses.includes('h-full');
          const hasOverflowYAuto = rootClasses.includes('overflow-y-auto');

          // Should NOT have h-full + overflow-y-auto combination
          expect(hasHFull && hasOverflowYAuto).toBe(false);
        }
      });
    });
  });

  describe('specific pages known to have scroll issues', () => {
    it('profile page should not create nested scroll container', () => {
      const profilePath = resolve(appDir, 'profile/page.tsx');
      const source = readFileSync(profilePath, 'utf-8');

      // The mobile view container should not have h-full + overflow-y-auto
      // Pattern: <div className={cn('md:hidden h-full flex flex-col relative'
      const mobileViewMatch = source.match(
        /className=\{cn\(\s*['"]md:hidden\s+([^'"]+)['"]/
      );

      if (mobileViewMatch) {
        const classes = mobileViewMatch[1];
        // h-full is problematic here as it constrains the container
        expect(classes).not.toContain('h-full');
      }
    });

    it('brain page should not create nested scroll container', () => {
      const brainPath = resolve(appDir, 'brain/page.tsx');
      const source = readFileSync(brainPath, 'utf-8');

      // Check for h-full + overflow-y-auto pattern
      const hasProblematicPattern = PROBLEMATIC_PATTERNS.some((pattern) =>
        pattern.test(source)
      );

      expect(hasProblematicPattern).toBe(false);
    });
  });
});
