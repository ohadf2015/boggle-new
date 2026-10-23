/**
 * The fixed header carries the bar AND the desktop game-mode tabs, but the
 * spacer that reserves its flow space was a hard-coded min-height. On a
 * 1000px-tall desktop the CSS said 80px while the header painted ~119px, so the
 * top of every page sat behind it. The spacer must follow the header's real height.
 */
import React from 'react';
import { render } from '@testing-library/react';
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
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ isAuthenticated: false, isAdmin: false, profile: null, refreshProfile: vi.fn() }),
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

describe('Header spacer', () => {
  const realRO = globalThis.ResizeObserver;
  const realRect = HTMLElement.prototype.getBoundingClientRect;

  afterEach(() => {
    globalThis.ResizeObserver = realRO;
    HTMLElement.prototype.getBoundingClientRect = realRect;
  });

  it('Given the header paints 119px tall, Then the spacer reserves 119px, not the CSS floor', () => {
    HTMLElement.prototype.getBoundingClientRect = function (this: HTMLElement) {
      return { height: this.tagName === 'HEADER' ? 119 : 0, width: 0, top: 0, left: 0, right: 0, bottom: 0, x: 0, y: 0, toJSON: () => ({}) } as DOMRect;
    };
    globalThis.ResizeObserver = class {
      constructor(private cb: () => void) {}
      observe() { this.cb(); }
      unobserve() {}
      disconnect() {}
    } as unknown as typeof ResizeObserver;

    const { container } = render(<Header />);
    const spacer = container.querySelector('header')!.previousElementSibling as HTMLElement;
    expect(spacer.style.minHeight).toBe('119px');
  });
});
