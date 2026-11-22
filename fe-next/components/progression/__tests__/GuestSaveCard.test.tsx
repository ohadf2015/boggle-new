import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { SIGNUP_PROMPT_ACTIVE_EVENT } from '@/lib/auth/signupPromptCoordination';

const reduced = vi.hoisted(() => ({ value: false }));
vi.mock('@/hooks/usePrefersReducedMotion', () => ({ usePrefersReducedMotion: () => reduced.value }));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string, p?: Record<string, unknown>) => (p ? `${key}:${JSON.stringify(p)}` : key),
    language: 'en',
    dir: 'ltr',
  }),
}));
const tracking = vi.hoisted(() => ({
  trackGrowthEvent: vi.fn(),
  trackSignupPromptClicked: vi.fn(),
  latchSignupSource: vi.fn(),
}));
vi.mock('@/utils/growthTracking', () => tracking);
const native = vi.hoisted(() => ({ value: false }));
vi.mock('@/utils/platform', () => ({ isNative: () => native.value }));
vi.mock('@/components/avatar/art/PartThumb', () => ({ PartThumb: () => <svg data-testid="part-thumb" /> }));
vi.mock('@/components/auth/GoogleSignInButton', () => ({
  default: ({ analyticsSource }: { analyticsSource?: string }) => <div data-testid="google-btn" data-source={analyticsSource} />,
}));
vi.mock('@/components/auth/AuthModal', () => ({
  default: ({ isOpen, initialMode }: { isOpen: boolean; initialMode?: string }) =>
    isOpen ? <div data-testid="auth-modal" data-mode={initialMode} /> : null,
}));
vi.mock('next/dynamic', () => ({
  default: () => (props: { isOpen: boolean; initialMode?: string }) =>
    props.isOpen ? <div data-testid="auth-modal" data-mode={props.initialMode} /> : null,
}));

import { GuestSaveCard } from '../GuestSaveCard';

describe('GuestSaveCard', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    reduced.value = false;
    native.value = false;
    vi.stubEnv('NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID', 'cid');
    Object.values(tracking).forEach((f) => f.mockClear());
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  it('Given a guest with XP, Then it shows the keep-XP headline, the meter, the next unlock and the inline Google button', () => {
    render(<GuestSaveCard gained={35} />);
    expect(screen.getByTestId('next-unlock-guest')).toHaveTextContent('progression.xp.signInToKeep:{"xp":"35"}');
    expect(screen.getByTestId('xp-moment-not-saved')).toBeInTheDocument();
    expect(screen.getByTestId('locked-unlock-thumb')).toBeInTheDocument();
    expect(screen.getByTestId('rarity-chip')).toBeInTheDocument();
    expect(screen.getByTestId('google-btn')).toHaveAttribute('data-source', 'results_card');
  });

  it('Given no XP, Then it shows the unlock headline and no meter', () => {
    render(<GuestSaveCard gained={0} />);
    expect(screen.getByTestId('next-unlock-guest')).toHaveTextContent('progression.unlock.signInToUnlock');
    expect(screen.queryByTestId('xp-moment')).toBeNull();
  });

  it('When the secondary button is tapped, Then the click is attributed and AuthModal opens in signup mode', () => {
    render(<GuestSaveCard gained={10} />);
    fireEvent.click(screen.getByTestId('guest-save-more-ways'));
    expect(tracking.trackSignupPromptClicked).toHaveBeenCalledWith('results_card');
    expect(tracking.latchSignupSource).toHaveBeenCalledWith('results_card');
    expect(screen.getByTestId('auth-modal')).toHaveAttribute('data-mode', 'signup');
  });

  it('Given motion allowed, Then the card holds in place, enters after the hero settles and reports one impression', () => {
    render(<GuestSaveCard gained={10} />);
    const card = screen.getByTestId('next-unlock-guest');
    expect(card).toHaveAttribute('data-entered', 'false');
    expect(card.className).toContain('invisible');
    expect(tracking.trackGrowthEvent).not.toHaveBeenCalled();
    act(() => { vi.advanceTimersByTime(700); });
    expect(card).toHaveAttribute('data-entered', 'true');
    expect(card.className).not.toContain('invisible');
    expect(screen.getByTestId('guest-save-thumb').className).toContain('quick-node-float');
    expect(tracking.trackGrowthEvent).toHaveBeenCalledTimes(1);
    expect(tracking.trackGrowthEvent).toHaveBeenCalledWith('signup_prompt_shown', expect.objectContaining({ source: 'results_card' }));
  });

  it('Given reduced motion, Then the card is on screen at once with no idle bob or hover lift', () => {
    reduced.value = true;
    render(<GuestSaveCard gained={10} />);
    const card = screen.getByTestId('next-unlock-guest');
    expect(card).toHaveAttribute('data-entered', 'true');
    expect(card.className).not.toContain('hover:-translate-y');
    expect(screen.getByTestId('guest-save-thumb').className).not.toContain('quick-node-float');
  });

  it('Given the post-game sheet opens, Then the card goes quiet (no idle bob)', () => {
    render(<GuestSaveCard gained={10} />);
    act(() => { vi.advanceTimersByTime(700); });
    act(() => { window.dispatchEvent(new CustomEvent(SIGNUP_PROMPT_ACTIVE_EVENT, { detail: { active: true } })); });
    expect(screen.getByTestId('next-unlock-guest')).toHaveAttribute('data-quiet', 'true');
    expect(screen.getByTestId('guest-save-thumb').className).not.toContain('quick-node-float');
    act(() => { window.dispatchEvent(new CustomEvent(SIGNUP_PROMPT_ACTIVE_EVENT, { detail: { active: false } })); });
    expect(screen.getByTestId('next-unlock-guest')).toHaveAttribute('data-quiet', 'false');
  });

  it('Given no inline Google (native app), Then "more ways" becomes the primary button', () => {
    native.value = true;
    render(<GuestSaveCard gained={10} />);
    expect(screen.queryByTestId('google-btn')).toBeNull();
    expect(screen.getByTestId('guest-save-more-ways')).toHaveAttribute('data-primary', 'true');
  });
});
