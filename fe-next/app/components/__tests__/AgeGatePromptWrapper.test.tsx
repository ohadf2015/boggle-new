/**
 * AgeGatePromptWrapper — asks for the user's age at the interstitial natural
 * break instead of showing an ad.
 *
 * AdMobContext latches `ageGatePromptOpportunity` when an interstitial slot
 * came due but the tier is still 'unknown'. This wrapper turns that latch into
 * ONE AgeGateModal per install:
 * - only when the user still needs the gate (needsAgeGate)
 * - marker written at SHOW-time (Class-1 rule: reload without dismiss must not
 *   re-prompt)
 * - resolve or dismiss closes it; dismissing leaves the tier unknown (banners
 *   and rewarded keep serving, interstitials stay off).
 */
import { render, screen, fireEvent, act } from '@testing-library/react';

const adCtx = { ageGatePromptOpportunity: false };
const social = { needsAgeGate: true, authResolved: true };

vi.mock('@/contexts/AdMobContext', () => ({
  useAdMobContext: () => adCtx,
}));

vi.mock('@/hooks/useSocialCapabilities', () => ({
  useSocialCapabilities: () => social,
}));

vi.mock('@/components/families/AgeGateModal', () => ({
  AgeGateModal: ({ isOpen, onResolved, onClose }: {
    isOpen: boolean;
    onResolved: () => void;
    onClose?: () => void;
  }) => (isOpen ? (
    <div data-testid="age-gate-modal">
      <button onClick={onResolved}>resolve</button>
      <button onClick={() => onClose?.()}>dismiss</button>
    </div>
  ) : null),
}));

import AgeGatePromptWrapper from '../AgeGatePromptWrapper';

const MARKER_KEY = 'lc_age_prompt_shown_at';

describe('AgeGatePromptWrapper', () => {
  beforeEach(() => {
    localStorage.clear();
    adCtx.ageGatePromptOpportunity = false;
    social.needsAgeGate = true;
    social.authResolved = true;
  });

  it('renders nothing before an opportunity arises', () => {
    render(<AgeGatePromptWrapper />);
    expect(screen.queryByTestId('age-gate-modal')).toBeNull();
  });

  it('shows the modal on opportunity and writes the marker at show-time', () => {
    adCtx.ageGatePromptOpportunity = true;
    render(<AgeGatePromptWrapper />);
    expect(screen.getByTestId('age-gate-modal')).toBeTruthy();
    expect(localStorage.getItem(MARKER_KEY)).not.toBeNull();
  });

  it('never re-prompts once the marker exists (dismiss + reload)', () => {
    localStorage.setItem(MARKER_KEY, String(Date.now()));
    adCtx.ageGatePromptOpportunity = true;
    render(<AgeGatePromptWrapper />);
    expect(screen.queryByTestId('age-gate-modal')).toBeNull();
  });

  it('does not prompt a user whose age is already known', () => {
    adCtx.ageGatePromptOpportunity = true;
    social.needsAgeGate = false;
    render(<AgeGatePromptWrapper />);
    expect(screen.queryByTestId('age-gate-modal')).toBeNull();
  });

  it('does not prompt until auth has resolved (transient unknown tier)', () => {
    adCtx.ageGatePromptOpportunity = true;
    social.authResolved = false;
    render(<AgeGatePromptWrapper />);
    expect(screen.queryByTestId('age-gate-modal')).toBeNull();
  });

  it('closes on resolve', () => {
    adCtx.ageGatePromptOpportunity = true;
    render(<AgeGatePromptWrapper />);
    act(() => { fireEvent.click(screen.getByText('resolve')); });
    expect(screen.queryByTestId('age-gate-modal')).toBeNull();
  });

  it('closes on dismiss and stays closed', () => {
    adCtx.ageGatePromptOpportunity = true;
    render(<AgeGatePromptWrapper />);
    act(() => { fireEvent.click(screen.getByText('dismiss')); });
    expect(screen.queryByTestId('age-gate-modal')).toBeNull();
  });
});
