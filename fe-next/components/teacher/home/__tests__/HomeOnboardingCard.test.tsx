import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, within, cleanup, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { homeOnboarding } from '@/lib/education/homeOnboarding';
import { HomeOnboardingCard } from '../HomeOnboardingCard';

const t = (k: string, p?: Record<string, unknown>) => (p ? `${k}:${JSON.stringify(p)}` : k);
const HREFS = { createClass: '/en/teacher/classroom/new', shareCode: '/en/teacher/classroom/new?classroomId=c1', tryDemo: '/en/education/classroom-game?classroomId=c1&minutes=2' };
const fresh = homeOnboarding({ classroomCount: 0, inviteCopied: false, liveStarted: false, dismissed: false });
const shared = homeOnboarding({ classroomCount: 1, inviteCopied: true, liveStarted: false, dismissed: false });
const allDone = homeOnboarding({ classroomCount: 1, inviteCopied: true, liveStarted: true, dismissed: false });

afterEach(() => cleanup());

describe('<HomeOnboardingCard>', () => {
  it('Given a teacher with no class, Then one card with one lime action leads to the quick class setup', () => {
    render(<HomeOnboardingCard onboarding={fresh} hrefs={HREFS} variant="full" t={t} />);
    const card = screen.getByTestId('home-onboarding');
    expect(within(card).getAllByTestId(/^home-onboarding-step-/)).toHaveLength(3);
    expect(within(card).getByTestId('home-onboarding-cta')).toHaveAttribute('href', '/en/teacher/classroom/new');
    expect(within(card).getAllByRole('link')).toHaveLength(1);
    expect(screen.queryByTestId('home-onboarding-dismiss')).toBeNull();
  });

  it('Given a class with the code shared, Then the one list is create class, share code, play first game', () => {
    render(<HomeOnboardingCard onboarding={shared} hrefs={HREFS} variant="full" t={t} />);
    const ids = screen.getAllByTestId(/^home-onboarding-step-/).map((el) => el.getAttribute('data-testid'));
    expect(ids).toEqual(['home-onboarding-step-createClass', 'home-onboarding-step-shareCode', 'home-onboarding-step-tryDemo']);
    expect(screen.getByTestId('home-onboarding')).toHaveAttribute('data-source', 'onboarding');
    expect(screen.getByTestId('home-onboarding-cta')).toHaveAttribute('href', HREFS.tryDemo);
  });

  it('Given every step is done, Then the card is gone', () => {
    const { container } = render(<HomeOnboardingCard onboarding={allDone} hrefs={HREFS} variant="compact" t={t} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('Given the share card is already on Home, Then the share step does not show a second card', () => {
    const needsShare = homeOnboarding({ classroomCount: 1, inviteCopied: false, liveStarted: false, dismissed: false });
    const { container } = render(<HomeOnboardingCard onboarding={needsShare} hrefs={HREFS} shareCardShown variant="compact" t={t} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('When a first-run step is started or dismissed, Then the callbacks fire with that step', () => {
    const onStepStart = vi.fn();
    const onDismiss = vi.fn();
    render(<HomeOnboardingCard onboarding={shared} hrefs={HREFS} onStepStart={onStepStart} onDismiss={onDismiss} variant="compact" t={t} />);
    const cta = screen.getByTestId('home-onboarding-cta');
    cta.addEventListener('click', (e) => e.preventDefault());
    fireEvent.click(cta);
    expect(onStepStart).toHaveBeenCalledWith('tryDemo');
    fireEvent.click(screen.getByTestId('home-onboarding-dismiss'));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('Given the compact nudge, Then its progress dots are neutral and its title wraps instead of cutting off', () => {
    render(<HomeOnboardingCard onboarding={shared} hrefs={HREFS} variant="compact" t={t} />);
    const card = screen.getByTestId('home-onboarding');
    for (const dot of within(card).getAllByTestId(/^home-onboarding-step-/)) expect(dot.className).not.toMatch(/neo-lime/);
    expect(card.querySelector('#home-onboarding-title')?.className).not.toMatch(/truncate|line-clamp/);
  });
});
