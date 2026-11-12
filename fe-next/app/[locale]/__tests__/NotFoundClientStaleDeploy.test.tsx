import React from 'react';
import { render, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('next/navigation', () => ({ usePathname: () => '/en/gone' }));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string, fallback?: string) => fallback ?? k, language: 'en' }),
}));
vi.mock('@/components/ui/InteractiveMascot', () => ({
  InteractiveMascot: () => <div data-testid="mascot" />,
}));

import NotFoundClient from '../NotFoundClient';
import { claimChunkRecoveryGuard } from '@/lib/deploy/staleDeployReload';

const replaceSpy = vi.fn();

async function mount(serverBuild: string) {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ buildTime: serverBuild }) }));
  await act(async () => {
    render(<NotFoundClient />);
  });
}

describe('NotFoundClient stale-deploy reload', () => {
  const originalBuild = process.env.NEXT_PUBLIC_BUILD_TIME;

  beforeEach(() => {
    process.env.NEXT_PUBLIC_BUILD_TIME = 'build-a';
    sessionStorage.clear();
    window.name = '';
    replaceSpy.mockClear();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { href: 'http://localhost/en/gone', search: '', reload: vi.fn(), replace: replaceSpy },
    });
    vi.stubGlobal('caches', { keys: async () => [], delete: async () => true });
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: { getRegistrations: async () => [] },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    process.env.NEXT_PUBLIC_BUILD_TIME = originalBuild;
  });

  it('reloads once when the 404 comes from a stale build', async () => {
    await mount('build-b');
    expect(replaceSpy).toHaveBeenCalledTimes(1);
    expect(replaceSpy.mock.calls[0][0]).toContain('_lc_chunk=');
    expect(sessionStorage.getItem('chunk_error_refresh')).toBe('build-a');
    await mount('build-b');
    expect(replaceSpy).toHaveBeenCalledTimes(1);
  });

  it('does not reload when this build already used its one reload', async () => {
    expect(claimChunkRecoveryGuard()).toBe(true);
    await mount('build-b');
    expect(replaceSpy).not.toHaveBeenCalled();
  });

  it('may reload once when the mark belongs to an older build', async () => {
    sessionStorage.setItem('chunk_error_refresh', 'build-old');
    await mount('build-b');
    expect(replaceSpy).toHaveBeenCalledTimes(1);
  });

  it('leaves a genuine 404 on a fresh build alone', async () => {
    await mount('build-a');
    expect(replaceSpy).not.toHaveBeenCalled();
  });
});
