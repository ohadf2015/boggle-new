import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';

vi.mock('@/utils/sentryLazy', () => ({ loadSentry: vi.fn() }));

import { ServiceWorkerRegistration } from '../ServiceWorkerRegistration';

describe('ServiceWorkerRegistration on a returning visit', () => {
  const register = vi.fn();
  let readyState: PropertyDescriptor | undefined;

  beforeEach(() => {
    vi.stubEnv('NODE_ENV', 'production');
    register.mockReset().mockResolvedValue({
      addEventListener: vi.fn(),
      waiting: null,
      update: vi.fn().mockResolvedValue(undefined),
    });
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: { register, addEventListener: vi.fn(), removeEventListener: vi.fn(), controller: {} },
    });
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, headers: new Headers({ 'content-type': 'application/javascript' }) })
    );
    readyState = Object.getOwnPropertyDescriptor(document, 'readyState');
    Object.defineProperty(document, 'readyState', { configurable: true, get: () => 'complete' });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    if (readyState) Object.defineProperty(document, 'readyState', readyState);
    else delete (document as { readyState?: string }).readyState;
  });

  it('registers even when the page load event fired before hydration', async () => {
    render(<ServiceWorkerRegistration />);
    await waitFor(() => expect(register).toHaveBeenCalledWith('/sw.js', { scope: '/' }));
  });
});
