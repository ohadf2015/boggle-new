import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';

const mockPush = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mockPush }) }));

vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => false } }));

const mockCrazy = { isAvailable: false, isOnCrazyGamesPlatform: false };
vi.mock('@/components/CrazyGamesSDK', () => ({ useCrazyGames: () => mockCrazy }));

const mockAuth = { user: { id: 'user-uuid-42' }, isGuest: false };
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => mockAuth }));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en' }),
}));

const mockRefreshCoins = vi.fn().mockResolvedValue(100);
vi.mock('@/contexts/CoinContext', () => ({
  useCoinContext: () => ({ refreshCoins: mockRefreshCoins }),
}));

// Families: a known child must not see the offerwall (purchase/earn surface).
const social = vi.hoisted(() => ({ tier: 'adult' as 'adult' | 'child' | 'unknown' }));
vi.mock('@/hooks/useSocialCapabilities', () => ({
  useSocialCapabilities: () => ({ tier: social.tier }),
}));

import { EarnCoinsOfferwallButton } from '../EarnCoinsOfferwall';

beforeEach(() => {
  vi.clearAllMocks();
  social.tier = 'adult';
  mockAuth.user = { id: 'user-uuid-42' };
  mockAuth.isGuest = false;
  mockCrazy.isOnCrazyGamesPlatform = false;
  // Configure + enable via test flag (NODE_ENV is 'test', so prod gate needs the flag).
  process.env.NEXT_PUBLIC_AYET_OFFERWALL_ENABLED = 'true';
  process.env.NEXT_PUBLIC_AYET_OFFERWALL_ADSLOT = 'web_ow_1';
  (window as unknown as { __ayetOfferwallTest?: boolean }).__ayetOfferwallTest = true;
});

afterEach(() => {
  cleanup();
  delete process.env.NEXT_PUBLIC_AYET_OFFERWALL_ENABLED;
  delete process.env.NEXT_PUBLIC_AYET_OFFERWALL_ADSLOT;
  delete (window as unknown as { __ayetOfferwallTest?: boolean }).__ayetOfferwallTest;
});

describe('EarnCoinsOfferwallButton', () => {
  it('renders nothing when the offerwall is unconfigured (dark by default)', () => {
    delete process.env.NEXT_PUBLIC_AYET_OFFERWALL_ENABLED;
    const { container } = render(<EarnCoinsOfferwallButton />);
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing on native (Families app / Capacitor)', async () => {
    vi.resetModules();
    vi.doMock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => true } }));
    const { EarnCoinsOfferwallButton: NativeBtn } = await import('../EarnCoinsOfferwall');
    const { container } = render(<NativeBtn />);
    expect(container.firstChild).toBeNull();
    vi.doUnmock('@capacitor/core');
  });

  it('shows the CTA when configured on web', () => {
    render(<EarnCoinsOfferwallButton />);
    expect(screen.getByText('offerwall.cta.label')).toBeTruthy();
  });

  it('renders nothing for a known child even when configured (no earn/purchase surface)', () => {
    social.tier = 'child';
    const { container } = render(<EarnCoinsOfferwallButton />);
    expect(container.firstChild).toBeNull();
  });

  it('opens the offerwall iframe (dir=ltr) with the user id as external_identifier when authed', () => {
    render(<EarnCoinsOfferwallButton />);
    fireEvent.click(screen.getByText('offerwall.cta.label'));
    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeTruthy();
    const iframe = dialog.querySelector('iframe') as HTMLIFrameElement;
    expect(iframe.getAttribute('src')).toContain('external_identifier=user-uuid-42');
    expect(iframe.closest('[dir="ltr"]')).not.toBeNull();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('routes guests to signup instead of opening the offerwall', () => {
    mockAuth.user = null as unknown as { id: string };
    mockAuth.isGuest = true;
    render(<EarnCoinsOfferwallButton />);
    fireEvent.click(screen.getByText('offerwall.cta.label'));
    expect(mockPush).toHaveBeenCalledWith('/en/login');
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('refetches the balance on close (coins arrive via webhook, not the iframe)', () => {
    render(<EarnCoinsOfferwallButton />);
    fireEvent.click(screen.getByText('offerwall.cta.label'));
    fireEvent.click(screen.getByLabelText('offerwall.modal.close'));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(mockRefreshCoins).toHaveBeenCalled();
  });
});
