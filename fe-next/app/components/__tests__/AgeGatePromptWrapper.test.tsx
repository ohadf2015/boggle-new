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

const trackAgeGate = vi.fn();
vi.mock('@/utils/growthTracking', () => ({
  trackAgeGate: (...args: unknown[]) => trackAgeGate(...args),
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

import AgeGatePromptWrapper, { RE_PROMPT_INTERVAL_MS } from '../AgeGatePromptWrapper';

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

  it('does not re-prompt while the last prompt is fresh (dismiss + reload)', () => {
    localStorage.setItem(MARKER_KEY, String(Date.now()));
    adCtx.ageGatePromptOpportunity = true;
    render(<AgeGatePromptWrapper />);
    expect(screen.queryByTestId('age-gate-modal')).toBeNull();
  });

  it('re-prompts once the last prompt is older than the re-prompt interval and refreshes the marker', () => {
    const stale = Date.now() - RE_PROMPT_INTERVAL_MS - 1000;
    localStorage.setItem(MARKER_KEY, String(stale));
    adCtx.ageGatePromptOpportunity = true;
    render(<AgeGatePromptWrapper />);
    expect(screen.getByTestId('age-gate-modal')).toBeTruthy();
    expect(Number(localStorage.getItem(MARKER_KEY))).toBeGreaterThan(stale);
  });

  it('treats an unparsable marker as stale and re-prompts', () => {
    localStorage.setItem(MARKER_KEY, 'garbage');
    adCtx.ageGatePromptOpportunity = true;
    render(<AgeGatePromptWrapper />);
    expect(screen.getByTestId('age-gate-modal')).toBeTruthy();
  });

  it('tracks shown / declared analytics', () => {
    adCtx.ageGatePromptOpportunity = true;
    render(<AgeGatePromptWrapper />);
    expect(trackAgeGate).toHaveBeenCalledWith('shown');
    act(() => { fireEvent.click(screen.getByText('resolve')); });
    expect(trackAgeGate).toHaveBeenCalledWith('declared');
  });

  it('tracks dismissed analytics', () => {
    adCtx.ageGatePromptOpportunity = true;
    render(<AgeGatePromptWrapper />);
    act(() => { fireEvent.click(screen.getByText('dismiss')); });
    expect(trackAgeGate).toHaveBeenCalledWith('dismissed');
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
