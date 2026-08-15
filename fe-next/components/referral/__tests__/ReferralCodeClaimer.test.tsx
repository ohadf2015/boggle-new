/**
 * The missing half of the referral loop. Codes were shareable (`<origin>?ref=CODE`)
 * and `POST /api/referral` exists to claim one, but nothing connected the two —
 * prod: 375 codes issued, 0 referrals, 0 rewards, ever.
 *
 * A referral link is almost always opened by someone with no account yet, so
 * capture and claim have to be separate beats: hold the code through signup, then
 * claim once there is a user to attach it to.
 */

import { render, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import ReferralCodeClaimer from '../ReferralCodeClaimer';
import {
  PENDING_REFERRAL_KEY,
  readPendingReferral,
} from '@/lib/referral/pendingReferral';

const postMock = vi.fn();
vi.mock('@/utils/authFetch', () => ({
  postWithAuth: (...args: unknown[]) => postMock(...args),
}));

let mockAuth: { isAuthenticated: boolean; user: { id: string } | null } = {
  isAuthenticated: false,
  user: null,
};
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockAuth,
}));

function setSearch(search: string) {
  Object.defineProperty(window, 'location', {
    value: { search, href: `https://www.lexiclash.live/${search}` },
    configurable: true,
    writable: true,
  });
}

const ok = (body: unknown = { success: true }) =>
  ({ ok: true, status: 200, json: async () => body }) as Response;
const fail = (status: number, body: unknown = {}) =>
  ({ ok: false, status, json: async () => body }) as Response;

beforeEach(() => {
  localStorage.clear();
  postMock.mockReset();
  postMock.mockResolvedValue(ok());
  mockAuth = { isAuthenticated: false, user: null };
  setSearch('');
});

afterEach(() => vi.restoreAllMocks());

describe('ReferralCodeClaimer', () => {
  it('captures ?ref= for a signed-out visitor and holds it instead of posting', async () => {
    setSearch('?ref=AB12CD');

    render(<ReferralCodeClaimer />);

    await waitFor(() => expect(readPendingReferral()).toBe('AB12CD'));
    expect(postMock).not.toHaveBeenCalled();
  });

  it('claims the held code once the visitor is authenticated, then clears it', async () => {
    localStorage.setItem(PENDING_REFERRAL_KEY, 'AB12CD');
    mockAuth = { isAuthenticated: true, user: { id: 'new-user' } };

    render(<ReferralCodeClaimer />);

    await waitFor(() =>
      expect(postMock).toHaveBeenCalledWith('/api/referral', { referralCode: 'AB12CD' })
    );
    await waitFor(() => expect(readPendingReferral()).toBeNull());
  });

  it('captures and claims in one pass when the visitor already has an account', async () => {
    setSearch('?ref=LEXI99');
    mockAuth = { isAuthenticated: true, user: { id: 'existing' } };

    render(<ReferralCodeClaimer />);

    await waitFor(() =>
      expect(postMock).toHaveBeenCalledWith('/api/referral', { referralCode: 'LEXI99' })
    );
  });

  it('drops the code on a terminal rejection so it cannot retry forever', async () => {
    localStorage.setItem(PENDING_REFERRAL_KEY, 'AB12CD');
    mockAuth = { isAuthenticated: true, user: { id: 'self' } };
    postMock.mockResolvedValue(fail(400, { error: 'Cannot refer yourself' }));

    render(<ReferralCodeClaimer />);

    await waitFor(() => expect(readPendingReferral()).toBeNull());
  });

  it('KEEPS the code when the server errors, so a bad deploy does not burn it', async () => {
    localStorage.setItem(PENDING_REFERRAL_KEY, 'AB12CD');
    mockAuth = { isAuthenticated: true, user: { id: 'new-user' } };
    postMock.mockResolvedValue(fail(500));

    render(<ReferralCodeClaimer />);

    await waitFor(() => expect(postMock).toHaveBeenCalled());
    expect(readPendingReferral()).toBe('AB12CD');
  });

  it('keeps the code when the request throws (offline)', async () => {
    localStorage.setItem(PENDING_REFERRAL_KEY, 'AB12CD');
    mockAuth = { isAuthenticated: true, user: { id: 'new-user' } };
    postMock.mockRejectedValue(new Error('network'));

    render(<ReferralCodeClaimer />);

    await waitFor(() => expect(postMock).toHaveBeenCalled());
    expect(readPendingReferral()).toBe('AB12CD');
  });

  it('posts once, not once per render', async () => {
    localStorage.setItem(PENDING_REFERRAL_KEY, 'AB12CD');
    mockAuth = { isAuthenticated: true, user: { id: 'new-user' } };

    const { rerender } = render(<ReferralCodeClaimer />);
    rerender(<ReferralCodeClaimer />);
    rerender(<ReferralCodeClaimer />);

    await waitFor(() => expect(postMock).toHaveBeenCalledTimes(1));
  });

  it('does nothing at all without a code', async () => {
    mockAuth = { isAuthenticated: true, user: { id: 'someone' } };

    render(<ReferralCodeClaimer />);

    await waitFor(() => expect(postMock).not.toHaveBeenCalled());
  });
});
