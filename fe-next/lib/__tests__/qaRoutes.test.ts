import { describe, it, expect } from 'vitest';
import { isHiddenQaRoute, qaRoutesEnabled } from '../qaRoutes';

const PROD = { NODE_ENV: 'production' };

describe('qaRoutesEnabled', () => {
  it('is off in a production build unless ENABLE_QA_ROUTES=1', () => {
    expect(qaRoutesEnabled(PROD)).toBe(false);
    expect(qaRoutesEnabled({ ...PROD, ENABLE_QA_ROUTES: '1' })).toBe(true);
  });

  it('is on outside production', () => {
    expect(qaRoutesEnabled({ NODE_ENV: 'development' })).toBe(true);
    expect(qaRoutesEnabled({ NODE_ENV: 'test' })).toBe(true);
  });
});

describe('isHiddenQaRoute', () => {
  it('hides every QA harness under any locale in production', () => {
    for (const path of ['/en/avatar-test', '/he/comeback-test', '/ja/ai-fanfare-demo', '/en/avatar-test/']) {
      expect(isHiddenQaRoute(path, PROD), path).toBe(true);
    }
  });

  it('leaves real pages alone', () => {
    for (const path of ['/en', '/en/word-tower', '/en/avatar', '/en/blog/avatar-test-tips', '/avatar-test']) {
      expect(isHiddenQaRoute(path, PROD), path).toBe(false);
    }
  });

  it('serves the harness when QA routes are enabled', () => {
    expect(isHiddenQaRoute('/en/avatar-test', { ...PROD, ENABLE_QA_ROUTES: '1' })).toBe(false);
    expect(isHiddenQaRoute('/en/avatar-test', { NODE_ENV: 'development' })).toBe(false);
  });
});
