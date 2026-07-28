// @vitest-environment happy-dom
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeAll } from 'vitest';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en', dir: 'ltr' }),
}));
vi.mock('@/lib/analytics/lazyPosthog', () => ({
  default: { capture: vi.fn() },
}));
vi.mock('@/utils/logger', () => ({
  default: { warn: vi.fn(), info: vi.fn(), error: vi.fn() },
}));
vi.mock('next/navigation', () => ({
  usePathname: () => '/he',
}));

import FeedbackWidget from '../FeedbackWidget';

// The app's full-screen screen layer (e.g. OnboardingFlow on the desktop
// landing page) is `fixed inset-0 z-[100]`. The widget must stack above it or
// it is painted over and unreachable (prod bug 2026-07-28).
const APP_SCREEN_LAYER_Z = 100;

function zIndexOf(el: HTMLElement): number {
  const match = el.className.match(/z-\[(\d+)\]/);
  expect(match, `expected an explicit z-[n] class on ${el.tagName}`).not.toBeNull();
  return Number(match![1]);
}

beforeAll(() => {
  // Defer-until-idle: fire the idle callback synchronously in tests.
  (window as Window & { requestIdleCallback?: (cb: () => void) => number }).requestIdleCallback = (
    cb: () => void,
  ) => {
    cb();
    return 1;
  };
});

describe('FeedbackWidget stacking above the app screen layer', () => {
  it('renders the bubble above the app z-100 screen layer', () => {
    render(<FeedbackWidget />);
    const bubble = screen.getByRole('button', { name: 'feedbackWidget.bubbleLabel' });
    expect(zIndexOf(bubble)).toBeGreaterThan(APP_SCREEN_LAYER_Z);
  });

  it('renders the dialog above the app z-100 screen layer', () => {
    render(<FeedbackWidget />);
    const dialog = screen.getByRole('dialog', { hidden: true });
    expect(zIndexOf(dialog)).toBeGreaterThan(APP_SCREEN_LAYER_Z);
  });
});
