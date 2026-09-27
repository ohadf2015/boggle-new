/**
 * First-paint graph: rejected web AdSense must not ride along in the always-on
 * EssentialProviders chunk (`app-root-mounts`). Auto-Ads was deleted 2026-09-15;
 * the body-wide MutationObserver was leftover main-thread cost on `/`.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const SOURCE = readFileSync(join(__dirname, '..', 'essential-providers.tsx'), 'utf8');

describe('EssentialProviders first-paint adsense leftovers', () => {
  it('does not import or mount WebAnchorAdObserver', () => {
    expect(SOURCE).not.toContain('WebAnchorAdObserver');
    expect(SOURCE).not.toContain('webAnchorAdHeight');
  });
});
