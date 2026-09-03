import { vi, describe, it, expect, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

vi.mock('@/utils/growthTracking', () => ({
  trackGrowthEvent: vi.fn(),
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (k: string) => k,
    language: 'en',
  }),
}));

// Reassignable per-test (mockUseAuth) so the fix/teacher-funnel resume-checkout tests
// can exercise the unauthenticated -> authenticated transition; every pre-existing
// test keeps the original always-authenticated default via beforeEach below.
const mockUseAuth = vi.fn();
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock('@/components/education/EducationHeader', () => ({
  EducationHeader: () => <div data-testid="education-header" />,
}));

// `priority` sends next/image down its preload path, which builds a `new URL(src)` with no
// base — happy-dom's URL constructor rejects a relative path and the whole component throws,
// taking every test in the file with it. An environment artifact, not a product bug: the same
// component renders fine under the education suite's Image (no `priority`) and in a browser.
// Renders a real <img> so `getByRole('img')` and `src` assert the actual contract.
// Same approach as host/components/pre-game/__tests__/MobileShareSection.test.tsx.
vi.mock('next/image', () => ({
  default: ({ src, alt }: { src: string; alt: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} />
  ),
}));

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

const mockToastError = vi.fn();
vi.mock('react-hot-toast', () => ({
  default: { error: (...a: unknown[]) => mockToastError(...a), success: vi.fn() },
}));

// The CTA is gated on a BUILD-time inlined flag, so it must be 'true' before the
// component module is imported — setting it inside a test is too late.
process.env.NEXT_PUBLIC_CHECKOUT_ENABLED = 'true';

// Assigned per-test, NOT at module scope: this project's vitest setup file installs its own
// globalThis.fetch AFTER test modules are imported, so a module-level `global.fetch = …` is
// silently overwritten and the component calls the setup's fetch instead of this mock.
const mockFetch = vi.fn();

import * as growthTracking from '@/utils/growthTracking';
import UpgradePricingPageClient from '../PageClient';

const mockTrackGrowthEvent = growthTracking.trackGrowthEvent as ReturnType<typeof vi.fn>;

