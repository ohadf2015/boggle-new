import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

const clicked = vi.fn();
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string, fallback?: string) => (typeof fallback === 'string' ? fallback : k), language: 'en' }),
}));
vi.mock('@/lib/education/telemetry', () => ({
  trackEduFirstAssignmentCtaClicked: (...a: unknown[]) => clicked(...a),
}));

import { FirstAssignmentInlineCta } from '../FirstAssignmentInlineCta';

describe('<FirstAssignmentInlineCta> — the phone nudge rides in the roster row', () => {
  beforeEach(() => clicked.mockClear());

  it('When tapped, Then it reports the same funnel click as the panel and opens the creator', () => {
    const onCta = vi.fn();
    render(<FirstAssignmentInlineCta classroomId="c1" onCta={onCta} />);
    fireEvent.click(screen.getByTestId('hq-first-assignment-inline'));
    expect(clicked).toHaveBeenCalledWith({ classroomId: 'c1' });
    expect(onCta).toHaveBeenCalledTimes(1);
  });

  it('Given phones only, Then it hides from sm up where the full panel shows', () => {
    render(<FirstAssignmentInlineCta classroomId="c1" onCta={vi.fn()} />);
    expect(screen.getByTestId('hq-first-assignment-inline').className).toMatch(/(^|\s)sm:hidden(\s|$)/);
  });
});
