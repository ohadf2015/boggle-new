/**
 * The comeback-bonus modal must not paint over a conversion surface (the Teacher Pro
 * upgrade page is the portfolio's only chargeable CTA — measured 2026-08-23, this
 * modal was the second of two overlays intercepting the click).
 *
 * The case under test is the ASYNC GAP, which the effect-time check cannot cover:
 * this component is mounted at the layout level, its eligibility fetch resolves
 * after mount, and a client-side navigation onto the upgrade page does not re-run
 * its effect. So the signal has to be re-read on the render that would paint.
 *
 * Includes a positive control — without it, "no modal" is trivially true whenever
 * the component fails to render for some unrelated reason, and the test proves nothing.
 */
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'u1' }, profile: { display_name: 'Tester' } }),
}));

const mockFetchWithAuth = vi.fn();
vi.mock('@/utils/authFetch', () => ({
  fetchWithAuth: (...a: unknown[]) => mockFetchWithAuth(...a),
}));

vi.mock('@/components/engagement/ComebackBonusModal', () => ({
  ComebackBonusModal: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div data-testid="comeback-modal" /> : null,
}));

import ComebackBonusWrapper from '../ComebackBonusWrapper';

/** Resolves the eligibility fetch only when the test releases it. */
function deferredEligible() {
  let release!: () => void;
  const gate = new Promise<void>((r) => {
    release = r;
  });
  mockFetchWithAuth.mockImplementation(async () => {
    await gate;
    return { ok: true, json: async () => ({ eligible: true, tier: 'gold', daysAway: 3 }) };
  });
  return () => release();
}

describe('ComebackBonusWrapper on a conversion surface', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    document.body.classList.remove('conversion-surface');
  });

  afterEach(() => {
    document.body.classList.remove('conversion-surface');
  });

  it('shows the bonus modal when the visitor is NOT on a conversion surface', async () => {
    const release = deferredEligible();
    render(<ComebackBonusWrapper />);
    release();
    await waitFor(() => expect(screen.queryByTestId('comeback-modal')).toBeInTheDocument());
  });

  it('stays hidden when the visitor reaches a conversion surface while the fetch is in flight', async () => {
    const release = deferredEligible();
    render(<ComebackBonusWrapper />);
    // Mounted off the upgrade page, so the effect-time check passed and the fetch went out.
    // The visitor then navigates onto the upgrade page, which sets the class, and only THEN
    // does eligibility come back.
    document.body.classList.add('conversion-surface');
    release();
    await waitFor(() => expect(mockFetchWithAuth).toHaveBeenCalled());
    expect(screen.queryByTestId('comeback-modal')).not.toBeInTheDocument();
  });
});
