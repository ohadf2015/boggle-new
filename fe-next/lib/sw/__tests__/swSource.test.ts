import { describe, it, expect } from 'vitest';
import vm from 'node:vm';
import { SW_SOURCE, SW_CACHE_NAME } from '../swSource';
import { offlineCapableRoutes } from '@/lib/offline/offlineCapableModes';
import { locales } from '@/i18n/config';

describe('swSource', () => {
  it('emits a syntactically valid script (compiles without throwing)', () => {
    // Compile-only: parses the source but does NOT execute it (no `self`,
    // `caches`, etc. in scope). Catches any template-literal escaping slip.
    expect(() => new vm.Script(SW_SOURCE)).not.toThrow();
  });

  it('precaches every offline-capable route (no drift from the allowlist)', () => {
    for (const route of offlineCapableRoutes()) {
      expect(SW_SOURCE).toContain(`"${route}"`);
    }
  });

  it('precaches each locale home (navigation-fallback targets)', () => {
    for (const loc of locales) {
      expect(SW_SOURCE).toContain(`"/${loc}"`);
    }
  });

  it('registers the three SW lifecycle handlers', () => {
    expect(SW_SOURCE).toContain("addEventListener('install'");
    expect(SW_SOURCE).toContain("addEventListener('activate'");
    expect(SW_SOURCE).toContain("addEventListener('fetch'");
  });

  it('includes the offline navigation fallback', () => {
    expect(SW_SOURCE).toContain('navigationFallback');
  });

  it('un-escapes regex backslashes correctly (single backslash in output)', () => {
    // Template literal `\\/api\\/` must emit the real regex source `\/api\/`.
    expect(SW_SOURCE).toContain('/\\/api\\//');
    expect(SW_SOURCE).not.toContain('\\\\/api'); // no double-backslash leaked
  });

  it('stamps the cache name', () => {
    expect(SW_SOURCE).toContain(SW_CACHE_NAME);
    expect(SW_CACHE_NAME).toMatch(/^lexiclash-v\d+-\d{8}$/);
  });
});
