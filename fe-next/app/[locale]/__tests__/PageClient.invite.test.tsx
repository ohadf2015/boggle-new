import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render } from '@testing-library/react';
import HomePageClient from '@/app/[locale]/PageClient';
import { getPendingRoomInvite } from '@/utils/onboardingStorage';

vi.mock('@/components/landing', () => ({
  LandingView: () => <div data-testid="landing-view" />,
}));

vi.mock('next/dynamic', () => ({ default: () => () => <div data-testid="onboarding-flow" /> }));

vi.mock('next/navigation', () => ({
  usePathname: () => '/en',
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

describe('HomePageClient invite parsing', () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
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
});
