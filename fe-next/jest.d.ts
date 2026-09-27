/// <reference types="@testing-library/jest-dom" />

// Extend Jest matchers with @testing-library/jest-dom matchers
import '@testing-library/jest-dom';

// Global test utilities from jest.setup.js
declare global {
  var mockSocket: {
    id: string;
    connected: boolean;
    disconnected: boolean;
    on: jest.Mock;
    off: jest.Mock;
    emit: jest.Mock;
    connect: jest.Mock;
    disconnect: jest.Mock;
    removeAllListeners: jest.Mock;
  };

  var mockSocketContext: {
    socket: typeof mockSocket;
    isConnected: boolean;
    isReconnecting: boolean;
    error: null | Error;
  };

  var mockAuthContext: {
    user: null | object;
    isLoading: boolean;
    isAuthenticated: boolean;
    signIn: jest.Mock;
    signOut: jest.Mock;
    signUp: jest.Mock;
  };

  var mockLanguageContext: {
    language: string;
    setLanguage: jest.Mock;
    t: jest.Mock;
    dir: 'ltr' | 'rtl';
  };

  function createMockEvent(properties?: object): {
    preventDefault: jest.Mock;
    stopPropagation: jest.Mock;
    target: { value: string };
    currentTarget: { value: string };
  };

  function waitForAsync(ms?: number): Promise<void>;

  function createDeferred(): {
    promise: Promise<unknown>;
    resolve: (value?: unknown) => void;
    reject: (reason?: unknown) => void;
  };
}

export {};
