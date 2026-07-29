/**
 * Preload script for Next.js custom server
 * Sets up globalThis.AsyncLocalStorage before Next.js loads
 * Required for Next.js 16+ when running through tsx
 */

import { AsyncLocalStorage } from 'async_hooks';

// Next.js expects AsyncLocalStorage on globalThis for its internal storage
// This must be set before any Next.js code is imported
if (typeof globalThis.AsyncLocalStorage === 'undefined') {
  (globalThis as typeof globalThis & { AsyncLocalStorage: typeof AsyncLocalStorage }).AsyncLocalStorage = AsyncLocalStorage;
}
