import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

let proState: Record<string, unknown>;
vi.mock('@/hooks/useTeacherPro', () => ({ useTeacherPro: () => proState }));
const start = vi.fn();
const hookArgs = vi.fn();
vi.mock('@/hooks/useStartTeacherProTrial', () => ({
  useStartTeacherProTrial: (...a: unknown[]) => {
    hookArgs(...a);
    return { start, pending: false };
  },
}));
const impression = vi.fn();
const click = vi.fn();
vi.mock('@/lib/education/reportProCtaClick', () => ({
  reportProOfferImpression: (a: unknown) => impression(a),
  reportProOfferClick: (a: unknown) => click(a),
}));
vi.mock('@/lib/education/useUpsellImpression', () => ({
  useUpsellImpression: (_r: unknown, imp: unknown, _e: unknown, onSeen?: () => void) => {
    if (imp && onSeen) onSeen();
  },
}));
vi.mock('@/utils/growthTracking', () => ({ trackGrowthEvent: vi.fn() }));
vi.mock('@/lib/education/proFunnelTelemetry', () => ({ trackTrialCtaView: vi.fn() }));
vi.mock('@/components/education/EduMascot', () => ({ EduMascot: () => null }));

import { HomeProCard } from '../HomeProCard';

const t = (k: string) => k;
const DAY = 24 * 60 * 60 * 1000;
const base = { hasPro: false, loading: false, known: true, trialUsed: false, accessTrialExpires: null, accessTrialEnded: false };

function renderCard(language = 'en') {
  return render(<HomeProCard kind="upgrade" onDismiss={vi.fn()} trackImpression={false} language={language} t={t} />);
}

beforeEach(() => {
  proState = { ...base };
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('HomeProCard — dashboard Teacher Pro offer', () => {
  it('Given the free access trial is live, Then it asks to keep Pro after the trial ($9/mo from the trial end) and checks out with the capped trial', () => {
    proState = { ...base, accessTrialExpires: new Date(Date.now() + 5 * DAY).toISOString() };
    renderCard();
    const card = screen.getByTestId('home-pro-card');
    expect(card).toHaveAttribute('data-offer', 'keep_after_trial');
    expect(card).toHaveTextContent('Keep Teacher Pro after your free trial');
    expect(screen.getByTestId('home-pro-cta')).toHaveTextContent('Keep Teacher Pro after my trial');
    expect(screen.getByTestId('home-pro-note')).toHaveTextContent('$9/mo starts when your trial ends');
    expect(card).not.toHaveTextContent(/14-day/);
    expect(hookArgs).toHaveBeenCalledWith(t, 'en', 'dashboard_trial_offer', { trial: true });
  });

  it('Given the access trial ended, Then it says the trial ended and goes straight to $9/mo checkout (no trial)', () => {
    proState = { ...base, accessTrialEnded: true };
    renderCard();
    const card = screen.getByTestId('home-pro-card');
    expect(card).toHaveAttribute('data-offer', 'paid');
    expect(card).toHaveTextContent('Your free trial has ended: continue with Teacher Pro');
    expect(screen.getByTestId('home-pro-note')).toHaveTextContent('$9/mo');
    expect(card).not.toHaveTextContent(/14-day/);
    expect(hookArgs).toHaveBeenCalledWith(t, 'en', 'dashboard_trial_offer', { trial: false });
  });

  it('Given a teacher who never trialed, Then it offers the 14-day trial', () => {
    renderCard();
    expect(screen.getByTestId('home-pro-card')).toHaveAttribute('data-offer', 'trial');
    expect(screen.getByTestId('home-pro-cta')).toHaveTextContent('Start your 14-day Teacher Pro trial');
    expect(hookArgs).toHaveBeenCalledWith(t, 'en', 'dashboard_trial_offer', { trial: true });
  });

  it.each(['en', 'he', 'sv', 'ja', 'es', 'ru'])('renders a localized label and note in %s', (lang) => {
    proState = { ...base, accessTrialExpires: new Date(Date.now() + 5 * DAY).toISOString() };
    renderCard(lang);
    expect(screen.getByTestId('home-pro-cta').textContent?.trim().length).toBeGreaterThan(3);
    expect(screen.getByTestId('home-pro-note')).toHaveTextContent('9');
    expect(screen.getByTestId('home-pro-card').textContent).not.toMatch(/eduShell\.pro\.(trialCta|cta|trialFine)/);
  });

  it('Then rendered + viewed + clicked go to the cookie-free server twins with source=dashboard, and the tap still starts checkout', () => {
    renderCard('he');
    expect(impression).toHaveBeenCalledWith({ placement: 'dashboard', locale: 'he', cta: 'teacher_pro_trial', offer: 'trial', stage: 'rendered' });
    expect(impression).toHaveBeenCalledWith({ placement: 'dashboard', locale: 'he', cta: 'teacher_pro_trial', offer: 'trial', stage: 'viewed' });
    fireEvent.click(screen.getByTestId('home-pro-cta'));
    expect(click).toHaveBeenCalledWith({ placement: 'dashboard', locale: 'he', cta: 'teacher_pro_trial', offer: 'trial' });
    expect(start).toHaveBeenCalledTimes(1);
  });

  it('Given the click report throws, Then checkout still starts', () => {
    click.mockImplementationOnce(() => {
      throw new Error('boom');
    });
    renderCard();
    fireEvent.click(screen.getByTestId('home-pro-cta'));
    expect(start).toHaveBeenCalledTimes(1);
  });
});
