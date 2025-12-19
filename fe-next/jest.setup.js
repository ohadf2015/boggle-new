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

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock requestAnimationFrame
global.requestAnimationFrame = jest.fn(callback => setTimeout(callback, 0));
global.cancelAnimationFrame = jest.fn(id => clearTimeout(id));

// Mock performance.now (for timing tests)
if (!global.performance) {
  global.performance = {};
}
global.performance.now = jest.fn(() => Date.now());

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
  // Clear all mocks
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
