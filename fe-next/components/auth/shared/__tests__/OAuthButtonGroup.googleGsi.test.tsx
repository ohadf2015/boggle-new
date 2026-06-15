import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';

const mockIsNative = vi.fn(() => false);
vi.mock('@/utils/platform', () => ({ isNative: () => mockIsNative() }));
vi.mock('@/utils/ThemeContext', () => ({ useTheme: () => ({ theme: 'dark' }) }));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string, p?: { provider?: string }) => (p?.provider ? `${k}:${p.provider}` : k) }),
}));
vi.mock('@/components/CrazyGamesSDK', () => ({
  useCrazyGames: () => ({ isOnCrazyGamesPlatform: false, showAuthPrompt: vi.fn() }),
}));
vi.mock('framer-motion', () => ({
  m: { div: ({ children }: { children: React.ReactNode }) => <div>{children}</div> },
}));
vi.mock('@/components/auth/GoogleSignInButton', () => ({
  default: () => <div data-testid="gsi-button" />,
}));

import { OAuthButtonGroup } from '../OAuthButtonGroup';

describe('OAuthButtonGroup — Google uses the GSI token button on web', () => {
  beforeEach(() => {
    mockIsNative.mockReturnValue(false);
    vi.stubEnv('NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID', 'cid-123.apps.googleusercontent.com');
  });
  afterEach(() => vi.unstubAllEnvs());

  it('renders the GSI button (not the redirect button) for Google on web', () => {
    render(<OAuthButtonGroup onSignIn={vi.fn()} loadingProvider={null} />);
    expect(screen.getByTestId('gsi-button')).toBeTruthy();
    // The redirect-based Google button label must NOT be present
    expect(screen.queryByText('auth.signInWith:Google')).toBeNull();
    // Discord still uses the styled redirect button
    expect(screen.getByText('auth.signInWith:Discord')).toBeTruthy();
  });

  it('falls back to the redirect Google button on the native platform', () => {
    mockIsNative.mockReturnValue(true);
    render(<OAuthButtonGroup onSignIn={vi.fn()} loadingProvider={null} />);
    expect(screen.queryByTestId('gsi-button')).toBeNull();
    expect(screen.getByText('auth.signInWith:Google')).toBeTruthy();
  });
});
