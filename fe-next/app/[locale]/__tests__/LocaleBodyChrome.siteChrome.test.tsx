import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
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

describe('LocaleBodyChrome site chrome (bottom tab bar, footer)', () => {
  beforeEach(() => {
    mockPathname = '/en';
  });

  it.each(['/en/daily', '/he/daily', '/ja/daily', '/daily'])(
    'mounts site chrome on the daily hub %s',
    (path) => {
      renderAt(path);
      expect(screen.queryByTestId('site-extras')).not.toBeNull();
    },
  );

  it.each(['/en/daily/word-hunt', '/he/daily/word-wheel', '/en/singleplayer'])(
    'keeps site chrome off the fullscreen game route %s',
    (path) => {
      renderAt(path);
      expect(screen.queryByTestId('site-extras')).toBeNull();
    },
  );

  it('mounts site chrome on ordinary pages', () => {
    renderAt('/en/blog');
    expect(screen.queryByTestId('site-extras')).not.toBeNull();
  });
});
