import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';
import { useState, type ReactNode } from 'react';

const pathname = vi.hoisted(() => ({ current: '/en' }));

vi.mock('next/navigation', () => ({
  usePathname: () => pathname.current,
}));

vi.mock('@/contexts/AuthProvider', async () => {
  const { AuthContext } = await import('@/contexts/AuthContext');
  const value = { loading: false, isGuest: false, isAuthenticated: true } as never;
  return {
    AuthProvider: ({ children }: { children: ReactNode }) => (
      <div data-testid="auth-provider">
        <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
      </div>
    ),
  };
});

import { DeferredAuthProvider, resetDeferredAuthForTests } from './deferredAuthProvider';
import { useAuth } from '@/contexts/AuthContext';

function StatefulChild() {
  const [open, setOpen] = useState(false);
  const { loading } = useAuth();
  return (
    <button type="button" onClick={() => setOpen(true)}>
      {open ? 'open' : 'closed'}:{loading ? 'loading' : 'ready'}
    </button>
  );
}

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

  it('mounts AuthProvider on landing without a gesture inside the native app', async () => {
    (globalThis as { Capacitor?: unknown }).Capacitor = { isNativePlatform: () => true };
    try {
      render(
        <DeferredAuthProvider>
          <span>child</span>
        </DeferredAuthProvider>,
      );
      expect(await screen.findByTestId('auth-provider')).toBeTruthy();
    } finally {
      delete (globalThis as { Capacitor?: unknown }).Capacitor;
    }
  });

  it('mounts AuthProvider on landing without a gesture for a signed-in visitor', async () => {
    localStorage.setItem('sb-test-auth-token', JSON.stringify({ access_token: 'x' }));
    try {
      render(
        <DeferredAuthProvider>
          <span>child</span>
        </DeferredAuthProvider>,
      );
      expect(await screen.findByTestId('auth-provider')).toBeTruthy();
    } finally {
      localStorage.removeItem('sb-test-auth-token');
    }
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

  it('keeps the app subtree mounted when AuthProvider arrives on first tap', async () => {
    render(
      <DeferredAuthProvider>
        <StatefulChild />
      </DeferredAuthProvider>,
    );
    const button = screen.getByRole('button');
    expect(button.textContent).toBe('closed:loading');

    // First tap on landing both arms the auth chunk and opens the menu.
    await act(async () => {
      window.dispatchEvent(new Event('pointerdown'));
      fireEvent.click(button);
      await Promise.resolve();
    });
    await screen.findByTestId('auth-provider');
    await screen.findByText('open:ready');
    // Same DOM node: the child was not unmounted/remounted.
    expect(screen.getByRole('button')).toBe(button);
  });
});
