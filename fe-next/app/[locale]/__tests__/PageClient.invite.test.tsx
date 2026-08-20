import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import HomePageClient from '@/app/[locale]/PageClient';
import { getPendingRoomInvite } from '@/utils/onboardingStorage';

vi.mock('@/components/landing', () => ({
  LandingView: () => <div data-testid="landing-view" />,
}));

vi.mock('next/dynamic', () => ({ default: () => () => <div data-testid="onboarding-flow" /> }));

const replaceMock = vi.fn();
vi.mock('next/navigation', () => ({
  usePathname: () => '/en',
  useRouter: () => ({ push: vi.fn(), replace: replaceMock }),
}));

describe('HomePageClient invite parsing', () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    replaceMock.mockClear();
  });

  const setUrl = (search: string) => {
    Object.defineProperty(window, 'location', {
      value: { search, pathname: '/en', origin: 'http://localhost' },
      writable: true,
    });
  };

  it('saves room + hostName when both URL params present', () => {
    setUrl('?room=ABC123&host=Alice');
    render(<HomePageClient />);
    expect(getPendingRoomInvite()).toMatchObject({ code: 'ABC123', hostName: 'Alice' });
  });

  it('saves room with no host when host param missing', () => {
    setUrl('?room=ABC123');
    render(<HomePageClient />);
    expect(getPendingRoomInvite()?.hostName).toBeUndefined();
  });

  it('strips XSS attempt from host', () => {
    setUrl('?room=ABC123&host=' + encodeURIComponent('<script>alert(1)</script>'));
    render(<HomePageClient />);
    const invite = getPendingRoomInvite();
    expect(invite?.hostName ?? '').not.toContain('<');
    expect(invite?.hostName ?? '').not.toContain('>');
  });

  it('truncates long host names to 24 chars', () => {
    const longName = 'a'.repeat(40);
    setUrl(`?room=ABC123&host=${longName}`);
    render(<HomePageClient />);
    expect(getPendingRoomInvite()?.hostName?.length ?? 0).toBeLessThanOrEqual(24);
  });

  it('redirects returning users with ?room= straight to /multiplayer (skip landing/friends)', () => {
    localStorage.setItem('lexiclash_onboarding_completed', 'true');
    setUrl('?room=ABC123&host=Alice');
    render(<HomePageClient />);
    expect(replaceMock).toHaveBeenCalledWith('/en/multiplayer?room=ABC123&host=Alice');
  });

  it('does NOT redirect new users — FTUE owns the invite hand-off', () => {
    setUrl('?room=ABC123&host=Alice');
    render(<HomePageClient />);
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it('auto-starts the daily puzzle for returning users when no ?room= param', () => {
    localStorage.setItem('lexiclash_onboarding_completed', 'true');
    setUrl('');
    render(<HomePageClient />);
    expect(replaceMock).not.toHaveBeenCalledWith(expect.stringContaining('/multiplayer'));
    expect(replaceMock).toHaveBeenCalledWith('/en/daily/word-hunt?from=autostart');
  });

  // Regression #418: the server (no window) renders LandingView. The first CLIENT
  // paint must match — it previously rendered the connecting spinner for a
  // returning user with ?room= (inviteRedirectUrl read in a useState initializer),
  // diverging from server HTML → React #418 hydration crash. renderToString runs
  // no effects, so it reproduces the first-paint output.
  it('first paint renders LandingView (not the connecting spinner) for a returning user with ?room=', () => {
    localStorage.setItem('lexiclash_onboarding_completed', 'true');
    setUrl('?room=ABC123&host=Alice');
    const html = renderToString(<HomePageClient />);
    expect(html).toContain('landing-view');
    expect(html).not.toContain('animate-spin');
  });
});
