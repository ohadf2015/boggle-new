/**
 * Test: Pages using useLanguage() must be server components with dynamic export
 *
 * Reproduces bug: Client components using useLanguage() fail during
 * Next.js static generation with "useLanguage must be used within a LanguageProvider"
 *
 * Fix: Page file must be a SERVER component with `export const dynamic = 'force-dynamic'`
 * that imports and renders a CLIENT component containing the actual logic.
 */

import { describe, it, expect } from '@jest/globals';
import fs from 'fs';
import path from 'path';

describe('Pages using useLanguage() prerender configuration', () => {
  it('should be server components when using client-side contexts', () => {
    // Pages that need to use client-side contexts
    const problematicPages = [
      'app/[locale]/education/page.tsx',
      'app/[locale]/admin/page.tsx',
      'app/[locale]/brain/drills/memory-hunt/page.tsx',
      'app/[locale]/brain/drills/pattern-switcher/page.tsx',
      'app/[locale]/brain/drills/rare-gems/page.tsx',
      'app/[locale]/brain/drills/combo-master/page.tsx',
      'app/[locale]/brain/drills/lightning-round/page.tsx',
      'app/[locale]/admin/words/page.tsx',
      'app/[locale]/admin/players/page.tsx',
      'app/[locale]/admin/dictionary/page.tsx',
      'app/[locale]/admin/invalid-words/page.tsx',
      'app/[locale]/admin/wikipedia-words/page.tsx',
      'app/[locale]/admin/daily-buzz/page.tsx',
      'app/[locale]/admin/web-vitals/page.tsx',
    ];

    const rootDir = path.resolve(__dirname, '../..');
    const errors: string[] = [];

    problematicPages.forEach((pagePath) => {
      const fullPath = path.join(rootDir, pagePath);

      // Skip if file doesn't exist (might be a test file or moved)
      if (!fs.existsSync(fullPath)) {
        return;
      }

      const content = fs.readFileSync(fullPath, 'utf-8');

      // Check if page uses useLanguage() or other client-side hooks/contexts
      const usesClientSideStuff = content.includes('useLanguage()') ||
                                   content.includes('useLanguage(') ||
                                   content.includes('useAuth()') ||
                                   content.includes('useState(') ||
                                   content.includes('useEffect(');

      // Check if page has 'use client' directive
      const isClientComponent = content.includes("'use client'") || content.includes('"use client"');

      // If it uses client-side stuff and is marked as a client component,
      // it WILL fail during prerendering
      if (usesClientSideStuff && isClientComponent) {
        errors.push(
          `${pagePath} is a client component ('use client') that uses client-side hooks/contexts. ` +
          `This will cause "useLanguage must be used within a LanguageProvider" errors during build. ` +
          `\nFix: Make the page.tsx a SERVER component with "export const dynamic = 'force-dynamic'" ` +
          `and move the client logic to a separate *Client.tsx file.`
        );
      }
    });

    if (errors.length > 0) {
      throw new Error(
        'Prerender configuration errors found:\n' +
        errors.map(err => `  - ${err}`).join('\n')
      );
    }
  });
});
