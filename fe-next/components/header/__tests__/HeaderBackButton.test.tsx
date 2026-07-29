/**
 * HeaderBackButton — desktop-only back affordance in shared Header.
 * - Renders on non-home routes (desktop breakpoint).
 * - Hidden on home routes (`/`, `/[locale]`).
 * - Clicking navigates ONE level up the URL hierarchy (via useBackOneLevel):
 *   pushes the computed parent; uses router.back() only when the referrer is
 *   that parent. No more over-shooting to home on deep-link/refresh.
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

function setReferrer(value: string) {
  Object.defineProperty(document, 'referrer', { configurable: true, value });
}

describe('HeaderBackButton', () => {
  beforeEach(() => {
    pushMock.mockReset();
    backMock.mockReset();
    setReferrer('');
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { origin: 'https://lexiclash.live' },
    });
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

  it('pushes the hierarchical parent (one level up), not home, for a nested route', () => {
    currentPath = '/en/daily/archive';
    render(<HeaderBackButton />);
    fireEvent.click(screen.getByRole('button', { name: /common\.back/i }));
    expect(pushMock).toHaveBeenCalledWith('/en/daily');
    expect(backMock).not.toHaveBeenCalled();
  });

  it('pushes localized home for a top-level section', () => {
    currentPath = '/en/settings';
    render(<HeaderBackButton />);
    fireEvent.click(screen.getByRole('button', { name: /common\.back/i }));
    expect(pushMock).toHaveBeenCalledWith('/en');
  });

  it('uses router.back() when arriving from the parent', () => {
    currentPath = '/en/daily/archive';
    setReferrer('https://lexiclash.live/en/daily');
    render(<HeaderBackButton />);
    fireEvent.click(screen.getByRole('button', { name: /common\.back/i }));
    expect(backMock).toHaveBeenCalledTimes(1);
    expect(pushMock).not.toHaveBeenCalled();
  });
});
