/**
 * @file Test for GIF restoration from backups
 * @description
 * Bug: GIFs were compressed too aggressively, causing quality loss
 * Fix: Restore original high-quality GIFs from backup directory
 */

import * as fs from 'fs';
import * as path from 'path';

describe('GIF Restoration', () => {
  const MASCOT_DIR = path.join(process.cwd(), 'public/mascot');
  const BACKUP_DIR = path.join(MASCOT_DIR, 'originals');

  const GIFS = [
    'main-nobg.gif',
    'play-nobg.gif',
    'study-nobg.gif',
    'oops-nobg.gif',
    'celebration-nobg.gif',
    'dj-nobg.gif',
    'trophy-nobg.gif',
  ];

  it('should have original backups available', () => {
    // GIVEN: Backup directory exists
    expect(fs.existsSync(BACKUP_DIR)).toBe(true);

    // WHEN: We check for all GIF backups
    GIFS.forEach((gifName) => {
      const backupPath = path.join(BACKUP_DIR, gifName);

      // THEN: Each backup should exist and be larger (original quality)
      expect(fs.existsSync(backupPath)).toBe(true);

      const stats = fs.statSync(backupPath);
      const sizeInKB = stats.size / 1024;

      // Originals should be 900KB-2.1MB (high quality)
      expect(sizeInKB).toBeGreaterThan(900);
    });
  });

  it('should have restored GIFs with original quality', () => {
    // GIVEN: GIFs have been restored from backup
    GIFS.forEach((gifName) => {
      const gifPath = path.join(MASCOT_DIR, gifName);
      const backupPath = path.join(BACKUP_DIR, gifName);

      if (!fs.existsSync(gifPath) || !fs.existsSync(backupPath)) {
        return; // Skip if files don't exist
      }

      // WHEN: We compare current GIF size to backup
      const currentStats = fs.statSync(gifPath);
      const backupStats = fs.statSync(backupPath);

      // THEN: Current should be same size as backup (within 1KB tolerance)
      const sizeDiff = Math.abs(currentStats.size - backupStats.size);
      expect(sizeDiff).toBeLessThan(1024); // Within 1KB means it's the original
    });
  });
});
