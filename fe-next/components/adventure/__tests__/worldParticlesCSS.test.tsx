/**
 * PF-H9: Verify WorldParticles uses external CSS, not inline <style> blocks.
 * Inline keyframes cause re-injection on every mount and increase JS bundle.
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const FILE_PATH = path.resolve(__dirname, '../themed/WorldParticles.tsx');

describe('PF-H9: WorldParticles keyframes in CSS file', () => {
  it('should NOT contain inline <style> blocks', () => {
    const content = fs.readFileSync(FILE_PATH, 'utf-8');
    expect(content).not.toMatch(/<style[\s>]/);
  });

  it('should import a CSS file for particle animations', () => {
    const content = fs.readFileSync(FILE_PATH, 'utf-8');
    expect(content).toMatch(/import\s+['"].*\.css['"]/);
  });
});
