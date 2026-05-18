/**
 * Jest Setup for Frontend Tests
 *
 * This file runs before each test file and sets up:
 * - React Testing Library matchers
 * - Global mocks for browser APIs
 * - Socket.IO mocks
 * - Next.js router mocks
 */

import '@testing-library/jest-dom';

// ==========================================
// Vitest globals compatibility
// ==========================================
// Some test files use `vi.fn()` etc. without importing from 'vitest'.
// Provide a global `vi` that delegates to jest for those files.
// (Files that DO import from 'vitest' are handled by jest-vitest-transform.js)
if (typeof globalThis.vi === 'undefined') {
  globalThis.vi = {
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
    runAllTimers: () => jest.runAllTimers(),
    runOnlyPendingTimers: () => jest.runOnlyPendingTimers(),
    setSystemTime: (date) => jest.setSystemTime(date),
    resetModules: () => jest.resetModules(),
    hoisted: (factory) => factory(),
    stubGlobal: (name, value) => {
      if (!globalThis.vi._stubbedGlobals) globalThis.vi._stubbedGlobals = new Map();
      if (!globalThis.vi._stubbedGlobals.has(name)) {
        globalThis.vi._stubbedGlobals.set(name, globalThis[name]);
      }
      globalThis[name] = value;
    },
    unstubAllGlobals: () => {
      if (!globalThis.vi._stubbedGlobals) return;
      for (const [name, original] of globalThis.vi._stubbedGlobals) {
        if (original === undefined) delete globalThis[name];
        else globalThis[name] = original;
      }
      globalThis.vi._stubbedGlobals.clear();
    },
    unstubAllEnvs: () => {},
    dynamicImportSettled: () => Promise.resolve(),
  };
}

// ==========================================
// Mock Sentry
// ==========================================

// Remotion is mocked via moduleNameMapper -> __mocks__/remotion.js
// That file uses jest.fn() so individual tests can override via .mockReturnValue()

jest.mock('@sentry/nextjs', () => ({
  captureException: jest.fn(),
  captureMessage: jest.fn(),
  captureEvent: jest.fn(),
  withScope: jest.fn((callback) => callback({ setTag: jest.fn(), setContext: jest.fn() })),
  configureScope: jest.fn(),
  setUser: jest.fn(),
  setTag: jest.fn(),
  setContext: jest.fn(),
  addBreadcrumb: jest.fn(),
  Severity: {
    Fatal: 'fatal',
    Error: 'error',
    Warning: 'warning',
    Log: 'log',
    Info: 'info',
    Debug: 'debug',
  },
}));

// ==========================================
// Mock Browser APIs
// ==========================================

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  length: 0,
  key: jest.fn(),
};
global.localStorage = localStorageMock;

// Mock sessionStorage
const sessionStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  length: 0,
  key: jest.fn(),
};
global.sessionStorage = sessionStorageMock;

// Mock matchMedia - Use a regular function (not jest.fn()) to avoid being reset by resetMocks: true
const createMatchMediaMock = () => (query) => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: jest.fn(),
  removeListener: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  dispatchEvent: jest.fn(),
});

// `window` is only defined under the jsdom test environment — node-env tests
// (e.g. API route tests) skip the matchMedia stub since nothing in them
// touches the browser API.
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: createMatchMediaMock(),
  });
}

// Mock ResizeObserver - use class syntax to ensure proper instantiation
class MockResizeObserver {
  constructor(callback) {
    this.callback = callback;
  }
  observe = jest.fn();
  unobserve = jest.fn();
  disconnect = jest.fn();
}
global.ResizeObserver = MockResizeObserver;

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor(callback) {
    this.callback = callback;
    this.observe = jest.fn();
    this.unobserve = jest.fn();
    this.disconnect = jest.fn();
    this.root = null;
    this.rootMargin = '';
    this.thresholds = [];
  }
};

// Mock requestAnimationFrame
global.requestAnimationFrame = jest.fn(callback => setTimeout(callback, 0));
global.cancelAnimationFrame = jest.fn(id => clearTimeout(id));

// Mock performance.now (for timing tests)
if (!global.performance) {
  global.performance = {};
}
global.performance.now = jest.fn(() => Date.now());

// Mock fetch API with a default implementation
const mockFetchImplementation = (url, _options) => {
  // Default response for dictionary check
  if (url.includes('/api/dictionary/check')) {
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ isValid: true, source: 'dictionary' }),
    });
  }

  // Default fallback for other endpoints
  return Promise.resolve({
    ok: true,
    json: () => Promise.resolve({}),
  });
};

