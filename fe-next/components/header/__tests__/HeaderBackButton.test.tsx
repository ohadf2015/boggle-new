/**
 * HeaderBackButton — desktop-only back affordance in shared Header.
 * - Renders on non-home routes (desktop breakpoint).
 * - Hidden on home routes (`/`, `/[locale]`).
 * - Clicking calls router.back(); if no history, falls back to `/[locale]`.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import HeaderBackButton from '../HeaderBackButton';

const pushMock = vi.fn();
const backMock = vi.fn();
let currentPath = '/en/daily';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, back: backMock }),
  usePathname: () => currentPath,
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en', dir: 'ltr' }),
}));

describe('HeaderBackButton', () => {
  beforeEach(() => {
    pushMock.mockReset();
    backMock.mockReset();
  });

  it('renders on a non-home desktop route', () => {
    currentPath = '/en/daily';
    render(<HeaderBackButton />);
    expect(screen.getByRole('button', { name: /common\.back/i })).toBeInTheDocument();
  });

  it('does not render on localized home', () => {
    currentPath = '/en';
    const { container } = render(<HeaderBackButton />);
    expect(container.firstChild).toBeNull();
  });

  it('does not render on root /', () => {
    currentPath = '/';
    const { container } = render(<HeaderBackButton />);
    expect(container.firstChild).toBeNull();
  });

  it('calls router.back on click when history exists', () => {
    currentPath = '/en/settings';
    const originalLength = window.history.length;
    Object.defineProperty(window.history, 'length', { configurable: true, value: 3 });
    render(<HeaderBackButton />);
    fireEvent.click(screen.getByRole('button', { name: /common\.back/i }));
    expect(backMock).toHaveBeenCalledTimes(1);
    expect(pushMock).not.toHaveBeenCalled();
    Object.defineProperty(window.history, 'length', { configurable: true, value: originalLength });
  });

  it('falls back to localized home when no history', () => {
    currentPath = '/en/settings';
    const originalLength = window.history.length;
    Object.defineProperty(window.history, 'length', { configurable: true, value: 1 });
    render(<HeaderBackButton />);
    fireEvent.click(screen.getByRole('button', { name: /common\.back/i }));
    expect(pushMock).toHaveBeenCalledWith('/en');
    expect(backMock).not.toHaveBeenCalled();
    Object.defineProperty(window.history, 'length', { configurable: true, value: originalLength });
  });
});
