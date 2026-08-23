import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
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

// Native-shell + PWA detection — stubbed so the test drives the Capacitor
// bridge race (window.Capacitor can register AFTER the pill mounts).
let native = false;
let standalone = false;
vi.mock('@/utils/androidApp', () => ({
  isCapacitorNative: () => native,
  isStandaloneDisplay: () => standalone,
}));

// Route gate: the pill must never float over a gameplay surface.
let pathname = '/en';
vi.mock('next/navigation', () => ({
  usePathname: () => pathname,
}));

const HIDDEN_KEY = 'android_app_install_pill_hidden';

// Longer than the component's native-settle window so a single flush reveals
// the pill for genuine web visitors.
const SETTLE = 2000;

beforeEach(() => {
  vi.useFakeTimers();
  document.body.classList.remove('screen-fit-locked');
  captureMock.mockClear();
  sessionStorage.clear();
  eligible = true;
  native = false;
  standalone = false;
  pathname = '/en';
  useAndroidInstallStore.setState({ open: false, source: 'auto_popup', pillVisible: false });
});

afterEach(() => {
  vi.runOnlyPendingTimers();
  vi.useRealTimers();
});

/** Flush the native-settle window so the pill resolves its visibility. */
function settle() {
  act(() => {
    vi.advanceTimersByTime(SETTLE);
  });
}

describe('AndroidInstallPill', () => {
  it('renders nothing when the pill is not active', () => {
    render(<AndroidInstallPill />);
    settle();
    expect(screen.queryByText('androidAppPromo.pillLabel')).not.toBeInTheDocument();
  });

  it('renders nothing on gameplay routes (banner-blocked) even if active', () => {
    pathname = '/he/connections/play';
    useAndroidInstallStore.setState({ pillVisible: true });
    render(<AndroidInstallPill />);
    settle();
    expect(screen.queryByText('androidAppPromo.pillLabel')).not.toBeInTheDocument();
  });

  // The route gate above cannot cover /multiplayer: its passive lobby and its live round share
  // one path, so the route stays allowed and the pill floated over the board mid-round
  // (measured on www.lexiclash.live/he 2026-08-23, across 4 of 36 tiles). The runtime signal
  // `body.screen-fit-locked` — the same one the ad banner already obeys — is what covers it,
  // and it has to be watched, because the round starts long after this mounted.
  it('hides on a banner-allowed route once a round starts, and returns when it ends', async () => {
    pathname = '/he/multiplayer';
    useAndroidInstallStore.setState({ pillVisible: true });
    render(<AndroidInstallPill />);
    settle();
    expect(screen.queryByText('androidAppPromo.pillLabel')).toBeInTheDocument();

    // `await act(async …)` because MutationObserver delivers on a microtask — a sync act()
    // returns before the observer has run and the assertion reads the pre-change render.
    await act(async () => {
      document.body.classList.add('screen-fit-locked');
    });
    expect(screen.queryByText('androidAppPromo.pillLabel')).not.toBeInTheDocument();

    await act(async () => {
      document.body.classList.remove('screen-fit-locked');
    });
    expect(screen.queryByText('androidAppPromo.pillLabel')).toBeInTheDocument();
  });

  it('renders nothing on an ineligible platform even if active', () => {
    eligible = false;
    useAndroidInstallStore.setState({ pillVisible: true });
    render(<AndroidInstallPill />);
    settle();
    expect(screen.queryByText('androidAppPromo.pillLabel')).not.toBeInTheDocument();
  });

  it('shows the pill and tracks the impression once when active + eligible', () => {
    useAndroidInstallStore.setState({ pillVisible: true });
    render(<AndroidInstallPill />);
    settle();
    expect(screen.getByText('androidAppPromo.pillLabel')).toBeInTheDocument();
    expect(captureMock).toHaveBeenCalledWith('android_install_pill_shown');
    expect(captureMock).toHaveBeenCalledTimes(1);
  });

  it('reopens the promo tagged as a pill re-entry when tapped', () => {
    useAndroidInstallStore.setState({ pillVisible: true });
    render(<AndroidInstallPill />);
    settle();
    fireEvent.click(screen.getByText('androidAppPromo.pillLabel'));
    const s = useAndroidInstallStore.getState();
    expect(s.open).toBe(true);
    expect(s.source).toBe('pill');
    expect(captureMock).toHaveBeenCalledWith('android_install_pill_click');
  });

  it('permanently hides the pill for the session when closed', () => {
    useAndroidInstallStore.setState({ pillVisible: true });
    render(<AndroidInstallPill />);
    settle();
    fireEvent.click(screen.getByLabelText('androidAppPromo.pillClose'));
    expect(useAndroidInstallStore.getState().pillVisible).toBe(false);
    expect(sessionStorage.getItem(HIDDEN_KEY)).toBe('1');
    expect(captureMock).toHaveBeenCalledWith('android_install_pill_dismissed');
  });

  it('stays hidden if it was already closed earlier this session', () => {
    sessionStorage.setItem(HIDDEN_KEY, '1');
    useAndroidInstallStore.setState({ pillVisible: true });
    render(<AndroidInstallPill />);
    settle();
    expect(screen.queryByText('androidAppPromo.pillLabel')).not.toBeInTheDocument();
  });

  // ── Capacitor bridge race (the reported native-app bug) ─────────────────
  it('never shows inside the native app when the bridge is ready at mount', () => {
    native = true;
    useAndroidInstallStore.setState({ pillVisible: true });
    render(<AndroidInstallPill />);
    settle();
    expect(screen.queryByText('androidAppPromo.pillLabel')).not.toBeInTheDocument();
    expect(captureMock).not.toHaveBeenCalled();
  });

  it('does not flash the pill when the Capacitor bridge registers after mount', () => {
    // Remote-URL WebView: window.Capacitor is absent for the first render(s),
    // so an immediate check misreads the native app as web.
    native = false;
    useAndroidInstallStore.setState({ pillVisible: true });
    render(<AndroidInstallPill />);

    // Pill must NOT be shown optimistically before native detection settles.
    expect(screen.queryByText('androidAppPromo.pillLabel')).not.toBeInTheDocument();

    // The native bridge finishes registering shortly after mount.
    native = true;
    settle();

    // It must stay hidden — no flash, no impression.
    expect(screen.queryByText('androidAppPromo.pillLabel')).not.toBeInTheDocument();
    expect(captureMock).not.toHaveBeenCalledWith('android_install_pill_shown');
  });
});
