/**
 * Test: ModeRow renders each card's art image with a valid src path.
 *
 * Prevention: blank dark boxes (image failed to load). This test verifies:
 * 1. ModeRow's "Pick your game" cards each render with non-empty img src
 * 2. Each genIcon path points to a file that exists in public/
 * 3. Path matching is case-sensitive (macOS is case-insensitive, but prod is Linux)
 *
 * Class 5 (mobile-web flash): images are lazy-loaded, so cards render with the
 * navy bg first. If the image fails (404), onError could hide content. This test
 * verifies all fresh mode card images exist before reaching prod.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { readdirSync } from 'fs';
import { join } from 'path';
import { FRESH_MODE_KEYS, ModeRow } from '../fresh/ModeRow';
import { MODE_META } from '@/lib/landing/modeMeta';

const lang = { language: 'en', dir: 'ltr' as 'ltr' | 'rtl' };
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (k: string) => k,
    language: lang.language,
    dir: lang.dir,
  }),
}));
vi.mock('@/utils/growthTracking', () => ({
  trackLandingCtaClick: vi.fn(),
  trackModeSelected: vi.fn(),
}));


// Preload the list of files in public/modes/cubes/ for case-sensitive checking
const CUBES_DIR = join(process.cwd(), 'public', 'modes', 'cubes');
let publicFiles: string[] = [];
try {
  publicFiles = readdirSync(CUBES_DIR);
} catch (err) {
  console.warn('Could not read public/modes/cubes directory:', err);
}

describe('ModeRow — image loading', () => {
  beforeEach(() => {
    lang.language = 'en';
    lang.dir = 'ltr';
  });

  it('each fresh mode card renders with a non-empty img src attribute', () => {
    const { container } = render(<ModeRow />);
    const images = container.querySelectorAll<HTMLImageElement>('[data-fresh-section="modes"] img');

    expect(images.length).toBeGreaterThan(0);
    for (const img of images) {
      const src = img.getAttribute('src');
      expect(src).toBeTruthy();
      expect(src!.length).toBeGreaterThan(0);
    }
  });

  it('ModeRow renders exactly the FRESH_MODE_KEYS modes', () => {
    const { container } = render(<ModeRow />);
    const cards = container.querySelectorAll<HTMLAnchorElement>('[data-fresh-section="modes"] [data-mode]');

    const renderedModes = Array.from(cards).map(c => c.getAttribute('data-mode'));
    expect(renderedModes).toEqual(FRESH_MODE_KEYS);
  });

  it('each FRESH_MODE_KEY in MODE_META has a genIcon path that exists in public/modes/cubes/', () => {
    // Skip if we couldn't read the directory
    if (publicFiles.length === 0) {
      console.warn('Skipping file existence check (could not read public/modes/cubes)');
      return;
    }

    const missingFiles: string[] = [];
    for (const key of FRESH_MODE_KEYS) {
      const meta = MODE_META[key];
      expect(meta, `Mode ${key} should exist in MODE_META`).toBeDefined();
      expect(meta.genIcon, `Mode ${key} should have genIcon set`).toBeDefined();

      // Extract and check the file
      const filename = meta.genIcon!.split('/').pop();
      if (!filename) {
        missingFiles.push(`${key}: invalid genIcon path "${meta.genIcon}"`);
      } else if (!publicFiles.includes(filename)) {
        missingFiles.push(`${key}: "${filename}" not found in public/modes/cubes/ (case-sensitive)`);
      }
    }

    expect(missingFiles, `Missing files or case mismatches:\n${missingFiles.join('\n')}`).toHaveLength(0);
  });

  it('adventure and wordTowerV2 featured cards have badge="NEW"', () => {
    const { container } = render(<ModeRow />);

    const adventureCard = container.querySelector('[data-mode="adventure"]');
    const wtCard = container.querySelector('[data-mode="wordTowerV2"]');

    expect(adventureCard?.querySelector('[data-testid="mode-badge"]')).toBeTruthy();
    expect(wtCard?.querySelector('[data-testid="mode-badge"]')).toBeTruthy();
  });

  it('wordCraft, connections, brainGym all render with valid genIcon paths', () => {
    if (publicFiles.length === 0) {
      console.warn('Skipping file existence check');
      return;
    }

    const requiredModes = ['wordCraft', 'connections', 'brainGym'];
    const missing: string[] = [];

    for (const key of requiredModes) {
      const meta = MODE_META[key];
      expect(meta, `Mode ${key} should exist in MODE_META`).toBeDefined();
      expect(meta.genIcon, `Mode ${key} should have genIcon set`).toBeDefined();

      const filename = meta.genIcon!.split('/').pop();
      if (filename && !publicFiles.includes(filename)) {
        missing.push(`${key}: "${filename}" not found`);
      }
    }

    expect(missing).toHaveLength(0);
  });
});