describe('UpgradePricingPageClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: { id: 'test-user' }, isAuthenticated: true, profile: null, loading: false });
    // Clean up any lingering conversion-surface class
    document.body.classList.remove('conversion-surface');
    vi.stubGlobal('fetch', mockFetch);
    localStorage.clear();
  });

  it('tracks iap_viewed with product teacher_pro on mount', () => {
    render(<UpgradePricingPageClient />);
    expect(mockTrackGrowthEvent).toHaveBeenCalledWith('iap_viewed', { product: 'teacher_pro' });
  });

  it('district CTA links to for-schools lead form, not mailto', () => {
    render(<UpgradePricingPageClient />);
    const cta = screen.getByRole('link', { name: /teacher\.subscription\.districtCta/i });
    expect(cta).toHaveAttribute('href', '/en/education/for-schools');
  });

  it('marks body as conversion-surface to suppress interstitial modals', () => {
    expect(document.body.classList.contains('conversion-surface')).toBe(false);
    const { unmount } = render(<UpgradePricingPageClient />);
    // While component is mounted, conversion-surface should be present
    expect(document.body.classList.contains('conversion-surface')).toBe(true);
    // After unmount, conversion-surface should be removed
    unmount();
    expect(document.body.classList.contains('conversion-surface')).toBe(false);
  });

  // A guest click returns 401 and retrying can never succeed, so the generic
  // "checkoutError" ("please try again") is a lie. Measured on prod 2026-08-23.
  // These two assert the 401 branch actually diverges — revert it and both fail.
  it('a 401 from checkout asks the visitor to sign in, never "try again"', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 401 });
    render(<UpgradePricingPageClient />);

    fireEvent.click(screen.getByRole('button', { name: /upgradeNow/i }));
    await vi.waitFor(() => expect(mockFetch).toHaveBeenCalled());

    expect(mockFetch).toHaveBeenCalledWith('/api/subscription/checkout', { method: 'POST' });
    await vi.waitFor(() =>
      expect(mockToastError).toHaveBeenCalledWith('teacher.subscription.signInRequired'),
    );
    expect(mockToastError).not.toHaveBeenCalledWith('teacher.subscription.checkoutError');
  });

  it('a non-401 failure still gets the generic checkout error', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 500 });
    render(<UpgradePricingPageClient />);

    fireEvent.click(screen.getByRole('button', { name: /upgradeNow/i }));
    await vi.waitFor(() =>
      expect(mockToastError).toHaveBeenCalledWith('teacher.subscription.checkoutError'),
    );
    expect(mockToastError).not.toHaveBeenCalledWith('teacher.subscription.signInRequired');
  });

  // fix/teacher-funnel: a guest who hits the 401 wall already proved intent by
  // clicking Upgrade. The wall this closes is the SECOND click a teacher used to need
  // after finishing sign-in (password/OTP/OAuth in-modal, or a magic-link /
  // email-confirmation round trip that reloads or redirects back to this exact page).
  // Must match RESUME_CHECKOUT_KEY in PageClient.tsx — there's no export for it
  // because the flag is an internal implementation detail, not a public contract.
  const RESUME_CHECKOUT_KEY = 'lc_resume_checkout_after_auth';

  describe('resumes checkout automatically once authenticated', () => {
    it('marks resume intent in localStorage when checkout 401s', async () => {
      mockFetch.mockResolvedValue({ ok: false, status: 401 });
      render(<UpgradePricingPageClient />);

      fireEvent.click(screen.getByRole('button', { name: /upgradeNow/i }));
      await vi.waitFor(() => expect(localStorage.getItem(RESUME_CHECKOUT_KEY)).not.toBeNull());
    });

    it('auto-retries checkout on mount when the teacher is authenticated and a fresh resume flag is pending', async () => {
      localStorage.setItem(RESUME_CHECKOUT_KEY, String(Date.now()));
      mockFetch.mockResolvedValue({ ok: true, json: async () => ({ url: 'https://polar.sh/checkout/resumed' }) });

      render(<UpgradePricingPageClient />);

      await vi.waitFor(() =>
        expect(mockFetch).toHaveBeenCalledWith('/api/subscription/checkout', { method: 'POST' }),
      );
      // No click fired — this is the whole point of the fix.
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('consumes the resume flag so mounting twice does not double-fire checkout', async () => {
      localStorage.setItem(RESUME_CHECKOUT_KEY, String(Date.now()));
      mockFetch.mockResolvedValue({ ok: true, json: async () => ({ url: 'https://polar.sh/checkout/resumed' }) });

      render(<UpgradePricingPageClient />);
      await vi.waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));

      expect(localStorage.getItem(RESUME_CHECKOUT_KEY)).toBeNull();
    });

    it('does not auto-fire checkout when no resume flag is set', async () => {
      render(<UpgradePricingPageClient />);
      // Give any stray effect a tick to (not) fire before asserting the negative.
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('does not auto-fire checkout when the resume flag is stale (older than 15 minutes)', async () => {
      const sixteenMinutesAgo = Date.now() - 16 * 60 * 1000;
      localStorage.setItem(RESUME_CHECKOUT_KEY, String(sixteenMinutesAgo));

      render(<UpgradePricingPageClient />);
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(mockFetch).not.toHaveBeenCalled();
      // A stale flag is discarded on read, not left to be misread again later.
      expect(localStorage.getItem(RESUME_CHECKOUT_KEY)).toBeNull();
    });

    it('does not auto-fire checkout while auth is still loading, even with a fresh flag', async () => {
      mockUseAuth.mockReturnValue({ user: null, isAuthenticated: false, profile: null, loading: true });
      localStorage.setItem(RESUME_CHECKOUT_KEY, String(Date.now()));

      render(<UpgradePricingPageClient />);
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  it('mobile: Pro card appears first in document order (order-1), Free second (order-2)', () => {
    render(<UpgradePricingPageClient />);

    // Get both card containers. Queried by HEADING, not by text: each plan name also
    // appears as a column header in the comparison matrix further down the page, so a bare
    // getByText matches two nodes. The card is the one that titles a section.
    const proPlanCard = screen
      .getByRole('heading', { name: 'teacher.subscription.proPlanName' })
      .closest('div')?.parentElement;
    const freePlanCard = screen
      .getByRole('heading', { name: 'teacher.subscription.freePlanName' })
      .closest('div')?.parentElement;

    expect(proPlanCard).toHaveClass('order-1');
    expect(freePlanCard).toHaveClass('order-2');

    // On desktop (md:), Pro should be second (order-2) and Free first (order-1)
    expect(proPlanCard).toHaveClass('md:order-2');
    expect(freePlanCard).toHaveClass('md:order-1');
  });

  it('redirects to checkout URL on successful checkout', async () => {
    const checkoutUrl = 'https://polar.example.com/checkout/abc123';
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ url: checkoutUrl }),
    });

    // Mock window.location.href assignment
    const originalLocation = window.location;
    delete (window as any).location;
    window.location = { href: '' } as any;

    render(<UpgradePricingPageClient />);
    fireEvent.click(screen.getByRole('button', { name: /upgradeNow/i }));

    await vi.waitFor(() => {
      expect(window.location.href).toBe(checkoutUrl);
    });

    // Restore location
    window.location = originalLocation;
  });

  it('renders outcome-driven Pro features instead of feature-speak', () => {
    render(<UpgradePricingPageClient />);

    // Check that outcome-driven keys are used (which will render as the keys themselves in the test)
    expect(screen.getByText('teacher.subscription.featureOutcome1')).toBeInTheDocument();
    expect(screen.getByText('teacher.subscription.featureOutcome2')).toBeInTheDocument();
    expect(screen.getByText('teacher.subscription.featureOutcome3')).toBeInTheDocument();
    expect(screen.getByText('teacher.subscription.featureOutcome4')).toBeInTheDocument();

    // Verify these are in the Pro card (which is on the page)
    const proPlanCard = screen
      .getByRole('heading', { name: 'teacher.subscription.proPlanName' })
      .closest('div')?.parentElement;
    expect(proPlanCard).toBeInTheDocument();
  });

  it('anchors on price-per-day and states where tax appears', () => {
    render(<UpgradePricingPageClient />);

    expect(screen.getByText('teacher.subscription.pricePerDay')).toBeInTheDocument();
    // Kahoot says "All prices include Tax" twice above the fold; silence on tax is a
    // surprise for a teacher spending their own money. We say where it shows up rather
    // than claiming it's included, because the checkout's tax handling isn't ours to
    // promise.
    expect(screen.getByText('teacher.subscription.priceTaxNote')).toBeInTheDocument();
  });

  // The single most expensive bug on this page: the CTA shipped `disabled` in production
  // while the server was ready to take money. `NEXT_PUBLIC_*` is inlined at BUILD time, so
  // the client held a frozen copy of a value the server re-reads every request — Class 1
  // dual-source-of-truth, and the stale reader won the render. Proof the server was live:
  // an anonymous POST to /api/subscription/checkout returned 401, and the route's 503 gate
  // sits BEFORE its auth check, so 401 is only reachable once the gate has passed.
  //
  // So the server is the only gate. These two assert the client no longer holds a second one.
  it('never gates the CTA on a build-time flag', () => {
    // Read at render time, so deleting it here genuinely exercises the un-baked bundle.
    delete process.env.NEXT_PUBLIC_CHECKOUT_ENABLED;
    render(<UpgradePricingPageClient />);

    const cta = screen.getByRole('button', { name: /upgradeNow/i });
    expect(
      cta,
      'CTA is disabled when the flag is missing from the bundle — this is the production bug',
    ).not.toBeDisabled();

    fireEvent.click(cta);
    expect(mockFetch, 'click did not reach the server; a client gate swallowed it').toHaveBeenCalledWith(
      '/api/subscription/checkout',
      { method: 'POST' },
    );

    process.env.NEXT_PUBLIC_CHECKOUT_ENABLED = 'true';
  });

  it('a 503 says checkout is not open yet rather than "try again"', async () => {
    // The server's own "not available yet" refusal. Retrying can never fix it, so the
    // generic checkoutError ("please try again") sends the teacher into a loop.
    mockFetch.mockResolvedValue({ ok: false, status: 503 });
    render(<UpgradePricingPageClient />);

    fireEvent.click(screen.getByRole('button', { name: /upgradeNow/i }));
    await vi.waitFor(() =>
      expect(mockToastError).toHaveBeenCalledWith('teacher.subscription.checkoutUnavailable'),
    );
    expect(mockToastError).not.toHaveBeenCalledWith('teacher.subscription.checkoutError');
  });

  it('shows the classroom artwork above the plans', () => {
    // This page was entirely text and bordered cards. The art is a real classroom mid-game,
    // which is the thing being sold; the plans are only the price of it.
    render(<UpgradePricingPageClient />);

    const art = screen.getByRole('img', { name: /proHeroAlt/i });
    expect(art.getAttribute('src') ?? '').toContain('pro-hero-poster');
  });

  it('does not quote a per-student rate derived from the free-tier cap', () => {
    render(<UpgradePricingPageClient />);

    // Pro is unlimited students, so dividing $9 by the FREE cap (10) advertises the
    // worst per-student rate Pro can have — a real class of 30 is $0.30, a hundred is
    // $0.09. It anchored against the sale, so it's gone deliberately; this guards it
    // from coming back.
    expect(screen.queryByText(/pricePerStudent/)).not.toBeInTheDocument();
  });

  // Headline + value prop only. Kahoot's schools/plans H1 is an outcome
  // ("Achieve awesome classroom results with Kahoot!+") plus a "Best for"
  // use-case under each plan. Ours used to lead with a checkout command
  // ("Upgrade to Teacher Pro") — product-name-as-H1, no classroom moment.
  // The H1 is the outcome; the product name sits in an eyebrow so the fold
  // still names what is for sale without making the sale the headline.
  it('leads with an outcome H1 and a best-for value line, product name as eyebrow', () => {
    render(<UpgradePricingPageClient />);

    const h1 = screen.getByRole('heading', { level: 1 });
    expect(h1).toHaveTextContent('teacher.subscription.upgradePricingTitle');
    expect(screen.getByTestId('upgrade-value-prop')).toHaveTextContent(
      'teacher.subscription.valueHeadline',
    );
    expect(screen.getByTestId('upgrade-value-eyebrow')).toHaveTextContent(
      'teacher.subscription.proPlanName',
    );
    expect(h1.textContent).not.toMatch(/upgradeNow/i);
  });
});
