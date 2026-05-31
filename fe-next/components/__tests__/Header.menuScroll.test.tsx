/**
 * Test: Side-menu (HeaderMobileMenu) vertical scroll on mobile
 *
 * Regression guard. The drawer must be scrollable on touch devices. The
 * bug: the outermost drawer element was BOTH the framer-motion `drag="x"`
 * swipe-to-close target AND the `overflow-y-auto` scroll container. A
 * framer drag gesture sitting directly on the scroll container arbitrates
 * the touch gesture and swallows vertical scrolling — so the menu can't be
 * scrolled. (The app's other drawer, MobileGameDrawer, deliberately keeps
 * `drag` on a separate element from the scroller for exactly this reason.)
 *
 * Fix: the swipe-to-close drag layer and the scrollable body are SEPARATE
 * elements — the drag wrapper does not scroll, and the inner scroll body
 * owns `overflow-y-auto` + `touch-action: pan-y`.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import Header from '../Header';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), pathname: '/' }),
  usePathname: () => '/',
}));

vi.mock('next/link', () => {
  const MockLink = ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>;
  MockLink.displayName = 'MockLink';
  return { default: MockLink };
});

vi.mock('../../contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key, language: 'en', currentFlag: '🇺🇸' }),
}));

const mockAuthContext = {
  isAuthenticated: true,
  isAdmin: false,
  profile: { username: 'ohad', total_coins: 1000, total_xp: 500 },
  refreshProfile: vi.fn(),
};

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => mockAuthContext,
}));

vi.mock('../../hooks/useUnclaimedGifts', () => ({
  useUnclaimedGifts: () => ({ unclaimedCount: 0, gifts: [], refresh: vi.fn(), claimGift: vi.fn() }),
}));

vi.mock('../../hooks/useSafeArea', () => ({
  useSafeArea: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

vi.mock('../../utils/ThemeContext', () => ({
  useTheme: () => ({ theme: 'dark', toggleTheme: vi.fn() }),
}));

// Mock framer-motion: render motion elements as plain DOM, spreading props
// (so `drag` etc. land as attributes we can introspect).
vi.mock('framer-motion', () => ({
  m: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: React.HTMLAttributes<HTMLButtonElement>) => <button {...props}>{children}</button>,
    span: ({ children, ...props }: React.HTMLAttributes<HTMLSpanElement>) => <span {...props}>{children}</span>,
    nav: ({ children, ...props }: React.HTMLAttributes<HTMLElement>) => <nav {...props}>{children}</nav>,
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  LazyMotion: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  domAnimation: {},
}));

vi.mock('../MusicControls', () => ({ __esModule: true, default: () => <div data-testid="music-controls">Music</div> }));
vi.mock('../CoinBalance', () => ({ CoinBalance: ({ coins }: { coins: number }) => <div data-testid="coin-balance">{coins}</div> }));
vi.mock('../QuickLanguageSwitcher', () => ({ QuickLanguageSwitcher: () => <div data-testid="language-switcher">Lang</div> }));
vi.mock('../auth/AuthButton', () => ({ __esModule: true, default: () => <div data-testid="auth-button">Auth</div> }));

describe('Side-menu vertical scroll', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthContext.isAdmin = false;
  });

  it('keeps the scrollable menu body separate from the swipe-to-close drag layer', async () => {
    const user = userEvent.setup();
    render(<Header />);

    const hamburger = screen.getByRole('button', { name: /common.openMenu/i });
    await user.click(hamburger);

    // The scrollable body owns vertical scroll + pan-y touch-action.
    const scroller = await screen.findByTestId('mobile-menu-scroll');
    expect(scroller.className).toContain('overflow-y-auto');
    expect(scroller).toHaveStyle({ touchAction: 'pan-y' });

    // The scroll body must NOT be the swipe-to-close target.
    const drawer = screen.getByTestId('mobile-menu-drawer');
    expect(drawer.className).not.toContain('overflow-y-auto');
    expect(drawer).not.toBe(scroller);
  });

  it('does not attach a framer-motion drag gesture to the drawer', async () => {
    // A framer `drag` gesture engages on the horizontal component of any
    // diagonal scroll and elastically translates the drawer — the menu
    // "shakes" / springs back instead of scrolling. Swipe-to-close must be
    // implemented WITHOUT framer drag so native vertical scroll is untouched.
    const user = userEvent.setup();
    render(<Header />);
    await user.click(screen.getByRole('button', { name: /common.openMenu/i }));

    const drawer = await screen.findByTestId('mobile-menu-drawer');
    expect(drawer).not.toHaveAttribute('drag');
    expect(drawer).not.toHaveAttribute('dragelastic');
  });

  it('closes on a deliberate horizontal swipe toward the edge', async () => {
    const user = userEvent.setup();
    render(<Header />);
    await user.click(screen.getByRole('button', { name: /common.openMenu/i }));

    const drawer = await screen.findByTestId('mobile-menu-drawer');
    // LTR: swipe right (dx dominant, > threshold) closes the drawer.
    fireEvent.touchStart(drawer, { touches: [{ clientX: 300, clientY: 200 }] });
    fireEvent.touchEnd(drawer, { changedTouches: [{ clientX: 395, clientY: 206 }] });

    await waitFor(() =>
      expect(screen.queryByTestId('mobile-menu-scroll')).not.toBeInTheDocument()
    );
  });

  it('caps the drawer to the viewport height so a transformed <html> ancestor cannot make it unscrollable', async () => {
    // Root cause of "can't scroll the side menu": the drawer is `position: fixed
    // top-0 bottom-0`, so it sizes to its containing block. A native WebView
    // repaint hack briefly sets `transform: translateZ(0)` on <html>; if that
    // transform lingers (rAF dropped under native ad compositing), <html> becomes
    // the containing block and the drawer sizes to the DOCUMENT height instead of
    // the viewport. Its overflow-y-auto body then fits all content without
    // overflowing — so it can't scroll, while the menu still looks full.
    // An explicit viewport-relative max-height keeps the drawer bounded to the
    // visible viewport regardless of which element is its containing block.
    const user = userEvent.setup();
    render(<Header />);
    await user.click(screen.getByRole('button', { name: /common.openMenu/i }));

    const drawer = await screen.findByTestId('mobile-menu-drawer');
    expect(drawer.className).toContain('max-h-[100dvh]');
  });

  it('does NOT close on a vertical scroll gesture (the regression)', async () => {
    const user = userEvent.setup();
    render(<Header />);
    await user.click(screen.getByRole('button', { name: /common.openMenu/i }));

    const drawer = await screen.findByTestId('mobile-menu-drawer');
    // A downward scroll: small dx, large dy → must be treated as scroll, not close.
    fireEvent.touchStart(drawer, { touches: [{ clientX: 300, clientY: 400 }] });
    fireEvent.touchEnd(drawer, { changedTouches: [{ clientX: 306, clientY: 120 }] });

    expect(screen.getByTestId('mobile-menu-scroll')).toBeInTheDocument();
  });
});
