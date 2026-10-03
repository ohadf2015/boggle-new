import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

const mockTrack = vi.fn();
const onboardingState = {
  shouldShowOnboarding: true,
  currentStep: 0,
  completedSteps: [] as string[],
  isCompleted: false,
  isSkipped: false,
  completeStep: vi.fn(),
  nextStep: vi.fn(),
  prevStep: vi.fn(),
  setStep: vi.fn(),
  complete: vi.fn(),
  skip: vi.fn(),
  reset: vi.fn(),
};

vi.mock('@/lib/education/telemetry', () => ({
  trackEduTeacherOnboardingStep: (...args: unknown[]) => mockTrack(...args),
}));

vi.mock('@/hooks/useOnboardingState', () => ({
  useTeacherOnboardingState: () => onboardingState,
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en', dir: 'ltr' }),
}));

vi.mock('@/hooks/useFocusTrap', () => ({ useFocusTrap: vi.fn() }));

vi.mock('@/components/motion/AdaptiveMotion', () => {
  const passthrough = ({ children, ...rest }: React.PropsWithChildren<Record<string, unknown>>) =>
    React.createElement('div', rest as React.HTMLAttributes<HTMLDivElement>, children);
  return {
    AdaptiveMotion: { div: passthrough },
    AdaptiveAnimatePresence: passthrough,
  };
});

import { TeacherOnboarding } from '../TeacherOnboarding';

describe('TeacherOnboarding presentation="chip"', () => {
  beforeEach(() => {
    mockTrack.mockClear();
    onboardingState.shouldShowOnboarding = true;
    onboardingState.complete.mockClear();
    onboardingState.skip.mockClear();
  });

  it('renders a small trigger instead of a dialog on first visit', () => {
    render(<TeacherOnboarding onDismiss={vi.fn()} presentation="chip" />);
    expect(screen.getByTestId('teacher-onboarding-chip')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(mockTrack).not.toHaveBeenCalled();
  });

  it('opens the full walkthrough on tap and reports the view then', () => {
    const onOpenChange = vi.fn();
    render(<TeacherOnboarding onDismiss={vi.fn()} presentation="chip" onOpenChange={onOpenChange} />);
    fireEvent.click(screen.getByTestId('teacher-onboarding-chip'));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(onOpenChange).toHaveBeenLastCalledWith(true);
    expect(mockTrack).toHaveBeenCalledWith(expect.objectContaining({ action: 'view' }));
  });

  it('closes on the X, persists the skip and tells the parent', () => {
    const onOpenChange = vi.fn();
    const onDismiss = vi.fn();
    render(<TeacherOnboarding onDismiss={onDismiss} presentation="chip" onOpenChange={onOpenChange} />);
    fireEvent.click(screen.getByTestId('teacher-onboarding-chip'));
    fireEvent.click(screen.getByLabelText('common.skip'));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(onboardingState.skip).toHaveBeenCalled();
    expect(onDismiss).toHaveBeenCalled();
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
  });

  it('shows nothing once the walkthrough was already seen', () => {
    onboardingState.shouldShowOnboarding = false;
    const { container } = render(<TeacherOnboarding onDismiss={vi.fn()} presentation="chip" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('portals the open walkthrough to <body>, so a blurred header or scroller cannot trap it off-screen', () => {
    const { container } = render(
      <div data-testid="host" style={{ backdropFilter: 'blur(12px)' }}>
        <TeacherOnboarding onDismiss={vi.fn()} presentation="chip" />
      </div>,
    );
    fireEvent.click(screen.getByTestId('teacher-onboarding-chip'));
    const dialog = screen.getByRole('dialog');
    expect(container.contains(dialog)).toBe(false);
    expect(document.body.contains(dialog)).toBe(true);
  });
});

describe('TeacherOnboarding reopened on demand (forceShow)', () => {
  it('portals to <body> too, so the header "?" opens it on-screen', () => {
    const { container } = render(<TeacherOnboarding forceShow onDismiss={vi.fn()} />);
    const dialog = screen.getByRole('dialog');
    expect(container.contains(dialog)).toBe(false);
    expect(document.body.contains(dialog)).toBe(true);
  });
});
