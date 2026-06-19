/**
 * growthTracking — referral_link_clicked closes the inbound-attribution gap.
 * Share links carry utm_medium=referral (room invites) or a ref code (friend
 * invites). The event was defined but never fired; this fires it once per
 * unique referral arrival so the referral cohort funnel is computable.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const captureMock = vi.fn();
vi.mock('@/lib/analytics/lazyPosthog', () => ({
  default: {
    register: vi.fn(),
    register_once: vi.fn(),
    capture: (...a: unknown[]) => captureMock(...a),
    people: { set: vi.fn(), set_once: vi.fn() },
    get_distinct_id: () => 'test-distinct-id',
    __loaded: true,
  },
}));

vi.mock('@/utils/posthogEngagement', () => ({
  setPostHogUserProps: vi.fn(),
  setPostHogUserPropsOnce: vi.fn(),
  setPostHogSuperProps: vi.fn(),
  setPostHogSuperPropsOnce: vi.fn(),
  incrementPostHogUserProp: vi.fn(),
  trackRageQuit: vi.fn(),
  trackSessionDepth: vi.fn(),
}));

vi.mock('@/components/GoogleAnalytics', () => ({ trackEvent: vi.fn() }));
vi.mock('@/utils/logger', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import { trackReferralLinkClicked } from '../growthTracking';

function setSearch(search: string): void {
  Object.defineProperty(window, 'location', {
    value: { search, hostname: 'lexiclash.live' },
    writable: true,
  });
}

function referralHits(): unknown[] {
  return captureMock.mock.calls.filter(([name]) => name === 'growth:referral_link_clicked');
}

function referralPayload(): Record<string, unknown> | undefined {
  return referralHits()[0]?.[1] as Record<string, unknown> | undefined;
}

describe('trackReferralLinkClicked', () => {
  beforeEach(() => {
    captureMock.mockClear();
    localStorage.clear();
  });

  it('fires referral_link_clicked for a room-invite arrival (utm_medium=referral)', () => {
    // GIVEN a visitor lands via a shared room invite link
    setSearch('?utm_source=whatsapp&utm_medium=referral&utm_campaign=player_invite');

    // WHEN inbound attribution runs
    trackReferralLinkClicked();

    // THEN the referral cohort event fires with the channel source
    const payload = referralPayload();
    expect(payload).toBeDefined();
    expect(payload!.utm_source).toBe('whatsapp');
    expect(payload!.utm_campaign).toBe('player_invite');
  });

  it('fires for a friend ref-code arrival', () => {
    setSearch('?ref=abc123');
    trackReferralLinkClicked();
    const payload = referralPayload();
    expect(payload).toBeDefined();
    expect(payload!.ref).toBe('abc123');
  });

  it('does NOT fire for an organic / paid arrival (no referral markers)', () => {
    // GIVEN a paid-ad arrival, not a player referral
    setSearch('?utm_source=google&utm_medium=cpc');
    trackReferralLinkClicked();
    expect(referralHits()).toHaveLength(0);
  });

  it('does NOT fire for a bare visit with no params', () => {
    setSearch('');
    trackReferralLinkClicked();
    expect(referralHits()).toHaveLength(0);
  });

  it('dedupes repeated loads of the same referral link (reload spam)', () => {
    setSearch('?utm_source=whatsapp&utm_medium=referral');
    trackReferralLinkClicked();
    trackReferralLinkClicked();
    expect(referralHits()).toHaveLength(1);
  });
});
