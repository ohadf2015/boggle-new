// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';

let reduced = false;

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en' }),
}));
vi.mock('@/hooks/useExperiment', () => ({
  useExperiment: () => ({ variant: 'control', trackExposure: () => {} }),
}));
vi.mock('@/lib/analytics/lazyPosthog', () => ({ default: { capture: () => {} } }));
vi.mock('@/lib/education/motion/useEduReducedMotion', () => ({ useEduReducedMotion: () => reduced }));
vi.mock('@/components/education/motion/useReducedMotionSafe', () => ({ useReducedMotionSafe: () => reduced }));

import { EducationLandingDemo } from '../EducationLandingDemo';

beforeEach(() => {
  reduced = false;
  vi.useFakeTimers();
});
afterEach(() => vi.useRealTimers());

describe('EducationLandingDemo found-word beat', () => {
  it('Given the demo traces a word, When it lands, Then the board sparkles', () => {
    render(<EducationLandingDemo />);
    expect(screen.queryByTestId('edu-celebration-burst')).toBeNull();
    act(() => vi.runAllTimers());
    const burst = screen.getByTestId('edu-celebration-burst');
    expect(burst.closest('[data-testid="education-landing-demo-board"]')).not.toBeNull();
  });

  it('Given reduced motion, When a word lands, Then nothing sparkles', () => {
    reduced = true;
    render(<EducationLandingDemo />);
    act(() => vi.runAllTimers());
    expect(screen.queryByTestId('edu-celebration-burst')).toBeNull();
  });

  it('wraps the status prompt instead of clipping it, with room reserved for two lines', () => {
    render(<EducationLandingDemo />);
    const prompt = screen.getByText('eg6Land.demo.watching');
    expect(prompt.className).not.toMatch(/\btruncate\b/);
    expect(prompt.className).toMatch(/min-h-\[2lh\]/);
  });
});
