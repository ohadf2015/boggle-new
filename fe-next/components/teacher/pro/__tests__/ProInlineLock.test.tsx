import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'ru' }),
}));
const start = vi.fn();
vi.mock('@/hooks/useTeacherProCheckout', () => ({ useTeacherProCheckout: () => ({ pending: false, start }) }));
let blocked = false;
vi.mock('@/hooks/useCheckoutBlockedInApp', () => ({ useCheckoutBlockedInApp: () => blocked }));
const clicked = vi.fn();
vi.mock('@/lib/education/proFunnelTelemetry', () => ({ trackProUpgradeClicked: (a: unknown) => clicked(a) }));

import { ProInlineLock } from '../ProInlineLock';
import { CHECKOUT_ORIGIN_KEY } from '@/lib/education/checkoutReturn';

describe('<ProInlineLock>: a locked inline Pro action previews before it asks', () => {
  beforeEach(() => {
    start.mockReset();
    clicked.mockReset();
    blocked = false;
    sessionStorage.clear();
    window.history.pushState({}, '', '/ru/teacher/reports?classroomId=c-9');
  });

  it.each(['missedPractice', 'pressureDials', 'mastery'] as const)('%s: closed, it is one labelled lock and no ask', (feature) => {
    render(<ProInlineLock feature={feature} label="Spaced practice" />);
    const toggle = screen.getByTestId(`pro-inline-lock-${feature}`);
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByTestId(`pro-preview-${feature}`)).not.toBeInTheDocument();
    expect(screen.queryByTestId(`pro-inline-upgrade-${feature}`)).not.toBeInTheDocument();
  });

  it.each(['missedPractice', 'pressureDials', 'mastery'] as const)('%s: opened, it shows the sample and exactly one upgrade', (feature) => {
    render(<ProInlineLock feature={feature} label="Spaced practice" />);
    fireEvent.click(screen.getByTestId(`pro-inline-lock-${feature}`));
    expect(screen.getByTestId(`pro-preview-${feature}`)).toBeInTheDocument();
    expect(screen.getAllByTestId(/^pro-inline-upgrade-/)).toHaveLength(1);
    expect(screen.queryAllByRole('link')).toHaveLength(0);
  });

  it('starts checkout from this page and remembers it for the return', () => {
    render(<ProInlineLock feature="missedPractice" label="Spaced practice" />);
    fireEvent.click(screen.getByTestId('pro-inline-lock-missedPractice'));
    fireEvent.click(screen.getByTestId('pro-inline-upgrade-missedPractice'));
    expect(start).toHaveBeenCalledTimes(1);
    expect(clicked).toHaveBeenCalledWith({ feature: 'missedPractice' });
    expect(JSON.parse(sessionStorage.getItem(CHECKOUT_ORIGIN_KEY) ?? '{}').path).toBe('/ru/teacher/reports?classroomId=c-9');
  });

  it('in the store app, says where to upgrade instead of offering checkout', () => {
    blocked = true;
    render(<ProInlineLock feature="pressureDials" label="Calm mode" />);
    fireEvent.click(screen.getByTestId('pro-inline-lock-pressureDials'));
    expect(screen.queryByTestId('pro-inline-upgrade-pressureDials')).not.toBeInTheDocument();
    expect(screen.getByText('teacher.subscription.notInApp')).toBeInTheDocument();
  });
});
