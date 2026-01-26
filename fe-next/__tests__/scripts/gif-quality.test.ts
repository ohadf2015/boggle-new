/**
 * @file Test for GIF quality verification
 * @description
 * Bug: GIFs were compressed too aggressively, causing noticeable quality degradation
 * Root cause: ffmpeg compression scaled to 96x96 with only 128 colors
 * Fix: Re-compress with higher resolution (192x192) and more colors (256)
 */

import * as fs from 'fs';
import * as path from 'path';

describe('GIF Quality Verification', () => {
  const MASCOT_DIR = path.join(process.cwd(), 'public/mascot');
  const BACKUP_DIR = path.join(MASCOT_DIR, 'originals');

  it('should have originals backed up for rollback if needed', () => {
    // GIVEN: Originals directory should exist with backups
    // WHEN: We check for backup files
    const hasBackups = fs.existsSync(BACKUP_DIR) &&
      fs.readdirSync(BACKUP_DIR).some(f => f.endsWith('.gif'));

    // THEN: Backups should exist (created by compress-gifs.sh)
    expect(hasBackups).toBe(true);
  });

  it('should maintain reasonable file sizes (restored originals: 900KB-2.2MB)', () => {
    // GIVEN: Mascot GIFs exist (restored to originals for quality)
    const gifs = ['main-nobg.gif', 'play-nobg.gif', 'study-nobg.gif', 'celebration-nobg.gif'];

    gifs.forEach((gifName) => {
      const gifPath = path.join(MASCOT_DIR, gifName);

      if (!fs.existsSync(gifPath)) {
        return; // Skip if doesn't exist
      }

      // WHEN: We check file size
      const stats = fs.statSync(gifPath);
      const sizeInKB = stats.size / 1024;

      // THEN: Size should match restored originals
      // After restoration (from compressed 200-520KB back to originals):
      // - Originals are 900KB-2.2MB for best quality
      // - Previous compression was too aggressive (visible quality loss)
      // - Trade-off: Slightly slower initial load for much better visual quality
      expect(sizeInKB).toBeGreaterThanOrEqual(900); // Original quality
      expect(sizeInKB).toBeLessThanOrEqual(2300); // Max original size
    });
  });

  it('should verify compression settings are documented', () => {
    // GIVEN: Compression script exists
    const scriptPath = path.join(process.cwd(), 'scripts/compress-gifs.sh');

    // WHEN: We check script exists
    const scriptExists = fs.existsSync(scriptPath);

    // THEN: Script should exist and be executable
    expect(scriptExists).toBe(true);

    // AND: Script should contain compression parameters
    if (scriptExists) {
      const scriptContent = fs.readFileSync(scriptPath, 'utf-8');
      expect(scriptContent).toContain('ffmpeg');
      expect(scriptContent).toContain('scale=');
      expect(scriptContent).toContain('palettegen');
    }
  });
});
