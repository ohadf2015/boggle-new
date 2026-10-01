import React from 'react';
import { render, act } from '@testing-library/react';

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

type IOCallback = (entries: Array<{ isIntersecting: boolean; target: Element }>) => void;
let observers: Array<{ cb: IOCallback; targets: Element[] }> = [];

class FakeIO {
  private entry: { cb: IOCallback; targets: Element[] };
  constructor(cb: IOCallback) {
    this.entry = { cb, targets: [] };
    observers.push(this.entry);
  }
  observe(el: Element) { this.entry.targets.push(el); }
  unobserve(el: Element) { this.entry.targets = this.entry.targets.filter((t) => t !== el); }
  disconnect() { this.entry.targets = []; }
}

function reveal(stepIndex: number) {
  act(() => {
    for (const o of observers) {
      const target = o.targets.find((t) => t.getAttribute('data-step-index') === String(stepIndex));
      if (target) o.cb([{ isIntersecting: true, target }]);
    }
  });
}

const viewedSteps = () =>
  mockTrack.mock.calls.map((c) => c[0] as { step: number; action: string }).filter((a) => a.action === 'view').map((a) => a.step);

describe('TeacherOnboarding per-step views (steps 1-3 were never emitted)', () => {
  beforeEach(() => {
    mockTrack.mockClear();
    observers = [];
    vi.stubGlobal('IntersectionObserver', FakeIO);
  });
  afterEach(() => vi.unstubAllGlobals());

  it('fires a view for each step as it scrolls into view, once each', () => {
    render(<TeacherOnboarding />);
    expect(viewedSteps()).toEqual([0]);
    reveal(1);
    reveal(2);
    reveal(2);
    reveal(3);
    expect(viewedSteps()).toEqual([0, 1, 2, 3]);
    expect(mockTrack).toHaveBeenCalledWith(expect.objectContaining({ step: 3, totalSteps: 5, action: 'view' }));
  });

  it('does not double-count step 0, which the open already reported', () => {
    render(<TeacherOnboarding />);
    reveal(0);
    expect(viewedSteps()).toEqual([0]);
  });

  it('without IntersectionObserver every rendered step counts as seen', () => {
    vi.stubGlobal('IntersectionObserver', undefined);
    render(<TeacherOnboarding />);
    expect([...viewedSteps()].sort()).toEqual([0, 1, 2, 3, 4]);
  });
});
