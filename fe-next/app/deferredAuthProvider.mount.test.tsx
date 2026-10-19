import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import type { ReactNode } from 'react';

const pathname = vi.hoisted(() => ({ current: '/en' }));

vi.mock('next/navigation', () => ({
  usePathname: () => pathname.current,
}));

vi.mock('@/contexts/AuthProvider', () => ({
  AuthProvider: ({ children }: { children: ReactNode }) => (
    <div data-testid="auth-provider">{children}</div>
  ),
}));

import { DeferredAuthProvider, resetDeferredAuthForTests } from './deferredAuthProvider';

describe('DeferredAuthProvider mount', () => {
  beforeEach(() => {
    resetDeferredAuthForTests();
    pathname.current = '/en';
    (globalThis as { __lcPathname?: string }).__lcPathname = '/en';
  });

  it('does not mount AuthProvider on landing until pointerdown', async () => {
    render(
      <DeferredAuthProvider>
        <span>child</span>
      </DeferredAuthProvider>,
    );
    expect(screen.getByText('child')).toBeTruthy();
    expect(screen.queryByTestId('auth-provider')).toBeNull();

    window.dispatchEvent(new Event('scroll'));
    await act(async () => {
      await Promise.resolve();
    });
    expect(screen.queryByTestId('auth-provider')).toBeNull();

    await act(async () => {
      window.dispatchEvent(new Event('pointerdown'));
      await Promise.resolve();
    });
    expect(await screen.findByTestId('auth-provider')).toBeTruthy();
  });

  it('mounts AuthProvider immediately on an auth-required route', async () => {
    pathname.current = '/en/teacher';
    (globalThis as { __lcPathname?: string }).__lcPathname = '/en/teacher';
    render(
      <DeferredAuthProvider>
        <span>teacher</span>
      </DeferredAuthProvider>,
    );
    expect(await screen.findByTestId('auth-provider')).toBeTruthy();
    expect(screen.getByText('teacher')).toBeTruthy();
  });

  it('mounts AuthProvider when a landing session navigates to an auth-required route', async () => {
    const view = render(
      <DeferredAuthProvider>
        <span>child</span>
      </DeferredAuthProvider>,
    );
    expect(screen.queryByTestId('auth-provider')).toBeNull();

    pathname.current = '/en/teacher';
    view.rerender(
      <DeferredAuthProvider>
        <span>teacher</span>
      </DeferredAuthProvider>,
    );
    expect(await screen.findByTestId('auth-provider')).toBeTruthy();
  });
});
