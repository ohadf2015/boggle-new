import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { teacherTrialExpiry } from '@/lib/education/trial';
import { DAY0_BRIDGE_PAYWALL_FROM_DAY } from '@/lib/education/day0FirstClassBridge';

const shown = vi.hoisted(() => vi.fn());
const pro = vi.hoisted(() => ({
  current: {
    hasPro: false,
    loading: false,
    known: true,
    accessTrialExpires: null as string | null,
  },
}));

vi.mock('@/hooks/useTeacherPro', () => ({ useTeacherPro: () => pro.current }));
vi.mock('@/lib/education/firstRoundGuideTelemetry', () => ({
  trackFirstRoundGuideShown: (...args: unknown[]) => shown(...args),
}));
vi.mock('@/components/education/results/ResultsTeacherProTrialCard', () => ({
  ResultsTeacherProTrialCard: () => <div data-testid="pro-trial-card" />,
  CLASS_CREATED_TRIAL_PLACEMENT: 'class_created',
}));

import { ClassCreatedAsk } from '../ClassCreatedAsk';

const DAY = 24 * 60 * 60 * 1000;
const HREF = '/en/education/classroom-game?classroomId=c1&minutes=2';

describe('ClassCreatedAsk', () => {
  beforeEach(() => {
    shown.mockClear();
    pro.current = {
      hasPro: false,
      loading: false,
      known: true,
      accessTrialExpires: teacherTrialExpiry(Date.now()),
    };
  });

  it('replaces the Polar card with the first-class bridge on approval day', () => {
    const onStart = vi.fn();
    render(<ClassCreatedAsk language="en" href={HREF} onStart={onStart} />);
    expect(screen.getByTestId('day0-first-class-bridge')).toHaveTextContent('Your first class in 2 minutes');
    const cta = screen.getByTestId('day0-first-class-cta');
    expect(cta).toHaveAttribute('href', HREF);
    fireEvent.click(cta);
    expect(onStart).toHaveBeenCalledTimes(1);
    expect(shown).toHaveBeenCalledWith({ surface: 'class_ready', locale: 'en', step: 'day0_bridge' });
  });

  it('renders the Teacher Pro offer card again on day 3 and after the trial', () => {
    pro.current.accessTrialExpires = teacherTrialExpiry(Date.now() - DAY0_BRIDGE_PAYWALL_FROM_DAY * DAY);
    const { rerender } = render(<ClassCreatedAsk language="en" href={HREF} />);
    expect(screen.queryByTestId('day0-first-class-bridge')).toBeNull();
    expect(screen.getByTestId('pro-trial-card')).toBeInTheDocument();

    pro.current.accessTrialExpires = new Date(Date.now() - DAY).toISOString();
    rerender(<ClassCreatedAsk language="en" href={HREF} />);
    expect(screen.queryByTestId('day0-first-class-bridge')).toBeNull();
    expect(screen.getByTestId('pro-trial-card')).toBeInTheDocument();
  });

  it('renders nothing for a Pro teacher and while entitlement is unread', () => {
    pro.current.hasPro = true;
    const { container, rerender } = render(<ClassCreatedAsk language="en" href={HREF} />);
    expect(container).toBeEmptyDOMElement();

    pro.current = { hasPro: false, loading: true, known: false, accessTrialExpires: teacherTrialExpiry(Date.now()) };
    rerender(<ClassCreatedAsk language="en" href={HREF} />);
    expect(screen.queryByTestId('day0-first-class-bridge')).toBeNull();
  });
});
