import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const signIn = vi.hoisted(() => vi.fn(async () => {}));
const native = vi.hoisted(() => ({ value: false }));
const edge = vi.hoisted(() => ({ value: false }));
const hookOptions = vi.hoisted(() => ({ value: null as null | Record<string, unknown> }));

vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ t: (k: string) => k, language: 'he' }) }));
vi.mock('@/utils/platform', () => ({ isNative: () => native.value, isEdgeBrowser: () => edge.value }));
vi.mock('@/components/auth/hooks/useOAuthSignIn', () => ({
  useOAuthSignIn: (opts: Record<string, unknown>) => {
    hookOptions.value = opts;
    return { signIn, loadingProvider: null };
  },
}));
vi.mock('@/components/auth/GoogleSignInButton', () => ({
  default: ({ analyticsSource }: { analyticsSource?: string }) => <div data-testid="gsi" data-source={analyticsSource} />,
}));

import { AccessRequestGoogleButton } from '../AccessRequestGoogleButton';

describe('<AccessRequestGoogleButton>', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    native.value = false;
    edge.value = false;
  });
  afterEach(() => vi.unstubAllEnvs());

  it('Given no Google web client, When tapped, Then it reports the tap and starts Google sign-in', async () => {
    vi.stubEnv('NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID', '');
    const onTap = vi.fn();
    render(<AccessRequestGoogleButton onTap={onTap} />);
    await userEvent.click(screen.getByRole('button', { name: 'auth.continueWithGoogle' }));
    expect(onTap).toHaveBeenCalledTimes(1);
    expect(signIn).toHaveBeenCalledWith('google');
    expect(screen.queryByTestId('gsi')).toBeNull();
  });

  it('Given a Google web client on the web, Then Google’s own button renders with the edu attribution', () => {
    vi.stubEnv('NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID', 'client-id');
    render(<AccessRequestGoogleButton onTap={vi.fn()} />);
    expect(screen.getByTestId('gsi')).toHaveAttribute('data-source', 'edu_access');
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('Given the native app, Then the SDK path is used even with a web client id', async () => {
    vi.stubEnv('NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID', 'client-id');
    native.value = true;
    render(<AccessRequestGoogleButton onTap={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: 'auth.continueWithGoogle' }));
    expect(signIn).toHaveBeenCalledWith('google');
  });

  it('Given Edge, Then our own translated button is used, not the shared fallback', async () => {
    vi.stubEnv('NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID', 'client-id');
    edge.value = true;
    render(<AccessRequestGoogleButton onTap={vi.fn()} />);
    expect(screen.queryByTestId('gsi')).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'auth.continueWithGoogle' }));
    expect(signIn).toHaveBeenCalledWith('google');
  });

  it('Given Google sign-in fails, Then the error is shown under the button', async () => {
    vi.stubEnv('NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID', '');
    render(<AccessRequestGoogleButton onTap={vi.fn()} />);
    const onError = hookOptions.value?.onError as (m: string) => void;
    await import('@testing-library/react').then(({ act }) => act(() => onError('Popup closed')));
    expect(screen.getByRole('alert')).toHaveTextContent('Popup closed');
  });
});
