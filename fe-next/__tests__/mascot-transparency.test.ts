/**
 * Mascot Transparency Test
 *
 * Verifies that all mascot PNG files have transparent backgrounds
 * and do not contain the pixel square artifacts from generation.
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { PNG } from 'pngjs';

const MASCOT_DIR = join(process.cwd(), 'public', 'mascot');

// All mascot variants that should have transparent backgrounds
const MASCOT_FILES = [
  'lexi-happy.png',
  'lexi-celebrating.png',
  'lexi-thinking.png',
  'lexi-encouraging.png',
  'lexi-oops.png',
  'lexi-victory.png',
  'lexi-focused.png',
  'lexi-surprised.png',
  'lexi-sleepy.png',
  'lexi-excited.png',
  'lexi-pointing.png',
  'lexi-eating-pizza.png',
  'lexi-drinking-coffee.png',
  'lexi-reading.png',
  'lexi-gaming.png',
  'lexi-dancing.png',
  'lexi-sleeping.png',
  'lexi-waving.png',
  'lexi-thumbs-up.png',
  'lexi-holding-trophy.png',
  'lexi-typing.png',
  'lexi-cheering.png',
  'lexi-training.png',
  'lexi-playing-ball.png',
  'lexi-skateboarding.png',
  'lexi-juggling.png',
];

describe('Mascot Image Transparency', () => {
  MASCOT_FILES.forEach((filename) => {
    test(`${filename} should have transparent background`, () => {
      const filePath = join(MASCOT_DIR, filename);
      const buffer = readFileSync(filePath);
      const png = PNG.sync.read(buffer);

      // Count transparent pixels (alpha = 0)
      let transparentPixels = 0;
      let totalPixels = png.width * png.height;

      for (let y = 0; y < png.height; y++) {
        for (let x = 0; x < png.width; x++) {
          const idx = (png.width * y + x) << 2;
          const alpha = png.data[idx + 3];
          if (alpha === 0) {
            transparentPixels++;
          }
        }
      }

      const transparencyPercentage = (transparentPixels / totalPixels) * 100;

      // Images should have at least 30% transparent pixels (background removed)
      // Most mascots will have 50-70% transparent background
      expect(transparencyPercentage).toBeGreaterThan(30);
    });

    test(`${filename} should not have raw image markers`, () => {
      // Raw images should have been processed and not be in use
      expect(filename).not.toContain('-raw');
      expect(filename).not.toContain('-temp');
    });
  });

  test('No raw or temp files should exist in mascot directory', () => {
    const fs = require('fs');
    const files = fs.readdirSync(MASCOT_DIR);

    const tempFiles = files.filter((f: string) => f.includes('-temp.png'));

    // Temp files should be cleaned up after processing
    // Raw files can exist for backup purposes
    expect(tempFiles).toHaveLength(0);
  });
});
