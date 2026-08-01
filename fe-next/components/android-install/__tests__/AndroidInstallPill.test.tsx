import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import AndroidInstallPill from '../AndroidInstallPill';
import { useAndroidInstallStore } from '@/lib/androidInstall/androidInstallStore';

const captureMock = vi.fn();
vi.mock('@/lib/analytics/lazyPosthog', () => ({
  default: { capture: (...a: unknown[]) => captureMock(...a) },
}));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key }),
}));

// Eligibility is platform detection — stub it so the test controls the gate.
let eligible = true;
vi.mock('@/lib/androidInstall/installEligibility', () => ({
  isAndroidInstallEntryEligible: () => eligible,
}));

// Route gate: the pill must never float over a gameplay surface.
let pathname = '/en';
vi.mock('next/navigation', () => ({
  usePathname: () => pathname,
}));

const HIDDEN_KEY = 'android_app_install_pill_hidden';

beforeEach(() => {
  captureMock.mockClear();
  sessionStorage.clear();
  eligible = true;
  pathname = '/en';
  useAndroidInstallStore.setState({ open: false, source: 'auto_popup', pillVisible: false });
});

describe('AndroidInstallPill', () => {
  it('renders nothing when the pill is not active', () => {
    render(<AndroidInstallPill />);
    expect(screen.queryByText('androidAppPromo.pillLabel')).not.toBeInTheDocument();
  });

  it('renders nothing on gameplay routes (banner-blocked) even if active', () => {
    pathname = '/he/connections/play';
    useAndroidInstallStore.setState({ pillVisible: true });
    render(<AndroidInstallPill />);
    expect(screen.queryByText('androidAppPromo.pillLabel')).not.toBeInTheDocument();
  });

  it('renders nothing on an ineligible platform even if active', () => {
    eligible = false;
    useAndroidInstallStore.setState({ pillVisible: true });
    render(<AndroidInstallPill />);
    expect(screen.queryByText('androidAppPromo.pillLabel')).not.toBeInTheDocument();
  });

  it('shows the pill and tracks the impression once when active + eligible', () => {
    useAndroidInstallStore.setState({ pillVisible: true });
    render(<AndroidInstallPill />);
    expect(screen.getByText('androidAppPromo.pillLabel')).toBeInTheDocument();
    expect(captureMock).toHaveBeenCalledWith('android_install_pill_shown');
    expect(captureMock).toHaveBeenCalledTimes(1);
  });

  it('reopens the promo tagged as a pill re-entry when tapped', () => {
    useAndroidInstallStore.setState({ pillVisible: true });
    render(<AndroidInstallPill />);
    fireEvent.click(screen.getByText('androidAppPromo.pillLabel'));
    const s = useAndroidInstallStore.getState();
    expect(s.open).toBe(true);
    expect(s.source).toBe('pill');
    expect(captureMock).toHaveBeenCalledWith('android_install_pill_click');
  });

  it('permanently hides the pill for the session when closed', () => {
    useAndroidInstallStore.setState({ pillVisible: true });
    render(<AndroidInstallPill />);
    fireEvent.click(screen.getByLabelText('androidAppPromo.pillClose'));
    expect(useAndroidInstallStore.getState().pillVisible).toBe(false);
    expect(sessionStorage.getItem(HIDDEN_KEY)).toBe('1');
    expect(captureMock).toHaveBeenCalledWith('android_install_pill_dismissed');
  });

  it('stays hidden if it was already closed earlier this session', () => {
    sessionStorage.setItem(HIDDEN_KEY, '1');
    useAndroidInstallStore.setState({ pillVisible: true });
    render(<AndroidInstallPill />);
    expect(screen.queryByText('androidAppPromo.pillLabel')).not.toBeInTheDocument();
  });
});
