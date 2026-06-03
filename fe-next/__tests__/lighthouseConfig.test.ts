import { describe, it, expect } from 'vitest';
import path from 'node:path';
import fs from 'node:fs';

/**
 * Regression guard for the Lighthouse CI configs.
 *
 * `package.json` runs `lhci autorun --config=./lighthouserc.mobile.cjs` (and
 * `.desktop.cjs`). Those files were referenced but never committed, so the CI
 * `lighthouse` job failed every run with `ENOENT`. This test fails loudly if
 * either config goes missing or loses the fields lhci needs to boot the server
 * and collect.
 */
const ROOT = path.resolve(__dirname, '..');

describe('Lighthouse CI configs', () => {
  for (const file of ['lighthouserc.mobile.cjs', 'lighthouserc.desktop.cjs']) {
    describe(file, () => {
      const abs = path.join(ROOT, file);

      it('exists on disk (matches the package.json lighthouse:ci scripts)', () => {
        expect(fs.existsSync(abs)).toBe(true);
      });

      it('exports a valid lhci config that boots the server and collects a URL', () => {
        const cfg = require(abs);
        expect(cfg?.ci?.collect?.startServerCommand).toBeTruthy();
        // Must point lhci at the custom server's port (3001), not the default 3000.
        expect(cfg.ci.collect.startServerReadyPattern).toBeTruthy();
        expect(Array.isArray(cfg.ci.collect.url)).toBe(true);
        expect(cfg.ci.collect.url.length).toBeGreaterThan(0);
        expect(cfg.ci.collect.url.every((u: string) => u.includes(':3001'))).toBe(true);
        // Assertions present (warn-level is fine) + an upload target so autorun exits 0.
        expect(cfg.ci.assert).toBeTruthy();
        expect(cfg.ci.upload?.target).toBeTruthy();
      });
    });
  }
});
