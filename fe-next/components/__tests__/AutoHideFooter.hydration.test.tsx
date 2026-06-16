import { vi } from 'vitest';
/**
 * AutoHideFooter - hydration safety + behavior lock
 *
 * Bug (React #418 on every daily/MP page): the component returned `null` on the
 * server (SSR default isDesktop=false → game route → null) but `<footer>` on a
 * desktop client (isDesktop flips true because useDesktopLayout reads window in
 * its useState initializer). Server/client first render diverged → React
 * regenerated the whole tree.
 *
 * Fix: a `mounted` gate makes the first client render mirror the server
 * (compute as if isDesktop=false) and only run the viewport-aware branch after
 * mount. These tests lock the POST-mount behavior; the hydration match itself is
 * verified in-browser (no #418 in console).
 */

const mockUseIsDesktop = vi.fn();
const mockUseNavigation = vi.fn();
const mockUseTv = vi.fn();
const mockUsePathname = vi.fn();

vi.mock('@/hooks/useDesktopLayout', () => ({ useIsDesktop: () => mockUseIsDesktop() }));
vi.mock('@/contexts/NavigationContext', () => ({ useNavigation: () => mockUseNavigation() }));
vi.mock('@/hooks/useTvFullscreenListener', () => ({ useTvFullscreenListener: () => mockUseTv() }));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'he' }),
}));
vi.mock('next/navigation', () => ({ usePathname: () => mockUsePathname() }));
vi.mock('../Footer', () => ({ __esModule: true, default: () => <div data-testid="full-footer" /> }));

import { render, screen } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { AutoHideFooter } from '../AutoHideFooter';

describe('AutoHideFooter - hydration + behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseTv.mockReturnValue(false);
    mockUseNavigation.mockReturnValue({ isInGame: false });
    mockUsePathname.mockReturnValue('/he/daily');
  });

  it('renders the compact legal footer on a desktop game route (post-mount)', () => {
    mockUseIsDesktop.mockReturnValue(true);
    const { container } = render(<AutoHideFooter />);
    expect(container.querySelector('footer[role="contentinfo"]')).toBeTruthy();
    expect(screen.queryByTestId('full-footer')).toBeNull();
  });

  it('renders nothing on a mobile game route', () => {
    mockUseIsDesktop.mockReturnValue(false);
    const { container } = render(<AutoHideFooter />);
    expect(container.querySelector('footer')).toBeNull();
    expect(screen.queryByTestId('full-footer')).toBeNull();
  });

  it('renders NO footer at all on /admin (desktop) — not even the compact legal strip', () => {
    mockUseIsDesktop.mockReturnValue(true);
    mockUsePathname.mockReturnValue('/he/admin');
    const { container } = render(<AutoHideFooter />);
    expect(container.querySelector('footer')).toBeNull();
    expect(screen.queryByTestId('full-footer')).toBeNull();
  });

  it('renders no full footer on a dev/test route (avatar-test, desktop)', () => {
    mockUseIsDesktop.mockReturnValue(true);
    mockUsePathname.mockReturnValue('/he/avatar-test');
    const { container } = render(<AutoHideFooter />);
    expect(container.querySelector('footer')).toBeNull();
    expect(screen.queryByTestId('full-footer')).toBeNull();
  });

  it('hides the full footer on the /word-craft GAME route (mobile)', () => {
    mockUseIsDesktop.mockReturnValue(false);
    mockUsePathname.mockReturnValue('/he/word-craft');
    const { container } = render(<AutoHideFooter />);
    expect(container.querySelector('footer')).toBeNull();
    expect(screen.queryByTestId('full-footer')).toBeNull();
  });

  it('KEEPS the full footer on /word-craft-landing (SEO content, not a game)', () => {
    mockUseIsDesktop.mockReturnValue(true);
    mockUsePathname.mockReturnValue('/he/word-craft-landing');
    render(<AutoHideFooter />);
    expect(screen.getByTestId('full-footer')).toBeTruthy();
  });

  it('KEEPS the full footer on /word-craft-game (SEO content, not a game)', () => {
    mockUseIsDesktop.mockReturnValue(true);
    mockUsePathname.mockReturnValue('/he/word-craft-game');
    render(<AutoHideFooter />);
    expect(screen.getByTestId('full-footer')).toBeTruthy();
  });

  it('hides the full footer on /crossword GAME route (mobile)', () => {
    mockUseIsDesktop.mockReturnValue(false);
    mockUsePathname.mockReturnValue('/he/crossword');
    const { container } = render(<AutoHideFooter />);
    expect(container.querySelector('footer')).toBeNull();
    expect(screen.queryByTestId('full-footer')).toBeNull();
  });

  // Practice hub + tutorial are a focused, gated app flow (not an SEO landing) —
  // no marketing footer. Mobile gets nothing; desktop gets the compact legal
  // strip floor (the hub itself also flips isInGame=true for full removal).
  it('hides the full footer on the /practice route (mobile)', () => {
    mockUseIsDesktop.mockReturnValue(false);
    mockUsePathname.mockReturnValue('/he/practice');
    const { container } = render(<AutoHideFooter />);
    expect(container.querySelector('footer')).toBeNull();
    expect(screen.queryByTestId('full-footer')).toBeNull();
  });

  it('renders only the compact legal strip on /practice (desktop)', () => {
    mockUseIsDesktop.mockReturnValue(true);
    mockUsePathname.mockReturnValue('/he/practice/classic');
    const { container } = render(<AutoHideFooter />);
    expect(container.querySelector('footer[role="contentinfo"]')).toBeTruthy();
    expect(screen.queryByTestId('full-footer')).toBeNull();
  });

  // Hydration contract: server render (no effects → mounted=false) must NOT
  // depend on isDesktop, otherwise server (mobile) and desktop-client first
  // render diverge → React #418. renderToString reflects exactly the !mounted
  // branch since effects never run server-side.
  it('SSR output is identical regardless of isDesktop (game route)', () => {
    mockUseIsDesktop.mockReturnValue(false);
    const asMobile = renderToString(<AutoHideFooter />);
    mockUseIsDesktop.mockReturnValue(true);
    const asDesktop = renderToString(<AutoHideFooter />);
    expect(asDesktop).toBe(asMobile);
  });
});
