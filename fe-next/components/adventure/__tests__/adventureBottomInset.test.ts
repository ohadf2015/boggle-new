import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

/**
 * Bottom-anchored Adventure UI must clear the device's bottom inset, not just the
 * AdMob banner. --admob-banner-height is 0px on the web (no AdMob there), so
 * anchoring to it put the action buttons underneath an Android phone's on-screen
 * navigation bar, where they could not be pressed. --adventure-bottom-inset is
 * max(banner, env(safe-area-inset-bottom)) and is the only correct anchor.
 */
const ADVENTURE_DIR = path.join(__dirname, '..');

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) {
      return entry === '__tests__' ? [] : sourceFiles(full);
    }
    return /\.tsx?$/.test(entry) ? [full] : [];
  });
}

describe('adventure bottom inset', () => {
  it('defines --adventure-bottom-inset from both the banner and the device inset', () => {
    const css = readFileSync(path.join(__dirname, '../../../app/globals.css'), 'utf8');
    const decl = css.match(/--adventure-bottom-inset:\s*([^;]+);/);
    expect(decl, '--adventure-bottom-inset must be declared in globals.css').toBeTruthy();
    expect(decl![1]).toContain('--admob-banner-height');
    expect(decl![1]).toContain('env(safe-area-inset-bottom');
  });

  it('anchors bottom-fixed adventure UI to the inset, never to the raw banner height', () => {
    // AdventureShopFAB is exempt: it stacks on --bottom-nav-height, which already
    // includes the safe-area inset, so adding it again would double-count.
    const offenders = sourceFiles(ADVENTURE_DIR)
      .filter((file) => path.basename(file) !== 'AdventureShopFAB.tsx')
      .filter((file) => /var\(--admob-banner-height/.test(readFileSync(file, 'utf8')))
      .map((file) => path.relative(ADVENTURE_DIR, file));

    expect(offenders).toEqual([]);
  });
});
