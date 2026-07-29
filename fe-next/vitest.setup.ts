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

import { vi, beforeAll, afterAll, afterEach, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { server as mswServer } from './test/msw/server';

// ==========================================
// Global TanStack Query Provider for Tests
// ==========================================
const globalQueryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false, gcTime: 0 },
    mutations: { retry: false },
  },
});

// Reset query client between tests
beforeEach(() => {
  globalQueryClient.clear();
});

// Override render/renderHook to wrap in QueryClientProvider unless a wrapper is already provided.
vi.mock('@testing-library/react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@testing-library/react')>();
  return {
    ...actual,
    render: (ui: React.ReactElement, options?: any) => {
      const BaseWrapper = ({ children }: { children: React.ReactNode }) =>
        React.createElement(QueryClientProvider, { client: globalQueryClient }, children);
      const Wrapper = options?.wrapper
        ? ({ children }: { children: React.ReactNode }) =>
            React.createElement(BaseWrapper, null, React.createElement(options.wrapper!, null, children))
        : BaseWrapper;
      return actual.render(ui, { ...options, wrapper: Wrapper });
    },
    renderHook: (hook: any, options?: any) => {
      const BaseWrapper = ({ children }: { children: React.ReactNode }) =>
        React.createElement(QueryClientProvider, { client: globalQueryClient }, children);
      const Wrapper = options?.wrapper
        ? ({ children }: { children: React.ReactNode }) =>
            React.createElement(BaseWrapper, null, React.createElement(options.wrapper!, null, children))
        : BaseWrapper;
      return actual.renderHook(hook, { ...options, wrapper: Wrapper });
    },
  };
});

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
// Mock Browser APIs (only in jsdom environment)
// ==========================================

const isBrowser = typeof window !== 'undefined';

// Mock localStorage with functional storage
const localStorageStore: Record<string, string> = {};
const localStorageMock = {
  getItem: vi.fn((key: string) => localStorageStore[key] ?? null),
  setItem: vi.fn((key: string, value: string) => { localStorageStore[key] = value; }),
  removeItem: vi.fn((key: string) => { delete localStorageStore[key]; }),
  clear: vi.fn(() => { Object.keys(localStorageStore).forEach(k => delete localStorageStore[k]); }),
  get length() { return Object.keys(localStorageStore).length; },
  key: vi.fn((i: number) => Object.keys(localStorageStore)[i] ?? null),
};

// Mock sessionStorage with functional storage (mirrors localStorage mock pattern)
const sessionStorageStore: Record<string, string> = {};
const sessionStorageMock = {
  getItem: vi.fn((key: string) => sessionStorageStore[key] ?? null),
  setItem: vi.fn((key: string, value: string) => { sessionStorageStore[key] = value; }),
  removeItem: vi.fn((key: string) => { delete sessionStorageStore[key]; }),
  clear: vi.fn(() => { Object.keys(sessionStorageStore).forEach(k => delete sessionStorageStore[k]); }),
  get length() { return Object.keys(sessionStorageStore).length; },
  key: vi.fn((i: number) => Object.keys(sessionStorageStore)[i] ?? null),
};

if (isBrowser) {
  (global as any).localStorage = localStorageMock;
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
}

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

// MSW intercepts fetch requests — no manual global.fetch mock needed.
// Default handlers are in test/msw/handlers.ts.
// Per-test overrides: server.use(http.get('/api/foo', () => HttpResponse.json({...})))
beforeAll(() => mswServer.listen({ onUnhandledRequest: 'bypass' }));
afterEach(() => mswServer.resetHandlers());
afterAll(() => mswServer.close());

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

// DesktopGameNav requires Navigation/CrazyGames/Veteran providers. Most tests
// that mount Header don't set those up; stub it out (the real component is
// loaded via next/dynamic in Header.tsx and is irrelevant to unit tests).
vi.mock('@/components/DesktopGameNav', () => ({
  default: () => null,
  DesktopGameNav: () => null,
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

// ==========================================
// Mock Framer Motion (Global)
// ==========================================

vi.mock('framer-motion', () => {
  const React = require('react');
  const createMotionComponent = (tag: string) =>
    React.forwardRef(function MotionComponent(
      { children, ...props }: any,
      ref: any
    ) {
      return React.createElement(tag, { ref, ...props }, children);
    });
  // Cache one component per tag — a fresh component identity per render
  // makes React remount on every render, breaking controlled inputs and effects.
  const componentCache = new Map<string, any>();
  const motion = new Proxy({} as Record<string, any>, {
    get: (_target, prop: string) => {
      if (!componentCache.has(prop)) {
        componentCache.set(prop, createMotionComponent(prop));
      }
      return componentCache.get(prop);
    },
  });
  const createMotionValue = (initial: unknown = 0) => {
    let value = initial;
    return {
      set: (v: unknown) => { value = v; },
      get: () => value,
      on: () => () => {},
      onChange: () => () => {},
    };
  };
  return {
    motion,
    m: motion,
    AnimatePresence: function AnimatePresence({ children }: any) {
      return React.createElement(React.Fragment, {}, children);
    },
    LazyMotion: function LazyMotion({ children }: any) {
      return React.createElement(React.Fragment, {}, children);
    },
    LayoutGroup: function LayoutGroup({ children }: any) {
      return React.createElement(React.Fragment, {}, children);
    },
    MotionConfig: function MotionConfig({ children }: any) {
      return React.createElement(React.Fragment, {}, children);
    },
    domAnimation: {},
    domMax: {},
    useMotionValue: (initial?: unknown) => createMotionValue(initial),
    useMotionValueEvent: vi.fn(),
    useMotionTemplate: () => '',
    useInView: () => true,
    useScroll: () => ({
      scrollX: createMotionValue(),
      scrollY: createMotionValue(),
      scrollXProgress: createMotionValue(),
      scrollYProgress: createMotionValue(),
    }),
    useReducedMotion: () => false,
    useAnimation: () => ({ start: vi.fn(), set: vi.fn() }),
    useAnimationControls: () => ({ start: vi.fn(), set: vi.fn() }),
    useSpring: () => createMotionValue(),
    useTransform: (mv: unknown, rangeOrFn?: unknown) => {
      // When called with a transform function, eagerly invoke with mv's current
      // value so JSX children render strings/numbers instead of the MotionValue object.
      if (typeof rangeOrFn === 'function') {
        const current = (mv as { get?: () => unknown } | null)?.get?.() ?? 0;
        try { return (rangeOrFn as (v: unknown) => unknown)(current); } catch { return ''; }
      }
      return createMotionValue();
    },
    useVelocity: () => createMotionValue(),
    animate: vi.fn(),
  };
});

afterEach(() => {
  vi.clearAllMocks();

  localStorageMock.getItem.mockClear();
  localStorageMock.setItem.mockClear();

  // Clear sessionStorage backing store between tests to prevent state bleed
  Object.keys(sessionStorageStore).forEach(k => delete sessionStorageStore[k]);

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
