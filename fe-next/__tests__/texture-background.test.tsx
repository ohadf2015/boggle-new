/**
 * Test to verify pages use texture-halftone instead of gradient backgrounds
 */

import { describe, it } from '@jest/globals';
import fs from 'fs';
import path from 'path';

describe('Texture Background Bug', () => {
  it('should not use bg-gradient-to-b on pages with halftone texture', () => {
    const filesToCheck = [
      'components/daily/DailyChallenge.tsx',
      'components/landing/LandingView.tsx',
    ];

    const failures: string[] = [];

    filesToCheck.forEach((filePath) => {
      const fullPath = path.join(process.cwd(), filePath);
      const content = fs.readFileSync(fullPath, 'utf-8');

      // Check for the problematic pattern: bg-gradient-to-b that covers the body texture
      const hasGradientOverTexture = /dark:bg-gradient-to-b\s+dark:from-(?:neo-navy|transparent)/.test(content);

      if (hasGradientOverTexture) {
        failures.push(`${filePath} uses dark:bg-gradient-to-b which covers the body halftone texture`);
      }
    });

    if (failures.length > 0) {
      throw new Error(
        `Found pages with gradient backgrounds covering halftone texture:\n${failures.join('\n')}`
      );
    }
  });
});
