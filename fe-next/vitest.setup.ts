/**
 * Vitest Setup for Frontend Tests
 *
 * Ported from jest.setup.js — sets up:
 * - React Testing Library matchers
 * - Global mocks for browser APIs
 * - Socket.IO mocks
 * - Next.js router mocks
 * - Jest compatibility layer (globalThis.jest = vi)
 */

import { vi, beforeAll, afterAll, afterEach } from 'vitest';
import '@testing-library/jest-dom';

// ==========================================
// Jest Compatibility Layer
// ==========================================
// Allows existing tests using jest.fn(), jest.mock(), etc. to work without modification.
if (typeof (globalThis as any).jest === 'undefined') {
  (globalThis as any).jest = vi;
}

// ==========================================
// Mock Sentry
// ==========================================

vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
  captureMessage: vi.fn(),
  captureEvent: vi.fn(),
  withScope: vi.fn((callback: any) => callback({ setTag: vi.fn(), setContext: vi.fn() })),
  configureScope: vi.fn(),
  setUser: vi.fn(),
  setTag: vi.fn(),
  setContext: vi.fn(),
  addBreadcrumb: vi.fn(),
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
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(),
};
(global as any).localStorage = localStorageMock;

// Mock sessionStorage
const sessionStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(),
};
(global as any).sessionStorage = sessionStorageMock;

// Mock matchMedia
const createMatchMediaMock = () => (query: string) => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: vi.fn(),
  removeListener: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
});

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: createMatchMediaMock(),
});

// Mock ResizeObserver
class MockResizeObserver {
  callback: any;
  constructor(callback: any) {
    this.callback = callback;
  }
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}
(global as any).ResizeObserver = MockResizeObserver;

// Mock IntersectionObserver
(global as any).IntersectionObserver = class IntersectionObserver {
  callback: any;
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
  root = null;
  rootMargin = '';
  thresholds: number[] = [];
  constructor(callback: any) {
    this.callback = callback;
  }
};

// Mock requestAnimationFrame
(global as any).requestAnimationFrame = vi.fn((callback: any) => setTimeout(callback, 0));
(global as any).cancelAnimationFrame = vi.fn((id: any) => clearTimeout(id));

// Mock performance.now
if (!(global as any).performance) {
  (global as any).performance = {};
}
(global as any).performance.now = vi.fn(() => Date.now());

// Mock fetch API with a default implementation
const mockFetchImplementation = (url: string, _options?: any) => {
  if (url.includes('/api/dictionary/check')) {
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ isValid: true, source: 'dictionary' }),
    });
  }
  return Promise.resolve({
    ok: true,
    json: () => Promise.resolve({}),
  });
};

(global as any).fetch = vi.fn(mockFetchImplementation);

// ==========================================
// Mock Next.js Router
// ==========================================

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
}));

vi.mock('next/router', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    pathname: '/',
    query: {},
    asPath: '/',
    locale: 'en',
    events: {
      on: vi.fn(),
      off: vi.fn(),
      emit: vi.fn(),
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
  on: vi.fn(),
  off: vi.fn(),
  emit: vi.fn(),
  connect: vi.fn(),
  disconnect: vi.fn(),
  removeAllListeners: vi.fn(),
};

vi.mock('socket.io-client', () => ({
  io: vi.fn(() => mockSocket),
}));

(global as any).mockSocket = mockSocket;

// ==========================================
// Mock Contexts
// ==========================================

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
  signIn: vi.fn(),
  signOut: vi.fn(),
  signUp: vi.fn(),
};

const mockLanguageContext = {
  language: 'en',
  setLanguage: vi.fn(),
  t: vi.fn((key: string) => key),
  dir: 'ltr',
};

(global as any).mockSocketContext = mockSocketContext;
(global as any).mockAuthContext = mockAuthContext;
(global as any).mockLanguageContext = mockLanguageContext;

// ==========================================
// Mock Sound/Audio
// ==========================================

(global as any).Audio = vi.fn().mockImplementation(() => ({
  play: vi.fn().mockResolvedValue(undefined),
  pause: vi.fn(),
  load: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
}));

// ==========================================
// Mock useDevicePerformance Hook
// ==========================================

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

const mockUseDevicePerformance = vi.fn(() => defaultDevicePerformanceValue);

vi.mock('@/hooks/useDevicePerformance', () => ({
  useDevicePerformance: mockUseDevicePerformance,
  createAdaptiveThrottle: () => (fn: any) => fn,
}));

(global as any).mockUseDevicePerformance = mockUseDevicePerformance;
(global as any).defaultDevicePerformanceValue = defaultDevicePerformanceValue;

// ==========================================
// Mock Console for Clean Output
// ==========================================

const originalError = console.error;
beforeAll(() => {
  console.error = (...args: any[]) => {
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
  vi.clearAllMocks();

  localStorageMock.getItem.mockClear();
  localStorageMock.setItem.mockClear();

  mockSocket.on.mockClear();
  mockSocket.off.mockClear();
  mockSocket.emit.mockClear();
});

// ==========================================
// Test Utilities
// ==========================================

(global as any).createMockEvent = (properties: any = {}) => ({
  preventDefault: vi.fn(),
  stopPropagation: vi.fn(),
  target: { value: '' },
  currentTarget: { value: '' },
  ...properties,
});

(global as any).waitForAsync = (ms = 0) => new Promise(resolve => setTimeout(resolve, ms));

(global as any).createDeferred = () => {
  let resolve: any;
  let reject: any;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};
