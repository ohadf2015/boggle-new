/**
 * ScrollToTopOnNavigate Tests
 *
 * Every client-side route change must land the user at the TOP of the new page.
 * The app's scroll container is <body class="screen-fit"> (overflow-y:auto), so a
 * stale scroll offset — or a child's mount-time auto-scroll — could otherwise leave
 * the new page opened at the footer (the documented "page opens at the footer" bug).
 *
 * Anchor navigations (URL carries a #hash) are exempt so anchor links still jump
 * to their target.
 */

import React from 'react';
import { render } from '@testing-library/react';

// Controllable pathname mock — updated per render to simulate navigation.
let mockPathname = '/en';
vi.mock('next/navigation', () => ({
  usePathname: () => mockPathname,
}));

import ScrollToTopOnNavigate from '../ScrollToTopOnNavigate';

describe('ScrollToTopOnNavigate', () => {
  let scrollToSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockPathname = '/en';
    scrollToSpy = vi.fn();
    // happy-dom doesn't implement window.scrollTo — install a spy to observe it.
    Object.defineProperty(window, 'scrollTo', { value: scrollToSpy, writable: true, configurable: true });
    window.location.hash = '';
    document.body.scrollTop = 0;
    document.documentElement.scrollTop = 0;
  });

  it('scrolls the page to the top on initial mount', () => {
    // GIVEN a fresh mount on a route
    render(<ScrollToTopOnNavigate />);

    // THEN the window is pinned to the top
    expect(scrollToSpy).toHaveBeenCalledWith(0, 0);
  });

  it('resets the body scroll container to the top on mount', () => {
    // GIVEN the body scroll container is scrolled down (previous page state)
    document.body.scrollTop = 999;
    document.documentElement.scrollTop = 999;

    // WHEN the component mounts on a new route
    render(<ScrollToTopOnNavigate />);

    // THEN every candidate scroll container is reset to the top
    expect(document.body.scrollTop).toBe(0);
    expect(document.documentElement.scrollTop).toBe(0);
  });

  it('scrolls to the top again when the pathname changes', () => {
    // GIVEN a mounted component on /en
    const { rerender } = render(<ScrollToTopOnNavigate />);
    scrollToSpy.mockClear();

    // WHEN the user navigates to a different route
    mockPathname = '/en/multiplayer';
    rerender(<ScrollToTopOnNavigate />);

    // THEN the new page is scrolled to the top
    expect(scrollToSpy).toHaveBeenCalledWith(0, 0);
  });

  it('does NOT scroll when the URL carries a #hash (anchor navigation)', () => {
    // GIVEN the destination URL targets an in-page anchor
    window.location.hash = '#faq';

    // WHEN the component mounts
    render(<ScrollToTopOnNavigate />);

    // THEN the browser's native anchor scroll is left untouched
    expect(scrollToSpy).not.toHaveBeenCalled();
  });

  it('renders nothing (no DOM footprint)', () => {
    const { container } = render(<ScrollToTopOnNavigate />);
    expect(container.firstChild).toBeNull();
  });
});
