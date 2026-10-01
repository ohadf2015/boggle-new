import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

const clicked = vi.fn();
const shown = vi.fn();
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string, fallback?: string) => (typeof fallback === 'string' ? fallback : k), language: 'en' }),
}));
vi.mock('@/lib/education/telemetry', () => ({
  trackEduFirstAssignmentCtaClicked: (...a: unknown[]) => clicked(...a),
  trackEduFirstAssignmentCtaShown: (...a: unknown[]) => shown(...a),
}));

import { FirstAssignmentInlineCta } from '../FirstAssignmentInlineCta';

describe('<FirstAssignmentInlineCta> — the phone nudge in the roster row', () => {
  beforeEach(() => {
    clicked.mockClear();
    shown.mockClear();
  });

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

  it('Given it is on screen, Then it reports the funnel impression once per class, like the panel does on wider screens', () => {
    const { rerender } = render(<FirstAssignmentInlineCta classroomId="c1" onCta={vi.fn()} />);
    rerender(<FirstAssignmentInlineCta classroomId="c1" onCta={vi.fn()} />);
    expect(shown).toHaveBeenCalledTimes(1);
    expect(shown).toHaveBeenCalledWith({ classroomId: 'c1' });
    rerender(<FirstAssignmentInlineCta classroomId="c2" onCta={vi.fn()} />);
    expect(shown).toHaveBeenLastCalledWith({ classroomId: 'c2' });
  });

  it('Given GO LIVE is the one shout on HQ, Then the nudge is a quiet lime outline with the short homework label, not a second filled lime button', () => {
    render(<FirstAssignmentInlineCta classroomId="c1" onCta={vi.fn()} />);
    const btn = screen.getByTestId('hq-first-assignment-inline');
    expect(btn).toHaveTextContent('eduHq.hq.assignNudge');
    expect(btn.className).toMatch(/(^|\s)border-neo-lime(\s|$)/);
    expect(btn.className).not.toMatch(/(^|\s)bg-neo-lime(\s|$)/);
  });
});
