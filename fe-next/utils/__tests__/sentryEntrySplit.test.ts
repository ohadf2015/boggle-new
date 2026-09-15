/**
 * Structural guard for the Sentry client entry split.
 *
 * withSentryConfig auto-injects BOTH `sentry.client.config.ts` (project root)
 * and `instrumentation-client.ts` into the `main-app` webpack entry. A
 * root-level client config statically imports @sentry/nextjs, which pins the
 * entire SDK (~122KB transfer, ~7.8s mobile eval — Lighthouse chunk 78883)
 * into every page's first-paint graph. The SDK must only ever load through
 * utils/sentryLazy's dynamic import (first error, or ~12s after window-load).
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const feRoot = path.resolve(__dirname, '..', '..');

describe('Sentry client entry split', () => {
  it('has no root-level sentry.client.config (would be auto-injected into main-app entry)', () => {
    for (const name of ['sentry.client.config.ts', 'sentry.client.config.js']) {
      expect(
        fs.existsSync(path.join(feRoot, name)),
        `${name} at project root is auto-injected into the main-app webpack entry by ` +
          'withSentryConfig, eagerly bundling the whole Sentry SDK into first paint. ' +
          'Keep the init module at lib/sentry/clientInit.ts instead.'
      ).toBe(false);
    }
  });

  it('instrumentation-client.ts has no static @sentry import', () => {
    const src = fs.readFileSync(path.join(feRoot, 'instrumentation-client.ts'), 'utf8');
    const staticImport = /^import[^;]*@sentry/m;
    expect(
      staticImport.test(src),
      'instrumentation-client.ts is part of the main-app entry — a static @sentry import ' +
        'there eagerly bundles the SDK into first paint. Use utils/sentryLazy instead.'
    ).toBe(false);
  });

  it('sentryLazy initializes via the non-root init module', () => {
    const initPath = path.join(feRoot, 'lib', 'sentry', 'clientInit.ts');
    expect(fs.existsSync(initPath), 'lib/sentry/clientInit.ts must exist').toBe(true);
    const lazySrc = fs.readFileSync(path.join(feRoot, 'utils', 'sentryLazy.ts'), 'utf8');
    expect(lazySrc).toContain('import("@/lib/sentry/clientInit")');
    expect(lazySrc).toContain('import("@sentry/nextjs")');
  });

  it('client init module runs Sentry.init as an import side effect', () => {
    const src = fs.readFileSync(path.join(feRoot, 'lib', 'sentry', 'clientInit.ts'), 'utf8');
    expect(src).toContain('Sentry.init(');
  });
});