global.fetch = jest.fn(mockFetchImplementation);

// ==========================================
// Mock Next.js Router
// ==========================================

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
}));

jest.mock('next/router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
    pathname: '/',
    query: {},
    asPath: '/',
    locale: 'en',
    events: {
      on: jest.fn(),
      off: jest.fn(),
      emit: jest.fn(),
    },
  }),
}));

// ==========================================
// Mock Socket.IO
// ==========================================

const mockSocket = {
  id: 'test-socket-id',
  connected: true,
  disconnected: false,
  on: jest.fn(),
  off: jest.fn(),
  emit: jest.fn(),
  connect: jest.fn(),
  disconnect: jest.fn(),
  removeAllListeners: jest.fn(),
};

jest.mock('socket.io-client', () => ({
  io: jest.fn(() => mockSocket),
}));

// Export mock socket for use in tests
global.mockSocket = mockSocket;

// ==========================================
// Mock Contexts
// ==========================================

// Create mock context values that can be overridden in tests
const mockSocketContext = {
  socket: mockSocket,
  isConnected: true,
  isReconnecting: false,
  error: null,
};

const mockAuthContext = {
  user: null,
  isLoading: false,
  isAuthenticated: false,
  signIn: jest.fn(),
  signOut: jest.fn(),
  signUp: jest.fn(),
};

const mockLanguageContext = {
  language: 'en',
  setLanguage: jest.fn(),
  t: jest.fn((key) => key),
  dir: 'ltr',
};

// Export mock contexts for use in tests
global.mockSocketContext = mockSocketContext;
global.mockAuthContext = mockAuthContext;
global.mockLanguageContext = mockLanguageContext;

// ==========================================
// Mock Sound/Audio
// ==========================================

global.Audio = jest.fn().mockImplementation(() => ({
  play: jest.fn().mockResolvedValue(undefined),
  pause: jest.fn(),
  load: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
}));

// ==========================================
// Mock useDevicePerformance Hook
// ==========================================

// Default values for useDevicePerformance mock
const defaultDevicePerformanceValue = {
  isLowEnd: false,
  prefersReducedMotion: false,
  enableGlowEffects: true,
  enableComplexAnimations: true,
  targetFPS: 60,
  throttleMs: 16,
  reduceParticles: false,
  maxParticles: 20,
  isSlowConnection: false,
  isMobile: false,
};

// Create a mock function with a stable default implementation
// Tests can override this using mockReturnValue
const mockUseDevicePerformance = jest.fn(() => defaultDevicePerformanceValue);

jest.mock('@/hooks/useDevicePerformance', () => ({
  useDevicePerformance: mockUseDevicePerformance,
  createAdaptiveThrottle: () => (fn) => fn,
}));

// Export for tests that need to customize the mock
global.mockUseDevicePerformance = mockUseDevicePerformance;
global.defaultDevicePerformanceValue = defaultDevicePerformanceValue;

// ==========================================
// Mock Console for Clean Output
// ==========================================

// Suppress console.error for expected errors in tests
const originalError = console.error;
beforeAll(() => {
  console.error = (...args) => {
    // Suppress React act() warnings and expected test errors
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('act(...)') ||
        args[0].includes('Warning:') ||
        args[0].includes('Not implemented'))
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});

// ==========================================
// Cleanup After Each Test
// ==========================================

afterEach(() => {
  // Clear all mocks (but don't restore fetch - let tests handle their own fetch mocks)
  jest.clearAllMocks();

  // Clear localStorage
  localStorageMock.getItem.mockClear();
  localStorageMock.setItem.mockClear();

  // Reset socket mock
  mockSocket.on.mockClear();
  mockSocket.off.mockClear();
  mockSocket.emit.mockClear();
});

// ==========================================
// Test Utilities
// ==========================================

/**
 * Create a mock event with specified properties
 * @param {Object} properties - Event properties
 * @returns {Object} - Mock event
 */
global.createMockEvent = (properties = {}) => ({
  preventDefault: jest.fn(),
  stopPropagation: jest.fn(),
  target: { value: '' },
  currentTarget: { value: '' },
  ...properties,
});

/**
 * Wait for async updates in components
 * @param {number} ms - Milliseconds to wait
 * @returns {Promise} - Promise that resolves after delay
 */
global.waitForAsync = (ms = 0) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Create a deferred promise for async testing
 * @returns {Object} - Object with promise, resolve, and reject
 */
global.createDeferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};
