import { defineConfig } from 'vitest/config';
import baseConfig from './vitest.config';

/**
 * Fast smoke-test config for the pre-push hook.
 *
 * This subset is intentionally small and targets pure-logic / node-environment
 * tests so the default pre-push gate finishes in seconds, not minutes. It is NOT
 * a replacement for the full suite — run `npm run test:full` locally or in CI
 * for comprehensive coverage.
 */
export default defineConfig({
  ...baseConfig,
  test: {
    ...baseConfig.test,
    include: [
      'shared/**/*.test.ts',
      'lib/__tests__/**/*.test.ts',
    ],
  },
});
