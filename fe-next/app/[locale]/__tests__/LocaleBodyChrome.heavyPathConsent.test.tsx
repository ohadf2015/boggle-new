/**
 * CookieConsent must mount on heavy game paths. SiteExtras (and therefore
 * DeferredLayoutWidgets) is skipped there, so the quiet-zone gate inside
 * CookieConsent never ran — the bar was absent even after the zone cleared.
 *
 * Visibility stays inside CookieConsent (showSheet). This shell only decides
 * whether the component is in the tree, and only when site chrome is not,
 * so chrome routes do not mount a second copy.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import type { ReactNode } from 'react';

let mockPathname = '/en';

vi.mock('next/navigation', () => ({
  usePathname: () => mockPathname,
}));

vi.mock('next/dynamic', () => ({
  default: () => function SiteExtrasStub() {
    return <nav data-testid="site-extras" />;
  },
}));

vi.mock('@/components/consent/HeavyPathCookieConsent', () => ({
  default: () => <div data-testid="heavy-path-consent" />,
}));

vi.mock('../../conditional-providers', () => ({
  ConditionalProviders: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock('@/components/ScrollToTopOnNavigate', () => ({ default: () => null }));
vi.mock('@/components/ChunkErrorRecovery', () => ({ default: () => null }));
vi.mock('@/components/ChunkErrorBoundary', () => ({
  default: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

import LocaleBodyChrome from '../LocaleBodyChrome';

function renderAt(pathname: string) {
  mockPathname = pathname;
  return render(
    <LocaleBodyChrome lang="en">
      <div>page</div>
    </LocaleBodyChrome>,
  );
}

describe('LocaleBodyChrome heavy-path cookie consent', () => {
  beforeEach(() => {
    mockPathname = '/en';
  });

  it.each([
    '/en/singleplayer',
    '/he/singleplayer',
    '/en/multiplayer',
    '/en/daily/word-hunt',
    '/en/education/live',
  ])('mounts the consent bar on heavy game path %s without site chrome', (p) => {
    renderAt(p);
    expect(screen.queryByTestId('heavy-path-consent')).not.toBeNull();
    expect(screen.queryByTestId('site-extras')).toBeNull();
  });

  it.each(['/en', '/en/blog', '/en/daily', '/he/daily', '/en/join', '/en/join/AB3K9Z', '/en/student'])(
    'does not double-mount consent beside site chrome on %s',
    (p) => {
      renderAt(p);
      expect(screen.queryByTestId('heavy-path-consent')).toBeNull();
      expect(screen.queryByTestId('site-extras')).not.toBeNull();
    },
  );
});

describe('HeavyPathCookieConsent chunk split', () => {
  const consentSrc = () =>
    readFileSync(
      path.resolve(__dirname, '..', '..', '..', 'components', 'consent', 'HeavyPathCookieConsent.tsx'),
      'utf8',
    );

  it('loads the real CookieConsent with ssr:false so /singleplayer does not parse it eagerly', () => {
    const src = consentSrc();
    expect(src).toContain("import('@/components/CookieConsent')");
    expect(src).toMatch(/ssr:\s*false/);
    expect(src).not.toMatch(/from ['"]@\/components\/CookieConsent['"]/);
  });

  it('wraps the mount in ChunkErrorBoundary so a consent chunk failure cannot blank the game', () => {
    const src = consentSrc();
    expect(src).toContain('ChunkErrorBoundary');
    expect(src).toMatch(/<ChunkErrorBoundary>[\s\S]*<CookieConsent/);
  });

  it('mounts the same CookieConsent component, so the student dense variant stays inside it', () => {
    const cookie = readFileSync(
      path.resolve(__dirname, '..', '..', '..', 'components', 'CookieConsent.tsx'),
      'utf8',
    );
    expect(cookie).toContain('STUDENT_ROUTE');
    expect(cookie).toContain("data-density={dense ? 'dense' : 'regular'}");
    expect(consentSrc()).toContain("import('@/components/CookieConsent')");
  });
});
