/**
 * Jest compatibility shim for vitest imports.
 *
 * When Jest encounters `import { vi, describe, ... } from 'vitest'`,
 * this module provides Jest-native equivalents so the same test files
 * can run under both runners.
 */

 
const vi = {
  fn: (...args) => jest.fn(...args),
  mock: (...args) => jest.mock(...args),
  unmock: (...args) => jest.unmock(...args),
  spyOn: (...args) => jest.spyOn(...args),
  mocked: (fn) => fn,
  resetAllMocks: () => jest.resetAllMocks(),
  clearAllMocks: () => jest.clearAllMocks(),
  restoreAllMocks: () => jest.restoreAllMocks(),
  useFakeTimers: (...args) => jest.useFakeTimers(...args),
  useRealTimers: () => jest.useRealTimers(),
  advanceTimersByTime: (ms) => jest.advanceTimersByTime(ms),
  advanceTimersByTimeAsync: (ms) => jest.advanceTimersByTime(ms),
  runAllTimers: () => jest.runAllTimers(),
  runOnlyPendingTimers: () => jest.runOnlyPendingTimers(),
  setSystemTime: (date) => jest.setSystemTime(date),
  getRealSystemTime: () => Date.now(),
  stubGlobal: (name, value) => {
    if (!vi._stubbedGlobals) vi._stubbedGlobals = new Map();
    if (!vi._stubbedGlobals.has(name)) vi._stubbedGlobals.set(name, globalThis[name]);
    globalThis[name] = value;
  },
  unstubAllGlobals: () => {
    if (!vi._stubbedGlobals) return;
    for (const [name, original] of vi._stubbedGlobals) {
      if (original === undefined) delete globalThis[name];
      else globalThis[name] = original;
    }
    vi._stubbedGlobals.clear();
  },
  stubEnv: (name, value) => { process.env[name] = value; },
  unstubAllEnvs: () => {},
  hoisted: (factory) => factory(),
  resetModules: () => jest.resetModules(),
  dynamicImportSettled: () => Promise.resolve(),
  waitFor: (cb) => cb(),
};

module.exports = {
  vi,
  vitest: vi,
  describe: globalThis.describe,
  it: globalThis.it,
  test: globalThis.test,
  expect: globalThis.expect,
  beforeAll: globalThis.beforeAll,
  afterAll: globalThis.afterAll,
  beforeEach: globalThis.beforeEach,
  afterEach: globalThis.afterEach,
};
